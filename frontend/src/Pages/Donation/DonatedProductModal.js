import React, { useState } from 'react';
import { X, MapPin, MessageCircle, Flag } from 'lucide-react';

const API_URL = 'https://bartrade.koyeb.app';

const DonatedProductModal = ({ product, isOpen, onClose }) => {
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Mock auth hook
  const useAuth = () => ({
    user: {
      id: "mock-user-123",
      name: "Mock User",
      email: "user@example.com",
      avatar: "https://ui-avatars.com/api/?name=Mock+User&background=0D8ABC&color=fff"
    },
    isAuthenticated: true,
  });
  
  const { user } = useAuth();
  
  if (!isOpen || !product) return null;

  const stopPropagation = (e) => {
    e.stopPropagation();
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Handle claiming the donation
  const handleClaim = async () => {
    try {
      setClaiming(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('userName', user.name);
      formData.append('userEmail', user.email);
      formData.append('userAvatar', user.avatar || '');
      
      const response = await fetch(`${API_URL}/donations/${product.id}/claim`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to claim donation');
      }
      
      setClaimSuccess(true);
    } catch (err) {
      console.error('Error claiming donation:', err);
      setError('Failed to claim this donation. Please try again.');
    } finally {
      setClaiming(false);
    }
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
            src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/500x500?text=No+Image'} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Right side - Details */}
        <div className="md:w-1/2 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-2">{product.name}</h2>
          
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <MapPin className="h-4 w-4" />
            <span>{product.location ? 'Near you' : 'Location unknown'}</span>
            <span className="mx-1">•</span>
            <span>{formatDate(product.created_at)}</span>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                {product.donor && product.donor.avatar ? (
                  <img src={product.donor.avatar} alt={product.donor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white">
                    {product.donor && product.donor.name ? product.donor.name.charAt(0) : '?'}
                  </div>
                )}
              </div>
              <p className="font-medium">{product.donor ? product.donor.name : 'Anonymous'}</p>
            </div>
            <p className="text-sm text-gray-500">Donated by</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-gray-600 text-sm">{product.description}</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-2">Category</h3>
            <div className="flex flex-wrap gap-2">
              {product.categories && product.categories.map((category, index) => (
                <div key={index} className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {category}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Condition</h3>
            <p className="text-gray-600 text-sm capitalize">{product.condition || 'Not specified'}</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            {claimSuccess ? (
              <div className="bg-green-50 p-4 rounded-lg text-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h4 className="font-medium text-green-800">Successfully Claimed!</h4>
                <p className="text-sm text-green-700 mt-1">
                  You have claimed this donation. The donor will be notified.
                </p>
              </div>
            ) : (
              <button 
                className={`w-full ${claiming ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors`}
                onClick={handleClaim}
                disabled={claiming || product.is_available === false}
              >
                {claiming ? 'Processing...' : 'Claim This Donation'}
              </button>
            )}
            
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

export default DonatedProductModal;