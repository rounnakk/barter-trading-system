import uuid
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import Dict
from pinecone import Pinecone
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("API_KEY")


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



if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
