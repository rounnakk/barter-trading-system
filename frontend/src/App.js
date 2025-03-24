import Landing from './Pages/Landing/Landing.tsx';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProductPage from './Pages/Product/Product_Page.tsx';
import UserProfile from './Pages/UserProfile/UserProfile.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { Toaster } from 'sonner';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/profile" element={<UserProfile />} /> {/* Current user's profile */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;