import Landing from './Pages/Landing/Landing.tsx';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ProductPage from './Pages/Product/Product_Page.tsx';
import UserProfile from './Pages/UserProfile/UserProfile.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { Toaster } from 'sonner';
import DonatedProducts from './Pages/Donation/DonatedProducts.js';
import { LocationProvider } from './context/LocationContext.tsx';
import { ChatProvider } from './context/ChatContext.tsx';
import ChatInbox from './Pages/Chat/ChatInbox.tsx'; // Import the ChatInbox component if you have one
import ChatPage from './Pages/Chat/ChatPage.tsx'; // Import the ChatPage component
import { SearchResults } from './Pages/Search/SearchResults.tsx';


function ChatNavigationHandler() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const storedRoomId = sessionStorage.getItem('openChatRoomId');
    if (storedRoomId) {
      navigate(`/chats/${storedRoomId}`);
      sessionStorage.removeItem('openChatRoomId');
    }
  }, [navigate]);
  
  // This component doesn't render anything
  return null;
}

function App() {
  return (
    <LocationProvider>
      <AuthProvider>
        <ChatProvider>
          <Router>
            <Toaster richColors position="top-right" />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/user/:id" element={<UserProfile />} />
              <Route path="/profile" element={<UserProfile />} /> {/* Current user's profile */}
              <Route path='/donation' element={<DonatedProducts />}/>
              <Route path='/chats' element={<ChatInbox />} />
              <Route path='/chats/:roomId' element={<ChatPage />} />
              <Route path="/search" element={<SearchResults />} />

            </Routes>
          </Router>
        </ChatProvider>
      </AuthProvider>
    </LocationProvider>
  );
}

export default App;