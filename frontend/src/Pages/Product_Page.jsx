import React from "react";
import { MapPin, MessageCircle, User, ChevronLeft, ChevronRight } from "lucide-react"; // Import icons
import { useState, useRef } from "react";

const MOCK_RELATED_PRODUCTS = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: `${Math.floor(Math.random() * 50000 + 5000)}`,
  brand: ["Apple", "Samsung", "Sony", "LG", "Xiaomi"][Math.floor(Math.random() * 5)],
  image: `https://picsum.photos/300/300?random=${i}`
}));

const ProductPage = () => {
  const [selectedImage, setSelectedImage] = useState(0);
  const images = [
    "https://picsum.photos/600/600?random=1",
    "https://picsum.photos/600/600?random=2",
    "https://picsum.photos/600/600?random=3"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Breadcrumb */}
      <div className="bg-gray-100 py-2">
        <div className="container mx-auto px-4">
          <p className="text-sm text-gray-600">Home / Electronics / Headphones</p>
        </div>
      </div>

      {/* Main Product Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Product Images */}
          <div className="col-span-4">
            <div className="sticky top-20">
              <div className="aspect-square bg-white p-4 rounded-lg">
                <img
                  src={images[selectedImage]}
                  alt="Product"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex gap-4 mt-4">
                {images.map((img, index) => (
                  <div
                    key={index}
                    className={`w-24 h-24 bg-white rounded-lg cursor-pointer hover:ring-2 ring-blue-500 ${
                      selectedImage === index ? 'ring-2' : ''
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img
                      src={img}
                      alt={`Product view ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="col-span-4">
            <h1 className="text-2xl font-bold">
              AirPods | Apple 
              <span className="ml-2 text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                ✔ BarTrade eligible
              </span>
            </h1>
            <div className="mt-4">
              <p className="text-3xl font-bold">₹10,000</p>
              <p className="text-sm text-gray-500 mt-1">Listed 2 days ago</p>
            </div>
            <div className="mt-6">
              <h3 className="font-semibold">About this item</h3>
              <p className="mt-2 text-gray-600">
                Detailed product description goes here. This should be a comprehensive
                description of the product including its features, condition, and any
                other relevant details.
              </p>
            </div>
          </div>

          {/* Seller Info Card */}
          <div className="col-span-4">
            <div className="bg-white p-8 rounded-lg shadow-lg sticky top-20">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-200 rounded-full">
                  <User className="w-full h-full p-3" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Listed By</h3>
                  <p className="text-gray-600 text-lg">John Doe</p>
                  <p className="text-sm text-gray-500">Member since 2023</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-gray-500" />
                  <div>
                    <p className="font-medium">Mumbai, Maharashtra</p>
                    <p className="text-sm text-gray-500">2.5 km away</p>
                  </div>
                </div>
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4">
                  {/* Map will go here */}
                </div>
                <button className="w-full bg-blue-600 text-white py-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors text-lg font-medium">
                  <MessageCircle className="w-6 h-6" />
                  Chat with Seller
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Slider */}
        <div className="mt-16 relative">
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="relative">
            <button 
              onClick={() => {
                const slider = document.getElementById('slider');
                slider.scrollLeft -= slider.offsetWidth;
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => {
                const slider = document.getElementById('slider');
                slider.scrollLeft += slider.offsetWidth;
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div 
              id="slider"
              className="flex overflow-x-auto scroll-smooth scrollbar-hide gap-4 px-2"
              style={{ scrollBehavior: 'smooth' }}
            >
              {MOCK_RELATED_PRODUCTS.map((product) => (
                <div
                  key={product.id}
                  className="flex-none w-[250px]"
                >
                  <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full aspect-square object-cover rounded-md mb-3"
                    />
                    <h3 className="font-medium truncate">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.brand}</p>
                    <p className="font-bold mt-1">₹{product.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
