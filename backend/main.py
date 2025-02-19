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


load_dotenv()

API_KEY = os.getenv("API_KEY")
API_URL = os.getenv("API_URL")
HF_API = os.getenv("HF_API")



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
    file: UploadFile = File(...),
    productName: str = Form(...),
    productDescription: str = Form(...),
    productPrice: str = Form(...)
):
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads"
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
        
        # Save the uploaded file
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process image with HuggingFace API
        with open(file_path, "rb") as f:
            image_data = f.read()
            response = requests.post(
                API_URL,
                headers={"Authorization": f"Bearer {HF_API}"},
                data=image_data
            )
            image_analysis = response.json()
        
        # Create product metadata
        metadata = {
            "productName": productName,
            "productDescription": productDescription,
            "productPrice": productPrice,
            "imageAnalysis": image_analysis
        }

        # Generate embeddings and store in Pinecone
        id = str(uuid.uuid4())
        combined_string = f"{productName} {productDescription} {productPrice}"
        vector = model.encode(combined_string).tolist()

        index.upsert(vectors=[{
            "id": id,
            "values": vector,
            "metadata": metadata
        }])

        return {"message": "Product uploaded successfully", "metadata": metadata}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





# Add API endpoints
VISION_API_URL = "https://api-inference.huggingface.co/models/google/vit-base-patch16-224"
TEXT_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"


CATEGORY_MAPPING = {
    'electronics': ['laptop', 'mobile', 'camera', 'headphones'],
    'furniture': ['chair', 'table', 'sofa', 'bed'],
    'clothing': ['shirt', 'pants', 'dress', 'shoes'],
    'books': ['textbook', 'novel', 'magazine'],
    # Add more categories as needed
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
                # Extract predicted labels
                for prediction in predictions:
                    label = prediction['label'].lower()
                    # Map prediction to category
                    for category, items in CATEGORY_MAPPING.items():
                        if any(item in label for item in items):
                            categories.add(category)

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
            # Add top 2 predicted categories from text
            scores = text_predictions['scores']
            labels = text_predictions['labels']
            top_categories = [labels[i] for i in range(min(2, len(scores)))]
            categories.update(top_categories)
        
        # Add default categories if none were predicted
        if not categories:
            categories = {"electronics", "furniture", "clothing"}
        
        return {"categories": list(categories)}
        
    except Exception as e:
        print(f"Error processing data: {str(e)}")
        return {"categories": ["electronics", "furniture", "clothing"]}












if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
