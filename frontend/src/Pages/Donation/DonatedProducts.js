import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, ShoppingBag, Heart, ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import DonatedProductModal from './DonatedProductModal';
import DonationUploadModal from './DonationUploadModal';

const API_URL = 'https://bartrade.koyeb.app'

// Mock useAuth hook to avoid dependency issues
const useAuth = () => {
  return {
    user: {
      id: "mock-user-123",
      name: "Mock User",
      email: "user@example.com",
      avatar: "https://ui-avatars.com/api/?name=Mock+User&background=0D8ABC&color=fff"
    },
    isAuthenticated: true,
    login: () => {},
    logout: () => {}
  };
};

const DonatedProducts = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const { user } = useAuth();
  
  // State for products and loading
  const [donatedProducts, setDonatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const categoryParam = activeCategory !== 'All' ? `?category=${activeCategory}` : '';
        const response = await fetch(`https://bartrade.koyeb.app/donations${categoryParam}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch donations');
        }
        
        const data = await response.json();
        setDonatedProducts(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching donations:', err);
        setError('Failed to load donations. Please try again later.');
        // Keep existing products if fetch fails
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [activeCategory, isDonateModalOpen]); // Refresh when category changes or after donation
  
  // Open product details modal
  const openModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Close product details modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // Open donation modal
  const openDonateModal = () => {
    setIsDonateModalOpen(true);
  };

  // Close donation modal
  const closeDonateModal = () => {
    setIsDonateModalOpen(false);
  };

  // Categories array with icons
  const categories = [
    { name: 'All', active: activeCategory === 'All' },
    { name: 'Electronics', active: activeCategory === 'Electronics' },
    { name: 'Furniture', active: activeCategory === 'Furniture' },
    { name: 'Clothing', active: activeCategory === 'Clothing' },
    { name: 'Books', active: activeCategory === 'Books' },
    { name: 'Toys', active: activeCategory === 'Toys' },
    { name: 'Kitchenware', active: activeCategory === 'Kitchenware' },
    { name: 'Appliances', active: activeCategory === 'Appliances' },
    { name: 'Sports', active: activeCategory === 'Sports' },
    { name: 'Other', active: activeCategory === 'Other' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with donate button */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className='h-9 w-9 overflow-hidden rounded-3xl'>
            <img className='filter invert' src='/bt.png' alt="BarTrade Logo" />
          </div>
          {/* Added donate button in navbar */}
          <div className="flex items-center gap-3">
            <button 
              onClick={openDonateModal}
              className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm"
            >
              <Gift className="h-4 w-4 mr-2" />
              Donate
            </button>
            <button className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-gray-100 text-gray-700">
              <ShoppingBag className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        {/* Top section with title and donate button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Donated Items</h1>
          <button 
            onClick={openDonateModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Gift className="h-5 w-5" />
            Donate an Item
          </button>
        </div>
        
        {/* Search input */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search for items..."
            className="w-full p-3 pl-12 rounded-lg border border-gray-300 shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
        
        {/* Categories */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex space-x-2 py-2">
            {categories.map(category => (
              <button
                key={category.name}
                className={`whitespace-nowrap px-4 py-2 rounded-full ${
                  category.active 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {/* Products grid */}
        {!loading && donatedProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {donatedProducts.map(product => (
              <div 
                key={product.id} 
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openModal(product)}
              >
                <div className="h-48 overflow-hidden">
                  <img 
                    src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x200?text=No+Image'} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    <span>{product.location ? 'Near you' : 'Location unknown'}</span>
                    <span className="mx-1">•</span>
                    <span>{new Date(product.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {product.categories && product.categories.length > 0 ? product.categories[0] : 'Uncategorized'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {!loading && donatedProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
              <Gift className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">No donations available</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {activeCategory !== 'All' 
                ? `There are no donations in the ${activeCategory} category yet.` 
                : 'There are no donations available at the moment.'}
            </p>
            <button 
              onClick={openDonateModal}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Donate an Item
            </button>
          </div>
        )}
      </div>
      
      {/* Product details modal */}
      <DonatedProductModal 
        product={selectedProduct} 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
      
      {/* Donation modal */}
      <DonationUploadModal 
        isOpen={isDonateModalOpen} 
        onClose={closeDonateModal} 
        currentUser={user}
      />
    </div>
  );
};

export default DonatedProducts;