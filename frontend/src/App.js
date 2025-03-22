import Landing from './Pages/Landing/Landing.tsx';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProductPage from './Pages/Product_Page.jsx';

import UploadProducts from './Pages/UploadProducts/UploadProducts.jsx';
// import UploadProducts from './Pages/UploadProducts/UploadProducts'
// import ProductUpload from './Components/ProductUploadModal.tsx';


function App() {
  return (
    <Router>
    <Routes>
      {/* Define your routes here */}
      <Route path="/" element={<Landing />} />
      <Route path="/product" element={<ProductPage />} />    
      <Route path="/blabla" element={<UploadProducts />} />
      
      {/* <Route path="/upload" element={<UploadProducts />} />  */}
      {/* <Route path="/upload_products" element={<ProductUpload />} />  */}
    </Routes>
  </Router>
  );
}

export default App;
