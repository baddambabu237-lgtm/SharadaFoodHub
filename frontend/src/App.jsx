import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginRegister from './pages/LoginRegister';
import ProductCatalog from './pages/ProductCatalog';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CustomerDashboard from './pages/CustomerDashboard';
import SubscriptionManagement from './pages/SubscriptionManagement';
import OrderHistory from './pages/OrderHistory';
import AdminDashboard from './pages/AdminDashboard';
import CustomerManagement from './pages/CustomerManagement';
import ProductManagement from './pages/ProductManagement';
import InventoryManagement from './pages/InventoryManagement';
import DispatchDashboard from './pages/DispatchDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import SupportCenter from './pages/SupportCenter';
import MyAccount from './pages/MyAccount';
import Reports from './pages/Reports';
import './App.css';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('sharadha_dark') === 'true';
  });
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sharadha_cart')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sharadha_dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('sharadha_cart', JSON.stringify(cart));
  }, [cart]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin';

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.id !== productId));
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(i => i.id === productId ? { ...i, quantity } : i));
  };

  const clearCart = () => setCart([]);

  return (
    <Router>
      <div className={`min-h-screen bg-warmgray-50 dark:bg-warmgray-900 transition-colors duration-200`}>
        <Navbar cartCount={cartCount} toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginRegister />} />

          {/* Customer Routes */}
          <Route path="/catalog" element={
            <div className="max-w-7xl mx-auto px-4 py-8">
              <ProductCatalog addToCart={addToCart} />
            </div>
          } />
          <Route path="/products/:id" element={
            <div className="max-w-7xl mx-auto px-4 py-8">
              <ProductDetails addToCart={addToCart} />
            </div>
          } />
          <Route path="/cart" element={
            <div className="max-w-7xl mx-auto px-4 py-8">
              <Cart cart={cart} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} />
            </div>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute customerOnly={true}>
              <div className="max-w-7xl mx-auto px-4 py-8">
                <Checkout cart={cart} clearCart={clearCart} />
              </div>
            </ProtectedRoute>
          } />

          {/* Customer Dashboard with Sidebar */}
          <Route path="/dashboard" element={
            <ProtectedRoute customerOnly={true}>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={false} />
                <main className="flex-1 overflow-auto"><CustomerDashboard /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/subscriptions" element={
            <ProtectedRoute customerOnly={true}>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={false} />
                <main className="flex-1 overflow-auto"><SubscriptionManagement /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute customerOnly={true}>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={false} />
                <main className="flex-1 overflow-auto"><OrderHistory /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/support" element={
            <ProtectedRoute customerOnly={true}>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={false} />
                <main className="flex-1 overflow-auto"><SupportCenter /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/account" element={
            <ProtectedRoute customerOnly={true}>
              <MyAccount />
            </ProtectedRoute>
          } />

          {/* Admin Routes with Admin Sidebar */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={true} />
                <main className="flex-1 overflow-auto"><AdminDashboard /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin/customers" element={
            <ProtectedRoute adminOnly>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={true} />
                <main className="flex-1 overflow-auto"><CustomerManagement /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin/products" element={
            <ProtectedRoute adminOnly>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={true} />
                <main className="flex-1 overflow-auto"><ProductManagement /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin/inventory" element={
            <ProtectedRoute adminOnly>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={true} />
                <main className="flex-1 overflow-auto"><InventoryManagement /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin/dispatches" element={
            <ProtectedRoute adminOnly>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={true} />
                <main className="flex-1 overflow-auto"><DispatchDashboard /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute adminOnly>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={true} />
                <main className="flex-1 overflow-auto"><AnalyticsDashboard /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin/support" element={
            <ProtectedRoute adminOnly>
              <div className="flex min-h-[calc(100vh-64px)]">
                <Sidebar isAdmin={true} />
                <main className="flex-1 overflow-auto"><SupportCenter isAdmin /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute adminOnly>
              <Reports />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
