import React, { useState, useEffect } from 'react';
import { useLocation as useRouterLocation, Link } from 'react-router-dom';
import { Loader2, Package, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from '../../Components/Navbar.tsx';
import { Button } from '../../Components/ui/button.tsx';
import { Toaster } from 'sonner';
import { useAuth } from '../../context/AuthContext.tsx';

// Import the API URL
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

export function SearchResults() {
  const { search } = useRouterLocation();
  const searchParams = new URLSearchParams(search);
  const query = searchParams.get('q') || '';
  
  const [searchTerm, setSearchTerm] = useState(query);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const productsPerPage = 12;
  
  // Get current products for pagination
  const indexOfLastProduct = page * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = searchResults.slice(indexOfFirstProduct, indexOfLastProduct);
  
  const { user } = useAuth();
  
  // Function to handle search submissions
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSearchResults(searchTerm);
  };
  
  // Function to paginate
  const paginate = (pageNumber: number) => setPage(pageNumber);
  
  const fetchSearchResults = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/products?search=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      const data = await response.json();
      
      // Filter out user's own products if logged in
      const filtered = user 
        ? data.filter((product: Product) => product.user?.id !== user.id)
        : data;
      
      setSearchResults(filtered);
      
      // Reset to first page with new results
      setPage(1);
    } catch (err) {
      console.error('Error searching products:', err);
      setError('Failed to load search results. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch results when the query parameter changes
  useEffect(() => {
    if (query) {
      setSearchTerm(query);
      fetchSearchResults(query);
    }
  }, [query]);
  
  // Format price with Indian Rupee formatting
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  return (
    <div className="min-h-screen bg-blue-50">
      <Toaster richColors position="top-right" />
      
      {/* Navbar with search functionality */}
      <Navbar 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleSearch}
      />
      
      {/* Main Content */}
      <div className="container px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            Search Results for "{query}"
          </h1>
          
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
        </div>
        
        {/* Results count */}
        <p className="mb-6 text-muted-foreground">
          Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
        </p>
        
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {/* Results grid */}
        {!loading && searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {currentProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        
        {/* No results state */}
        {!loading && searchResults.length === 0 && query && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground max-w-md">
              We couldn't find any products matching "{query}". Try adjusting your search terms.
            </p>
            <Link to="/">
              <Button className="mt-4">
                Browse all products
              </Button>
            </Link>
          </div>
        )}
        
        {/* Pagination */}
        {searchResults.length > productsPerPage && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => paginate(page > 1 ? page - 1 : 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Page number buttons */}
              {Array.from({ length: Math.ceil(searchResults.length / productsPerPage) }).map((_, i) => (
                <Button
                  key={i}
                  variant={page === i + 1 ? "default" : "outline"}
                  onClick={() => paginate(i + 1)}
                  className="w-10 h-10 p-0"
                >
                  {i + 1}
                </Button>
              )).slice(Math.max(0, page - 3), Math.min(page + 2, Math.ceil(searchResults.length / productsPerPage)))}
              
              <Button 
                variant="outline" 
                onClick={() => paginate(page < Math.ceil(searchResults.length / productsPerPage) ? page + 1 : page)}
                disabled={page === Math.ceil(searchResults.length / productsPerPage)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ProductCard component (similar to the one in Landing.tsx)
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
    <Link to={`/product/${product.id}`} className="block w-full">
      <div className="group relative w-full h-full overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
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
        </div>
        
        {/* Product Details */}
        <div className="p-4">
          <h3 className="font-medium text-sm md:text-base line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          
          <div className="mt-2 flex justify-between items-center">
            <div className="font-bold text-base md:text-lg">
              {formatPrice(product.price)}
            </div>
          </div>
          
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        </div>
      </div>
    </Link>
  );
}