import React from 'react'
import { useState, useEffect } from 'react'
import { Button } from "../../Components/ui/button.tsx"
import { Input } from "../../Components/ui/input.tsx"
import { ScrollArea, ScrollBar } from "../../Components/ui/scroll-area.tsx"
import { Camera, MapPin, Menu, Plus, Search, User, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { ProductUploadModal } from '../../Components/ProductUploadModal.tsx'
import { ImageSearchModal } from '../../Components/ImageSearchModal.tsx'
import { Toaster } from 'sonner';
import { Smartphone, Sofa, Shirt, BookOpen, Car, Dumbbell, Package, Flower2, Layers } from "lucide-react"
import { AuthModal } from '../../Components/AuthModal.tsx'
import { Link } from "react-router-dom"
import { Github, Twitter, Instagram, Facebook, ArrowRight, Heart, Mail, Phone } from "lucide-react"
import { useAuth } from '../../context/AuthContext.tsx'
import { Navbar } from '../../Components/Navbar.tsx';
import { useLocation } from '../../context/LocationContext.tsx';

// const API_URL = "http://localhost:8000";
const API_URL = "https://bartrade.koyeb.app";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categories: string[];
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  address: string;
}

const categories = [
  { name: "All", icon: Layers, color: "bg-blue-100" },
  { name: "Electronics", icon: Smartphone, color: "bg-blue-100" },
  { name: "Furniture", icon: Sofa, color: "bg-amber-100" },
  { name: "Clothing", icon: Shirt, color: "bg-pink-100" },
  { name: "Books", icon: BookOpen, color: "bg-green-100" },
  { name: "Automobile", icon: Car, color: "bg-orange-100" },
  { name: "Sports", icon: Dumbbell, color: "bg-purple-100" },
  { name: "Home & Garden", icon: Flower2, color: "bg-emerald-100" },
  { name: "Other", icon: Package, color: "bg-gray-100" }
]

export default function Home() {
  const [nearbyProducts, setNearbyProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const productsPerPage = 12;

  // Get current products for pagination
  const indexOfLastProduct = page * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = allProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // Function to change page
  const paginate = (pageNumber: number) => setPage(pageNumber);


  const { user } = useAuth();
  // Get coords from the LocationContext instead of maintaining separate state
  const { coords, loading: loadingLocation } = useLocation();

  // Fetch nearby products when coords change
  useEffect(() => {
    if (coords?.lat && coords?.lng) {
      console.log("Fetching nearby products with coords:", coords);
      fetchNearbyProducts(coords.lat, coords.lng);
    } else {
      console.log("No coordinates available for nearby products");
      setLoadingNearby(false);
    }
  }, [coords]); // Only depend on coords for nearby products

  // Separate useEffect for all products to avoid unnecessary refetches
  useEffect(() => {
    console.log("Fetching all products, category:", selectedCategory);
    fetchAllProducts(selectedCategory, searchTerm);
  }, [selectedCategory, searchTerm, user?.id]); // Don't include coords here

  // Update the fetchAllProducts function to show all products
const fetchAllProducts = async (category?: string | null, search?: string) => {
  try {
    setLoadingAll(true);
    let url = `${API_URL}/products`; // Remove the limit parameter
    
    // Only add category parameter if it's not null and not "All"
    if (category && category !== "All") {
      url += `?category=${encodeURIComponent(category)}`;
    }
    
    if (search) {
      // Add appropriate query parameter separator
      url += url.includes('?') ? `&search=${encodeURIComponent(search)}` : `?search=${encodeURIComponent(search)}`;
    }
    
    console.log("Fetching products from URL:", url);
    
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      console.log("Products received:", data.length);
      
      // Filter out products uploaded by the current user
      const filteredProducts = user 
        ? data.filter(product => product.user?.id !== user.id)
        : data;
      
      console.log("After user filtering:", filteredProducts.length);
      
      // Set all products instead of limiting to 12
      setAllProducts(filteredProducts);
    } else {
      console.error("Failed to fetch all products");
    }
  } catch (error) {
    console.error("Error fetching all products:", error);
  } finally {
    setLoadingAll(false);
  }
};

// Also update the fetchNearbyProducts function to show more products
const fetchNearbyProducts = async (latitude: number, longitude: number) => {
  try {
    setLoadingNearby(true);
    console.log(`Fetching nearby products at lat:${latitude}, lng:${longitude}`);
    
    // Remove the limit parameter to get all nearby products
    const response = await fetch(
      `${API_URL}/products/nearby?latitude=${latitude}&longitude=${longitude}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Received ${data.length} nearby products`);
      
      // Filter out products uploaded by the current user
      const filteredProducts = user 
        ? data.filter(product => product.user?.id !== user.id)
        : data;
      
      // Show all nearby products
      setNearbyProducts(filteredProducts);
    } else {
      console.error("Failed to fetch nearby products:", await response.text());
      setNearbyProducts([]);
    }
  } catch (error) {
    console.error("Error fetching nearby products:", error);
    setNearbyProducts([]);
  } finally {
    setLoadingNearby(false);
  }
};

  // Add a useEffect to refetch products when user changes
// Add selectedCategory dependency to this useEffect
useEffect(() => {
  if (coords?.lat && coords?.lng) {
    fetchNearbyProducts(coords.lat, coords.lng);
  }
  fetchAllProducts(selectedCategory, searchTerm);
}, [user?.id, selectedCategory, searchTerm]); // Add selectedCategory and searchTerm as dependencies // Refetch when user ID changes

const handleCategoryClick = (categoryName: string) => {
  // If "All" is clicked, reset category filter
  if (categoryName === "All") {
    setSelectedCategory("All");
    fetchAllProducts(null, searchTerm);
    return;
  }
  
  // If the current selection is clicked again, select "All"
  if (selectedCategory === categoryName) {
    setSelectedCategory("All");
    fetchAllProducts(null, searchTerm);
  } else {
    // Otherwise set the new category and fetch filtered products
    setSelectedCategory(categoryName);
    fetchAllProducts(categoryName, searchTerm);
  }
};

  // Handle search input
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    fetchAllProducts(selectedCategory, searchTerm);
  };

  return (
    <main className="min-h-screen bg-blue-50">
      <Toaster richColors position='top-right'/>

      {/* Navbar */}
      <Navbar 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleSearch}
      />

      {/* Main Content */}
      <div className="container px-4 py-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold">Barter Trade</h1>
          <p className="text-lg text-muted-foreground">
            Exchange goods and services without using money
          </p>
        </div>

        {/* Products Near You Section */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Products near you</h2>
          {loadingNearby ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : loadingLocation ? (
            // Show message when still determining location
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Determining your location...</h3>
              <p className="text-muted-foreground max-w-md">
                Please allow location access to see products near you.
              </p>
            </div>
          ) : coords === null ? (
            // Show message when location access is denied
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Location access required</h3>
              <p className="text-muted-foreground max-w-md">
                To see products near you, please enable location access in your browser settings.
              </p>
            </div>
          ) : nearbyProducts.length > 0 ? (
            <ScrollArea>
              <div className="flex gap-4 pb-4">
                {nearbyProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <ScrollBar className='opacity-0' orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No nearby products found</h3>
              <p className="text-muted-foreground max-w-md">
                There are no products listed in your area yet. Be the first to list something!
              </p>
              <ProductUploadModal asChild>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" /> List a Product
                </Button>
              </ProductUploadModal>
            </div>
          )}
        </section>

        {/* Categories Section */}
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">Categories</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map((category) => (
              <div 
                key={category.name} 
                className={`flex flex-col items-center justify-center aspect-square rounded-lg ${
                  selectedCategory === category.name ? 'bg-primary/10 border-2 border-primary' : 'bg-white'
                } p-4 shadow-sm transition-all hover:bg-accent hover:-translate-y-1 cursor-pointer`}
                onClick={() => handleCategoryClick(category.name)}
              >
                <div className={`p-4 rounded-full ${category.color} mb-3`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <span className="font-medium text-center">{category.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* All Products Section */}
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">
            {selectedCategory ? `${selectedCategory} Products` : "All Products"}
          </h2>
          {loadingAll ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : allProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} isGrid />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground max-w-md">
                {selectedCategory 
                  ? `There are no ${selectedCategory} products listed yet. Be the first to list something!`
                  : "There are no products listed yet. Be the first to list something!"}
              </p>
              <ProductUploadModal asChild>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" /> List a Product
                </Button>
              </ProductUploadModal>
            </div>
          )}
        </section>
      </div>

      <div className="flex justify-center mt-8">
        {allProducts.length > productsPerPage && (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => paginate(page > 1 ? page - 1 : 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page number buttons */}
            {Array.from({ length: Math.ceil(allProducts.length / productsPerPage) }).map((_, i) => (
              <Button
                key={i}
                variant={page === i + 1 ? "default" : "outline"}
                onClick={() => paginate(i + 1)}
                className="w-10 h-10 p-0"
              >
                {i + 1}
              </Button>
            )).slice(Math.max(0, page - 3), Math.min(page + 2, Math.ceil(allProducts.length / productsPerPage)))}
            
            <Button 
              variant="outline" 
              onClick={() => paginate(page < Math.ceil(allProducts.length / productsPerPage) ? page + 1 : page)}
              disabled={page === Math.ceil(allProducts.length / productsPerPage)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

    {/* Footer */}
    <footer className="bg-white border-t py-12 mt-16">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className='h-8 w-8 overflow-hidden rounded-full'>
                  <img className='filter invert' src='/bt.png' alt="Barter Trade Logo" />
                </div>
                <h3 className="font-bold text-xl">Barter Trade</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Exchange goods and services without using money. A sustainable 
                alternative to traditional commerce.
              </p>
              <div className="flex space-x-2">
                <a href="https://twitter.com" className="hover:text-primary transition-colors" aria-label="Twitter">
                  <Twitter size={18} />
                </a>
                <a href="https://instagram.com" className="hover:text-primary transition-colors" aria-label="Instagram">
                  <Instagram size={18} />
                </a>
                <a href="https://facebook.com" className="hover:text-primary transition-colors" aria-label="Facebook">
                  <Facebook size={18} />
                </a>
                <a href="https://github.com" className="hover:text-primary transition-colors" aria-label="GitHub">
                  <Github size={18} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center">
                    <ArrowRight size={14} className="mr-1" /> Home
                  </Link>
                </li>
                <li>
                  <Link to="/browse" className="text-muted-foreground hover:text-primary transition-colors flex items-center">
                    <ArrowRight size={14} className="mr-1" /> Browse Products
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors flex items-center">
                    <ArrowRight size={14} className="mr-1" /> How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors flex items-center">
                    <ArrowRight size={14} className="mr-1" /> About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors flex items-center">
                    <ArrowRight size={14} className="mr-1" /> Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-sm">
                {categories.slice(0, 5).map(category => (
                  <li key={category.name}>
                    <button 
                      onClick={() => handleCategoryClick(category.name)}
                      className="text-muted-foreground hover:text-primary transition-colors flex items-center"
                    >
                      <ArrowRight size={14} className="mr-1" /> {category.name}
                    </button>
                  </li>
                ))}
                <li>
                  <Link to="/categories" className="text-primary hover:underline flex items-center">
                    View All Categories
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <Mail size={16} className="mr-2 mt-0.5 text-muted-foreground" />
                  <span className="text-muted-foreground">support@bartertrade.com</span>
                </li>
                <li className="flex items-start">
                  <Phone size={16} className="mr-2 mt-0.5 text-muted-foreground" />
                  <span className="text-muted-foreground">+91 98765 43210</span>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-2">Newsletter</h4>
                <form className="flex gap-2">
                  <Input 
                    type="email" 
                    placeholder="Your email" 
                    className="h-9 text-sm" 
                  />
                  <Button type="submit" className="h-9 px-3">
                    Subscribe
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-4 border-t text-center text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} Barter Trade. All rights reserved.
            </p>
            <p className="mt-1 flex justify-center items-center">
              Made with <Heart size={14} className="mx-1 text-red-500" /> in India
            </p>
            <div className="mt-2 flex justify-center space-x-4">
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link to="/faq" className="hover:text-primary transition-colors">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

// Updated ProductCard to display actual product data
function ProductCard({ product, isGrid = false }: { product: Product, isGrid?: boolean }) {
  // Format price with Indian Rupee formatting
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Link to={`/product/${product.id}`} className={`relative block ${isGrid ? 'w-full' : 'flex-none'}`}>
      <div className={`group relative ${
        isGrid 
          ? 'w-full h-full' 
          : 'w-[220px]'
      } overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1`}>
        {/* Product Image Container */}
        <div className="relative aspect-square overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img 
              src={product.images[0]} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Package className="h-16 w-16 text-muted-foreground opacity-50" />
            </div>
          )}
          
          {/* Category Badge */}
          {product.categories && product.categories.length > 0 && (
            <div className="absolute top-3 left-3">
              <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                {product.categories[0]}
              </span>
            </div>
          )}

          {/* Location Badge */}
          {product.address && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center">
              <div className="bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm flex items-center max-w-full">
                <MapPin size={12} className="mr-1 flex-shrink-0" />
                <span className="truncate">{product.address}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Product Details */}
        <div className="p-4">
          {/* Product Name */}
          <h3 className="font-medium text-sm md:text-base line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          
          {/* Price and User Info */}
          <div className="mt-2 flex justify-between items-center">
            <div className="font-bold text-base md:text-lg">
              {formatPrice(product.price)}
            </div>
            
            <div className="flex items-center gap-1">
              {product.user?.avatar ? (
                <img 
                  src={product.user.avatar} 
                  alt={product.user.name} 
                  className="w-6 h-6 rounded-full object-cover" 
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={14} />
                </div>
              )}
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                {product.user?.name || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Description Preview */}
          {isGrid && product.description && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}