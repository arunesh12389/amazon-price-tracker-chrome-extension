import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import uvicorn
import re # Added for ASIN extraction
import httpx # Added for API calls
from dotenv import load_dotenv 
load_dotenv()
from scraper.history_scraper import HistoryScraper  

from groq import Groq
from scraper.amazon_scraper import AmazonScraper
from predictor.predict import PricePredictor
from database.db import Database
from alerts.notifier import Notifier
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
from contextlib import asynccontextmanager
# Removed: from scraper.history_scraper import KeepaScraper

# --- Groq AI Configuration (remains the same) ---
try:
    GROQ_API_KEY = os.getenv('GROQ_API_KEY')
    if GROQ_API_KEY:
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("✅ Groq AI configured successfully.")
    else:
        groq_client = None
        print("⚠️ GROQ_API_KEY not found. AI features will be disabled.")
except Exception as e:
    groq_client = None
    print(f"❌ Error configuring Groq AI: {e}")

# --- RapidAPI Configuration ---
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
RAPIDAPI_HOST = os.getenv('RAPIDAPI_HOST')

if not RAPIDAPI_KEY or not RAPIDAPI_HOST:
    print("⚠️ RAPIDAPI_KEY or RAPIDAPI_HOST not found in .env file. Historical data endpoint will fail.")


# --- Scheduler and Lifespan (remains the same) ---
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🟢 Starting scheduler on application startup...")
    scheduler.add_job(scheduled_price_update, 'interval', minutes=15, id='price_update_job') # Changed interval to 15 mins

    jobs = scheduler.get_jobs()
    print(f"📋 Scheduler jobs: {[job.id for job in jobs]}")

    try:
        scheduler.start()
        print("✅ Scheduler started successfully!")
    except Exception as e:
        print(f"❌ Failed to start scheduler: {e}")

    job = scheduler.get_job('price_update_job')
    if job:
        next_run = job.next_run_time
        print(f"⏰ Next scheduled run: {next_run}")
    else:
        print("⚠️ Price update job not found!")

    yield

    print("🔴 Shutting down scheduler...")
    scheduler.shutdown()

# --- FastAPI App Setup (remains the same) ---
app = FastAPI(title="Smart Price Tracker API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Initialize Components (remains the same) ---
db = Database()
predictor = PricePredictor()
notifier = Notifier()

# --- Pydantic Models (remains the same) ---
class PriceHistory(BaseModel):
    date: datetime
    price: float

class PricePrediction(BaseModel):
    dates: List[str]
    prices: List[float]
    recommendation: str
    confidence: float

class TrackRequest(BaseModel):
    url: str
    name: str
    price: float
    threshold: float
    image_url: Optional[str] = None
    user_id: str = "default"
    last_checked: Optional[str] = None

class TrackingResponse(BaseModel):
    status: str
    product_id: str
    prediction: Optional[PricePrediction] = None
    current_price: Optional[float] = None
    data_points_needed: int = 0
    next_update: Optional[str] = None

class UpdateThresholdRequest(BaseModel):
    url: str
    new_threshold: float
    user_id: str = "default"

class ProductActionRequest(BaseModel):
    url: str
    user_id: str = "default"

class AddPricePointRequest(BaseModel):
    url: str
    price: float
    user_id: str = "default"
    timestamp: Optional[str] = None

class AlertActionRequest(BaseModel):
    url: str
    user_id: str = "default"

class ClearAlertsRequest(BaseModel):
    user_id: str = "default"

class MarkAlertsNotifiedRequest(BaseModel):
    alert_ids: List[str]
    user_id: str = "default"

class UserEmailRequest(BaseModel):
    email: EmailStr
    user_id: str = "default"

# --- Helper function to extract ASIN ---
def _extract_asin(amazon_url: str) -> Optional[str]:
    # Regex to find ASIN in different URL patterns
    match = re.search(r'/(dp|gp/product)/([A-Z0-9]{10})', amazon_url)
    if match:
        return match.group(2)
    # Check for /ASIN/{ASIN} pattern
    match = re.search(r'/ASIN/([A-Z0-9]{10})', amazon_url)
    if match:
        return match.group(1)
    # Add more patterns if needed
    return None

# --- API Endpoints (Most remain the same) ---

@app.get("/")
def root():
    return {"message": "FastAPI is working!"}


@app.get("/api/price")
async def get_current_price(url: str):
    try:
        if 'amazon' in url:
            scraper = AmazonScraper()
            details = await scraper.get_price_and_details(url)
            return {"price": details['price']}
        else:
            raise HTTPException(status_code=400, detail="Unsupported website")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/product/historical-data")
async def get_historical_data(url: str, current_price: str = None):
    """Fetch historical price data from Rainforest API for immediate chart display."""
    try:
                # Convert string price parameter to float if provided
        price_value = None
        if current_price:
            try:
                price_value = float(current_price)
            except (ValueError, TypeError):
                pass
        api_key = os.getenv('RAINFOREST_API_KEY', '').strip()
        scraper = HistoryScraper(api_key=api_key)
        result = await scraper.get_historical_data(url, price_value, db=db)
        return result
    except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Error fetching historical data: {e}")

@app.post("/api/track", response_model=TrackingResponse)
async def track_product(request: TrackRequest):
    # --- This endpoint remains largely the same ---
    try:
        print(f"Tracking product: {request.name} at ₹{request.price} for user: {request.user_id}")
        if not isinstance(request.price, (int, float)) or request.price <= 0:
            raise HTTPException(status_code=422, detail="Invalid price value")

        product_id = await db.add_tracked_product(
            url=request.url, name=request.name, threshold=request.threshold,
            current_price=request.price, image_url=request.image_url, user_id=request.user_id
        )
        await db.update_price(request.url, request.price, request.user_id) # Log initial price

        history = await db.get_price_history(request.url, request.user_id)
        if not history: history = [] # Ensure history is a list

        prediction = None
        data_points_needed = 0
        next_update_dt = datetime.utcnow() + timedelta(minutes=15) # Match scheduler interval
        next_update_iso = next_update_dt.isoformat() + "Z"

        try:
            if len(history) >= predictor.MIN_HISTORY: # Use constant from predictor
                prediction = predictor.predict_prices(history)
            else:
                data_points_needed = predictor.MIN_HISTORY - len(history)
        except Exception as pred_e:
            print(f"Prediction error during tracking: {pred_e}")
            prediction = None

        return {
            "status": "success", "product_id": str(product_id), "prediction": prediction,
            "current_price": request.price, "data_points_needed": data_points_needed,
            "next_update": next_update_iso
        }
    except Exception as e:
        import traceback
        print(f"Tracking error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Tracking failed: {str(e)}")

@app.get("/api/history")
async def get_price_history(url: str, user_id: str = "default") -> List[PriceHistory]:
    # --- Remains the same ---
    try:
        history = await db.get_price_history(url, user_id)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/historical-data")
async def get_history_and_prediction(url: str, user_id: str = "default"):
     # --- Remains the same ---
    try:
        history = await db.get_price_history(url, user_id)
        prediction = None
        data_points = len(history) if history else 0
        min_required = predictor.MIN_HISTORY # Use constant

        if data_points >= min_required:
            try:
                prediction = predictor.predict_prices(history)
            except Exception as pred_e:
                import traceback
                print("Prediction error:", str(pred_e))
                traceback.print_exc()
                prediction = None
        return {
            "history": history, "prediction": prediction,
            "data_points": data_points, "min_required": min_required
        }
    except Exception as e:
        import traceback
        print(f"History+Prediction error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch history and prediction: {str(e)}")

@app.get("/ping")
async def ping():
    # --- Remains the same ---
    return {"status": "alive", "timestamp": datetime.utcnow()}


@app.get("/api/user/products")
async def get_user_products(user_id: str = "default"):
    # --- Remains the same ---
    try:
        products = await db.get_user_tracked_products(user_id=user_id)
        return {"user_id": user_id, "products": products, "total_products": len(products)}
    except Exception as e:
        print(f"Error getting user products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/product/threshold")
async def update_product_threshold(request: UpdateThresholdRequest):
    # --- Remains the same ---
    try:
        success = await db.update_product_threshold(request.url, request.new_threshold, request.user_id)
        if success:
            return {"status": "success", "message": f"Threshold updated to ₹{request.new_threshold}", "new_threshold": request.new_threshold}
        else:
            raise HTTPException(status_code=404, detail="Product not found")
    except HTTPException as e: raise e
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/product/remove")
async def remove_product(request: ProductActionRequest):
    # --- Remains the same ---
    try:
        deactivated = await db.deactivate_product(request.url, request.user_id)
        if deactivated:
            await db.remove_alerts_for_product(request.url, request.user_id)
            return {"status": "success", "message": "Product tracking stopped and alerts cleared."}
        else:
            raise HTTPException(status_code=404, detail="Product not found.")
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts")
async def get_alerts(user_id: str = "default", new_only: bool = False):
    # --- Remains the same ---
    try:
        alerts = await db.get_user_alerts(user_id, only_new=new_only)
        return { "user_id": user_id, "alerts": alerts, "total_alerts": len(alerts) }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/alerts")
async def remove_alert(request: AlertActionRequest):
    # --- Remains the same ---
    try:
        success = await db.remove_alert(request.url, request.user_id)
        if success: return {"status": "success", "message": "Alert removed successfully"}
        else: raise HTTPException(status_code=404, detail="Alert not found")
    except HTTPException as e: raise e
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/alerts/all")
async def remove_all_alerts(request: ClearAlertsRequest):
    # --- Remains the same ---
    try:
        deleted_count = await db.remove_all_alerts_for_user(request.user_id)
        return {"status": "success", "message": f"{deleted_count} alerts removed successfully."}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/alerts/mark-notified")
async def mark_alerts_as_notified(request: MarkAlertsNotifiedRequest):
    # --- Remains the same ---
    try:
        modified_count = await db.mark_alerts_notified(request.alert_ids, request.user_id)
        return {"status": "success", "message": f"{modified_count} alerts marked as notified."}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/email")
async def set_user_email(request: UserEmailRequest):
    # --- Remains the same ---
    try:
        await db.set_user_email(request.user_id, request.email)
        return { "status": "success", "message": "Email saved" }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/email")
async def get_user_email(user_id: str = "default"):
    # --- Remains the same ---
    try:
        email = await db.get_user_email(user_id)
        return { "user_id": user_id, "email": email }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# --- Removed /api/add_price_point (handled by scheduler/tracking) ---

# --- Scheduled Price Update (remains largely the same, uses AmazonScraper) ---
async def scheduled_price_update():
    print("[Scheduler] Running scheduled price update...")
    db_instance = Database() # Create instance inside function for async safety
    try:
        products = await db_instance.get_products_to_check()
        user_products = {}
        for product in products:
            user_id = product.get('user_id', 'default')
            user_products.setdefault(user_id, []).append(product)

        print(f"[Scheduler] Processing {len(products)} products for {len(user_products)} users")

        async for user_id, user_products_list in AsyncIterator(user_products.items()):
            print(f"[Scheduler] Processing user: {user_id} ({len(user_products_list)} products)")
            scraper = AmazonScraper() # Create scraper once per user batch (or outside loop if safe)

            for product in user_products_list:
                url = product.get('url')
                if not url: continue

                try:
                    # Only Amazon supported by current scraper
                    if 'amazon' not in url:
                        print(f"[Scheduler] Skipping unsupported site: {url}")
                        continue

                    details = await scraper.get_price_and_details(url)

                    if details and 'price' in details and details['price'] > 0:
                        price = details['price']
                        await db_instance.update_price(url, price, user_id) # Log price

                        # Alert Check
                        threshold = product.get('threshold', float('inf')) # Default high if missing
                        if price <= threshold:
                            await db_instance.add_alert(
                                url=url, price=price, threshold=threshold, user_id=user_id,
                                name=product.get('name'), image_url=product.get('image_url')
                            )
                            # Email notification
                            try:
                                user_email = await db_instance.get_user_email(user_id)
                                if user_email:
                                    print(f"[Scheduler] Sending email alert to {user_email}...")
                                    await notifier.send_email_alert(
                                        to_email=user_email,
                                        product_name=product.get('name', 'Tracked Product'),
                                        current_price=price, threshold=threshold, url=url
                                    )
                            except Exception as notify_err:
                                print(f"[Scheduler] Email notify failed: {notify_err}")
                            print(f"[Scheduler] 🚨 Price alert for {product.get('name')}: ₹{price} <= ₹{threshold}")

                        print(f"[Scheduler] Updated price for {url}: ₹{price}")
                    else:
                         print(f"[Scheduler] Could not get valid price for {url}. Details: {details}")


                except Exception as e:
                    import traceback
                    print(f"[Scheduler] Error updating {url}: {e}")
                    # traceback.print_exc() # Uncomment for detailed traceback

    except Exception as e:
        import traceback
        print(f"[Scheduler] General error: {e}")
        traceback.print_exc()

# Helper for async iteration over dict items (if needed, depends on Python version)
class AsyncIterator:
    def __init__(self, seq):
        self.iter = iter(seq)
    def __aiter__(self):
        return self
    async def __anext__(self):
        try:
            return next(self.iter)
        except StopIteration:
            raise StopAsyncIteration

@app.get("/api/test-scheduler")
async def test_scheduler_manually():
     # --- Remains the same ---
    print("🧪 Manually testing scheduler function...")
    try:
        await scheduled_price_update()
        return {"status": "success", "message": "Scheduler test completed"}
    except Exception as e:
        print(f"❌ Scheduler test failed: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/product/advice")
async def get_product_advice(request: ProductActionRequest):
    # --- Remains largely the same, ensure MIN_HISTORY is accessible ---
    if not groq_client:
        raise HTTPException(status_code=503, detail="AI service is not configured.")
    try:
        history_raw = await db.get_price_history(request.url, request.user_id)

        if not history_raw or len(history_raw) < predictor.MIN_HISTORY: # Check history exists
            raise HTTPException(status_code=400, detail=f"Insufficient price history for prediction. Need at least {predictor.MIN_HISTORY} data points.")

        insights = predictor.get_price_insights(history_raw)
        prediction = predictor.predict_prices(history_raw) # Should work if history check passes

        prompt = f"""
        You are an expert e-commerce price analyst. A user wants to buy a product. Based on the data below, give a concise, one-paragraph recommendation on whether they should "Buy Now" or "Wait". Justify your answer.

        - Product Name: '{insights.get("name", "this product")}'
        - Current Price: ₹{insights['current_price']:.2f}
        - Historical Low Price: ₹{insights['lowest_price']:.2f}
        - Historical High Price: ₹{insights['highest_price']:.2f}
        - Our ML model's recommendation: '{prediction['recommendation']}' with {prediction['confidence']*100:.0f}% confidence.
        - Our model predicts the price will move towards ₹{min(prediction['prices']):.2f} in the next 7 days.

        Start your response with a clear "Recommendation: Buy Now." or "Recommendation: Wait.".
        """

        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        return {"advice": chat_completion.choices[0].message.content}

    except HTTPException as httpe: # Catch specific HTTP exceptions first
        raise httpe
    except Exception as e:
        print(f"Error in AI advice endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An error occurred while generating AI advice.")


# --- MODIFIED: Use RapidAPI instead of KeepaScraper ---
@app.get("/api/product/historical-data")
async def get_product_historical_data(url: str):
    """
    Receives an Amazon product URL, calls the RapidAPI Amazon Data Product Scraper
    for product details including price history, and returns key statistics.
    """
    if not RAPIDAPI_KEY or not RAPIDAPI_HOST:
        print("❌ RapidAPI credentials not configured.")
        raise HTTPException(status_code=503, detail="External data service is not configured.")

    asin = _extract_asin(url)
    if not asin:
        print(f"❌ Could not extract ASIN from URL: {url}")
        raise HTTPException(status_code=400, detail="Invalid Amazon product URL or ASIN not found.")

    api_url = f"https://{RAPIDAPI_HOST}/products/{asin}"
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
    }

    print(f" Querying RapidAPI for ASIN: {asin}")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(api_url, headers=headers, timeout=30.0) # Added timeout

        # Handle API response status
        if response.status_code != 200:
            try:
                error_detail = response.json().get('message', response.text)
            except Exception:
                error_detail = response.text
            print(f"❌ RapidAPI error ({response.status_code}): {error_detail}")
            raise HTTPException(status_code=response.status_code, detail=f"Failed to fetch data from external service: {error_detail}")

        response_json = response.json()

        # --- PARSE AND TRANSFORM API RESPONSE ---
        # IMPORTANT: Adjust these lines based on the ACTUAL structure of the RapidAPI response!
        raw_history = response_json.get('price_history', []) # Assuming 'price_history' is the key
        chart_history = []
        valid_prices = []

        if isinstance(raw_history, list):
            for item in raw_history:
                # Assuming item is a dict with 'timestamp' and 'price'
                timestamp_str = item.get('timestamp')
                price = item.get('price')

                if timestamp_str and price is not None and price > 0:
                    try:
                        # Attempt to parse the timestamp (adjust format if needed)
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00')) # Handle Z timezone
                        iso_date = timestamp.isoformat()
                        chart_history.append({'date': iso_date, 'price': price})
                        valid_prices.append(price)
                    except ValueError:
                        print(f"⚠️ Could not parse timestamp: {timestamp_str}")
                else:
                     print(f"⚠️ Skipping invalid history item: {item}")

        if not valid_prices:
             # If API gave no valid history, maybe get current price if available
             current_price = response_json.get('current_price') # Check if API provides current price directly
             if current_price and current_price > 0:
                 print("⚠️ No history found, returning current price only.")
                 now_iso = datetime.utcnow().isoformat() + "Z"
                 return {
                     'lowest_price': current_price,
                     'highest_price': current_price,
                     'average_price': current_price,
                     'asin': asin,
                     'source': 'RapidAPI (Current Price Only)',
                     'history': [{'date': now_iso, 'price': current_price}]
                 }
             else:
                print(f"❌ No valid price history found in API response for ASIN {asin}")
                raise HTTPException(status_code=404, detail="No valid price history found for this product from the data source.")

        # Calculate stats
        lowest_price = min(valid_prices)
        highest_price = max(valid_prices)
        average_price = sum(valid_prices) / len(valid_prices)

        print(f"✅ Successfully fetched data for ASIN {asin} via RapidAPI")
        return {
            'lowest_price': lowest_price,
            'highest_price': highest_price,
            'average_price': average_price,
            'asin': asin,
            'source': 'RapidAPI', # Indicate the new source
            'history': chart_history # This is the array [{'date': '...', 'price': ...}, ...]
        }

    except httpx.RequestError as exc:
        print(f"❌ HTTPX Network error calling RapidAPI: {exc}")
        raise HTTPException(status_code=504, detail=f"Network error communicating with external data service: {exc}")
    except Exception as e:
        import traceback
        print(f"❌ Unexpected error processing RapidAPI data: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error processing historical data: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) # Added reload=True for development


# **Step 4: Update Frontend Code (`contentScript.js`)**

# Your existing `contentScript.js` should already work!

# The `fetchAndDisplayHistoricalData` function calls `/api/product/historical-data` and expects the exact dictionary structure (`lowest_price`, `highest_price`, `average_price`, `history`) that our updated backend endpoint now provides using the RapidAPI data.

# The `renderPriceChart` function also expects the `history` array in the format `[{'date': 'ISO_STRING', 'price': NUMBER}]`, which the backend prepares.

# **Step 5: Run and Test**

# 1.  **Stop** your current backend server (Ctrl+C).
# 2.  Make sure you've created the `.env` file with your API key and host.
# 3.  **Start** the backend server again:
#     ```cmd
#     (venv) D:\coding\ext\price-tracker\backend> uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    
