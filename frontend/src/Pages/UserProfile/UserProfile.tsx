import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Star, Calendar, CheckCircle, Package, ArrowLeftRight, 
         Edit, MessageCircle, Clock, Search, Menu, Camera, Plus, User, Loader2 } from 'lucide-react';
import { Button } from "../../Components/ui/button.tsx";
import { Input } from "../../Components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../Components/ui/tabs.tsx";
import { useAuth } from '../../context/AuthContext.tsx';
import { ProductUploadModal } from '../../Components/ProductUploadModal.tsx';
import { ImageSearchModal } from '../../Components/ImageSearchModal.tsx';
import { AuthModal } from '../../Components/AuthModal.tsx';
import { toast } from 'sonner';
import { Navbar } from '../../Components/Navbar.tsx';

// const API_URL = "http://localhost:8000";
const API_URL = "https://bartrade.koyeb.app";

interface UserData {
  id: string;
  name: string;
  email: string;
  username?: string;
  verified: boolean;
  created_at: string;
  avatar: string;
  location?: string;
  address?: string;
  country?: string;
  bio?: string;
  rating?: number;
  total_ratings?: number;
  statistics?: {
    total_trades: number;
    successful_trades: number;
    items_listed: number;
  };
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categories: string[];
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
}

interface TradeHistory {
  id: string;
  date: string;
  partner: {
    id: string;
    name: string;
    avatar: string;
  };
  item_given: string;
  item_received: string;
  rating: number;
  review: string;
}

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { user: authUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  
  // Determine if we're viewing our own profile
  const isOwnProfile = !id || (authUser && id === authUser.id);
  
  useEffect(() => {
    // First, check if we're trying to view profile without being logged in
    if (!id && !authUser) {
      toast.error("Please log in to view your profile");
      navigate("/");
      return;
    }
    
    // Determine which user ID to fetch
    const userIdToFetch = id || authUser?.id;
    
    // If we're viewing our own profile but using the /user/:id route,
    // redirect to /profile for consistency
    if (id && authUser && id === authUser.id && window.location.pathname !== '/profile') {
      navigate('/profile');
      return;
    }
    
    // If we have a user ID to fetch, get their data
    if (userIdToFetch) {
      fetchUserData(userIdToFetch);
    } else {
      setError("User not found");
      setLoading(false);
    }
  }, [id, authUser, navigate, isAuthenticated]);

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      // If this is the logged-in user and we don't have a MongoDB user yet,
      // create one based on Supabase data
      if (!id && authUser) {
        // Check if user exists in our MongoDB
        const checkResponse = await fetch(`${API_URL}/users/${userId}`);
        
        if (checkResponse.status === 404) {
          // User doesn't exist in MongoDB, create one
          await createUserInMongoDB(authUser);
        }
      }
      
      // Fetch user data
      const userResponse = await fetch(`${API_URL}/users/${userId}`);
      
      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          // If this is the current user and they don't exist in MongoDB,
          // create them based on Supabase data
          if (!id && authUser) {
            const createdUser = await createUserInMongoDB(authUser);
            setUser(createdUser);
          } else {
            throw new Error("User not found");
          }
        } else {
          throw new Error(`Error ${userResponse.status}: ${await userResponse.text()}`);
        }
      } else {
        const userData = await userResponse.json();
        setUser(userData);
      }
      
      // Fetch user's products
      const productsResponse = await fetch(`${API_URL}/users/${userId}/products`);
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }
      
      // Fetch trade history
      const tradeResponse = await fetch(`${API_URL}/users/${userId}/trades`);
      if (tradeResponse.ok) {
        const tradeData = await tradeResponse.json();
        setTradeHistory(tradeData);
      }
      
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError(err instanceof Error ? err.message : "Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to create a user in MongoDB based on Supabase auth data
  const createUserInMongoDB = async (supabaseUser: any) => {
    // Extract user metadata from Supabase
    const userData = {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
      avatar: supabaseUser.user_metadata?.avatar_url || "",
      created_at: supabaseUser.created_at,
    };
    
    // Send to our backend to create the user
    const response = await fetch(`${API_URL}/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error("Failed to create user profile");
    }
    
    return await response.json();
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm)}`);
    }
  };
  
  const renderStars = (rating: number): JSX.Element => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars: JSX.Element[] = [];
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="w-5 h-5 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(
        <div key="half-star" className="relative inline-block">
          <Star className="w-5 h-5 text-gray-300" />
          <div className="absolute top-0 left-0 overflow-hidden w-1/2">
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
        </div>
      );
    }
    
    const emptyStars = 5 - (fullStars + (hasHalfStar ? 1 : 0));
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />);
    }
    
    return <div className="flex">{stars}</div>;
  };
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format price with Indian Rupee formatting
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">
          {error || "User not found"}
        </h2>
        <p className="mb-8 text-muted-foreground">
          We couldn't find the user profile you're looking for.
        </p>
        <Link to="/">
          <Button className="flex items-center gap-2">
            <MapPin size={16} />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <Navbar 
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleSearch={handleSearch}
            />

      {/* User Profile */}
      <div className="container px-4 py-8">
        {/* Cover and Profile Section */}
        <div className="relative mb-8">
          {/* Cover Image - Blue gradient as placeholder */}
          <div className="h-48 md:h-64 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-lg"></div>
          
          {/* Profile Info Container */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Profile Image */}
            <div className="relative -mt-16 md:-mt-20 ml-4 md:ml-8">
              <div className="w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-white bg-white overflow-hidden">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <User className="w-1/2 h-1/2 text-gray-400" />
                  </div>
                )}
              </div>
              {user.verified && (
                <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-1">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            
            {/* User Info */}
            <div className="flex-1 mt-4 md:mt-8 px-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold flex items-center">
                    {user.name}
                    {user.verified && (
                      <CheckCircle className="ml-2 w-5 h-5 text-blue-500" />
                    )}
                  </h1>
                  <p className="text-muted-foreground">@{user.username || user.name.toLowerCase().replace(/\s+/g, '')}</p>
                </div>
                
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <Button variant="outline" className="flex items-center gap-1">
                      <Edit className="w-4 h-4" /> Edit Profile
                    </Button>
                  ) : (
                    <Button className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" /> Message
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Bio */}
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">
                    {user.bio || "No bio provided yet."}
                  </p>
                </div>
                
                {/* Basic Stats */}
                <div className="flex flex-wrap gap-4 md:justify-end">
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Joined {formatDate(user.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{user.address || "No location"}</span>
                  </div>
                  
                  {user.rating !== undefined && (
                    <div className="flex items-center gap-1">
                      {renderStars(user.rating)}
                      <span className="text-sm text-muted-foreground">
                        ({user.total_ratings || 0} ratings)
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Trading Statistics */}
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-b py-4">
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-500 mr-1" />
                    <span className="font-bold">{user.statistics?.items_listed || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Items Listed</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <ArrowLeftRight className="w-5 h-5 text-green-500 mr-1" />
                    <span className="font-bold">{user.statistics?.total_trades || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total Trades</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-amber-500 mr-1" />
                    <span className="font-bold">{user.statistics?.successful_trades || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Successful Trades</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs for Products and Trades */}
        <Tabs defaultValue="products" className="mt-8" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="products">Listed Products</TabsTrigger>
            <TabsTrigger value="trades">Trade History</TabsTrigger>
          </TabsList>
          
          {/* Listed Products Tab */}
          <TabsContent value="products" className="py-4">
            <h2 className="text-xl font-semibold mb-4">Products Listed</h2>
            {products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Products Listed</h3>
                <p className="text-muted-foreground mt-2">
                  {isOwnProfile ? "You haven't listed any products yet." : "This user hasn't listed any products yet."}
                </p>
                {isOwnProfile && (
                  <ProductUploadModal>
                    <Button className="mt-6">
                      <Plus className="mr-2 h-4 w-4" /> List a Product
                    </Button>
                  </ProductUploadModal>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Trade History Tab */}
          <TabsContent value="trades" className="py-4">
            <h2 className="text-xl font-semibold mb-4">Trade History</h2>
            {tradeHistory.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Trade History</h3>
                <p className="text-muted-foreground mt-2">
                  {isOwnProfile ? "You haven't made any trades yet." : "This user hasn't made any trades yet."}
                </p>
                {isOwnProfile && (
                  <Link to="/">
                    <Button className="mt-6">
                      Explore Products
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {tradeHistory.map(trade => (
                  <div 
                    key={trade.id} 
                    className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="sm:w-16 flex items-center justify-center">
                      {trade.partner.avatar ? (
                        <img 
                          src={trade.partner.avatar} 
                          alt={trade.partner.name} 
                          className="w-12 h-12 rounded-full" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-medium">
                            Trade with <span className="text-blue-600">{trade.partner.name}</span>
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" /> {formatDate(trade.date)}
                          </div>
                        </div>
                        <div>{renderStars(trade.rating)}</div>
                      </div>
                      <div className="mt-3 text-sm">
                        <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full">
                          Gave: {trade.item_given}
                        </span>
                        <ArrowLeftRight className="inline mx-2 w-4 h-4 text-gray-400" />
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                          Received: {trade.item_received}
                        </span>
                      </div>
                      {trade.review && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          "{trade.review}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ProductCard component for displaying user products
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
    <Link to={`/product/${product.id}`} className="block">
      <div className="group relative w-full overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
        {/* Product Image Container */}
        <div className="aspect-square overflow-hidden">
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
        </div>
        
        {/* Product Details */}
        <div className="p-4">
          <h3 className="font-medium text-base line-clamp-1">{product.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{product.description}</p>
          <div className="mt-2 font-bold">{formatPrice(product.price)}</div>
        </div>
      </div>
    </Link>
  );
}

export default UserProfile;