import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Phone, MapPin, AlertCircle } from 'lucide-react';
import API from '../utils/api';
import { useToast } from '../utils/ToastContext';

const LoginRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(false);
  const toast = useToast();

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

  // Field validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Shake animation states
  const [emailShake, setEmailShake] = useState(false);
  const [passwordShake, setPasswordShake] = useState(false);

  // DOM Refs
  const passwordRef = useRef(null);

  const triggerEmailShake = () => {
    setEmailShake(true);
    setTimeout(() => setEmailShake(false), 500);
  };

  const triggerPasswordShake = () => {
    setPasswordShake(true);
    setTimeout(() => setPasswordShake(false), 500);
  };

  const handleTogglePassword = (e) => {
    e.preventDefault();
    const input = passwordRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      setShowPassword(prev => !prev);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start, end);
      }, 0);
    } else {
      setShowPassword(prev => !prev);
    }
  };

  // Sync with query params
  useEffect(() => {
    if (searchParams.get('register') === 'true') {
      setIsRegister(true);
    } else {
      setIsRegister(false);
    }
    // Clear errors when toggling modes
    setEmailError('');
    setPasswordError('');
    setError('');
  }, [searchParams]);

  // Reactive email format check
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setEmailError('');
    setPasswordError('');
    setError('');
    setSuccess('');

    // Perform client-side validation
    let hasError = false;
    if (!isRegister) {
      if (!email) {
        setEmailError('Email is required.');
        triggerEmailShake();
        hasError = true;
      } else if (!isEmailValid) {
        setEmailError('Please enter a valid email address.');
        triggerEmailShake();
        hasError = true;
      }

      if (!password) {
        setPasswordError('Password is required.');
        triggerPasswordShake();
        hasError = true;
      }

      if (hasError) return;
    } else {
      if (!name) {
        setError('Full Name is required.');
        hasError = true;
      }
      if (!email) {
        setEmailError('Email is required.');
        triggerEmailShake();
        hasError = true;
      } else if (!isEmailValid) {
        setEmailError('Please enter a valid email address.');
        triggerEmailShake();
        hasError = true;
      }
      if (!password) {
        setPasswordError('Password is required.');
        triggerPasswordShake();
        hasError = true;
      }
      if (!phone) {
        setError('Phone Number is required.');
        hasError = true;
      }
      if (hasError) return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        // Register API call
        const res = await API.post('/auth/register', { name, email, password, phone, address, role });
        localStorage.setItem('sharadha_token', res.data.token);
        localStorage.setItem('sharadha_user', JSON.stringify(res.data.user));
        
        toast.success(`✅ Welcome to Sharadha, ${res.data.user.name}!`);
        const from = location.state?.from?.pathname || (res.data.user.role === 'admin' ? '/admin' : '/dashboard');
        setTimeout(() => {
          navigate(from, { replace: true });
          window.location.reload();
        }, 1000);

      } else {
        // Login API call
        const res = await API.post('/auth/login', { email, password });
        localStorage.setItem('sharadha_token', res.data.token);
        localStorage.setItem('sharadha_user', JSON.stringify(res.data.user));
        
        toast.success(`✅ Welcome back, ${res.data.user.name}!`);
        const from = location.state?.from?.pathname || (res.data.user.role === 'admin' ? '/admin' : '/dashboard');
        setTimeout(() => {
          navigate(from, { replace: true });
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      
      let backendError = 'Authentication failed. Please check your credentials.';
      let field = null;

      if (err.response) {
        backendError = err.response.data?.error || backendError;
        field = err.response.data?.field;
      } else if (err.request) {
        backendError = 'Network error. Please check your internet connection and try again.';
      } else {
        backendError = err.message || backendError;
      }

      if (field === 'email') {
        setEmailError(backendError);
        toast.error(`❌ ${backendError}`);
        triggerEmailShake();
      } else if (field === 'password') {
        setPasswordError(backendError);
        toast.error(`⚠️ ${backendError}`);
        triggerPasswordShake();
        setPassword('');
        setTimeout(() => {
          passwordRef.current?.focus();
        }, 50);
      } else {
        setError(backendError);
        toast.error(`❌ ${backendError}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for easy user testing!
  const fillCredentials = (type) => {
    setEmailError('');
    setPasswordError('');
    setError('');
    
    if (type === 'admin') {
      setEmail('admin@sharadafoodhub.com');
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

        {/* General/Registration Notifications */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-150 dark:bg-red-950/35 dark:text-red-400 dark:border-red-900/50 animate-fadein">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-150 dark:bg-green-950/35 dark:text-green-400 dark:border-green-900/50 animate-fadein">
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

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  className="w-full pl-10 pr-4 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
                />
              </div>
            </div>
          )}
          <div className={`space-y-1 ${emailShake ? 'animate-shake' : ''}`}>
            <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Email Address</label>
            <div className="relative">
              {emailError ? (
                <AlertCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-red-500" />
              ) : (
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="customer@example.com"
                className={`w-full pl-10 pr-4 py-3 bg-warmgray-50 rounded-xl border ${
                  emailError
                    ? 'border-red-500 focus:border-red-500 dark:border-red-500'
                    : 'border-warmgray-200 focus:border-brand-500 dark:border-warmgray-700'
                } dark:bg-warmgray-800 dark:text-white focus:outline-none`}
              />
            </div>
            
            {/* Real-time Validation Indicator */}
            <div className="text-[11px] mt-1 font-medium">
              {email ? (
                isEmailValid ? (
                  <span className="text-green-600 dark:text-green-400">✓ Valid email</span>
                ) : (
                  <span className="text-red-500 dark:text-red-400">✗ Invalid email format</span>
                )
              ) : (
                <span className="text-red-500 dark:text-red-400">✗ Empty</span>
              )}
            </div>

            {/* Error Message */}
            {emailError && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">{emailError}</p>
            )}
          </div>

          <div className={`space-y-1 ${passwordShake ? 'animate-shake' : ''}`}>
            <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Password</label>
            <div className="relative">
              {passwordError ? (
                <AlertCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-red-500" />
              ) : (
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
              )}
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-3 bg-warmgray-50 rounded-xl border ${
                  passwordError
                    ? 'border-red-500 focus:border-red-500 dark:border-red-500'
                    : 'border-warmgray-200 focus:border-brand-500 dark:border-warmgray-700'
                } dark:bg-warmgray-800 dark:text-white focus:outline-none`}
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warmgray-400 hover:text-warmgray-600 focus:outline-none transition-all duration-200 active:scale-90 flex items-center justify-center"
                aria-label={showPassword ? "Hide Password" : "Show Password"}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                <div className="relative w-5 h-5">
                  <EyeOff className={`absolute inset-0 w-full h-full transition-all duration-200 ${showPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-12 pointer-events-none'}`} />
                  <Eye className={`absolute inset-0 w-full h-full transition-all duration-200 ${!showPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 rotate-12 pointer-events-none'}`} />
                </div>
              </button>
            </div>

            {/* Real-time Validation Indicator */}
            <div className="text-[11px] mt-1 font-medium">
              {password ? (
                <span className="text-green-600 dark:text-green-400">✓ Entered</span>
              ) : (
                <span className="text-red-500 dark:text-red-400">✗ Empty</span>
              )}
            </div>

            {/* Error Message */}
            {passwordError && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">{passwordError}</p>
            )}
          </div>

          {!isRegister && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[11px] font-bold text-warmgray-400 hover:text-brand-500 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {isRegister && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
                  <input
                    type="tel"
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
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/10 focus:outline-none transition-colors mt-4 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : isRegister ? (
              'Register Account'
            ) : (
              'Sign In'
            )}
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
