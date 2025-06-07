import React from "react";
import { MapPin, MessageCircle, User, ChevronLeft, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "../../Components/ui/button.tsx";
import { Input } from "../../Components/ui/input.tsx";
import { useAuth } from "../../context/AuthContext.tsx";
import { toast, Toaster } from "sonner";
import { Github, Twitter, Instagram, Facebook, ArrowRight, Heart, Mail, Phone } from "lucide-react";
import { Navbar } from "../../Components/Navbar.tsx";
import { useChat } from '../../context/ChatContext.tsx';


// const API_URL = "http://localhost:8000";
const API_URL = "https://bartrade.koyeb.app";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categories: string[];
  created_at: string;
  updated_at: string;
  address: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  location?: {
    type: string;
    coordinates: [number, number];
  };
}

// Define categories (same as in Landing.tsx for consistency)
const categories = [
  { name: "Electronics", color: "bg-blue-100" },
  { name: "Furniture", color: "bg-amber-100" },
  { name: "Clothing", color: "bg-pink-100" },
  { name: "Books", color: "bg-green-100" },
  { name: "Automobile", color: "bg-orange-100" },
  { name: "Sports", color: "bg-purple-100" },
  { name: "Home & Garden", color: "bg-emerald-100" },
  { name: "Other", color: "bg-gray-100" }
];

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  const navigate = useNavigate();
  const { initiateChatWithSeller } = useChat();


  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/products/${id}`);
        
        if (!response.ok) {
          throw new Error("Product not found");
        }
        
        const data = await response.json();
        setProduct(data);
        
        // Record product view for analytics
        if (id) {
          try {
            await fetch(`${API_URL}/products/${id}/view${user ? `?user_id=${user.id}` : ''}`, {
              method: 'POST',
            });
          } catch (viewError) {
            console.error("Error recording view:", viewError);
            // Non-critical error, don't handle
          }
        }
        
        // After fetching the product, get related products
        if (data.categories && data.categories.length > 0) {
          fetchRelatedProducts(data.categories[0]);
        }

        // Get recommended products
        if (user?.id) {
          fetchRecommendedProducts(user.id);
        } else {
          // Get popular products if user is not logged in
          fetchPopularProducts();
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchProduct();
    }
  }, [id, user?.id]);
  
  const fetchRelatedProducts = async (category: string) => {
    try {
      const response = await fetch(`${API_URL}/products?category=${encodeURIComponent(category)}&limit=12`);
      
      if (response.ok) {
        const data = await response.json();
        // Filter out the current product and limit to 8 items
        const filtered = data
          .filter((p: Product) => p.id !== id)
          .slice(0, 8);
        setRelatedProducts(filtered);
      }
    } catch (err) {
      console.error("Error fetching related products:", err);
    }
  };

  const fetchRecommendedProducts = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/products/recommended/${userId}?limit=8`);
      
      if (response.ok) {
        const data = await response.json();
        // Filter out current product and related products
        const filtered = data
          .filter((p: Product) => p.id !== id)
          .slice(0, 8);
        setRecommendedProducts(filtered);
      }
    } catch (err) {
      console.error("Error fetching recommended products:", err);
      // Fallback to popular products
      fetchPopularProducts();
    }
  };

  const fetchPopularProducts = async () => {
    try {
      // Assuming you have an endpoint for popular products
      const response = await fetch(`${API_URL}/products?limit=8`);
      
      if (response.ok) {
        const data = await response.json();
        // Filter out current product
        const filtered = data
          .filter((p: Product) => p.id !== id)
          .slice(0, 8);
        setRecommendedProducts(filtered);
      }
    } catch (err) {
      console.error("Error fetching popular products:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  // Format date as "X days/weeks/months ago"
  const formatListingDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Format price with Indian Rupee formatting
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };
  
 
const handleContactSeller = async () => {
  if (!user) {
    toast.error("Please sign in to contact the seller");
    return;
  }
  
  if (!product) {
    toast.error("Product information not available");
    return;
  }
  
  if (user.id === product.user.id) {
    toast.info("This is your own listing");
    return;
  }
  
  const toastId = toast.loading("Starting chat with seller...");
  
  const roomId = await initiateChatWithSeller(
    product.id,
    product.user.id,
    { 
      name: product.name, 
      image: product.images[0] || null 
    }
  );
  
  if (roomId) {
    toast.dismiss(toastId);
    toast.success("Chat started!");
    navigate(`/chats/${roomId}`);
  } else {
    toast.dismiss(toastId);
    toast.error("Couldn't start chat. Please try again.");
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">
          {error || "Product not found"}
        </h2>
        <p className="mb-8 text-muted-foreground">
          We couldn't find the product you're looking for.
        </p>
        <Link to="/">
          <Button className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <Toaster richColors position="top-right" />
      
      <Navbar 
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleSearch={handleSearch}
            />

      {/* Main Content */}
      <main className="flex-grow">
        {/* Navigation Breadcrumb */}
        <div className="bg-white border-b py-2">
          <div className="container mx-auto px-4">
            <p className="text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link> / 
              {product.categories && product.categories.length > 0 && (
                <>
                  <Link 
                    to={`/?category=${encodeURIComponent(product.categories[0])}`} 
                    className="hover:text-primary transition-colors"
                  > {product.categories[0]}</Link> / 
                </>
              )}
              <span className="text-foreground">{product.name}</span>
            </p>
          </div>
        </div>

        {/* Main Product Section */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Product Images */}
            <div className="lg:col-span-5">
              <div className="sticky top-20">
                <div className="aspect-square bg-white p-4 rounded-lg shadow-sm">
                  <img
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                {product.images.length > 1 && (
                  <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
                    {product.images.map((img, index) => (
                      <div
                        key={index}
                        className={`w-24 h-24 flex-shrink-0 bg-white rounded-lg cursor-pointer hover:ring-2 ring-primary transition-all ${
                          selectedImage === index ? 'ring-2' : ''
                        }`}
                        onClick={() => setSelectedImage(index)}
                      >
                        <img
                          src={img}
                          alt={`${product.name} view ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="lg:col-span-4">
              <h1 className="text-2xl font-bold">
                {product.name}
                {product.categories && product.categories.length > 0 && (
                  <span className="ml-2 text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✔ BarTrade eligible
                  </span>
                )}
              </h1>
              <div className="mt-4">
                <p className="text-3xl font-bold">{formatPrice(product.price)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Listed {formatListingDate(product.created_at)}
                </p>
              </div>
              
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold text-lg">About this item</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {product.description}
                </p>
                
                {product.categories && product.categories.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.categories.map(category => (
                        <Link 
                          key={category}
                          to={`/?category=${encodeURIComponent(category)}`}
                          className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm hover:bg-primary/20 transition-colors"
                        >
                          {category}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seller Info Card */}
            <div className="lg:col-span-3">
              <div className="bg-white p-6 rounded-lg shadow-sm sticky top-20">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-muted rounded-full overflow-hidden">
                    {product.user.avatar ? (
                      <img 
                        src={product.user.avatar} 
                        alt={product.user.name}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <User className="w-full h-full p-3 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Listed By</h3>
                    <p className="text-muted-foreground text-lg">{product.user.name}</p>
                    <p className="text-sm text-muted-foreground">Member since 2023</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{product.address}</p>
                      <p className="text-sm text-muted-foreground">App location based</p>
                    </div>
                  </div>
                  
                  {product.location && (
                    <div className="w-full h-48 bg-muted rounded-lg mb-4">
                      {/* You can integrate a map here using Google Maps, Mapbox, etc. */}
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Map of item location
                      </div>
                    </div>
                  )}
                  
                  {user?.id !== product.user.id ? (
                    <Button 
                      className="w-full py-6 text-lg font-medium"
                      onClick={handleContactSeller}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Chat with Seller
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full">
                      This is your listing
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Products Section */}
          {recommendedProducts.length > 0 && (
            <div className="mt-16 relative">
              <h2 className="text-2xl font-bold mb-6">Recommended for You</h2>
              <div className="relative">
                <button 
                  onClick={() => {
                    const slider = document.getElementById('rec-slider');
                    if (slider) slider.scrollLeft -= 600;
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => {
                    const slider = document.getElementById('rec-slider');
                    if (slider) slider.scrollLeft += 600;
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div 
                  id="rec-slider"
                  className="flex overflow-x-auto scroll-smooth scrollbar-hide gap-4 px-2 pb-4"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {recommendedProducts.map((recProduct) => (
                    <ProductCard key={recProduct.id} product={recProduct} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Related Products Slider */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 relative">
              <h2 className="text-2xl font-bold mb-6">Related Products</h2>
              <div className="relative">
                <button 
                  onClick={() => {
                    const slider = document.getElementById('rel-slider');
                    if (slider) slider.scrollLeft -= 600;
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => {
                    const slider = document.getElementById('rel-slider');
                    if (slider) slider.scrollLeft += 600;
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div 
                  id="rel-slider"
                  className="flex overflow-x-auto scroll-smooth scrollbar-hide gap-4 px-2 pb-4"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {relatedProducts.map((relatedProduct) => (
                    <ProductCard key={relatedProduct.id} product={relatedProduct} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

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
                    <Link 
                      to={`/?category=${encodeURIComponent(category.name)}`}
                      className="text-muted-foreground hover:text-primary transition-colors flex items-center"
                    >
                      <ArrowRight size={14} className="mr-1" /> {category.name}
                    </Link>
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
    </div>
  );
};

// ProductCard for the related and recommended products
function ProductCard({ product }: { product: Product }) {
  // Format price with Indian Rupee formatting
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Link to={`/product/${product.id}`} className="flex-none w-[250px]">
      <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 h-full">
        <div className="aspect-square mb-3 overflow-hidden rounded-md bg-muted">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <h3 className="font-medium truncate">{product.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{product.user.name}</p>
        <p className="font-bold mt-1">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}

export default ProductPage;