import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Phone, MapPin, Mail, ShieldCheck, Save, AlertCircle,
  Plus, Trash2, Edit2, CreditCard, Lock, Bell, Shield, Heart,
  Headphones, LogOut, ChevronRight, CheckCircle2, Key, Star, ShoppingBag, RefreshCw, Sparkles,
  Eye, EyeOff
} from 'lucide-react';
import API from '../utils/api';
import Sidebar from '../components/Sidebar';
import { calculateMembership, MEMBERSHIP_TIERS } from '../utils/membership';

const MyAccount = () => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Tabs for the main panel
  const [activeTab, setActiveTab] = useState('profile'); // profile, addresses, subscriptions, orders, payments, settings, rewards, security

  // Profile Form States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profilePic, setProfilePic] = useState(() => {
    return localStorage.getItem(`sharadha_pic_${user?.id}`) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Address Management States
  const [addresses, setAddresses] = useState([]);
  const [addressTitle, setAddressTitle] = useState('');
  const [addressText, setAddressText] = useState('');
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Payment Method States
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [payType, setPayType] = useState('UPI');
  const [payDetail, setPayDetail] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);

  // Subscription and Order Summary States
  const [subscriptions, setSubscriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);

  // Account Settings / Preferences States
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  
  const [privPersonalize, setPrivPersonalize] = useState(true);
  const [privShare, setPrivShare] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Password visibility states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Input refs for changing password
  const oldPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const toggleOldPassword = (e) => {
    e.preventDefault();
    const input = oldPasswordRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      setShowOldPassword(prev => !prev);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start, end);
      }, 0);
    } else {
      setShowOldPassword(prev => !prev);
    }
  };

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

  // Fetch profiles, addresses, payments, subscriptions, and orders
  const loadAccountData = async () => {
    if (!user) return;
    try {
      setLoadingSummaries(true);
      // Fetch dynamic backend summaries
      const [profileRes, subsRes, ordersRes] = await Promise.all([
        API.get('/auth/profile'),
        API.get('/subscriptions'),
        API.get('/orders')
      ]);

      if (profileRes.data.user) {
        const u = profileRes.data.user;
        setProfileName(u.name || '');
        setProfileEmail(u.email || '');
        setProfilePhone(u.phone || '');
        localStorage.setItem('sharadha_user', JSON.stringify(u));
      }

      setSubscriptions(subsRes.data.subscriptions || []);
      setOrders(ordersRes.data.orders || []);

      // Load Addresses from LocalStorage
      const storedAddrs = localStorage.getItem(`sharadha_addresses_${user.id}`);
      if (storedAddrs) {
        setAddresses(JSON.parse(storedAddrs));
      } else {
        const defaultList = [
          {
            id: Date.now(),
            title: 'Home Address',
            text: profileRes.data.user.address || 'Flat 402, Sunshine Apts, Adyar, Chennai - 600020',
            isDefault: true
          }
        ];
        setAddresses(defaultList);
        localStorage.setItem(`sharadha_addresses_${user.id}`, JSON.stringify(defaultList));
      }

      // Load Payment Methods from LocalStorage
      const storedPays = localStorage.getItem(`sharadha_payments_${user.id}`);
      if (storedPays) {
        setPaymentMethods(JSON.parse(storedPays));
      } else {
        const defaultPays = [
          { id: 1, type: 'UPI', detail: 'customer@upi', isPreferred: true },
          { id: 2, type: 'Card', detail: 'Visa ending in 4242', isPreferred: false }
        ];
        setPaymentMethods(defaultPays);
        localStorage.setItem(`sharadha_payments_${user.id}`, JSON.stringify(defaultPays));
      }

      // Load Preferences from LocalStorage
      const storedSettings = localStorage.getItem(`sharadha_settings_${user.id}`);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setNotifEmail(settings.notifEmail ?? true);
        setNotifWhatsapp(settings.notifWhatsapp ?? true);
        setNotifSms(settings.notifSms ?? false);
        setPrivPersonalize(settings.privPersonalize ?? true);
        setPrivShare(settings.privShare ?? false);
      }

    } catch (err) {
      console.error('Error loading account summary:', err);
    } finally {
      setLoadingSummaries(false);
    }
  };

  useEffect(() => {
    loadAccountData();

    // Check if redirecting with edit flag
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('edit') === 'true') {
      setIsEditingProfile(true);
    }
  }, []);

  // Sync Preferences to LocalStorage
  const savePreferences = (updated) => {
    localStorage.setItem(`sharadha_settings_${user.id}`, JSON.stringify(updated));
  };

  // Edit Profile Submit
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSubmitting(true);

    try {
      // Find default address to sync to user profile db field
      const defaultAddr = addresses.find(a => a.isDefault)?.text || '';
      const res = await API.put('/auth/profile', {
        name: profileName,
        phone: profilePhone,
        address: defaultAddr
      });

      setProfileSuccess('Profile details updated successfully!');
      localStorage.setItem('sharadha_user', JSON.stringify(res.data.user));
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(''), 2500);
    } catch (err) {
      console.error(err);
      setProfileError(err.response?.data?.error || 'Failed to update profile details.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Avatar Upload Mock
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        localStorage.setItem(`sharadha_pic_${user.id}`, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Address Actions
  const handleAddOrEditAddress = async (e) => {
    e.preventDefault();
    if (!addressTitle.trim() || !addressText.trim()) return;

    let updatedList = [];
    if (editingAddressId) {
      updatedList = addresses.map(addr =>
        addr.id === editingAddressId ? { ...addr, title: addressTitle, text: addressText } : addr
      );
      setEditingAddressId(null);
    } else {
      const newAddr = {
        id: Date.now(),
        title: addressTitle,
        text: addressText,
        isDefault: addresses.length === 0
      };
      updatedList = [...addresses, newAddr];
    }

    setAddresses(updatedList);
    localStorage.setItem(`sharadha_addresses_${user.id}`, JSON.stringify(updatedList));
    setAddressTitle('');
    setAddressText('');
    setShowAddressForm(false);

    // Sync default address to DB
    const defaultAddr = updatedList.find(a => a.isDefault)?.text || '';
    try {
      await API.put('/auth/profile', { name: profileName, phone: profilePhone, address: defaultAddr });
    } catch (err) {
      console.error('Failed to sync default address to backend:', err);
    }
  };

  const handleDeleteAddress = async (id) => {
    const target = addresses.find(a => a.id === id);
    if (!target) return;

    const remaining = addresses.filter(a => a.id !== id);
    let updatedList = [...remaining];

    // If deleted the default, set next available as default
    if (target.isDefault && remaining.length > 0) {
      updatedList = remaining.map((a, idx) => idx === 0 ? { ...a, isDefault: true } : a);
    }

    setAddresses(updatedList);
    localStorage.setItem(`sharadha_addresses_${user.id}`, JSON.stringify(updatedList));

    // Sync default address to DB
    const defaultAddr = updatedList.find(a => a.isDefault)?.text || '';
    try {
      await API.put('/auth/profile', { name: profileName, phone: profilePhone, address: defaultAddr });
    } catch (err) {
      console.error('Failed to sync default address to backend:', err);
    }
  };

  const handleSetDefaultAddress = async (id) => {
    const updatedList = addresses.map(addr =>
      addr.id === id ? { ...addr, isDefault: true } : { ...addr, isDefault: false }
    );
    setAddresses(updatedList);
    localStorage.setItem(`sharadha_addresses_${user.id}`, JSON.stringify(updatedList));

    // Sync default address to DB
    const defaultAddr = updatedList.find(a => a.isDefault)?.text || '';
    try {
      await API.put('/auth/profile', { name: profileName, phone: profilePhone, address: defaultAddr });
    } catch (err) {
      console.error('Failed to sync default address to backend:', err);
    }
  };

  const handleEditAddressInit = (addr) => {
    setEditingAddressId(addr.id);
    setAddressTitle(addr.title);
    setAddressText(addr.text);
    setShowAddressForm(true);
  };

  // Payment Actions
  const handleAddPayment = (e) => {
    e.preventDefault();
    if (!payDetail.trim()) return;

    const newPay = {
      id: Date.now(),
      type: payType,
      detail: payDetail,
      isPreferred: paymentMethods.length === 0
    };

    const updatedList = [...paymentMethods, newPay];
    setPaymentMethods(updatedList);
    localStorage.setItem(`sharadha_payments_${user.id}`, JSON.stringify(updatedList));
    setPayDetail('');
    setShowPayForm(false);
  };

  const handleDeletePayment = (id) => {
    const target = paymentMethods.find(p => p.id === id);
    const remaining = paymentMethods.filter(p => p.id !== id);
    let updatedList = [...remaining];

    if (target?.isPreferred && remaining.length > 0) {
      updatedList = remaining.map((p, idx) => idx === 0 ? { ...p, isPreferred: true } : p);
    }

    setPaymentMethods(updatedList);
    localStorage.setItem(`sharadha_payments_${user.id}`, JSON.stringify(updatedList));
  };

  const handleSetPreferredPayment = (id) => {
    const updatedList = paymentMethods.map(pay =>
      pay.id === id ? { ...pay, isPreferred: true } : { ...pay, isPreferred: false }
    );
    setPaymentMethods(updatedList);
    localStorage.setItem(`sharadha_payments_${user.id}`, JSON.stringify(updatedList));
  };

  // Change Password Action
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    try {
      await API.post('/auth/change-password', {
        currentPassword: oldPassword,
        newPassword: newPassword,
        confirmNewPassword: confirmPassword
      });
      setPasswordSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError(err.response?.data?.error || 'Failed to change password. Please check your credentials.');
    }
  };

  // Logout Action
  const handleLogout = () => {
    localStorage.removeItem('sharadha_token');
    localStorage.removeItem('sharadha_user');
    navigate('/login');
    window.location.reload();
  };

  if (!user) {
    return <div className="text-center py-20 text-warmgray-400">Please log in to access account details.</div>;
  }

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const pausedSubs = subscriptions.filter(s => s.status === 'paused');
  const historySubs = subscriptions.filter(s => s.status === 'cancelled' || s.status === 'expired');

  const totalSavings = activeSubs.reduce((sum, s) => sum + Math.round((s.product_price || 150) * 0.15), 0) + (orders.length * 20);
  const membership = calculateMembership(subscriptions, orders);
  const loyaltyStatus = membership.currentTier.name;

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar isAdmin={false} />
      <main className="flex-1 overflow-auto bg-warmgray-50 dark:bg-warmgray-900 transition-colors p-4 sm:p-6 md:p-8 max-w-7xl mx-auto animate-fadein">
        
        {/* Title */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">My Account</h1>
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Manage your profile, addresses, active subscriptions, and settings</p>
          </div>
          <button
            onClick={handleLogout}
            className="md:hidden px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors dark:bg-red-950/30 dark:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Left Column: Account Quick Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-xl dark:bg-warmgray-850 dark:border-warmgray-700 flex flex-col items-center text-center space-y-4">
              
              {/* Profile Picture */}
              <div className="relative group">
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-brand-100 dark:border-warmgray-750"
                  loading="lazy"
                />
                <label className="absolute bottom-0 right-0 p-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-full cursor-pointer shadow-md transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                  <input type="file" onChange={handleAvatarChange} accept="image/*" className="hidden" />
                </label>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-warmgray-900 dark:text-white font-display">{profileName}</h3>
                <p className="text-xs text-warmgray-450 dark:text-warmgray-400 truncate max-w-[180px]">{profileEmail}</p>
                <p className="text-[10px] text-warmgray-400 font-semibold">{profilePhone}</p>
              </div>

              {/* Loyalty Status */}
              <div className="w-full pt-4 border-t border-warmgray-50 dark:border-warmgray-750 flex flex-col items-center space-y-1">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${membership.currentTier.badgeClass}`}>
                  <span>{membership.currentTier.icon}</span>
                  <span>{membership.currentTier.name}</span>
                </span>
                <span className="text-[10px] text-warmgray-400">Total Savings: <span className="font-bold text-green-600 dark:text-green-400">₹{totalSavings}</span></span>
              </div>

              {/* Sidebar Tabs Selectors */}
              <div className="w-full pt-4 border-t border-warmgray-50 dark:border-warmgray-750 flex flex-col gap-1 text-left">
                {[
                  { id: 'profile', label: 'Profile Information', icon: User },
                  { id: 'addresses', label: 'Address Book', icon: MapPin },
                  { id: 'subscriptions', label: 'Subscriptions Summary', icon: RefreshCw },
                  { id: 'orders', label: 'Orders Summary', icon: ShoppingBag },
                  { id: 'payments', label: 'Payment Details', icon: CreditCard },
                  { id: 'settings', label: 'Account Settings', icon: Bell },
                  { id: 'rewards', label: 'Rewards & Benefits', icon: Heart },
                  { id: 'security', label: 'Security & Password', icon: Lock }
                ].map(tab => {
                  const IconComp = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsEditingProfile(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
                          : 'text-warmgray-600 hover:bg-warmgray-50 dark:text-warmgray-400 dark:hover:bg-warmgray-800'
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <IconComp className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${isActive ? 'rotate-90 text-brand-500' : 'text-warmgray-350'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full mt-2 py-2 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors dark:bg-red-950/30 dark:text-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Account</span>
              </button>

            </div>
          </div>

          {/* Right Column: Tab View Panels */}
          <div className="lg:col-span-3">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-warmgray-100 shadow-xl dark:bg-warmgray-850 dark:border-warmgray-700 min-h-[500px] flex flex-col justify-between">
              
              {/* Tab 1: Profile Information */}
              {activeTab === 'profile' && (
                <div className="space-y-6 animate-fadein">
                  <div className="flex justify-between items-center border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
                    <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                      <User className="w-5 h-5 text-brand-500" />
                      <span>Profile Information</span>
                    </h2>
                    {!isEditingProfile && (
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 font-bold rounded-xl text-xs dark:bg-brand-950/40 dark:text-brand-400 transition-colors"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {profileSuccess && (
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl text-xs font-semibold dark:bg-green-950/40 dark:text-green-400">
                      {profileSuccess}
                    </div>
                  )}

                  {!isEditingProfile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider block">Full Name</span>
                        <p className="font-semibold text-warmgray-800 dark:text-white text-sm bg-warmgray-50 dark:bg-warmgray-900 p-3 rounded-xl border border-warmgray-100 dark:border-warmgray-800">{profileName}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider block">Email Address</span>
                        <p className="font-semibold text-warmgray-800 dark:text-white text-sm bg-warmgray-50 dark:bg-warmgray-900 p-3 rounded-xl border border-warmgray-100 dark:border-warmgray-800">{profileEmail}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider block">Mobile Number</span>
                        <p className="font-semibold text-warmgray-800 dark:text-white text-sm bg-warmgray-50 dark:bg-warmgray-900 p-3 rounded-xl border border-warmgray-100 dark:border-warmgray-800">{profilePhone}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider block">Primary Shipping Address</span>
                        <p className="font-semibold text-warmgray-800 dark:text-white text-sm bg-warmgray-50 dark:bg-warmgray-900 p-3 rounded-xl border border-warmgray-100 dark:border-warmgray-800 leading-relaxed truncate-2-lines min-h-[46px]">
                          {addresses.find(a => a.isDefault)?.text || 'No address set. Select Address Book tab to configure one.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                      {profileError && (
                        <div className="p-3 bg-red-50 text-red-650 rounded-xl flex items-center space-x-1.5 dark:bg-red-950/45 dark:text-red-400">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{profileError}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-bold text-warmgray-550 block">Full Name</label>
                          <input
                            type="text"
                            required
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-warmgray-50 border border-warmgray-200 rounded-xl font-semibold dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-warmgray-550 block">Phone Number</label>
                          <input
                            type="tel"
                            required
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            className="w-full px-4 py-2.5 bg-warmgray-50 border border-warmgray-200 rounded-xl font-semibold dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 border border-warmgray-205 text-warmgray-500 rounded-xl font-bold hover:bg-warmgray-50 dark:border-warmgray-750 dark:hover:bg-warmgray-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={profileSubmitting}
                          className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                          {profileSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="bg-brand-50/20 p-5 rounded-2xl border border-brand-100 dark:bg-brand-950/10 dark:border-brand-900/40 space-y-2 mt-4">
                    <h4 className="text-xs font-bold text-brand-700 dark:text-brand-400">🛡️ Account Protection</h4>
                    <p className="text-[11px] text-warmgray-600 dark:text-warmgray-300 leading-relaxed">
                      Your identity and contact details are fully encrypted. To change your registered email ID, please contact customer support or raise a help ticket.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Address Management */}
              {activeTab === 'addresses' && (
                <div className="space-y-6 animate-fadein">
                  <div className="flex justify-between items-center border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
                    <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-brand-500" />
                      <span>Saved Shipping Addresses</span>
                    </h2>
                    {!showAddressForm && (
                      <button
                        onClick={() => {
                          setEditingAddressId(null);
                          setAddressTitle('');
                          setAddressText('');
                          setShowAddressForm(true);
                        }}
                        className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 font-bold rounded-xl text-xs dark:bg-brand-950/40 dark:text-brand-400 flex items-center space-x-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New</span>
                      </button>
                    )}
                  </div>

                  {showAddressForm && (
                    <form onSubmit={handleAddOrEditAddress} className="p-4 bg-warmgray-50 rounded-2xl border border-warmgray-150 dark:bg-warmgray-900 dark:border-warmgray-800 space-y-4 text-xs">
                      <h3 className="font-bold text-warmgray-800 dark:text-white">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-warmgray-500 uppercase tracking-wider mb-1">Address Label (e.g. Home, Office)</label>
                          <input
                            type="text"
                            required
                            placeholder="Home Address, Office Address..."
                            value={addressTitle}
                            onChange={(e) => setAddressTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-warmgray-200 rounded-xl font-semibold dark:bg-warmgray-850 dark:border-warmgray-750 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-warmgray-500 uppercase tracking-wider mb-1">Full Delivery Address</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Flat Number, Building Name, Street, Locality, City, PIN Code..."
                            value={addressText}
                            onChange={(e) => setAddressText(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-warmgray-200 rounded-xl font-semibold dark:bg-warmgray-850 dark:border-warmgray-750 dark:text-white resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddressForm(false)}
                          className="px-3.5 py-1.5 border border-warmgray-200 hover:bg-warmgray-100 rounded-xl text-warmgray-500 font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl"
                        >
                          {editingAddressId ? 'Update Address' : 'Save Address'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-4">
                    {addresses.length === 0 ? (
                      <p className="text-xs text-warmgray-400">No saved addresses found. Please add an address to streamline your deliveries.</p>
                    ) : (
                      addresses.map(addr => (
                        <div key={addr.id} className="p-4 bg-white rounded-2xl border border-warmgray-150 dark:bg-warmgray-800 dark:border-warmgray-750 flex justify-between items-start gap-4">
                          <div className="space-y-1 text-xs flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-warmgray-800 dark:text-white">{addr.title}</h4>
                              {addr.isDefault && (
                                <span className="px-2 py-0.5 bg-brand-50 text-brand-650 text-[9px] font-bold uppercase tracking-wider rounded-md dark:bg-brand-950/40 dark:text-brand-400">Default Delivery</span>
                              )}
                            </div>
                            <p className="text-warmgray-600 dark:text-warmgray-300 font-medium leading-relaxed">{addr.text}</p>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            {!addr.isDefault && (
                              <button
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-[10px] font-bold text-brand-500 hover:underline px-2 py-1 rounded-lg hover:bg-brand-50/50"
                              >
                                Set default
                              </button>
                            )}
                            <button
                              onClick={() => handleEditAddressInit(addr)}
                              className="p-1.5 text-warmgray-400 hover:text-brand-500 hover:bg-warmgray-50 rounded-lg dark:hover:bg-warmgray-750"
                              title="Edit address"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-1.5 text-warmgray-400 hover:text-red-600 hover:bg-red-50 rounded-lg dark:hover:bg-red-950/30"
                              title="Delete address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Subscription Summary */}
              {activeTab === 'subscriptions' && (
                <div className="space-y-6 animate-fadein">
                  <div className="flex justify-between items-center border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
                    <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                      <RefreshCw className="w-5 h-5 text-brand-500" />
                      <span>Subscription Summary</span>
                    </h2>
                    <Link
                      to="/subscriptions"
                      className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Go to Planner ➜
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-50/40 p-4 rounded-2xl border border-green-100 dark:bg-green-950/20 dark:border-green-900/30">
                      <p className="text-2xl font-black text-green-650 dark:text-green-400">{activeSubs.length}</p>
                      <p className="text-[9px] font-bold text-warmgray-450 uppercase tracking-widest mt-1">Active Subscriptions</p>
                    </div>
                    <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30">
                      <p className="text-2xl font-black text-amber-650 dark:text-amber-400">{pausedSubs.length}</p>
                      <p className="text-[9px] font-bold text-warmgray-450 uppercase tracking-widest mt-1">Paused Subscriptions</p>
                    </div>
                    <div className="bg-warmgray-50 p-4 rounded-2xl border border-warmgray-100 dark:bg-warmgray-900 dark:border-warmgray-800">
                      <p className="text-2xl font-black text-warmgray-600 dark:text-warmgray-400">{historySubs.length}</p>
                      <p className="text-[9px] font-bold text-warmgray-455 uppercase tracking-widest mt-1">History & Expired</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-warmgray-900 uppercase tracking-wider dark:text-white">Active Subscription Items</h3>
                    {activeSubs.length === 0 ? (
                      <p className="text-xs text-warmgray-400">You do not have any active subscriptions. Visit our Products catalog to set one up!</p>
                    ) : (
                      <div className="space-y-2">
                        {activeSubs.map(sub => (
                          <div key={sub.id} className="p-3.5 bg-warmgray-50 border border-warmgray-150 rounded-2xl dark:bg-warmgray-900 dark:border-warmgray-800 flex justify-between items-center text-xs">
                            <div>
                              <h4 className="font-bold text-warmgray-800 dark:text-white">{sub.product_name}</h4>
                              <p className="text-[10px] text-warmgray-400 capitalize mt-0.5">Frequency: {sub.delivery_frequency} • Next dispatch: {new Date(sub.next_dispatch_date).toLocaleDateString()}</p>
                            </div>
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 font-bold uppercase text-[9px] tracking-wider rounded-md dark:bg-green-950/40 dark:text-green-400">Active</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Order Summary */}
              {activeTab === 'orders' && (
                <div className="space-y-6 animate-fadein">
                  <div className="flex justify-between items-center border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
                    <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                      <ShoppingBag className="w-5 h-5 text-brand-500" />
                      <span>Orders Summary</span>
                    </h2>
                    <Link
                      to="/orders"
                      className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 font-bold rounded-xl text-xs dark:bg-brand-950/40 dark:text-brand-400 transition-colors"
                    >
                      Track Orders
                    </Link>
                  </div>

                  <div className="bg-warmgray-50 p-4 rounded-2xl border border-warmgray-100 dark:bg-warmgray-900 dark:border-warmgray-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-warmgray-700 dark:text-warmgray-300">Total Orders Placed</p>
                      <p className="text-sm text-warmgray-400">Lifetime orders with Sharadha Fine Foods</p>
                    </div>
                    <p className="text-3xl font-black text-brand-500">{orders.length}</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-warmgray-900 uppercase tracking-wider dark:text-white">Recent Orders</h3>
                    {orders.length === 0 ? (
                      <p className="text-xs text-warmgray-400">No orders placed yet.</p>
                    ) : (
                      <div className="overflow-x-auto border border-warmgray-100 rounded-2xl dark:border-warmgray-700">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-warmgray-50 text-warmgray-450 uppercase font-bold tracking-wider dark:bg-warmgray-900">
                              <th className="p-3">Order ID</th>
                              <th className="p-3">Order Date</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Amount Paid</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700 dark:text-warmgray-350">
                            {orders.slice(0, 4).map(order => (
                              <tr key={order.id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-900/30">
                                <td className="p-3 font-bold text-warmgray-900 dark:text-white">OR-{order.id}</td>
                                <td className="p-3">{new Date(order.order_date).toLocaleDateString()}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    order.status === 'completed' ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    {order.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-black text-warmgray-950 dark:text-white">₹{order.total_amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Payment Information */}
              {activeTab === 'payments' && (
                <div className="space-y-6 animate-fadein">
                  <div className="flex justify-between items-center border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
                    <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-brand-500" />
                      <span>Saved Payment Methods</span>
                    </h2>
                    {!showPayForm && (
                      <button
                        onClick={() => {
                          setPayDetail('');
                          setShowPayForm(true);
                        }}
                        className="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-600 font-bold rounded-xl text-xs dark:bg-brand-950/40 dark:text-brand-400 flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Method</span>
                      </button>
                    )}
                  </div>

                  {showPayForm && (
                    <form onSubmit={handleAddPayment} className="p-4 bg-warmgray-50 rounded-2xl border border-warmgray-150 dark:bg-warmgray-900 dark:border-warmgray-800 space-y-4 text-xs">
                      <h3 className="font-bold text-warmgray-800 dark:text-white">Add Payment Method</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-warmgray-500 uppercase tracking-wider mb-1">Type</label>
                          <select
                            value={payType}
                            onChange={(e) => setPayType(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-warmgray-200 rounded-xl font-semibold dark:bg-warmgray-850 dark:border-warmgray-750 dark:text-white"
                          >
                            <option value="UPI">UPI ID</option>
                            <option value="Card">Card</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-warmgray-500 uppercase tracking-wider mb-1">Details</label>
                          <input
                            type="text"
                            required
                            placeholder={payType === 'UPI' ? 'name@upi' : '16-digit card number / expiry'}
                            value={payDetail}
                            onChange={(e) => setPayDetail(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-warmgray-200 rounded-xl font-semibold dark:bg-warmgray-850 dark:border-warmgray-750 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowPayForm(false)}
                          className="px-3.5 py-1.5 border border-warmgray-200 hover:bg-warmgray-100 rounded-xl text-warmgray-500 font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl"
                        >
                          Save Payment
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-4">
                    {paymentMethods.length === 0 ? (
                      <p className="text-xs text-warmgray-400 font-medium">No saved payment options found.</p>
                    ) : (
                      paymentMethods.map(pay => (
                        <div key={pay.id} className="p-4 bg-white rounded-2xl border border-warmgray-150 dark:bg-warmgray-800 dark:border-warmgray-750 flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-brand-50 rounded-xl text-brand-650 dark:bg-brand-950/40 dark:text-brand-400">
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-warmgray-800 dark:text-white">{pay.type} Method</span>
                                {pay.isPreferred && (
                                  <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[8px] font-bold uppercase tracking-wider rounded-md dark:bg-green-950/40 dark:text-green-400">Preferred</span>
                                )}
                              </div>
                              <p className="text-warmgray-500 font-semibold">{pay.detail}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!pay.isPreferred && (
                              <button
                                onClick={() => handleSetPreferredPayment(pay.id)}
                                className="text-[10px] font-bold text-brand-500 hover:underline px-2.5 py-1 rounded-lg hover:bg-brand-50/50"
                              >
                                Use preferred
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePayment(pay.id)}
                              className="p-1.5 text-warmgray-400 hover:text-red-650 hover:bg-red-50 rounded-lg dark:hover:bg-red-950/40"
                              title="Delete payment option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 6: Account Settings */}
              {activeTab === 'settings' && (
                <div className="space-y-6 animate-fadein">
                  <div className="border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
                    <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                      <Bell className="w-5 h-5 text-brand-500" />
                      <span>Account Settings & Preferences</span>
                    </h2>
                  </div>

                  <div className="space-y-6 text-xs font-semibold">
                    {/* Notification Preferences */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-warmgray-450 dark:text-warmgray-400">Notification Channels</h3>
                      <div className="space-y-2.5">
                        <label className="flex items-center justify-between p-3 bg-warmgray-50 dark:bg-warmgray-900 rounded-xl cursor-pointer">
                          <div>
                            <p className="text-warmgray-800 dark:text-white">Email Subscriptions</p>
                            <p className="text-[10px] font-medium text-warmgray-400">Receive receipts, newsletters, and system renewals</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifEmail}
                            onChange={(e) => {
                              setNotifEmail(e.target.checked);
                              savePreferences({ notifEmail: e.target.checked, notifWhatsapp, notifSms, privPersonalize, privShare });
                            }}
                            className="w-4 h-4 text-brand-500 focus:ring-brand-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-warmgray-50 dark:bg-warmgray-900 rounded-xl cursor-pointer">
                          <div>
                            <p className="text-warmgray-800 dark:text-white">WhatsApp Updates</p>
                            <p className="text-[10px] font-medium text-warmgray-400">Instant dispatch dispatches and skip/pause calendar reminders</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifWhatsapp}
                            onChange={(e) => {
                              setNotifWhatsapp(e.target.checked);
                              savePreferences({ notifEmail, notifWhatsapp: e.target.checked, notifSms, privPersonalize, privShare });
                            }}
                            className="w-4 h-4 text-brand-500 focus:ring-brand-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-warmgray-50 dark:bg-warmgray-900 rounded-xl cursor-pointer">
                          <div>
                            <p className="text-warmgray-800 dark:text-white">SMS Notifications</p>
                            <p className="text-[10px] font-medium text-warmgray-400">Receive backup text SMS alerts for delivery dispatches</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifSms}
                            onChange={(e) => {
                              setNotifSms(e.target.checked);
                              savePreferences({ notifEmail, notifWhatsapp, notifSms: e.target.checked, privPersonalize, privShare });
                            }}
                            className="w-4 h-4 text-brand-500 focus:ring-brand-500 rounded"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Privacy Preferences */}
                    <div className="space-y-3 pt-4 border-t border-warmgray-50 dark:border-warmgray-800">
                      <h3 className="text-xs font-black uppercase tracking-wider text-warmgray-455 dark:text-warmgray-400">Privacy & Consent</h3>
                      <div className="space-y-2.5">
                        <label className="flex items-center justify-between p-3 bg-warmgray-50 dark:bg-warmgray-900 rounded-xl cursor-pointer">
                          <div>
                            <p className="text-warmgray-800 dark:text-white">Personalised Product Recommendations</p>
                            <p className="text-[10px] font-medium text-warmgray-400">Allow AI recommendations model to customize combo suggestions</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={privPersonalize}
                            onChange={(e) => {
                              setPrivPersonalize(e.target.checked);
                              savePreferences({ notifEmail, notifWhatsapp, notifSms, privPersonalize: e.target.checked, privShare });
                            }}
                            className="w-4 h-4 text-brand-500 focus:ring-brand-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-warmgray-50 dark:bg-warmgray-900 rounded-xl cursor-pointer">
                          <div>
                            <p className="text-warmgray-800 dark:text-white">Share operational metrics</p>
                            <p className="text-[10px] font-medium text-warmgray-400">Share anonymous diagnostic logs to improve app service speed</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={privShare}
                            onChange={(e) => {
                              setPrivShare(e.target.checked);
                              savePreferences({ notifEmail, notifWhatsapp, notifSms, privPersonalize, privShare: e.target.checked });
                            }}
                            className="w-4 h-4 text-brand-500 focus:ring-brand-500 rounded"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: Rewards & Savings */}
              {activeTab === 'rewards' && (
                <div className="space-y-6 animate-fadein">
                  <div className="border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
                    <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                      <Heart className="w-5 h-5 text-brand-500" />
                      <span>Rewards, Savings & Loyalty</span>
                    </h2>
                  </div>

                  {/* Main Grid: Membership Card & Savings Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Membership status card */}
                    <div className="p-6 bg-gradient-to-br from-brand-500 to-orange-600 text-white rounded-3xl flex flex-col justify-between min-h-[160px] shadow-lg shadow-brand-500/10 animate-fadein">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">Membership Tier</span>
                          <span className="text-xl">{membership.currentTier.icon}</span>
                        </div>
                        <h3 className="text-2xl font-black font-display mt-2">{membership.currentTier.name}</h3>
                      </div>
                      
                      {membership.nextTier ? (
                        <div className="space-y-1.5 mt-4">
                          <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-brand-100">
                            <span>Progress to {membership.nextTier.name}</span>
                            <span>{membership.progress}%</span>
                          </div>
                          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${membership.progress}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-brand-100 font-bold flex items-center space-x-1 mt-4">
                          <Sparkles className="w-3.5 h-3.5 fill-current text-yellow-300" />
                          <span>Highest Rank Achieved! VIP Member benefits active.</span>
                        </p>
                      )}
                    </div>

                    {/* Savings card */}
                    <div className="p-6 bg-warmgray-50 border border-warmgray-150 dark:bg-warmgray-900 dark:border-warmgray-800 rounded-3xl flex flex-col justify-between min-h-[160px]">
                      <div>
                        <span className="text-[9px] font-bold text-warmgray-450 dark:text-warmgray-400 uppercase tracking-widest block">Total Savings Unlocked</span>
                        <p className="text-4xl font-black text-green-600 dark:text-green-400 mt-2">₹{totalSavings}</p>
                      </div>
                      <p className="text-[10.5px] text-warmgray-600 dark:text-warmgray-300 font-medium pt-2 border-t border-warmgray-100 dark:border-warmgray-800/80 leading-relaxed">
                        Saved from active subscription renewals & special combo membership benefits.
                      </p>
                    </div>
                  </div>

                  {/* Loyalty Stats Summary Section */}
                  <div className="bg-white border border-warmgray-100 dark:bg-warmgray-800 dark:border-warmgray-700 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-bold text-warmgray-950 uppercase tracking-wider dark:text-white">Your Loyalty Stats</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-warmgray-50 dark:bg-warmgray-900 rounded-2xl border border-warmgray-100 dark:border-warmgray-750">
                        <p className="text-[9px] text-warmgray-400 uppercase font-bold tracking-wider">Active Subscriptions</p>
                        <p className="text-xl font-black text-warmgray-900 dark:text-white mt-1">{membership.stats.subscriptions}</p>
                      </div>
                      <div className="p-3 bg-warmgray-50 dark:bg-warmgray-900 rounded-2xl border border-warmgray-100 dark:border-warmgray-750">
                        <p className="text-[9px] text-warmgray-400 uppercase font-bold tracking-wider">Total Orders (Non-Cancelled)</p>
                        <p className="text-xl font-black text-warmgray-900 dark:text-white mt-1">{membership.stats.orders}</p>
                      </div>
                      <div className="p-3 bg-warmgray-50 dark:bg-warmgray-900 rounded-2xl border border-warmgray-100 dark:border-warmgray-750">
                        <p className="text-[9px] text-warmgray-400 uppercase font-bold tracking-wider">Total Spending</p>
                        <p className="text-xl font-black text-warmgray-900 dark:text-white mt-1">₹{membership.stats.spending}</p>
                      </div>
                    </div>
                  </div>

                  {/* Compare Tiers / Threshold breakdown */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-warmgray-905 uppercase tracking-wider dark:text-white">Membership Tier Benefits Comparison</h3>
                    <div className="space-y-3">
                      {Object.values(MEMBERSHIP_TIERS).map((tier) => {
                        const isCurrent = membership.currentTier.key === tier.key;
                        const isLocked = !isCurrent && 
                          (membership.stats.subscriptions < tier.thresholds.subscriptions && 
                           membership.stats.orders < tier.thresholds.orders && 
                           membership.stats.spending < tier.thresholds.spending);
                        
                        return (
                          <div 
                            key={tier.key} 
                            className={`p-5 rounded-2xl border transition-all ${
                              isCurrent 
                                ? 'bg-brand-50/20 border-brand-200 dark:bg-brand-950/10 dark:border-brand-900/40 shadow-sm' 
                                : 'bg-white border-warmgray-150 dark:bg-warmgray-800 dark:border-warmgray-750'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warmgray-100 dark:border-warmgray-700/60">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{tier.icon}</span>
                                <h4 className="text-sm font-bold text-warmgray-900 dark:text-white font-display">{tier.name}</h4>
                              </div>
                              <div className="flex items-center space-x-2">
                                {/* Requirements tag */}
                                {tier.key !== 'BRONZE' && (
                                  <span className="text-[9px] text-warmgray-500 font-bold bg-warmgray-100 dark:bg-warmgray-900 px-2 py-0.5 rounded">
                                    Requires: {tier.thresholds.subscriptions} Sub, {tier.thresholds.orders} Orders, or ₹{tier.thresholds.spending} Spend
                                  </span>
                                )}
                                {/* Status Badge */}
                                {isCurrent ? (
                                  <span className="text-[9px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full dark:bg-green-950/40 dark:text-green-400 font-bold uppercase tracking-wider">
                                    Current Rank
                                  </span>
                                ) : isLocked ? (
                                  <span className="text-[9px] bg-warmgray-100 text-warmgray-400 px-2.5 py-0.5 rounded-full dark:bg-warmgray-900 dark:text-warmgray-500 font-bold uppercase tracking-wider">
                                    Locked
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-brand-50 text-brand-600 px-2.5 py-0.5 rounded-full dark:bg-brand-950/20 dark:text-brand-400 font-bold uppercase tracking-wider">
                                    Unlocked
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Benefits list */}
                            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {tier.benefits.map((benefit, bIdx) => (
                                <div key={bIdx} className="flex items-start space-x-2">
                                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isCurrent ? 'text-brand-500' : 'text-green-500'}`} />
                                  <span className="text-warmgray-700 dark:text-warmgray-300 font-medium">{benefit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 8: Security & Change Password */}
              {activeTab === 'security' && (
                <div className="space-y-6 animate-fadein">
                  <div className="border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
                    <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                      <Lock className="w-5 h-5 text-brand-500" />
                      <span>Security & Password settings</span>
                    </h2>
                  </div>

                  <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs font-semibold">
                    <h3 className="text-xs font-black uppercase tracking-wider text-warmgray-450 dark:text-warmgray-400">Change Account Password</h3>

                    {passwordError && (
                      <div className="p-3 bg-red-50 text-red-650 rounded-xl flex items-center space-x-1.5 dark:bg-red-950/45 dark:text-red-400">
                        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                        <span>{passwordError}</span>
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 bg-green-50 text-green-600 rounded-xl dark:bg-green-950/40 dark:text-green-400">
                        {passwordSuccess}
                      </div>
                    )}

                    <div className="space-y-3 max-w-md">
                      <div className="space-y-1">
                        <label className="text-warmgray-500 block">Current Password</label>
                        <div className="relative">
                          <input
                            ref={oldPasswordRef}
                            type={showOldPassword ? 'text' : 'password'}
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-warmgray-50 border border-warmgray-200 rounded-xl dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white focus:outline-none focus:border-brand-500"
                          />
                          <button
                            type="button"
                            onClick={toggleOldPassword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-warmgray-400 hover:text-warmgray-600 focus:outline-none transition-all duration-200 active:scale-90 flex items-center justify-center"
                            aria-label={showOldPassword ? "Hide Password" : "Show Password"}
                            title={showOldPassword ? "Hide Password" : "Show Password"}
                          >
                            <div className="relative w-5 h-5">
                              <EyeOff className={`absolute inset-0 w-full h-full transition-all duration-200 ${showOldPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-12 pointer-events-none'}`} />
                              <Eye className={`absolute inset-0 w-full h-full transition-all duration-200 ${!showOldPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 rotate-12 pointer-events-none'}`} />
                            </div>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-warmgray-500 block">New Password</label>
                        <div className="relative">
                          <input
                            ref={newPasswordRef}
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-warmgray-50 border border-warmgray-200 rounded-xl dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white focus:outline-none focus:border-brand-500"
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
                        <label className="text-warmgray-500 block">Confirm New Password</label>
                        <div className="relative">
                          <input
                            ref={confirmPasswordRef}
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-warmgray-50 border border-warmgray-200 rounded-xl dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white focus:outline-none focus:border-brand-500"
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
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-brand-500/10 flex items-center space-x-1.5"
                    >
                      <Key className="w-4 h-4" />
                      <span>Update Password</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Bottom Support Section (Always present or linked) */}
              <div className="mt-8 pt-6 border-t border-warmgray-100 dark:border-warmgray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-warmgray-50/50 p-4 rounded-2xl dark:bg-warmgray-900/20">
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-warmgray-850 dark:text-white flex items-center space-x-1.5">
                    <Headphones className="w-4 h-4 text-brand-500" />
                    <span>Need Help with Your Account?</span>
                  </h4>
                  <p className="text-[10px] text-warmgray-450 font-medium">Reach out for help with recurring cycles, bulk requests, or order tracking issues.</p>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to="/support"
                    className="px-3.5 py-2 bg-white hover:bg-brand-50 border border-brand-200 text-brand-600 font-bold rounded-xl text-[10px] transition-colors dark:bg-warmgray-800 dark:border-warmgray-750 dark:text-brand-450 dark:hover:bg-warmgray-750"
                  >
                    Raise Ticket
                  </Link>
                  <Link
                    to="/support"
                    className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-[10px] transition-colors"
                  >
                    View Ticket History
                  </Link>
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default MyAccount;
