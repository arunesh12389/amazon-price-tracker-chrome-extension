from unittest import result
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
from bson import ObjectId
import json

load_dotenv()

class Database:
    def __init__(self):
        MONGO_URI = os.getenv('MONGO_URI')        
        if not MONGO_URI:
            raise ValueError("MONGODB_URI not found in environment variables")       
        print(f"Connecting to MongoDB with URI: {MONGO_URI[:18]}...")  # Log first 20 chars for security
        self.client = AsyncIOMotorClient(MONGO_URI)
        self.db = self.client["price_tracker"]
        
        # Verify connection
        try:
            # Ping the server to test connection
            self.client.admin.command('ping')
            print("✅ Successfully connected to MongoDB")
        except Exception as e:
            print("❌ MongoDB connection failed:", str(e))
            raise
        
        # Collections
        self.products = self.db.products
        self.price_history = self.db.price_history
        self.alerts = self.db.alerts
        self.users = self.db.users

    def _serialize_document(self, doc):
        """Convert MongoDB document to JSON-serializable format."""
        if doc is None:
            return None
        
        # Convert ObjectId to string
        if '_id' in doc and isinstance(doc['_id'], ObjectId):
            doc['_id'] = str(doc['_id'])
        
        # Convert datetime objects to ISO string
        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = value.isoformat()
            elif isinstance(value, ObjectId):
                doc[key] = str(value)
        
        return doc

    def _serialize_documents(self, docs):
        """Convert list of MongoDB documents to JSON-serializable format."""
        return [self._serialize_document(doc) for doc in docs]
    
    async def set_user_email(self, user_id: str, email: str) -> None:
        """Saves or updates a user's email address."""
        await self.users.update_one(
            {'user_id': user_id},
            {'$set': {'email': email, 'updated_at': datetime.utcnow()}},
            upsert=True
        )

    # --- NEW FUNCTION TO GET EMAIL ---
    async def get_user_email(self, user_id: str) -> Optional[str]:
        """Retrieves a user's email address."""
        user_data = await self.users.find_one({'user_id': user_id})
        return user_data.get('email') if user_data else None

    async def add_tracked_product(self, url: str, name: str, threshold: float, current_price: float, image_url: Optional[str], user_id: str = "default") -> str:

        """Add a new product to track."""
        product = {
            'url': url,
            'name': name,
            'threshold': threshold,
            'current_price': current_price,
            'image_url': image_url,
            'user_id': user_id, 
            'created_at': datetime.utcnow(),
            'last_checked': datetime.utcnow(),
            'is_active': True
        }
        
        result = await self.products.update_one(
            {'url': url, 'user_id': user_id},  # Unique per user
            {'$set': product},
            upsert=True
        )
        
        return str(result.upserted_id) if result.upserted_id else str(result.modified_count)

    async def update_price(self, url: str, price: float, user_id: str = "default") -> None:
        """Add new price point to history."""
        price_point = {
            'url': url,
            'price': price,
            'user_id': user_id,  # Add user identification
            'timestamp': datetime.utcnow()
        }
        
        await self.price_history.insert_one(price_point)
        await self.products.update_one(
            {'url': url, 'user_id': user_id},
            {'$set': {'last_checked': datetime.utcnow()}}
        )

    async def get_price_history(self, url: str, user_id: str = "default") -> List[Dict]:
        """Get price history for a product."""
        cursor = self.price_history.find(
            {'url': url, 'user_id': user_id},
            {'_id': 0, 'price': 1, 'timestamp': 1}
        ).sort('timestamp', 1)
        
        history = await cursor.to_list(length=None)
        return [{
            'date': item['timestamp'],
            'price': item['price']
        } for item in history]

    async def get_products_to_check(self, user_id: str = None) -> List[Dict]:
        """Get all active products that need price check."""
        query = {'is_active': True}
        if user_id:
            query['user_id'] = user_id
        cursor = self.products.find(query)
        products = await cursor.to_list(length=None)
        return self._serialize_documents(products)

    async def add_alert(self, url: str, price: float, threshold: float, user_id: str = "default", name: Optional[str] = None, image_url: Optional[str] = None) -> None:
        """Record a price alert."""
        if not image_url:
            product = await self.products.find_one({'url': url, 'user_id': user_id})
            if product:
                image_url = product.get('image_url')
        alert = {
            'url': url,
            'price': price,
            'threshold': threshold,
            'user_id': user_id,  
            'name': name,
            'image_url': image_url,
            'timestamp': datetime.utcnow(),
            'notified': False
        }
        existing_alert = await self.alerts.find_one({'url': url, 'user_id': user_id, 'price': price})
        if not existing_alert:
            await self.alerts.insert_one(alert)

    async def mark_alert_notified(self, alert_id: str) -> None:
        """Mark an alert as notified."""
        await self.alerts.update_one(
            {'_id': ObjectId(alert_id)},
            {'$set': {'notified': True}}
        )
 
    async def deactivate_product(self, url: str, user_id: str = "default") -> bool:
        """Deactivate a product (stop tracking)."""
        result = await self.products.update_one(
            {'url': url, 'user_id': user_id},
            {'$set': {'is_active': False}}
        )
        return result.modified_count > 0

    async def get_user_tracked_products(self, user_id: str = "default") -> List[Dict]:
        """Get all tracked products for a specific user with current info."""
        cursor = self.products.find({'user_id': user_id, 'is_active': True})
        products = await cursor.to_list(length=None) 
                
        return self._serialize_documents(products)

    async def get_latest_price(self, url: str, user_id: str = "default") -> Optional[float]:
        """Get the most recent price for a product."""
        cursor = self.price_history.find(
            {'url': url, 'user_id': user_id}
        ).sort('timestamp', -1).limit(1)
        
        latest = await cursor.to_list(length=1)
        return latest[0]['price'] if latest else None

    async def update_product_threshold(self, url: str, new_threshold: float, user_id: str = "default") -> bool:
        """Update the threshold for a tracked product."""
        result = await self.products.update_one(
            {'url': url, 'user_id': user_id},
            {'$set': {'threshold': new_threshold}}
        )
        return result.modified_count > 0

    async def stop_tracking_product(self, url: str, user_id: str = "default") -> bool:
        """Stop tracking a product by setting is_active to False.

        Treat as idempotent: if the product exists but is already inactive,
        consider the operation successful to avoid 404s on repeated requests.
        """
        result = await self.products.update_one(
            {'url': url, 'user_id': user_id},
            {'$set': {'is_active': False}}
        )
        return result.matched_count > 0

    async def remove_product_completely(self, url: str, user_id: str = "default") -> bool:
        """Completely remove a product and its history."""
        # Remove from products collection
        product_result = await self.products.delete_one({'url': url, 'user_id': user_id})
        
        # Remove from price history
        history_result = await self.price_history.delete_many({'url': url, 'user_id': user_id})
        
        # Remove from alerts
        alert_result = await self.alerts.delete_many({'url': url, 'user_id': user_id})
        
        return product_result.deleted_count > 0

    async def remove_alert(self, url: str, user_id: str = "default") -> bool:
        """Remove a single alert for a product & user."""
        result = await self.alerts.delete_one({'url': url, 'user_id': user_id})
        return result.deleted_count > 0
    
    async def remove_alerts_for_product(self, url: str, user_id: str = "default") -> int:
        """Removes all alerts associated with a specific product for a user."""
        result = await self.alerts.delete_many({'url': url, 'user_id': user_id})
        print(f"Removed {result.deleted_count} alerts for product {url}")
        return result.deleted_count

    async def get_user_alerts(self, user_id: str = "default", only_new: bool = False) -> List[Dict]:
        """Get alerts for a user sorted by newest first."""
        query = {'user_id': user_id}
        if only_new:
            query['notified'] = False
        cursor = self.alerts.find(query).sort('timestamp', -1)
        alerts = await cursor.to_list(length=None)
        return self._serialize_documents(alerts)

    async def mark_alerts_notified(self, alert_ids: List[str], user_id: str = "default") -> int:
            """Marks a list of alerts as notified for a user."""
            if not alert_ids:
                return 0
            
            object_ids = [ObjectId(alert_id) for alert_id in alert_ids]
            
            result = await self.alerts.update_many(
                {'_id': {'$in': object_ids}, 'user_id': user_id},
                {'$set': {'notified': True}}
            )
            return result.modified_count

    async def remove_all_alerts_for_user(self, user_id: str = "default") -> int:
        """Remove all alerts for a specific user."""
        result = await self.alerts.delete_many({'user_id': user_id})
        return result.deleted_count

    async def set_user_email(self, user_id: str, email: str) -> None:
        await self.users.update_one(
            { 'user_id': user_id },
            { '$set': { 'user_id': user_id, 'email': email, 'updated_at': datetime.utcnow() } },
            upsert=True
        )

    async def get_user_email(self, user_id: str) -> Optional[str]:
        doc = await self.users.find_one({ 'user_id': user_id })
        return doc.get('email') if doc else None