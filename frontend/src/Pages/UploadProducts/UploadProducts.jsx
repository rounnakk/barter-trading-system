import React, { useState } from 'react';
import './UploadProducts.css'

function UploadProducts() {
  const [formData, setFormData] = useState({
    productName: '',
    productDescription: '',
    productPrice: ''
  });

  const [products, setProducts] = useState([]);

  // Function to send product data to the backend and update the products state
  function upsert_into_pinecone(productName, productDescription, productPrice) {
    fetch("https://bartrade.koyeb.app/insert", {
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

        // Since `data` is an array, you should update the products state by appending the new array
        if (Array.isArray(data)) {
          setProducts((prevProducts) => [...prevProducts, ...data]); // Appending new products
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
    upsert_into_pinecone(formData.productName, formData.productDescription, formData.productPrice);

    setFormData({
      productName: '',
      productDescription: '',
      productPrice: ''
    });
  };

  return (
    <div>
      <h1 id='header1'>Please provide some details about your product.</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="product-name">Product Name:</label>
        <input
          type="text"
          id="product-name"
          name="productName"
          value={formData.productName}
          onChange={handleChange}
          required
        />
        <label htmlFor="product-description">Product Description:</label>
        <input
          type="text"
          id="product-description"
          name="productDescription"
          value={formData.productDescription}
          onChange={handleChange}
          required
        />
        <label htmlFor="product-price">Product Price:</label>
        <input
          type="number"
          id="product-price"
          name="productPrice"
          value={formData.productPrice}
          onChange={handleChange}
          required
        />
        <button type="submit">Submit</button>
      </form>

      <div>
        <h2>Recommendations</h2>
        <div style={{ display: 'flex' }}>
          {products.length > 0 ? (
            products.map((product, index) => (
              <div key={index} style={{ border: '1px solid #000', padding: '10px', margin: '10px 10px' }}>
                <h3>{product.productName}</h3>
                <p>Description: {product.productDescription}</p>
                <p>Price: ₹{product.productPrice}</p>
              </div>
            ))
          ) : (
            <p>Waiting for product submission...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadProducts;
