import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Phone, MapPin } from 'lucide-react';
import API from '../utils/api';

const LoginRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('customer'); // Default to customer
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync with query params
  useEffect(() => {
    if (searchParams.get('register') === 'true') {
      setIsRegister(true);
    } else {
      setIsRegister(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        // Register API call
        const res = await API.post('/auth/register', { name, email, password, phone, address, role });
        localStorage.setItem('sharadha_token', res.data.token);
        localStorage.setItem('sharadha_user', JSON.stringify(res.data.user));
        
        setSuccess('Registration successful! Redirecting...');
        setTimeout(() => {
          if (res.data.user.role === 'admin') navigate('/admin');
          else navigate('/dashboard');
          window.location.reload();
        }, 1500);

      } else {
        // Login API call
        const res = await API.post('/auth/login', { email, password });
        localStorage.setItem('sharadha_token', res.data.token);
        localStorage.setItem('sharadha_user', JSON.stringify(res.data.user));
        
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          if (res.data.user.role === 'admin') navigate('/admin');
          else navigate('/dashboard');
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for easy user testing!
  const fillCredentials = (type) => {
    if (type === 'admin') {
      setEmail('admin@sharadha.com');
      setPassword('admin123');
      setRole('admin');
      setIsRegister(false);
    } else {
      setEmail('customer@example.com');
      setPassword('customer123');
      setRole('customer');
      setIsRegister(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-warmgray-50 dark:bg-warmgray-900 transition-colors">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-warmgray-100 shadow-xl dark:bg-warmgray-850 dark:border-warmgray-700 space-y-6 animate-slideup">
        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">
            {isRegister ? 'Sign up to subscribe to fresh meals' : 'Access your dashboard and order tracking'}
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-150 dark:bg-red-950/35 dark:text-red-400 dark:border-red-900/50">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-150 dark:bg-green-950/35 dark:text-green-400 dark:border-green-900/50">
            {success}
          </div>
        )}

        {/* Quick Credentials Picker for Testing */}
        <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100 dark:bg-brand-950/10 dark:border-brand-900/40 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">⚡ Developer Quick Test Access</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fillCredentials('customer')}
              className="px-3 py-1.5 bg-white hover:bg-brand-100/40 text-[11px] font-bold rounded-xl border border-brand-200 text-brand-700 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-brand-300 transition-colors"
            >
              Fill Customer Login
            </button>
            <button
              onClick={() => fillCredentials('admin')}
              className="px-3 py-1.5 bg-white hover:bg-brand-100/40 text-[11px] font-bold rounded-xl border border-brand-200 text-brand-700 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-brand-300 transition-colors"
            >
              Fill Admin Login
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  className="w-full pl-10 pr-4 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full pl-10 pr-4 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warmgray-400 hover:text-warmgray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-4 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Delivery Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4.5 h-4.5 text-warmgray-400" />
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Flat 402, Sunshine Apts, Adyar, Chennai - 600020"
                    className="w-full pl-10 pr-4 py-2 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white resize-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Signup Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
                >
                  <option value="customer">Customer (Buy / Manage Subscriptions)</option>
                  <option value="admin">Administrator (Manager Panel)</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/10 focus:outline-none transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : 'New to Sharadha? Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRegister;
