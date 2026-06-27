import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Key, ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import API from '../utils/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // Password visibility states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Input refs
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const toggleNewPassword = (e) => {
    e.preventDefault();
    const input = newPasswordRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      setShowNewPassword(prev => !prev);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start, end);
      }, 0);
    } else {
      setShowNewPassword(prev => !prev);
    }
  };

  const toggleConfirmPassword = (e) => {
    e.preventDefault();
    const input = confirmPasswordRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      setShowConfirmPassword(prev => !prev);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start, end);
      }, 0);
    } else {
      setShowConfirmPassword(prev => !prev);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setSuccess('');
    setLoading(true);
    setDevOtp('');

    try {
      const res = await API.post('/auth/forgot-password', { email });
      if (res.data.otp) {
        setDevOtp(res.data.otp);
        setSuccess('Reset OTP generated (Dev Sandbox Mode)');
      } else {
        setSuccess('Reset Link Sent Successfully');
      }
      setTimeout(() => {
        setSuccess('');
        setStep(2);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Account not found or system error.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await API.post('/auth/verify-otp', { email, otp });
      setSuccess('OTP Verified Successfully');
      setResetToken(res.data.resetToken);
      setTimeout(() => {
        setSuccess('');
        setStep(3);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await API.post('/auth/reset-password', {
        resetToken,
        newPassword,
        confirmPassword
      });
      setSuccess('Password Reset Successfully');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-warmgray-50 dark:bg-warmgray-900 transition-colors">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-warmgray-100 shadow-xl dark:bg-warmgray-850 dark:border-warmgray-700 space-y-6 animate-slideup">
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-warmgray-450 hover:text-brand-500 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">
            {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'Reset Password'}
          </h2>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">
            {step === 1 ? 'Enter your email address to receive a secure OTP code' :
             step === 2 ? `Enter the 6-digit OTP code sent to ${email}` :
             'Create a secure new password for your account'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-150 dark:bg-red-950/35 dark:text-red-400 dark:border-red-900/50 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-150 dark:bg-green-950/35 dark:text-green-400 dark:border-green-900/50 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Step 1 Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/10 focus:outline-none transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Request Reset OTP'}
            </button>
          </form>
        )}

        {/* Step 2 Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {devOtp && (
              <div className="p-4 bg-brand-50/50 border border-brand-100 dark:bg-brand-950/10 dark:border-brand-900/40 rounded-2xl space-y-1.5 animate-slideup">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">⚡ Developer Sandbox Mode</p>
                <p className="text-xs text-warmgray-600 dark:text-warmgray-300">
                  SMTP is not configured. Retrieve your generated OTP code:
                </p>
                <div className="text-center py-2 bg-white rounded-xl border border-brand-200 text-lg font-mono font-bold tracking-widest text-brand-600 dark:bg-warmgray-800 dark:border-warmgray-750 dark:text-brand-400">
                  {devOtp}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">OTP Code</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white text-center font-bold tracking-widest text-lg font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/10 focus:outline-none transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setDevOtp('');
                }}
                className="text-xs font-bold text-warmgray-450 hover:text-brand-500 transition-colors"
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* Step 3 Form */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
                <input
                  ref={newPasswordRef}
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={toggleNewPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warmgray-400 hover:text-warmgray-600 focus:outline-none transition-all duration-200 active:scale-90 flex items-center justify-center"
                  aria-label={showNewPassword ? "Hide Password" : "Show Password"}
                  title={showNewPassword ? "Hide Password" : "Show Password"}
                >
                  <div className="relative w-5 h-5">
                    <EyeOff className={`absolute inset-0 w-full h-full transition-all duration-200 ${showNewPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-12 pointer-events-none'}`} />
                    <Eye className={`absolute inset-0 w-full h-full transition-all duration-200 ${!showNewPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 rotate-12 pointer-events-none'}`} />
                  </div>
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-450" />
                <input
                  ref={confirmPasswordRef}
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={toggleConfirmPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warmgray-400 hover:text-warmgray-600 focus:outline-none transition-all duration-200 active:scale-90 flex items-center justify-center"
                  aria-label={showConfirmPassword ? "Hide Password" : "Show Password"}
                  title={showConfirmPassword ? "Hide Password" : "Show Password"}
                >
                  <div className="relative w-5 h-5">
                    <EyeOff className={`absolute inset-0 w-full h-full transition-all duration-200 ${showConfirmPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-12 pointer-events-none'}`} />
                    <Eye className={`absolute inset-0 w-full h-full transition-all duration-200 ${!showConfirmPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 rotate-12 pointer-events-none'}`} />
                  </div>
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/10 focus:outline-none transition-colors disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
