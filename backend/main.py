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
from typing import Optional
import cloudinary
import cloudinary.uploader
import cloudinary.api
import base64
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, HTTPException, Query, Path
from typing import Optional
from bson.objectid import ObjectId
from pydantic import BaseModel


load_dotenv()

API_KEY = os.getenv("API_KEY")
API_URL = os.getenv("API_URL")
HF_API = os.getenv("HF_API")

MONGODB_URI = os.getenv("MONGODB_URI")
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client['Cluster0']  # database name
products_collection = db["products"]

products_collection.create_index([("location", GEOSPHERE)])

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
    limit: int = 20
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
        ).limit(limit))
        
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
    skip: int = 0, 
    limit: int = 20, 
    category: Optional[str] = None,
    search: Optional[str] = None
):
    try:
        query = {}
        
        # Filter by category if provided
        if category:
            query["categories"] = category
            
        # Text search if provided
        if search:
            # If you need full-text search, create a text index first:
            # products_collection.create_index([("name", "text"), ("description", "text")])
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
            
        # Get products
        products = list(products_collection.find(query).sort("created_at", -1).skip(skip).limit(limit))
        
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
@app.get("/products/recommended/{user_id}")
async def get_recommended_products(
    user_id: str,
    limit: int = Query(10, ge=1, le=50)
):
    """Get personalized product recommendations for a user"""
    try:
        # 1. Get user's view history
        user_views = list(db["product_views"].find(
            {"user_id": user_id},
            {"product_id": 1}
        ).sort("timestamp", -1).limit(10))
        
        product_ids = [view["product_id"] for view in user_views]
        
        if not product_ids:
            # If no view history, return popular products
            return await get_popular_products(limit)
        
        # 2. Find products the user has viewed
        viewed_products = list(products_collection.find(
            {"id": {"$in": product_ids}},
            {"name": 1, "description": 1, "categories": 1}
        ))
        
        # 3. Generate a combined query vector based on viewed products
        combined_text = " ".join([
            f"{p.get('name', '')} {p.get('description', '')} {' '.join(p.get('categories', []))}"
            for p in viewed_products
        ])
        
        query_vector = model.encode(combined_text).tolist()
        
        # 4. Query Pinecone for similar products
        pinecone_result = index.query(
            vector=query_vector,
            top_k=limit * 2,  # Get more than needed to filter
            include_values=False,
            include_metadata=True,
            filter={"product_id": {"$nin": product_ids}}  # Exclude already viewed products
        )
        
        if not pinecone_result or 'matches' not in pinecone_result:
            # Fallback to popular products if no matches
            return await get_popular_products(limit)
        
        # 5. Get full product details for recommendations
        rec_product_ids = [
            match["metadata"].get("product_id") 
            for match in pinecone_result["matches"]
            if "product_id" in match.get("metadata", {})
        ]
        
        recommended_products = list(products_collection.find(
            {"id": {"$in": rec_product_ids}}
        ).limit(limit))
        
        # Convert ObjectId to string
        for product in recommended_products:
            if "_id" in product:
                product["_id"] = str(product["_id"])
                
        return recommended_products[:limit]  # Limit results
        
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



if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
