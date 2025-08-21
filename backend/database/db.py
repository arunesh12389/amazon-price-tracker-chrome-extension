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
        # Correct way to access environment variables in Python
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

    async def add_tracked_product(self, url: str, name: str, threshold: float, current_price: float, user_id: str = "default") -> str:

        """Add a new product to track."""
        product = {
            'url': url,
            'name': name,
            'threshold': threshold,
            'current_price': current_price,
            'user_id': user_id,  # Add user identification
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

    async def add_alert(self, url: str, price: float, threshold: float, user_id: str = "default") -> None:
        """Record a price alert."""
        alert = {
            'url': url,
            'price': price,
            'threshold': threshold,
            'user_id': user_id,  # Add user identification
            'timestamp': datetime.utcnow(),
            'notified': False
        }
        
        await self.alerts.insert_one(alert)

    async def mark_alert_notified(self, alert_id: str) -> None:
        """Mark an alert as notified."""
        await self.alerts.update_one(
            {'_id': ObjectId(alert_id)},
            {'$set': {'notified': True}}
        )

    async def deactivate_product(self, url: str, user_id: str = "default") -> None:
        """Deactivate a product (stop tracking)."""
        await self.products.update_one(
            {'url': url, 'user_id': user_id},
            {'$set': {'is_active': False}}
        )

    async def get_user_tracked_products(self, user_id: str = "default") -> List[Dict]:
        """Get all tracked products for a specific user with current info."""
        cursor = self.products.find({'user_id': user_id, 'is_active': True})
        products = await cursor.to_list(length=None)
        
        # Get latest price for each product
        for product in products:
            url = product.get('url')
            if url:
                latest_price = await self.get_latest_price(url, user_id)
                product['current_price'] = latest_price
                
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
        """Stop tracking a product by setting is_active to False."""
        result = await self.products.update_one(
            {'url': url, 'user_id': user_id},
            {'$set': {'is_active': False}}
        )
        return result.modified_count > 0

    async def remove_product_completely(self, url: str, user_id: str = "default") -> bool:
        """Completely remove a product and its history."""
        # Remove from products collection
        product_result = await self.products.delete_one({'url': url, 'user_id': user_id})
        
        # Remove from price history
        history_result = await self.price_history.delete_many({'url': url, 'user_id': user_id})
        
        # Remove from alerts
        alert_result = await self.alerts.delete_many({'url': url, 'user_id': user_id})
        
        return product_result.deleted_count > 0

    async def get_user_alerts(self, user_id: str = "default") -> List[Dict]:
        """Get alerts for a user sorted by newest first."""
        cursor = self.alerts.find({ 'user_id': user_id }).sort('timestamp', -1)
        alerts = await cursor.to_list(length=None)
        return self._serialize_documents(alerts)