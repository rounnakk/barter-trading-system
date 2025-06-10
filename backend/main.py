import uuid
from fastapi import FastAPI, Request, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import Dict
from pinecone import Pinecone
from dotenv import load_dotenv
import os
import requests
import shutil
from PIL import Image
import io
from pymongo import MongoClient, GEOSPHERE
from datetime import datetime
import json
from typing import Optional, List
import cloudinary
import cloudinary.uploader
import cloudinary.api
import base64
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, HTTPException, Query, Path
from typing import Optional
from bson.objectid import ObjectId
from pydantic import BaseModel
from fastapi import Body, Depends
from pydantic import BaseModel, Field, EmailStr
import donation_service
from fastapi.responses import StreamingResponse
import asyncio
import json


load_dotenv()

API_KEY = os.getenv("API_KEY")
API_URL = os.getenv("API_URL")
HF_API = os.getenv("HF_API")

MONGODB_URI = os.getenv("MONGODB_URI")
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client['Cluster0']  # database name

products_collection = db["products"]
users_collection = db["users"]

# Initialize chat collections
chat_rooms_collection = db["chat_rooms"]
messages_collection = db["messages"]

users_collection.create_index([("id", 1)], unique=True)

# Create indexes for chat collections
chat_rooms_collection.create_index([("product_id", 1), ("buyer_id", 1), ("seller_id", 1)], unique=True)
messages_collection.create_index([("chat_room_id", 1), ("created_at", 1)])
chat_rooms_collection.create_index([("buyer_id", 1)])
chat_rooms_collection.create_index([("seller_id", 1)])


products_collection.create_index([("location", GEOSPHERE)])

sse_connections = {}


class UserCreate(BaseModel):
    id: str
    email: str
    name: str
    avatar: Optional[str] = ""
    created_at: Optional[str] = None
    
class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

class ChatRoomCreate(BaseModel):
    product_id: str
    buyer_id: str
    seller_id: str

class MessageCreate(BaseModel):
    chat_room_id: str
    sender_id: str
    message: str


cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)


# Initialize Pinecone with API key from environment variable
pc = Pinecone(api_key=API_KEY)

index_name = "products-test"
index = pc.Index(index_name)

app = FastAPI()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import donation_service after initializing the app and database
import donation_service

# Initialize donation_service module with your database
donation_service.setup_collection(db)

# Include the donation_service router in your app
app.include_router(donation_service.router)

model = SentenceTransformer('all-MiniLM-L6-v2')

class ProdutData(BaseModel):
    productName: str
    productDescription: str
    productPrice: str

@app.post("/insert")
async def insert(data: ProdutData):
    productName = data.productName
    productDescription = data.productDescription
    productPrice = data.productPrice

    metadata = {
        "productName": productName,
        "productDescription": productDescription,
        "productPrice": productPrice
    }

    # Generate a unique ID (consider using a database ID or UUID)
    id = str(uuid.uuid4())

    combined_string = f"{productName} {productDescription} {productPrice}"
    vector = model.encode(combined_string)

    query_vector = model.encode(combined_string).tolist()

    results = index.query(
        vector=query_vector,
        top_k=5,
        include_values=False,
        include_metadata=True
    )

    index.upsert(vectors = [{
        "id" : id,
        "values" : vector,
        "metadata" : metadata
    }])

    product_data = [
        result['metadata']
        for result in results['matches']  
    ]

    print(product_data)

    return product_data


# Add this endpoint to your main.py
@app.post("/upload_product")
async def upload_product(
    file1: UploadFile = File(...),
    file2: UploadFile = File(None),
    file3: UploadFile = File(None),
    productName: str = Form(...),
    productDescription: str = Form(...),
    productPrice: str = Form(...),
    categories: str = Form(...),
    # User information parameters
    userId: str = Form(None),
    userEmail: str = Form(None),
    userName: str = Form(None),
    userAvatar: str = Form(""),
    # Location parameters
    latitude: str = Form(None),
    longitude: str = Form(None),
    address: str = Form(None)
):
    try:
        # Generate a unique ID for this product
        product_id = str(uuid.uuid4())
        
        # Process all files
        image_categories = []
        image_urls = []
        image_details = []
        files = [file1]
        
        if file2 and file2.filename:
            files.append(file2)
        
        if file3 and file3.filename:
            files.append(file3)
            
        for i, file in enumerate(files):
            if file and file.filename:
                # Upload to Cloudinary
                cloudinary_result = await upload_to_cloudinary(file, product_id, i+1)
                image_url = cloudinary_result["url"]
                image_urls.append(image_url)
                image_details.append(cloudinary_result)
                
                # Process image with HuggingFace API for category prediction
                try:
                    await file.seek(0)  # Reset file pointer
                    image_data = await file.read()
                    response = requests.post(
                        VISION_API_URL,
                        headers={"Authorization": f"Bearer {HF_API}"},
                        data=image_data
                    )
                    if response.status_code == 200:
                        for item in response.json():
                            category = item['label']
                            image_categories.append(category)
                except Exception as img_error:
                    print(f"Error processing image: {str(img_error)}")
                    # Continue with other files if one fails
        
        # Parse the categories JSON string
        try:
            parsed_categories = json.loads(categories)
        except:
            try:
                parsed_categories = eval(categories)
            except:
                parsed_categories = []
        
        # Create product metadata for Pinecone
        metadata = {
            "productName": productName,
            "productDescription": productDescription,
            "productPrice": productPrice,
            "categories": parsed_categories,
            "image_categories": image_categories,
            "product_id": product_id,
            "image_urls": image_urls  # Add image URLs to metadata
        }

        # Generate embeddings and store in Pinecone
        combined_string = f"{productName} {productDescription} {' '.join(parsed_categories)}"
        vector = model.encode(combined_string).tolist()

        # Upsert to Pinecone
        index.upsert(vectors=[{
            "id": product_id,
            "values": vector,
            "metadata": metadata
        }])

        # Parse location data
        location = None
        if latitude and longitude:
            try:
                lat_float = float(latitude)
                lng_float = float(longitude)
                location = {
                    "type": "Point",
                    "coordinates": [lng_float, lat_float]  # GeoJSON format is [longitude, latitude]
                }
            except ValueError:
                location = None

        # Parse price to float
        try:
            price_float = float(productPrice)
        except ValueError:
            price_float = 0.0

        # Create MongoDB document
        mongo_product = {
            "id": product_id,
            "name": productName,
            "description": productDescription,
            "price": price_float,
            "categories": parsed_categories,
            "images": image_urls,
            "image_details": image_details,  # Store full image details
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            # User information
            "user": {
                "id": userId,
                "email": userEmail,
                "name": userName,
                "avatar": userAvatar
            },
            # Location information
            "location": location,
            "address": address,
            # Store image analysis for future use
            "image_categories": image_categories
        }
        
        # Insert into MongoDB
        products_collection.insert_one(mongo_product)
        
        return {
            "message": "Product uploaded successfully", 
            "product_id": product_id, 
            "metadata": metadata,
            "mongo_id": str(mongo_product.get("_id", "")),
            "images": image_urls
        }

    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/products/nearby")
async def get_nearby_products(
    latitude: float,
    longitude: float,
    max_distance: int = 50000,  # 50 km default radius
    limit: int = 1000  # Increase default limit to 1000
):
    try:
        # Find products near the given coordinates
        nearby_products = list(products_collection.find(
            {
                "location": {
                    "$near": {
                        "$geometry": {
                            "type": "Point",
                            "coordinates": [longitude, latitude]
                        },
                        "$maxDistance": max_distance  # in meters
                    }
                }
            }
        ))  # Removed the limit parameter
        
        # Convert ObjectId to string for JSON serialization
        for product in nearby_products:
            if "_id" in product:
                product["_id"] = str(product["_id"])
        
        return nearby_products
    
    except Exception as e:
        print(f"Error fetching nearby products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching nearby products: {str(e)}")
    
@app.get("/products")
async def get_products(
    skip: int = Query(0, ge=0), 
    limit: int = Query(1000, ge=1),  # Increase default limit to 1000
    category: Optional[str] = None,
    search: Optional[str] = None
):
    try:
        query = {}
        
        # Add debugging
        print(f"Category filter: {category}")
        print(f"Search term: {search}")

        if search:
            # Create a search pattern that's more flexible
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},  # Case-insensitive name search
                {"description": {"$regex": search, "$options": "i"}},  # Search in description
                {"categories": {"$regex": search, "$options": "i"}}  # Search in categories
            ]
        
        # Filter by category if provided and not 'All'
        if category and category.lower() != 'all':
            # Check if the category field exists
            query["categories"] = {"$regex": category, "$options": "i"}
            
        # Text search if provided
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        print(f"MongoDB query: {query}")
            
        # Get products - removed the limit parameter to get all products
        products = list(products_collection.find(query).sort("created_at", -1).skip(skip))
        print(f"Found {len(products)} products matching query")
        
        # Convert ObjectId to string for JSON serialization
        for product in products:
            if "_id" in product:
                product["_id"] = str(product["_id"])
        
        return products
    
    except Exception as e:
        print(f"Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")

# Add API endpoints
VISION_API_URL = "https://api-inference.huggingface.co/models/google/vit-base-patch16-224"
TEXT_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"

CATEGORY_MAPPING = {
    'electronics': ['laptop', 'mobile', 'camera', 'headphones', 'television', 'watch', 'earphones', 'tablet', 'smartwatch', 'speaker', 'microphone', 'radio', 'projector', 'drone', 'smartphone'],
    'furniture': ['chair', 'table', 'sofa', 'bed', 'desk', 'cabinet', 'shelf', 'couch', 'stool', 'dresser'],
    'clothing': ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'skirt', 'sweater', 'jeans', 't-shirt', 'shorts'],
    'books': ['textbook', 'novel', 'magazine', 'comic', 'manual', 'guide', 'encyclopedia', 'biography', 'journal', 'anthology'],
    'automobile': ['car', 'bike', 'scooter', 'motorcycle', 'truck', 'van', 'bus', 'bicycle', 'trailer', 'moped'],
    'sports': ['football', 'cricket', 'tennis', 'basketball', 'baseball', 'hockey', 'golf', 'volleyball', 'badminton', 'rugby'],
    'other': ['other']
}

@app.post("/predict_categories")
async def predict_categories(
    file1: UploadFile = File(None),
    file2: UploadFile = File(None),
    file3: UploadFile = File(None),
    productName: str = Form(...),
    productDescription: str = Form(...)
):
    try:
        categories = set()
        headers = {"Authorization": f"Bearer {HF_API}"}

        # Process images
        for file in [file1, file2, file3]:
            if file is None:
                continue
                
            # Read image
            contents = await file.read()
            
            # Send image to Hugging Face API
            response = requests.post(
                VISION_API_URL,
                headers=headers,
                data=contents
            )
            
            if response.status_code == 200:
                predictions = response.json()
                print("Predictions:", predictions)
                # Extract predicted labels
                for prediction in predictions:
                    label = prediction['label'].lower()
                    # Map prediction to category
                    for category, items in CATEGORY_MAPPING.items():
                        if any(item in label for item in items):
                            categories.add(category)
            print("Categories:", categories)

        # Process text (product name and description)
        text_payload = {
            "inputs": f"{productName} {productDescription}",
            "parameters": {
                "candidate_labels": list(CATEGORY_MAPPING.keys())
            }
        }
        
        response = requests.post(
            TEXT_API_URL,
            headers=headers,
            json=text_payload
        )
        
        if response.status_code == 200:
            text_predictions = response.json()
            print("Text Predictions:", text_predictions)
            # Add top 2 predicted categories from text
            scores = text_predictions['scores']
            labels = text_predictions['labels']
            top_categories = [labels[i] for i in range(min(1, len(scores)))]
            categories.update(top_categories)
        print("Categories:", categories)
        
        # Add default categories if none were predicted
        if not categories:
            categories = {"electronics", "furniture", "clothing"}
        
        return {"categories": list(categories)}
        
    except Exception as e:
        print(f"Error processing data: {str(e)}")
        return {"categories": ["electronics", "furniture", "clothing"]}





async def upload_to_cloudinary(file: UploadFile, product_id: str, index: int) -> dict:
    """
    Uploads an image to Cloudinary and returns the image details
    """
    try:
        # Read file content
        contents = await file.read()
        
        # Create a unique public_id based on product and image index
        public_id = f"barter_trade/{product_id}_{index}"
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            contents,
            public_id=public_id,
            folder="barter_trade_products",
            resource_type="auto",
            overwrite=True
        )
        
        # Reset file pointer for potential future reads
        await file.seek(0)
        
        return {
            "url": upload_result["secure_url"],
            "public_id": upload_result["public_id"],
            "format": upload_result["format"],
            "width": upload_result["width"],
            "height": upload_result["height"],
            "resource_type": upload_result["resource_type"]
        }
    except Exception as e:
        print(f"Error uploading to Cloudinary: {str(e)}")
        # Return a placeholder if upload fails
        return {
            "url": f"https://res.cloudinary.com/demo/image/upload/v1/placeholder.jpg",
            "public_id": "",
            "format": "jpg",
            "width": 300,
            "height": 300,
            "resource_type": "image",
            "error": str(e)
        }


@app.get("/products/{product_id}")
async def get_product(product_id: str = Path(..., description="The ID of the product to retrieve")):
    """
    Get a specific product by its ID
    
    This endpoint returns detailed information about a product, including:
    - Basic product information (name, description, price)
    - Images and categories
    - Seller information
    - Location data
    """
    try:
        # Try to find the product in MongoDB by ID
        product = products_collection.find_one({"id": product_id})
        
        # If the product is not found
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Convert MongoDB ObjectId to string for JSON serialization
        if "_id" in product:
            product["_id"] = str(product["_id"])
        
        # Enhance the response with vector similarity if available
        try:
            # Query Pinecone for similar products based on this product's vector
            combined_string = f"{product['name']} {product['description']}"
            query_vector = model.encode(combined_string).tolist()
            
            pinecone_result = index.query(
                vector=query_vector,
                top_k=5,
                include_values=False,
                include_metadata=True,
                filter={"product_id": {"$ne": product_id}}  # Exclude the current product
            )
            
            # Add similar products to the response if found
            if pinecone_result and 'matches' in pinecone_result:
                product["similar_products"] = [
                    match["metadata"] for match in pinecone_result["matches"]
                ]
        except Exception as vector_error:
            # Don't fail the entire request if vector similarity fails
            print(f"Error getting vector similarity: {str(vector_error)}")
            product["similar_products"] = []
        
        # If the product has location data, ensure proper GeoJSON format
        if "location" in product and product["location"]:
            if isinstance(product["location"], dict) and "coordinates" in product["location"]:
                # Extract just what we need for the frontend for security and privacy
                product["location"] = {
                    "type": product["location"]["type"],
                    "coordinates": product["location"]["coordinates"]
                }
            else:
                # Remove malformed location data
                product["location"] = None
        
        # Clean up user data to remove sensitive information
        if "user" in product and product["user"]:
            # Ensure we're only sending what's needed
            product["user"] = {
                "id": product["user"].get("id", ""),
                "name": product["user"].get("name", "Unknown"),
                "avatar": product["user"].get("avatar", ""),
                # Remove email for privacy unless you specifically need it
            }
        
        return product
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"Error fetching product details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Add this endpoint to handle view counting and product analytics
@app.post("/products/{product_id}/view")
async def record_product_view(
    product_id: str = Path(...),
    user_id: Optional[str] = Query(None)
):
    """Record a product view for analytics"""
    try:
        # Create view record
        view_data = {
            "product_id": product_id,
            "timestamp": datetime.utcnow(),
            "user_id": user_id,  # Could be None for anonymous views
        }
        
        # Insert into a views collection
        db["product_views"].insert_one(view_data)
        
        # Increment view count on the product
        products_collection.update_one(
            {"id": product_id},
            {"$inc": {"view_count": 1}}
        )
        
        return {"success": True}
    except Exception as e:
        print(f"Error recording product view: {str(e)}")
        # Don't fail the request if analytics fails
        return {"success": False, "error": str(e)}

# Add an endpoint to fetch recommended products for a user
# Replace the existing get_recommended_products function with this improved version

@app.get("/products/recommended/{user_id}")
async def get_recommended_products(
    user_id: str,
    productId: str = None,
    price: float = None,
    lat: float = None, 
    lng: float = None,
    category: str = None,
    limit: int = Query(10, ge=1, le=50)
):
    """Get personalized product recommendations for a user based on price, location, and category"""
    try:
        # Check if user has uploaded products
        user_products = list(products_collection.find({"user.id": user_id}))
        has_uploads = len(user_products) > 0
        
        # User hasn't uploaded any products - use generic recommendations
        if not has_uploads:
            # Build a query based on current product attributes
            query = {}
            
            if productId:
                query["id"] = {"$ne": productId}  # Exclude current product
                
            if user_id:
                query["user.id"] = {"$ne": user_id}  # Exclude user's own products
                
            # 1. Price-based matching (if price provided)
            if price is not None:
                # Find products within ±20% of current price
                price_min = price * 0.8
                price_max = price * 1.2
                query["price"] = {"$gte": price_min, "$lte": price_max}
                
            # 2. Category-based filtering (if category provided)
            if category:
                query["categories"] = {"$regex": category, "$options": "i"}
                
            # Get similar products with price and category matching
            matched_products = list(products_collection.find(query).sort("created_at", -1).limit(limit))
            
            # Add match reason to products
            for product in matched_products:
                product["match_reasons"] = []
                
                # Add price match reason if within range
                if price is not None and price_min <= product["price"] <= price_max:
                    product["match_reasons"].append("Similar price")
                    
                # Add category match reason
                if category and any(cat.lower() == category.lower() for cat in product.get("categories", [])):
                    product["match_reasons"].append("Similar category")
                
                # Convert ObjectId to string
                if "_id" in product:
                    product["_id"] = str(product["_id"])
                    
            # If not enough products found, add popular products
            if len(matched_products) < limit:
                # Get popular products excluding already recommended ones
                existing_ids = [p["id"] for p in matched_products]
                popular_query = {"id": {"$nin": existing_ids}}
                
                if productId:
                    popular_query["id"] = {"$ne": productId}
                    
                if user_id:
                    popular_query["user.id"] = {"$ne": user_id}
                    
                popular_products = list(
                    products_collection.find(popular_query)
                    .sort("view_count", -1)
                    .limit(limit - len(matched_products))
                )
                
                # Convert ObjectId to string
                for product in popular_products:
                    product["match_reasons"] = ["Popular item"]
                    if "_id" in product:
                        product["_id"] = str(product["_id"])
                        
                matched_products.extend(popular_products)
                
            return matched_products
            
        # User has uploaded products - do more sophisticated matching
        else:
            # STEP 1: PRICE MATCHING (highest priority)
            price_matched = []
            price_query = {}
            
            if price is not None:
                # Get average price of user's products to find suitable price range
                user_avg_price = sum(p.get("price", 0) for p in user_products) / len(user_products)
                
                # Adjust matching range based on current product and user's average
                price_min = min(price, user_avg_price) * 0.7
                price_max = max(price, user_avg_price) * 1.3
                
                price_query = {
                    "price": {"$gte": price_min, "$lte": price_max},
                    "user.id": {"$ne": user_id}  # Exclude user's own products
                }
                
                if productId:
                    price_query["id"] = {"$ne": productId}  # Exclude current product
                    
                price_matched = list(products_collection.find(price_query).limit(limit))
                
            # STEP 2: LOCATION MATCHING (second priority)
            location_matched = []
            if lat is not None and lng is not None:
                # Find products near current location
                location_query = {
                    "location": {
                        "$near": {
                            "$geometry": {
                                "type": "Point",
                                "coordinates": [lng, lat]  # GeoJSON format: [longitude, latitude]
                            },
                            "$maxDistance": 10000  # 10km radius
                        }
                    },
                    "user.id": {"$ne": user_id}  # Exclude user's own products
                }
                
                if productId:
                    location_query["id"] = {"$ne": productId}  # Exclude current product
                    
                # Exclude products already included in price matching
                if price_matched:
                    location_query["id"] = {
                        "$nin": [p["id"] for p in price_matched]
                    }
                    
                location_matched = list(products_collection.find(location_query).limit(limit))
                
                # Calculate distance for each product
                for product in location_matched:
                    if product.get("location") and product["location"].get("coordinates"):
                        # Calculate distance in kilometers using Haversine formula
                        from math import sin, cos, sqrt, atan2, radians
                        
                        R = 6371.0  # Earth radius in kilometers
                        
                        lat1 = radians(lat)
                        lon1 = radians(lng)
                        lat2 = radians(product["location"]["coordinates"][1])
                        lon2 = radians(product["location"]["coordinates"][0])
                        
                        dlon = lon2 - lon1
                        dlat = lat2 - lat1
                        
                        a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
                        c = 2 * atan2(sqrt(a), sqrt(1 - a))
                        
                        distance = R * c
                        product["distance"] = round(distance, 1)  # kilometers, rounded to 1 decimal
            
            # STEP 3: CATEGORY MATCHING (third priority)
            category_matched = []
            if category or (user_products and any("categories" in p for p in user_products)):
                # Get all categories from user's products
                user_categories = set()
                for p in user_products:
                    if "categories" in p and p["categories"]:
                        user_categories.update(p["categories"])
                        
                # Add current product category if provided
                if category:
                    user_categories.add(category)
                
                if user_categories:
                    category_query = {
                        "categories": {"$in": list(user_categories)},
                        "user.id": {"$ne": user_id}  # Exclude user's own products
                    }
                    
                    if productId:
                        category_query["id"] = {"$ne": productId}  # Exclude current product
                        
                    # Exclude products already included in other matching methods
                    excluded_ids = [p["id"] for p in price_matched + location_matched]
                    if excluded_ids:
                        category_query["id"] = {"$nin": excluded_ids}
                        
                    category_matched = list(products_collection.find(category_query).limit(limit))
            
            # Combine all matched products with priority (price > location > category)
            all_matches = []
            
            # Add price matched products with tag
            for p in price_matched:
                p["match_reasons"] = ["Similar price"]
                if "_id" in p:
                    p["_id"] = str(p["_id"])
                all_matches.append(p)
                
            # Add location matched products with tag
            for p in location_matched:
                distance_str = f"Nearby ({p.get('distance', '?')}km)"
                p["match_reasons"] = [distance_str]
                if "_id" in p:
                    p["_id"] = str(p["_id"])
                all_matches.append(p)
                
            # Add category matched products with tag
            for p in category_matched:
                p["match_reasons"] = ["Similar category"]
                if "_id" in p:
                    p["_id"] = str(p["_id"])
                all_matches.append(p)
            
            # If we still don't have enough products, add popular products
            if len(all_matches) < limit:
                # Get popular products excluding already recommended ones
                existing_ids = [p["id"] for p in all_matches]
                popular_query = {"id": {"$nin": existing_ids}}
                
                if productId:
                    popular_query["id"] = {"$ne": productId}
                    
                if user_id:
                    popular_query["user.id"] = {"$ne": user_id}
                    
                popular_products = list(
                    products_collection.find(popular_query)
                    .sort("view_count", -1)
                    .limit(limit - len(all_matches))
                )
                
                # Convert ObjectId to string
                for p in popular_products:
                    p["match_reasons"] = ["Popular item"]
                    if "_id" in p:
                        p["_id"] = str(p["_id"])
                        
                all_matches.extend(popular_products)
                
            return all_matches[:limit]  # Return at most 'limit' products
                
    except Exception as e:
        print(f"Error getting recommendations: {str(e)}")
        # Fallback to popular products
        return await get_popular_products(limit)
    
# Helper function to get popular products
async def get_popular_products(limit: int = 10):
    try:
        # Get products with highest view count
        popular_products = list(products_collection.find().sort("view_count", -1).limit(limit))
        
        # Convert ObjectId to string
        for product in popular_products:
            if "_id" in product:
                product["_id"] = str(product["_id"])
                
        return popular_products
    except Exception as e:
        print(f"Error fetching popular products: {str(e)}")
        # Return empty list as last resort
        return []


@app.post("/users/create")
async def create_user(user: UserCreate):
    """Create a new user in MongoDB based on Supabase auth data"""
    try:
        # Check if user exists first
        existing_user = users_collection.find_one({"id": user.id})
        if existing_user:
            # Update the existing user instead of creating new
            users_collection.update_one(
                {"id": user.id},
                {"$set": {
                    "email": user.email,
                    "name": user.name,
                    "avatar": user.avatar,
                    "updated_at": datetime.utcnow()
                }}
            )
            # Get updated user
            updated_user = users_collection.find_one({"id": user.id})
            if updated_user:
                updated_user["_id"] = str(updated_user["_id"])
            return updated_user
        
        # Initialize user data
        new_user = {
            "id": user.id,
            "email": user.email, 
            "name": user.name,
            "avatar": user.avatar,
            "verified": False,
            "created_at": user.created_at or datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow(),
            "statistics": {
                "total_trades": 0,
                "successful_trades": 0,
                "items_listed": 0
            }
        }
        
        # Insert the user
        result = users_collection.insert_one(new_user)
        
        # Get the created user
        created_user = users_collection.find_one({"_id": result.inserted_id})
        if created_user:
            created_user["_id"] = str(created_user["_id"])
            
        return created_user
        
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@app.get("/users/{user_id}")
async def get_user_profile(user_id: str):
    """Get a user's profile data"""
    try:
        # Find the user in the database
        user = users_collection.find_one({"id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert ObjectId to string for JSON serialization
        if "_id" in user:
            user["_id"] = str(user["_id"])
            
        # Update statistics if needed
        user = update_user_statistics(user)
            
        # Remove sensitive fields
        if "password" in user:
            del user["password"]
        if "token" in user:
            del user["token"]
            
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching user profile: {str(e)}")

def update_user_statistics(user):
    """Update user statistics based on their activity"""
    try:
        user_id = user["id"]
        
        # Count user's products
        products_count = products_collection.count_documents({"user.id": user_id})
        
        # Add calculated statistics
        user["statistics"] = {
            "items_listed": products_count,
            "total_trades": user.get("statistics", {}).get("total_trades", 0),
            "successful_trades": user.get("statistics", {}).get("successful_trades", 0)
        }
        
        # Save updated statistics back to database
        users_collection.update_one(
            {"id": user_id},
            {"$set": {"statistics": user["statistics"]}}
        )
        
        return user
    except Exception as e:
        print(f"Error updating user statistics: {str(e)}")
        return user  # Return the original user if we can't update stats

@app.get("/users/{user_id}/products")
async def get_user_products(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get products listed by a user"""
    try:
        products = list(products_collection.find(
            {"user.id": user_id}
        ).sort("created_at", -1).skip(skip).limit(limit))
        
        # Convert ObjectId to string
        for product in products:
            if "_id" in product:
                product["_id"] = str(product["_id"])
                
        return products
        
    except Exception as e:
        print(f"Error fetching user products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching user products: {str(e)}")

@app.get("/users/{user_id}/trades")
async def get_user_trades(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50)
):
    """Get a user's trade history"""
    try:
        # For now, return an empty array as trades might not be implemented yet
        return []
        
    except Exception as e:
        print(f"Error fetching user trades: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching user trades: {str(e)}")

@app.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate):
    """Update user profile information"""
    try:
        # Check if the user exists
        existing_user = users_collection.find_one({"id": user_id})
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create update object with only non-None fields
        update_fields = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_fields:
            return {"message": "No fields to update"}
        
        # Add updated_at timestamp
        update_fields["updated_at"] = datetime.utcnow()
        
        # Update the user
        users_collection.update_one(
            {"id": user_id},
            {"$set": update_fields}
        )
        
        # Get and return the updated user
        updated_user = users_collection.find_one({"id": user_id})
        if updated_user:
            updated_user["_id"] = str(updated_user["_id"])
        
        return updated_user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")


# In your main FastAPI application code, after database initialization
# Set up the donation collection
donation_service.setup_collection(db)

# Include the donation router
app.include_router(donation_service.router)



@app.post("/chat/rooms")
async def create_chat_room(room_data: ChatRoomCreate):
    """Create a new chat room or return existing one"""
    try:
        # Check if room already exists
        existing_room = chat_rooms_collection.find_one({
            "product_id": room_data.product_id,
            "buyer_id": room_data.buyer_id,
            "seller_id": room_data.seller_id
        })
        
        if existing_room:
            existing_room["_id"] = str(existing_room["_id"])
            return existing_room
        
        # Get product details
        product = products_collection.find_one({"id": room_data.product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        # Get buyer details
        buyer = users_collection.find_one({"id": room_data.buyer_id})
        if not buyer:
            raise HTTPException(status_code=404, detail="Buyer not found")
            
        # Get seller details
        seller = users_collection.find_one({"id": room_data.seller_id})
        if not seller:
            raise HTTPException(status_code=404, detail="Seller not found")
        
        # Create new room
        new_room = {
            "id": str(uuid.uuid4()),
            "product_id": room_data.product_id,
            "buyer_id": room_data.buyer_id,
            "seller_id": room_data.seller_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_message": None,
            "last_message_at": None,
            "buyer_read_at": None,
            "seller_read_at": None,
            # Include minimal product and user details
            "product": {
                "id": product["id"],
                "name": product["name"],
                "images": product.get("images", [])
            },
            "buyer": {
                "id": buyer["id"],
                "name": buyer.get("name", "User"),
                "avatar": buyer.get("avatar", "")
            },
            "seller": {
                "id": seller["id"],
                "name": seller.get("name", "User"),
                "avatar": seller.get("avatar", "")
            }
        }
        
        result = chat_rooms_collection.insert_one(new_room)
        new_room["_id"] = str(result.inserted_id)
        
        return new_room
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating chat room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating chat room: {str(e)}")

@app.get("/chat/rooms")
async def get_chat_rooms(user_id: str = Query(...)):
    """Get all chat rooms for a user"""
    try:
        rooms = list(chat_rooms_collection.find({
            "$or": [
                {"buyer_id": user_id},
                {"seller_id": user_id}
            ]
        }).sort("updated_at", -1))
        
        # Convert ObjectId to string
        for room in rooms:
            if "_id" in room:
                room["_id"] = str(room["_id"])
                
        return rooms
        
    except Exception as e:
        print(f"Error fetching chat rooms: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching chat rooms: {str(e)}")

@app.get("/chat/rooms/{room_id}")
async def get_chat_room(room_id: str):
    """Get a specific chat room by ID"""
    try:
        room = chat_rooms_collection.find_one({"id": room_id})
        
        if not room:
            raise HTTPException(status_code=404, detail="Chat room not found")
            
        room["_id"] = str(room["_id"])
        return room
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching chat room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching chat room: {str(e)}")


async def sse_generator(user_id: str):
    """Generate SSE events for a user"""
    connection_id = str(uuid.uuid4())
    queue = asyncio.Queue()
    sse_connections[connection_id] = {"user_id": user_id, "queue": queue}
    
    try:
        # Send initial connection message
        yield f"data: {json.dumps({'type': 'connected'})}\n\n"
        
        # Keep connection alive and send events as they come
        while True:
            try:
                # Wait for new events with a timeout
                event = await asyncio.wait_for(queue.get(), timeout=30)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
    except asyncio.CancelledError:
        # Client disconnected
        pass
    finally:
        # Clean up when connection is closed
        if connection_id in sse_connections:
            del sse_connections[connection_id]

@app.get("/chat/events")
async def chat_events(user_id: str = Query(...)):
    """Subscribe to real-time chat events using SSE"""
    return StreamingResponse(
        sse_generator(user_id),
        media_type="text/event-stream"
    )

# Helper function to notify users of new messages
async def notify_new_message(room_id: str, message: dict):
    """Send notification to all connected clients about a new message"""
    room = chat_rooms_collection.find_one({"id": room_id})
    if not room:
        return
        
    # Get the recipient ID (the user who didn't send the message)
    recipient_id = room["buyer_id"] if message["sender_id"] == room["seller_id"] else room["seller_id"]
    
    # Find all connections for this user
    for conn_id, connection in list(sse_connections.items()):
        if connection["user_id"] == recipient_id:
            # Send the event to this connection
            event = {
                "type": "new_message",
                "room_id": room_id,
                "message": message
            }
            await connection["queue"].put(event)


@app.post("/chat/messages")
async def create_message(message: MessageCreate):
    """Send a new message in a chat room"""
    try:
        # Check if the chat room exists
        room = chat_rooms_collection.find_one({"id": message.chat_room_id})
        if not room:
            raise HTTPException(status_code=404, detail="Chat room not found")
            
        # Create the message
        new_message = {
            "id": str(uuid.uuid4()),
            "chat_room_id": message.chat_room_id,
            "sender_id": message.sender_id,
            "message": message.message,
            "created_at": datetime.utcnow(),
            "is_read": False
        }
        
        result = messages_collection.insert_one(new_message)
        new_message["_id"] = str(result.inserted_id)
        
        # Update the chat room with last message
        chat_rooms_collection.update_one(
            {"id": message.chat_room_id},
            {
                "$set": {
                    "last_message": message.message,
                    "last_message_at": new_message["created_at"],
                    "updated_at": new_message["created_at"]
                }
            }
        )

        asyncio.create_task(notify_new_message(message.chat_room_id, new_message))

        
        return new_message
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

@app.get("/chat/messages/{room_id}")
async def get_messages(
    room_id: str,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[str] = None
):
    """Get messages for a chat room with pagination"""
    try:
        # Build query
        query = {"chat_room_id": room_id}
        
        if before:
            # Convert before to datetime for filtering
            try:
                before_date = datetime.fromisoformat(before.replace("Z", "+00:00"))
                query["created_at"] = {"$lt": before_date}
            except:
                pass
        
        # Get messages
        messages = list(
            messages_collection.find(query)
            .sort("created_at", -1)
            .limit(limit)
        )
        
        # Convert ObjectId to string
        for msg in messages:
            if "_id" in msg:
                msg["_id"] = str(msg["_id"])
                
        # Sort messages in ascending order for client display
        messages.sort(key=lambda x: x["created_at"])
                
        return messages
        
    except Exception as e:
        print(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}")

@app.post("/chat/read/{room_id}")
async def mark_messages_read(room_id: str, user_id: str = Body(...)):
    """Mark all messages in a room as read for a user"""
    try:
        # Get the room
        room = chat_rooms_collection.find_one({"id": room_id})
        if not room:
            raise HTTPException(status_code=404, detail="Chat room not found")
            
        # Determine if user is buyer or seller
        is_buyer = room["buyer_id"] == user_id
        is_seller = room["seller_id"] == user_id
        
        if not is_buyer and not is_seller:
            raise HTTPException(status_code=403, detail="User not authorized for this chat room")
            
        # Update read status based on user role
        read_field = "buyer_read_at" if is_buyer else "seller_read_at"
        now = datetime.utcnow()
        
        # Update the room read timestamp
        chat_rooms_collection.update_one(
            {"id": room_id},
            {"$set": {read_field: now}}
        )
        
        # Mark messages from other user as read
        messages_collection.update_many(
            {
                "chat_room_id": room_id,
                "sender_id": {"$ne": user_id},
                "is_read": False
            },
            {"$set": {"is_read": True}}
        )
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking messages as read: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error marking messages as read: {str(e)}")

@app.get("/chat/unread")
async def get_unread_count(user_id: str = Query(...)):
    """Get the number of unread messages across all chats for a user"""
    try:
        # Get rooms where the user is buyer or seller
        rooms = list(chat_rooms_collection.find({
            "$or": [
                {"buyer_id": user_id},
                {"seller_id": user_id}
            ]
        }))
        
        total_unread = 0
        
        for room in rooms:
            # Check if the user is buyer or seller
            is_buyer = room["buyer_id"] == user_id
            read_field = "buyer_read_at" if is_buyer else "seller_read_at"
            
            # If no read timestamp or it's older than the last message
            last_read = room.get(read_field)
            last_message_at = room.get("last_message_at")
            
            if last_message_at and (not last_read or last_message_at > last_read):
                # Count unread messages
                unread_count = messages_collection.count_documents({
                    "chat_room_id": room["id"],
                    "sender_id": {"$ne": user_id},
                    "created_at": {"$gt": last_read} if last_read else {"$exists": True}
                })
                
                total_unread += unread_count
        
        return {"unread_count": total_unread}
        
    except Exception as e:
        print(f"Error getting unread count: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting unread count: {str(e)}")


# Initialize model and processor globally to avoid reloading (reduces latency)
processor = None
model = None

def load_model():
    global processor, model
    if processor is None or model is None:
        print("Loading model for the first time...")
        processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224', token=HF_API_KEY)
        model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224', token=HF_API_KEY)
        print("Model loaded successfully")
    return processor, model

def classify_from_file(image_path):
    try:
        if not os.path.exists(image_path):
            return None
        image = Image.open(image_path)
        return get_top_prediction(image)
    except Exception as e:
        print(f"Error classifying from file: {str(e)}")
        return None

def get_top_prediction(image):
    try:
        processor, model = load_model()
        inputs = processor(images=image, return_tensors="pt")
        outputs = model(**inputs)
        logits = outputs.logits
        
        # Get only the top prediction
        predicted_class_idx = logits.argmax(-1).item()
        label = model.config.id2label[predicted_class_idx]
        
        return label
    except Exception as e:
        print(f"Error getting prediction: {str(e)}")
        return None

@app.post("/api/search_by_image")
async def search_by_image(file: UploadFile = File(...)):
    try:
        print(f"Received image: {file.filename}, size: {file.size} bytes")
        # Read the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Get classification
        print("Calling get_top_prediction...")
        label = get_top_prediction(image)
        print(f"Prediction result: {label}")
        
        # Return result
        return {"label": label}
    except Exception as e:
        print(f"Error in search_by_image: {str(e)}")
        return {"error": str(e)}



if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)






