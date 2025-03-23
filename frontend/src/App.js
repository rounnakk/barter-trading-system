import Landing from './Pages/Landing/Landing.tsx';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProductPage from './Pages/Product/Product_Page.tsx';
import ProductPage2 from './Pages/Product_Page.jsx';

// import UploadProducts from './Pages/UploadProducts/UploadProducts'
// import ProductUpload from './Components/ProductUploadModal.tsx';


function App() {
  return (
    <Router>
    <Routes>
      {/* Define your routes here */}
      <Route path="/" element={<Landing />} />
      <Route path="/product/:id" element={<ProductPage />} />
      <Route path="/product" element={<ProductPage2 />} />

    </Routes>
  </Router>
  );
}

export default App;
