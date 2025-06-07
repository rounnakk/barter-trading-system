import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Loader2 } from 'lucide-react';

const API_URL = 'https://bartrade.koyeb.app'

const DonationUploadModal = ({ isOpen, onClose, currentUser }) => {
  const [step, setStep] = useState(1); // 1: Form, 2: Processing, 3: Success
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [condition, setCondition] = useState('good');
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 3) {
      setError('You can upload a maximum of 3 images');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // Create preview URLs
    const newPreviewImages = [...previewImages];
    files.forEach(file => {
      newPreviewImages.push(URL.createObjectURL(file));
    });
    setPreviewImages(newPreviewImages);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    const newPreviewImages = [...previewImages];
    
    // Revoke the URL to avoid memory leaks
    URL.revokeObjectURL(newPreviewImages[index]);
    
    newImages.splice(index, 1);
    newPreviewImages.splice(index, 1);
    
    setImages(newImages);
    setPreviewImages(newPreviewImages);
  };

  const handleCategoryChange = (category) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!productName) {
      setError('Product name is required');
      return;
    }

    if (!productDescription) {
      setError('Product description is required');
      return;
    }

    if (images.length === 0) {
      setError('At least one image is required');
      return;
    }

    if (categories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setError('');
    setStep(2); // Move to processing step
    setLoading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('productName', productName);
      formData.append('productDescription', productDescription);
      formData.append('categories', JSON.stringify(categories));
      formData.append('condition', condition);
      
      // Add user data
      if (currentUser) {
        formData.append('userId', currentUser.id);
        formData.append('userName', currentUser.name);
        formData.append('userEmail', currentUser.email);
        formData.append('userAvatar', currentUser.avatar || '');
      }
      
      // Add images
      images.forEach((image, index) => {
        formData.append(`file${index + 1}`, image);
      });
      
      // Get user location if available
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          
          formData.append('latitude', position.coords.latitude.toString());
          formData.append('longitude', position.coords.longitude.toString());
        } catch (locError) {
          console.log('Location access denied:', locError);
        }
      }

      // This endpoint doesn't exist yet - you'll implement it later
      const response = await fetch(`${API_URL}/donations/create`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload donation');
      }

      // Success!
      setStep(3);
    } catch (submitError) {
      console.error('Error submitting donation:', submitError);
      setError('Failed to upload donation. Please try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductName('');
    setProductDescription('');
    setCondition('good');
    setCategories([]);
    setImages([]);
    setPreviewImages([]);
    setError('');
    setStep(1);
  };

  const closeModal = () => {
    resetForm();
    onClose();
  };

  // Available categories
  const availableCategories = [
    'Electronics', 'Furniture', 'Clothing', 'Books', 
    'Toys', 'Kitchenware', 'Appliances', 'Sports', 'Other'
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto"
      onClick={closeModal}
    >
      <div 
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto"
        onClick={stopPropagation}
      >
        {/* Close button */}
        <button 
          onClick={closeModal}
          className="absolute top-4 right-4 bg-white/80 rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            {step === 3 ? 'Donation Complete!' : 'Donate an Item'}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <form onSubmit={handleSubmit}>
              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Product Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="What are you donating?"
                  required
                />
              </div>

              {/* Product Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="w-full p-2 border rounded-md h-24"
                  placeholder="Provide details about the item's condition, features, etc."
                  required
                />
              </div>

              {/* Item Condition */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              {/* Categories */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Categories <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryChange(category)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        categories.includes(category)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">
                  Images <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {/* Image Previews */}
                  {previewImages.map((preview, index) => (
                    <div key={index} className="relative w-24 h-24 border rounded-md overflow-hidden">
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-0 right-0 bg-white/80 rounded-full h-5 w-5 flex items-center justify-center hover:bg-gray-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add Image Button */}
                  {images.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      className="w-24 h-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-gray-400 hover:text-gray-500 hover:border-gray-300"
                    >
                      <Camera className="h-6 w-6 mb-1" />
                      <span className="text-xs">Add Photo</span>
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    accept="image/*"
                    multiple
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload up to 3 images (Required)
                </p>
              </div>

              {/* Submit Button */}
              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                >
                  <Upload className="h-5 w-5 inline mr-1" />
                  Donate Item
                </button>
              </div>
            </form>
          )}

          {/* Processing State */}
          {step === 2 && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-500 mb-4" />
              <h3 className="text-xl font-medium mb-2">Processing Your Donation</h3>
              <p className="text-gray-500">
                Please wait while we process your donation...
              </p>
            </div>
          )}

          {/* Success State */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Donation Successful!</h3>
              <p className="text-gray-600 mb-6">
                Thank you for your generosity. Your donation has been listed and will be available for someone in need.
              </p>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={closeModal}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                >
                  Done
                </button>
                <button
                  onClick={resetForm}
                  className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50"
                >
                  Donate Another Item
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationUploadModal;