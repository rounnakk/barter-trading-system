import React, { useState } from 'react';
import './UploadProducts.css'
import { Label } from '../../Components/Label';
import { Input } from '../../Components/Input';
import { HoverBorderGradient } from '../../Components/HoverBorderGradient';
import { MultiStepLoader as Loader } from '../../Components/MultiStepLoader';

const loadingStates = [
  {
    text: "Uploading your product",
  },
  {
    text: "Generating Embeddings",
  },
  {
    text: "Comparing Items",
  },
  {
    text: "Personalising Recommendations",
  }
];


function UploadProducts() {
  const [loading, setLoading] = useState(false);


  const [formData, setFormData] = useState({
    productName: '',
    productDescription: '',
    productPrice: ''
  });

  const [products, setProducts] = useState([]);

  

  // Function to send product data to the backend and update the products state
  function upsert_into_pinecone(productName, productDescription, productPrice) {
    console.log("upsert_into_pinecone called") // Debug log
    fetch("https://bartrade.koyeb.app/insert", {
    // fetch("http://localhost:8000/insert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        productName,
        productDescription,
        productPrice
      })
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("API response:", data); // Debug log

        // Ensure only the latest 5 products are shown
        if (Array.isArray(data)) {
          setProducts((prevProducts) => {
            const newProducts = [...data, ...prevProducts];
            return newProducts.slice(0, 5); // Keep only the latest 5 products
          });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true)
    
    console.log("submit clicked")
    upsert_into_pinecone(formData.productName, formData.productDescription, formData.productPrice);
    setTimeout(()=>{
      setLoading(false)
    }, 4800)
    setFormData({
      productName: '',
      productDescription: '',
      productPrice: ''
    });
  };

  return (
    <div style={{height:'100vh', color:'black'}}>
    <Loader loadingStates={loadingStates} loading={loading} duration={1200} />
    
    <div className='main-container'>




      <h1 id='header1'>Please provide some details about your product.</h1>
      <form onSubmit={handleSubmit}>
        <Label htmlFor="product-name">Product Name:</Label>
        <Input
          type="text"
          id="product-name"
          name="productName"
          value={formData.productName}
          onChange={handleChange}
          required
        />
        <Label htmlFor="product-description">Product Description:</Label>
        <Input
          type="text"
          id="product-description"
          name="productDescription"
          value={formData.productDescription}
          onChange={handleChange}
          required
        />
        <Label htmlFor="product-price">Product Price:</Label>
        <Input
          type="number"
          id="product-price"
          name="productPrice"
          value={formData.productPrice}
          onChange={handleChange}
          required
        />
        <button type="submit" style={{paddingTop: '30px'}} className='submit-button'>
        <HoverBorderGradient type="submit" className=" bg-black text-white  flex items-center space-x-2 ">
        
        <span className='text-1xl font-bold'>Submit</span>
        <img src='./arrow.png' className="invert rotate-[315deg] h-[25px] m-[-3px_-8px_-4px_2px] overflow-hidden p-0"
 alt=''></img>
      </HoverBorderGradient>
      </button>
      </form>

      <div>
        <h2 style={{fontWeight: 500}}>Recommendations</h2>
        <div style={{ marginTop: '50px',display: 'flex', background:'black',justifyContent: 'center', flexWrap:'wrap' }}>
          {products.length > 0 ? (
            products.map((product, index) => (
              <div key={index} style={{ zIndex:40, color: 'white', background:'black', maxWidth:'350px' , border: '1px solid white', padding: '10px', margin: '10px 10px' }}>
                <h3 style={{fontSize: '20px'}}>{product.productName}</h3>
                <p style={{fontSize:'15px', color: '#acacac'}}>{product.productDescription}</p>
                <p style={{color:'#00f400'}}>₹{product.productPrice}</p>
              </div>
            ))
          ) : (
            <p className='waiting' style={{marginBottom:'50px'}}>Waiting for product submission...</p>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default UploadProducts;
