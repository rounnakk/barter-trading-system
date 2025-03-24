import React from 'react';
import { X, MapPin, MessageCircle, Flag } from 'lucide-react';

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

export default DonatedProductModal;