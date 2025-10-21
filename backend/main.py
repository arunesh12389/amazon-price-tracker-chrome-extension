import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import uvicorn

from groq import Groq 
from scraper.amazon_scraper import AmazonScraper
from predictor.predict import PricePredictor
from database.db import Database
from alerts.notifier import Notifier
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
from contextlib import asynccontextmanager

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




scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🟢 Starting scheduler on application startup...")
    scheduler.add_job(scheduled_price_update, 'interval', minutes=2, id='price_update_job')
    
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

app = FastAPI(title="Smart Price Tracker API", lifespan=lifespan)

# Enable CORS for Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
db = Database()
predictor = PricePredictor()
notifier = Notifier()

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
    user_id: str = "default"  # Add user identification
    last_checked: Optional[str] = None

class TrackingResponse(BaseModel):
    status: str
    product_id: str
    prediction: Optional[PricePrediction] = None
    current_price: Optional[float] = None
    data_points_needed: int = 0  # Add data collection info
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

class UserEmailRequest(BaseModel): # New model for email
    email: EmailStr
    user_id: str = "default"

@app.get("/")
def root():
    return {"message": "FastAPI is working!"}

@app.get("/api/price")
async def get_current_price(url: str):
    try:
        if 'amazon' in url:
            scraper = AmazonScraper()
        elif 'flipkart' in url:
            scraper = FlipkartScraper()
        else:
            raise HTTPException(status_code=400, detail="Unsupported website")
            
        price = await scraper.get_price(url)
        return {"price": price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/track", response_model=TrackingResponse)
async def track_product(request: TrackRequest):
    try:
        # Debug received data
        print(f"Tracking product: {request.name} at ₹{request.price} for user: {request.user_id}")
        
        # Validate price
        if not isinstance(request.price, (int, float)) or request.price <= 0:
            raise HTTPException(status_code=422, detail="Invalid price value")
        
        # Store in database
        product_id = await db.add_tracked_product(
            url=request.url,
            name=request.name,
            threshold=request.threshold,
            current_price=request.price,
            image_url=request.image_url,
            user_id=request.user_id
        )
        
        # Add to price history
        await db.update_price(request.url, request.price, request.user_id)


        history = await db.get_price_history(request.url, request.user_id)
        if not history:
            history = [{"date": datetime.utcnow(), "price": request.price}]
        
        prediction = None
        data_points_needed = 0
        next_update = None
        
        try:
            if len(history) >= 5:
                prediction = predictor.predict_prices(history)
            else:
                data_points_needed = 5 - len(history)
                next_update = (datetime.utcnow() + timedelta(minutes=2)).isoformat()  
        except Exception as pred_e:
            print(f"Prediction error: {pred_e}")
            prediction = None
        
        return {
            "status": "success",
            "product_id": str(product_id),
            "prediction": prediction,
            "current_price": request.price,
            "data_points_needed": data_points_needed,
            "next_update": next_update
        }
        
    except Exception as e:
        import traceback
        print(f"Tracking error: {str(e)}")  # Detailed error logging
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Tracking failed: {str(e)}"
        )
    

@app.get("/api/history")
async def get_price_history(url: str, user_id: str = "default") -> List[PriceHistory]:
    try:
        history = await db.get_price_history(url, user_id)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history-prediction")
async def get_history_and_prediction(url: str, user_id: str = "default"):
    try:
        history = await db.get_price_history(url, user_id)
        prediction = None
        if history and len(history) >= 5:
            try:
                prediction = predictor.predict_prices(history)
            except Exception as pred_e:
                import traceback
                print("Prediction error:", str(pred_e))
                traceback.print_exc()
                prediction = None
        return {
            "history": history,
            "prediction": prediction,
            "data_points": len(history),
            "min_required": 5
        }
    except Exception as e:
        import traceback
        print(f"History+Prediction error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch history and prediction: {str(e)}")

@app.get("/ping")
async def ping():
    return {"status": "alive", "timestamp": datetime.utcnow()}


@app.post("/api/predict")
async def predict_price(body: Dict) -> Dict:
    """Return prediction given a product URL. Matches extension POST call.

    body: { url: str }
    """
    try:
        url = body.get('url')
        if not url:
            raise HTTPException(status_code=422, detail="Missing url")

        history = await db.get_price_history(url)
        if not history or len(history) < 5:
            # Not enough data – return placeholder so UI can show progress
            return {
                "history": history,
                "prediction": None,
                "data_points": len(history),
                "min_required": 5
            }

        prediction = predictor.predict_prices(history)
        return {
            "history": history,
            "prediction": prediction,
            "data_points": len(history),
            "min_required": 5
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/products")
async def get_user_products(user_id: str = "default"):
    """Get all tracked products for a specific user."""
    try:
        products = await db.get_user_tracked_products(user_id=user_id)
        return {
            "user_id": user_id,
            "products": products,
            "total_products": len(products)
        }
    except Exception as e:
        print(f"Error getting user products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/products/{user_id}")
async def get_user_products_by_id(user_id: str):
    """Get all tracked products for a specific user by ID."""
    try:
        products = await db.get_user_tracked_products(user_id)
        return {
            "user_id": user_id,
            "products": products,
            "total_products": len(products)
        }
    except Exception as e:
        print(f"Error getting user products by ID: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/product/threshold")
async def update_product_threshold(request: UpdateThresholdRequest):
    """Update the threshold for a tracked product."""
    try:
        success = await db.update_product_threshold(
            request.url, 
            request.new_threshold, 
            request.user_id
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Threshold updated to ₹{request.new_threshold}",
                "new_threshold": request.new_threshold
            }
        else:
            raise HTTPException(status_code=404, detail="Product not found")
            
    except HTTPException as e:
        # Preserve explicit HTTP errors like 404
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/product/stop-tracking")
async def stop_tracking_product(request: ProductActionRequest):
    """Stop tracking a product (set to inactive)."""
    try:
        success = await db.stop_tracking_product(request.url, request.user_id)        
        if success:
            return {
                "status": "success",
                "message": "Product tracking stopped successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Product not found")
            
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/product/remove")
async def remove_product(request: ProductActionRequest):
    """Deactivates a product AND removes its associated alerts."""
    try:
        deactivated = await db.deactivate_product(request.url, request.user_id)
        if deactivated:
            # Also remove any existing alerts for this product to prevent ghost notifications
            await db.remove_alerts_for_product(request.url, request.user_id)
            return {"status": "success", "message": "Product tracking stopped and alerts cleared."}
        else:
            raise HTTPException(status_code=404, detail="Product not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts")
async def get_alerts(user_id: str = "default", new_only: bool = False):
    """Return alerts for the user. If new_only is true, returns only un-notified alerts."""
    try:
        alerts = await db.get_user_alerts(user_id, only_new=new_only)
        return { "user_id": user_id, "alerts": alerts, "total_alerts": len(alerts) }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/alerts")
async def remove_alert(request: AlertActionRequest):
    """Remove a single alert for a product & user."""
    try:
        success = await db.remove_alert(request.url, request.user_id)
        if success:
            return {
                "status": "success",
                "message": "Alert removed successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/alerts/all")
async def remove_all_alerts(request: ClearAlertsRequest):
    try:
        deleted_count = await db.remove_all_alerts_for_user(request.user_id)
        return {
            "status": "success",
            "message": f"{deleted_count} alerts removed successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/alerts/mark-notified")
async def mark_alerts_as_notified(request: MarkAlertsNotifiedRequest):
    """Marks a list of alerts as having been notified."""
    try:
        modified_count = await db.mark_alerts_notified(request.alert_ids, request.user_id)
        return {"status": "success", "message": f"{modified_count} alerts marked as notified."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/email")
async def set_user_email(request: UserEmailRequest):
    try:
        await db.set_user_email(request.user_id, request.email)
        return { "status": "success", "message": "Email saved" }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/email")
async def get_user_email(user_id: str = "default"):
    try:
        email = await db.get_user_email(user_id)
        return { "user_id": user_id, "email": email }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/add_price_point")
async def add_price_point(request: AddPricePointRequest):
    """Add a new price point to a product's history."""
    try:
        # Optionally use provided timestamp, else use now
        if request.timestamp:
            from datetime import datetime
            ts = datetime.fromisoformat(request.timestamp)
        else:
            ts = None
        # Patch db.update_price to accept timestamp if needed, else just use now
        # For now, we use the existing db.update_price which uses now
        await db.update_price(request.url, request.price, request.user_id)
        return {
            "status": "success",
            "message": f"Added price point ₹{request.price} for {request.url}",
            "url": request.url,
            "price": request.price
        }
    except Exception as e:
        import traceback
        print(f"Add price point error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to add price point: {str(e)}")

async def scheduled_price_update():
    print("[Scheduler] Running scheduled price update...")
    db_instance = Database()
    try:
        # Get all products for all users

        products = await db_instance.get_products_to_check()

        # Group by user for better organization
        user_products = {}
        for product in products:
            user_id = product.get('user_id', 'default')
            if user_id not in user_products:
                user_products[user_id] = []
            user_products[user_id].append(product)
        
        print(f"[Scheduler] Processing {len(products)} products for {len(user_products)} users")
        
        for user_id, user_products_list in user_products.items():
            print(f"[Scheduler] Processing user: {user_id} ({len(user_products_list)} products)")
            
            for product in user_products_list:
                url = product.get('url')
                if not url:
                    continue
                    
                try:
                    if 'amazon' in url:
                        scraper = AmazonScraper()
                    else:
                        print(f"[Scheduler] Unsupported site for url: {url}")
                        continue
                        
                    details = await scraper.get_price_and_details(url)
                
                    if details and 'price' in details:
                        price = details['price']
                        await db_instance.update_price(url, price, user_id)
                    
                        # Check if price dropped below threshold
                        threshold = product.get('threshold', 0)
                        if price <= threshold:
                            await db_instance.add_alert(
                                url=url, 
                                price=price, 
                                threshold=threshold, 
                                user_id=user_id, 
                                name=product.get('name'), 
                                image_url=product.get('image_url')
                            )
                            # Email notification if configured
                            try:
                                user_email = await db_instance.get_user_email(user_id)
                                if user_email:
                                    print(f"[Scheduler] Sending email alert to {user_email}...")
                                    await notifier.send_email_alert(
                                        to_email=user_email,
                                        product_name=product.get('name', 'Your Tracked Product'),
                                        current_price=price, threshold=threshold, url=url
                                    )
                            except Exception as notify_err:
                                print(f"[Scheduler] Email notify failed: {notify_err}")
                            print(f"[Scheduler] 🚨 Price alert for {product.get('name')} {url}: ₹{price} <= ₹{threshold}")
                        
                        print(f"[Scheduler] Updated price for {url}: ₹{price}")
                    
                except Exception as e:
                    print(f"[Scheduler] Error updating {url}: {e}")
                    
    except Exception as e:
        print(f"[Scheduler] General error: {e}")

@app.get("/api/test-scheduler")
async def test_scheduler_manually():
    """Manual endpoint to test the scheduler function."""
    print("🧪 Manually testing scheduler function...")
    try:
        await scheduled_price_update()
        return {"status": "success", "message": "Scheduler test completed"}
    except Exception as e:
        print(f"❌ Scheduler test failed: {e}")
        return {"status": "error", "message": str(e)}

# --- NEW AI ADVISOR ENDPOINT ---
@app.post("/api/product/advice")
async def get_product_advice(request: ProductActionRequest):
    if not groq_client:
        raise HTTPException(status_code=503, detail="AI service is not configured.")

    try:
        # 1. Gather Data
        history_raw = await db.get_price_history(request.url, request.user_id)
        
        if len(history_raw) < predictor.MIN_HISTORY:
            raise HTTPException(status_code=400, detail=f"Insufficient price history for prediction. Need at least {predictor.MIN_HISTORY} data points.")
        # Use your existing predictor functions
        insights = predictor.get_price_insights(history_raw)
        prediction = predictor.predict_prices(history_raw)

        # 2. Construct the Prompt for the AI
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

# 3. Call the Groq AI
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile", 
        )
        
        return {"advice": chat_completion.choices[0].message.content}

    except Exception as e:
        print(f"Error in AI advice endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
