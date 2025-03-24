import React, { useState } from 'react';
import { Search, MapPin, Filter, ShoppingBag, Heart, ChevronLeft, ChevronRight, X, MessageCircle, Flag } from 'lucide-react';

// Modal component inline to avoid import issues
const DonatedProductModal = ({ product, isOpen, onClose }) => {
  if (!isOpen || !product) return null;

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
        onClick={stopPropagation}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/80 rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100 z-10"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Left side - Image */}
        <div className="md:w-1/2 h-64 md:h-auto relative">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Right side - Product Details */}
        <div className="md:w-1/2 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-2">{product.name}</h2>
          
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <MapPin className="h-4 w-4" />
            <span>{product.location}</span>
            <span className="mx-1">•</span>
            <span>{product.listed}</span>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <p className="font-medium">{product.donor}</p>
            </div>
            <p className="text-sm text-gray-500">Donated by</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-gray-600 text-sm">{product.description}</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-2">Category</h3>
            <div className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
              {product.category}
            </div>
          </div>
          
          <div className="space-y-3">
            <button className="w-full bg-green-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors">
              Claim This Donation
            </button>
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
              <MessageCircle className="h-5 w-5" />
              Message Donor
            </button>
            <button className="w-full text-gray-500 text-sm py-2 hover:underline flex items-center justify-center gap-1">
              <Flag className="h-4 w-4" />
              Report this item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DonatedProducts = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Mock data - replace with API call later
  const donatedProducts = [
    {
      id: 1,
      name: 'Economics Textbook',
      description: 'College textbook, excellent condition with minimal highlighting',
      image: 'https://picsum.photos/seed/book1/300/300',
      category: 'Books',
      donor: 'Rahul M.',
      location: 'Mumbai',
      listed: '2 days ago',
    },
    {
      id: 2,
      name: 'Men\'s Running Shoes',
      description: 'Size 9, gently used Nike running shoes',
      image: 'https://picsum.photos/seed/shoes1/300/300',
      category: 'Clothing',
      donor: 'Anita K.',
      location: 'Delhi',
      listed: '5 days ago',
    },
    {
      id: 3,
      name: 'Microwave Oven',
      description: 'Working condition, 800W microwave',
      image: 'https://picsum.photos/seed/microwave1/300/300',
      category: 'Appliances',
      donor: 'Vijay S.',
      location: 'Pune',
      listed: '1 week ago',
    },
    {
      id: 4,
      name: 'Children\'s Toys Bundle',
      description: 'Assorted toys for ages 3-5, in good condition',
      image: 'https://picsum.photos/seed/toys1/300/300',
      category: 'Kids',
      donor: 'Priya R.',
      location: 'Bangalore',
      listed: '3 days ago',
    },
    {
      id: 5,
      name: 'Coffee Table',
      description: 'Wooden coffee table, some scratches but sturdy',
      image: 'https://picsum.photos/seed/table1/300/300',
      category: 'Furniture',
      donor: 'Kiran D.',
      location: 'Chennai',
      listed: '1 day ago',
    },
    {
      id: 6,
      name: 'Samsung Galaxy S9',
      description: 'Used phone, working condition with minor screen scratches',
      image: 'https://picsum.photos/seed/phone1/300/300',
      category: 'Electronics',
      donor: 'Amit P.',
      location: 'Hyderabad',
      listed: '4 days ago',
    },
    {
      id: 7,
      name: 'Rice Cooker',
      description: '3-cup rice cooker, perfect working condition',
      image: 'https://picsum.photos/seed/cooker1/300/300',
      category: 'Appliances',
      donor: 'Neha T.',
      location: 'Kolkata',
      listed: '2 weeks ago',
    },
    {
      id: 8,
      name: 'Yoga Mat',
      description: 'Lightly used yoga mat, clean and sanitized',
      image: 'https://picsum.photos/seed/yoga1/300/300',
      category: 'Sports',
      donor: 'Deepak M.',
      location: 'Pune',
      listed: '6 days ago',
    },
  ];

  const categories = ['All', 'Electronics', 'Clothing', 'Books', 'Furniture', 'Appliances', 'Kids', 'Sports'];
  
  const filteredProducts = activeCategory === 'All' 
    ? donatedProducts 
    : donatedProducts.filter(product => product.category === activeCategory);
  
  const openProductModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeProductModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className='h-9 w-9 overflow-hidden rounded-3xl'>
            <img className='filter invert' src='/bt.png' alt="BarTrade Logo" />
          </div>
          <button className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-gray-100 text-gray-700">
            <ShoppingBag className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="container px-4 py-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mb-8">
          <h1 className="text-2xl font-bold mb-2">Donation Corner</h1>
          <p className="opacity-90">Browse items donated by our community or donate your own items to someone in need</p>
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search donated items" 
              className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-8" 
            />
          </div>
          <div className="flex space-x-2">
            <button className="inline-flex items-center justify-center gap-2 h-10 py-2 px-4 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700">
              <MapPin className="h-4 w-4" />
              <span>Location</span>
            </button>
            <button className="inline-flex items-center justify-center gap-2 h-10 py-2 px-4 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>
        
        {/* Category Pills */}
        <div className="mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex space-x-2 pb-2">
            {categories.map(category => (
              <button
                key={category}
                className={`rounded-full h-10 py-2 px-4 ${
                  activeCategory === category 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Donation CTA */}
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg mb-8 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-800">Have Something to Donate?</h2>
            <p className="text-blue-700 mt-1">Your unused items could help someone in need</p>
          </div>
          <button className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 inline-flex items-center justify-center h-10 py-2 px-4 rounded-md text-white">
            Donate an Item
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
              onClick={() => openProductModal(product)}
            >
              <div className="aspect-square relative">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <button 
                  className="absolute top-2 right-2 bg-white/80 rounded-full h-8 w-8 p-1.5 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    // Handle wishlist/favorite
                  }}
                >
                  <Heart className="h-full w-full" />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-lg mb-1">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">{product.description}</p>
                <div className="flex items-center text-xs text-gray-500 mt-3">
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {product.location}
                  </div>
                  <span className="mx-2">•</span>
                  <span>{product.listed}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-500">Donated by</span>
                    <span className="font-medium ml-1">{product.donor}</span>
                  </div>
                  <button 
                    className="h-8 px-3 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      openProductModal(product);
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-8 space-x-2">
          <button className="h-10 w-10 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center justify-center">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="h-10 w-10 rounded-md border border-gray-300 bg-blue-50 text-gray-700 inline-flex items-center justify-center">
            1
          </button>
          <button className="h-10 w-10 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center justify-center">
            2
          </button>
          <button className="h-10 w-10 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center justify-center">
            3
          </button>
          <button className="h-10 w-10 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center justify-center">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Product Modal */}
      <DonatedProductModal 
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={closeProductModal}
      />

      {/* Footer */}
      <footer className="bg-white border-t mt-16 py-8">
        <div className="container px-4">
          <div className="text-center text-gray-500 text-sm">
            <p>BarTrade Donation Corner - Giving back to the community</p>
            <p className="mt-2">© 2025 BarTrade. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DonatedProducts;