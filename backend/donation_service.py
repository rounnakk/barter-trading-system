from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from typing import List, Optional
from datetime import datetime
import uuid
import json
import cloudinary
import cloudinary.uploader
from pymongo import GEOSPHERE

import time
from requests.exceptions import RequestException, ConnectionError

# Create router for donation endpoints
router = APIRouter(
    prefix="/donations",
    tags=["donations"]
)

# This will be set in main.py when importing this module
donated_products_collection = None

# Set up the collection (called from main.py)
def setup_collection(db):
    global donated_products_collection
    donated_products_collection = db["donated_products"]
    
    # Create indexes
    donated_products_collection.create_index([("is_available", 1)])
    donated_products_collection.create_index([("categories", 1)])
    donated_products_collection.create_index([("donor.id", 1)])
    
    try:
        donated_products_collection.create_index([("location", GEOSPHERE)])
    except Exception as e:
        print(f"Warning: Could not create geospatial index: {str(e)}")

# Helper function to upload images to Cloudinary
async def upload_to_cloudinary(file: UploadFile, product_id: str, index: int, max_retries=3):
    retries = 0
    while retries < max_retries:
        try:
            contents = await file.read()
            
            # Create a unique public_id
            public_id = f"barter_trade/donations/{product_id}_{index}"
            
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                contents,
                public_id=public_id,
                folder="donations",
                resource_type="auto",
                timeout=30  # Increase timeout
            )
            
            # Reset file pointer
            await file.seek(0)
            
            return {
                "url": upload_result["secure_url"],
                "public_id": upload_result["public_id"],
                "format": upload_result["format"],
                "width": upload_result["width"],
                "height": upload_result["height"]
            }
        except (ConnectionError, RequestException) as e:
            retries += 1
            print(f"Connection error on attempt {retries}: {str(e)}")
            if retries >= max_retries:
                raise HTTPException(status_code=500, detail=f"Image upload failed after {max_retries} attempts: Connection error")
            # Wait before retrying
            time.sleep(2)
        except Exception as e:
            print(f"Error uploading to Cloudinary: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

# Create a new donation
@router.post("/create")
async def create_donation(
    file1: UploadFile = File(...),
    file2: Optional[UploadFile] = File(None),
    file3: Optional[UploadFile] = File(None),
    productName: str = Form(...),
    productDescription: str = Form(...),
    categories: str = Form(...),
    condition: str = Form("good"),
    userId: str = Form(...),
    userName: str = Form(...),
    userEmail: str = Form(...),
    userAvatar: str = Form(""),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
):
    """Create a new donation"""
    try:
        # Generate a unique ID
        product_id = str(uuid.uuid4())
        
        # Process images
        image_urls = []
        image_details = []
        files = [file1]
        
        if file2 and file2.filename:
            files.append(file2)
        if file3 and file3.filename:
            files.append(file3)
        
        # Upload each image to Cloudinary
        for i, file in enumerate(files):
            if file and file.filename:
                cloudinary_result = await upload_to_cloudinary(file, product_id, i+1)
                image_urls.append(cloudinary_result["url"])
                image_details.append(cloudinary_result)
        
        # Parse categories
        try:
            parsed_categories = json.loads(categories)
        except:
            parsed_categories = [categories]
        
        # Parse location
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
        
        # Create donation document
        donation = {
            "id": product_id,
            "name": productName,
            "description": productDescription,
            "categories": parsed_categories,
            "condition": condition,
            "images": image_urls,
            "image_details": image_details,
            "is_available": True,   # Initially available
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            # Donor information
            "donor": {
                "id": userId,
                "name": userName,
                "email": userEmail,
                "avatar": userAvatar
            },
            # Location
            "location": location,
            # Initially no claimer
            "claim": None
        }
        
        # Insert into MongoDB
        result = donated_products_collection.insert_one(donation)
        
        # Return success response
        return {
            "success": True,
            "message": "Donation created successfully",
            "product_id": product_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating donation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create donation: {str(e)}")

# Get all donations with optional filtering
@router.get("/")
async def get_donations(
    category: Optional[str] = None,
    available_only: bool = True,
    skip: int = 0,
    limit: int = 20
):
    """Get all donations with optional filtering"""
    try:
        # Build query
        query = {}
        
        if available_only:
            query["is_available"] = True
        
        if category and category.lower() != "all":
            query["categories"] = category
        
        # Get donations from database
        donations = list(donated_products_collection.find(query)
                         .sort("created_at", -1)
                         .skip(skip)
                         .limit(limit))
        
        # Convert ObjectId to string
        for donation in donations:
            if "_id" in donation:
                donation["_id"] = str(donation["_id"])
                
        return donations
        
    except Exception as e:
        print(f"Error fetching donations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch donations: {str(e)}")

# Get a specific donation
@router.get("/{donation_id}")
async def get_donation(donation_id: str):
    """Get a specific donation by ID"""
    try:
        donation = donated_products_collection.find_one({"id": donation_id})
        
        if not donation:
            raise HTTPException(status_code=404, detail="Donation not found")
            
        # Convert ObjectId to string
        if "_id" in donation:
            donation["_id"] = str(donation["_id"])
            
        return donation
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching donation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch donation: {str(e)}")

# Claim a donation
@router.post("/{donation_id}/claim")
async def claim_donation(
    donation_id: str,
    userId: str = Form(...),
    userName: str = Form(...),
    userEmail: str = Form(...),
    userAvatar: str = Form("")
):
    """Claim a donation"""
    try:
        # Find the donation
        donation = donated_products_collection.find_one({"id": donation_id})
        
        if not donation:
            raise HTTPException(status_code=404, detail="Donation not found")
            
        # Check if already claimed
        if not donation.get("is_available", False):
            raise HTTPException(status_code=400, detail="This donation has already been claimed")
            
        # Update the donation
        donated_products_collection.update_one(
            {"id": donation_id},
            {
                "$set": {
                    "is_available": False,
                    "updated_at": datetime.utcnow(),
                    "claim": {
                        "claimed_at": datetime.utcnow(),
                        "claimed_by": {
                            "id": userId,
                            "name": userName,
                            "email": userEmail,
                            "avatar": userAvatar
                        }
                    }
                }
            }
        )
        
        return {
            "success": True,
            "message": "Donation claimed successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error claiming donation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to claim donation: {str(e)}")