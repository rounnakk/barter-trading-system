import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Search, MapPin, Loader2, Gift } from 'lucide-react';
import { ImageSearchModal } from './ImageSearchModal.tsx';
import { ProductUploadModal } from './ProductUploadModal.tsx';
import { AuthModal } from './AuthModal.tsx';
import { useLocation } from '../context/LocationContext.tsx';
import { ChatNotification } from './ChatNotification.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  handleSearch?: (e: React.FormEvent) => void;
}

export function Navbar({ searchTerm = '', setSearchTerm, handleSearch }: NavbarProps) {
  const { user } = useAuth();
  const { userLocation, loading } = useLocation();
  const navigate = useNavigate();
  
  // Function to navigate to donate page
  const navigateToDonate = () => {
    navigate('/donation');
  };

  // Modified search submission handler
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent the default form submission behavior
    e.stopPropagation();
    
    // Check if search term exists and isn't just whitespace
    if (searchTerm?.trim()) {
      // Navigate to search page with query parameter
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
    
    // Don't call the parent handleSearch function 
    // as we're handling navigation directly here
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className='h-9 w-9 overflow-hidden rounded-3xl'>
            <img className='filter invert' src='/bt.png' alt="Logo" />
          </div>
          <span className="font-semibold hidden sm:inline-block">Barter Trade</span>
        </Link>

        <div className="flex flex-1 items-center justify-center gap-2 px-4">
          {/* Always use our own form submission handler */}
          <form onSubmit={onSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search" 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
              // Add an onKeyDown handler for the Enter key
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchTerm?.trim()) {
                    navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
                  }
                }
              }}
            />
            {/* Add a visible search button */}
            <Button 
              type="submit" 
              size="sm" 
              variant="ghost" 
              className="absolute right-0 top-0 h-full px-3"
            >
              Search
            </Button>
          </form>
          
          <ImageSearchModal />

            {user && <ChatNotification />}

          
          <Button variant="outline" className="gap-2">
            <MapPin className="h-4 w-4" />
            {loading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              userLocation
            )}
          </Button>
          
          <ProductUploadModal />

          <Button 
            onClick={navigateToDonate}
            className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white"
            variant="default"
          >
            <Gift className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Donate</span>
          </Button>
        </div>

        <AuthModal />
      </div>
    </header>
  );
}