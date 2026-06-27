import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginRegister = lazy(() => import('./pages/LoginRegister'));
const ProductCatalog = lazy(() => import('./pages/ProductCatalog'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const SubscriptionManagement = lazy(() => import('./pages/SubscriptionManagement'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CustomerManagement = lazy(() => import('./pages/CustomerManagement'));
const ProductManagement = lazy(() => import('./pages/ProductManagement'));
const InventoryManagement = lazy(() => import('./pages/InventoryManagement'));
const DispatchDashboard = lazy(() => import('./pages/DispatchDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const SupportCenter = lazy(() => import('./pages/SupportCenter'));
const MyAccount = lazy(() => import('./pages/MyAccount'));
const Reports = lazy(() => import('./pages/Reports'));
const CancellationManagement = lazy(() => import('./pages/CancellationManagement'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const MyReviews = lazy(() => import('./pages/MyReviews'));
const ReviewsManagement = lazy(() => import('./pages/ReviewsManagement'));

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

        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-warmgray-400 dark:text-warmgray-500 font-medium">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading page...</span>
            </div>
          </div>
        }>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginRegister />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

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
              <ProtectedRoute customerOnly={true}>
                <div className="max-w-7xl mx-auto px-4 py-8">
                  <Cart cart={cart} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute customerOnly={true}>
                <div className="max-w-7xl mx-auto px-4 py-8">
                  <Checkout cart={cart} clearCart={clearCart} />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/my-account" element={<Navigate to="/account" replace />} />

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
            <Route path="/reviews" element={
              <ProtectedRoute customerOnly={true}>
                <div className="flex min-h-[calc(100vh-64px)]">
                  <Sidebar isAdmin={false} />
                  <main className="flex-1 overflow-auto"><MyReviews /></main>
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
            <Route path="/admin/cancellations" element={
              <ProtectedRoute adminOnly>
                <div className="flex min-h-[calc(100vh-64px)]">
                  <Sidebar isAdmin={true} />
                  <main className="flex-1 overflow-auto"><CancellationManagement /></main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/admin/reviews" element={
              <ProtectedRoute adminOnly>
                <div className="flex min-h-[calc(100vh-64px)]">
                  <Sidebar isAdmin={true} />
                  <main className="flex-1 overflow-auto"><ReviewsManagement /></main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/admin/profile" element={
              <ProtectedRoute adminOnly>
                <div className="flex min-h-[calc(100vh-64px)]">
                  <Sidebar isAdmin={true} />
                  <main className="flex-1 overflow-auto"><Profile /></main>
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
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
