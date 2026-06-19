import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Calendar, RefreshCw, AlertCircle, Sparkles, MessageCircle,
  ArrowRight, UserCog, User, ClipboardList, ShieldCheck, Play, Pause,
  CreditCard, MapPin, Bell, ShoppingCart, Heart
} from 'lucide-react';
import API from '../utils/api';
import Modal from '../components/Modal';

const CustomerDashboard = () => {
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [subscriptions, setSubscriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Profile editing form states
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // WhatsApp Mocking states
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState('');

  const fetchDashboardData = async () => {
    try {
      const [subsRes, ordersRes, dispatchesRes, aiRes, profileRes, notificationsRes] = await Promise.all([
        API.get('/subscriptions'),
        API.get('/orders'),
        API.get('/dispatches'),
        API.get('/recommendations'),
        API.get('/auth/profile'),
        API.get('/notifications')
      ]);

      setSubscriptions(subsRes.data.subscriptions || []);
      setOrders(ordersRes.data.orders || []);
      setDispatches(dispatchesRes.data.dispatches.filter(d => d.dispatch_status !== 'delivered') || []);
      setAiData(aiRes.data || null);
      setNotifications(notificationsRes.data.notifications || []);

      if (profileRes.data.user) {
        const u = profileRes.data.user;
        setProfileName(u.name || '');
        setProfilePhone(u.phone || '');
        setProfileAddress(u.address || '');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSubmitting(true);
    try {
      const res = await API.put('/auth/profile', {
        name: profileName,
        phone: profilePhone,
        address: profileAddress
      });
      
      setProfileSuccess('Profile updated successfully!');
      localStorage.setItem('sharadha_user', JSON.stringify(res.data.user));
      setTimeout(() => {
        setProfileModalOpen(false);
        setProfileSuccess('');
      }, 1200);
    } catch (err) {
      console.error(err);
      setProfileError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleToggleSubscription = async (id, currentStatus) => {
    try {
      const endpoint = currentStatus === 'active' ? `/subscriptions/${id}/pause` : `/subscriptions/${id}/resume`;
      await API.put(endpoint);
      fetchDashboardData();
    } catch (err) {
      console.error('Error toggling subscription:', err);
    }
  };

  const getUpcomingSchedule = (subs) => {
    const schedule = [];
    const activeSubs = subs.filter(s => s.status === 'active');
    
    activeSubs.forEach(sub => {
      let currentDate = new Date(sub.next_dispatch_date);
      for (let i = 0; i < 3; i++) {
        schedule.push({
          id: `${sub.id}-${i}`,
          product_name: sub.product_name,
          date: new Date(currentDate),
          frequency: sub.delivery_frequency
        });
        
        if (sub.delivery_frequency === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (sub.delivery_frequency === 'bi-weekly') {
          currentDate.setDate(currentDate.getDate() + 14);
        } else if (sub.delivery_frequency === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
    });
    
    return schedule.sort((a, b) => a.date - b.date).slice(0, 5);
  };

  const handleSendWhatsapp = async () => {
    if (!aiData?.reminderMessage || !profilePhone) return;
    setSendingWhatsapp(true);
    setWhatsappResult('');

    try {
      await API.post('/notifications/whatsapp', {
        phone: profilePhone,
        message: aiData.reminderMessage
      });
      setWhatsappResult(`WhatsApp Mock Sent! See terminal console logs.`);
      setTimeout(() => setWhatsappResult(''), 3000);
    } catch (err) {
      console.error('WhatsApp mock error:', err);
      setWhatsappResult('Failed to dispatch mockup WhatsApp message.');
    } finally {
      setSendingWhatsapp(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-warmgray-400">Loading your dashboard...</div>;
  }

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const pausedSubs = subscriptions.filter(s => s.status === 'paused');
  const upcomingDeliveriesCount = getUpcomingSchedule(subscriptions).length;

  // Profile completion metric calculation
  let profileCompletion = 0;
  if (profileName) profileCompletion += 33;
  if (profilePhone) profileCompletion += 33;
  if (profileAddress) profileCompletion += 34;

  const totalSavings = activeSubs.reduce((sum, s) => sum + Math.round((s.product_price || 0) * 0.15), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadein">
      
      {/* 1. Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-50 to-orange-100/35 p-6 rounded-3xl border border-brand-100 dark:from-warmgray-850 dark:to-warmgray-800 dark:border-warmgray-700">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Welcome, {profileName}!</h1>
          <p className="text-sm text-warmgray-600 dark:text-warmgray-300">We're glad to have you back! Handcrafted traditional southern delicacies prepared with love.</p>
          <span className="inline-block mt-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-brand-500 text-white shadow-sm">
            {activeSubs.length > 0 ? '👑 Premium Subscription Member' : '🌱 Standard Member'}
          </span>
        </div>
        <Link
          to="/account?edit=true"
          className="px-4 py-2 bg-white hover:bg-brand-50 text-brand-600 border border-brand-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-brand-400 dark:hover:bg-warmgray-750"
        >
          <UserCog className="w-4.5 h-4.5" />
          <span>Edit Profile Details</span>
        </Link>
      </div>

      {/* 2. Dashboard Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-805 dark:border-warmgray-700 flex items-center space-x-4">
          <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-warmgray-900 dark:text-white">{activeSubs.length}</p>
            <p className="text-[10px] font-bold text-warmgray-450 uppercase tracking-widest">Active Subscriptions</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-805 dark:border-warmgray-700 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 dark:bg-orange-950/40">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-warmgray-900 dark:text-white">{orders.length}</p>
            <p className="text-[10px] font-bold text-warmgray-450 uppercase tracking-widest">Total Orders Placed</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-805 dark:border-warmgray-700 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 dark:bg-amber-950/40">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-warmgray-900 dark:text-white">{upcomingDeliveriesCount}</p>
            <p className="text-[10px] font-bold text-warmgray-455 uppercase tracking-widest">Upcoming Deliveries</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-805 dark:border-warmgray-700 flex items-center space-x-4">
          <div className="p-3 bg-green-50 rounded-2xl text-green-600 dark:bg-green-950/40">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-green-600 dark:text-green-400">₹{totalSavings}</p>
            <p className="text-[10px] font-bold text-warmgray-455 uppercase tracking-widest">Monthly Savings</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-805 dark:border-warmgray-700 flex items-center space-x-4">
          <div className="p-3 bg-red-50 rounded-2xl text-red-650 dark:bg-red-950/40">
            <AlertCircle className="w-6 h-6 text-red-650" />
          </div>
          <div>
            <p className="text-2xl font-black text-red-650">{orders.filter(o => o.status === 'cancelled').length}</p>
            <p className="text-[10px] font-bold text-warmgray-455 uppercase tracking-widest">Cancelled Orders</p>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 3. Upcoming Deliveries Widget */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-brand-500" />
                <span>Upcoming Deliveries Calendar</span>
              </h2>
              <span className="text-[9px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md dark:bg-brand-950/40 dark:text-brand-400 font-bold uppercase tracking-wider">Next 5 Shipments</span>
            </div>
            {getUpcomingSchedule(subscriptions).length === 0 ? (
              <p className="text-xs text-warmgray-400">No active subscriptions to project upcoming deliveries.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {getUpcomingSchedule(subscriptions).map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl border border-warmgray-100 bg-gradient-to-br from-warmgray-50/50 to-warmgray-50 dark:from-warmgray-850/50 dark:to-warmgray-850 dark:border-warmgray-750 flex flex-col justify-between space-y-3 hover:scale-[1.01] transition-transform">
                    <div>
                      <span className="text-[9px] bg-brand-50 text-brand-650 px-2 py-0.5 rounded-md dark:bg-brand-950/40 dark:text-brand-400 font-bold uppercase tracking-wider">
                        {item.frequency}
                      </span>
                      <h4 className="text-xs font-bold text-warmgray-800 dark:text-white truncate mt-2">{item.product_name}</h4>
                    </div>
                    <div className="pt-2 border-t border-warmgray-100 dark:border-warmgray-700/60 flex items-center space-x-1.5 text-[10px] text-warmgray-600 dark:text-warmgray-300 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      <span>{item.date.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Active Subscriptions Section */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
            <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-brand-500" />
              <span>Active Subscriptions</span>
            </h2>
            {subscriptions.length === 0 ? (
              <p className="text-xs text-warmgray-405">You have no subscription plans registered.</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="p-4 bg-warmgray-50 rounded-2xl border border-warmgray-150 dark:bg-warmgray-900 dark:border-warmgray-750 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-warmgray-850 dark:text-white">{sub.product_name}</h4>
                      <p className="text-[10px] text-warmgray-400 capitalize">Frequency: {sub.delivery_frequency} • Next dispatch: {new Date(sub.next_dispatch_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${sub.status === 'active' ? 'bg-green-50 text-green-600 dark:bg-green-950/40' : 'bg-amber-50 text-amber-600'}`}>
                        {sub.status}
                      </span>
                      {sub.status === 'active' ? (
                        <button
                          onClick={() => handleToggleSubscription(sub.id, 'active')}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-750 font-bold rounded-xl text-[10px] flex items-center space-x-1 transition-colors dark:bg-amber-950/30 dark:text-amber-400"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      ) : sub.status === 'paused' ? (
                        <button
                          onClick={() => handleToggleSubscription(sub.id, 'paused')}
                          className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-750 font-bold rounded-xl text-[10px] flex items-center space-x-1 transition-colors dark:bg-green-950/30 dark:text-green-400"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Resume</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Recent Orders Section */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
            <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
              <ClipboardList className="w-5 h-5 text-brand-500" />
              <span>Recent Orders</span>
            </h2>
            {orders.length === 0 ? (
              <p className="text-xs text-warmgray-400">No orders found.</p>
            ) : (
              <div className="overflow-x-auto border border-warmgray-100 rounded-2xl dark:border-warmgray-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-warmgray-50 text-warmgray-450 uppercase font-bold tracking-wider dark:bg-warmgray-900">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700 dark:text-warmgray-300">
                    {orders.slice(0, 3).map(order => (
                      <tr key={order.id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-900/30">
                        <td className="p-3 font-semibold text-warmgray-900 dark:text-white">OR-{order.id}</td>
                        <td className="p-3">{new Date(order.order_date).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-warmgray-950 dark:text-white">₹{order.total_amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 6. Recommended Products & Combos */}
          {aiData && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                <h2 className="text-lg font-bold font-display text-warmgray-900 dark:text-white">Personalized Recommendations</h2>
              </div>
              
              <div className="bg-brand-50/20 p-6 rounded-3xl border border-brand-100 dark:bg-brand-950/10 dark:border-brand-900/40 space-y-4">
                <p className="text-xs text-brand-700 dark:text-brand-300 font-semibold italic">⚡ "{aiData.reason}"</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {aiData.recommendations.map(prod => (
                    <div key={prod.id} className="bg-white p-4 rounded-2xl border border-warmgray-100 dark:bg-warmgray-800 dark:border-warmgray-700 flex gap-3">
                      <img src={prod.image_url} alt={prod.name} className="w-14 h-14 object-cover rounded-xl" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-warmgray-800 dark:text-white truncate">{prod.name}</h4>
                        <p className="text-[10px] text-warmgray-400">{prod.weight} • ₹{prod.price}</p>
                        <Link to={`/products/${prod.id}`} className="text-[10px] text-brand-500 font-bold hover:underline mt-1 block">View Details</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Combos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {aiData.combos.map((combo, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-850 dark:border-warmgray-700 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md dark:bg-brand-950/40 dark:text-brand-400 font-bold uppercase tracking-wider">{combo.discount}</span>
                      <span className="text-sm font-black text-brand-500">₹{combo.price}</span>
                    </div>
                    <h3 className="text-xs font-bold font-display text-warmgray-900 dark:text-white">{combo.name}</h3>
                    <p className="text-[10px] text-warmgray-500 dark:text-warmgray-450 leading-relaxed">{combo.desc}</p>
                    <p className="text-[9px] font-bold text-warmgray-400 truncate">Includes: {combo.products.join(', ')}</p>
                    <Link to="/catalog" className="inline-flex items-center text-[10px] text-brand-500 font-bold hover:underline">
                      <span>View in catalog</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-8">
          
          {/* 7. Quick Actions */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
            <h3 className="text-sm font-bold font-display text-warmgray-900 dark:text-white border-b border-warmgray-50 dark:border-warmgray-700 pb-3">Quick Actions</h3>
            <div className="flex flex-col gap-2.5">
              <Link to="/catalog" className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400 flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4" />
                <span>🛒 Browse Products</span>
              </Link>
              <Link to="/cart" className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400 flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4" />
                <span>🛍️ View Cart</span>
              </Link>
              <Link to="/subscriptions" className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400 flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>🔄 Manage Subscription</span>
              </Link>
              <Link to="/orders" className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400 flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>📦 Track Orders</span>
              </Link>
              <Link to="/support" className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400 flex items-center space-x-2">
                <MessageCircle className="w-4 h-4" />
                <span>💬 Contact Support</span>
              </Link>
            </div>
          </div>

          {/* 8. Notifications Panel */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
            <h3 className="text-sm font-bold font-display text-warmgray-900 dark:text-white border-b border-warmgray-50 dark:border-warmgray-700 pb-3 flex items-center space-x-1.5">
              <Bell className="w-4.5 h-4.5 text-brand-500" />
              <span>Notifications Panel</span>
            </h3>
            {notifications.length === 0 ? (
              <p className="text-xs text-warmgray-400">No new alerts or reminders.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {notifications.slice(0, 4).map(notif => (
                  <div key={notif.id} className="p-3 bg-warmgray-50 border border-warmgray-150 rounded-2xl dark:bg-warmgray-900 dark:border-warmgray-750 flex items-start space-x-2.5">
                    <AlertCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs text-warmgray-700 dark:text-warmgray-300 leading-relaxed">{notif.message}</p>
                      <p className="text-[9px] text-warmgray-400">{new Date(notif.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 9. Account Summary */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
            <h3 className="text-sm font-bold font-display text-warmgray-900 dark:text-white border-b border-warmgray-50 dark:border-warmgray-700 pb-3">Account Summary</h3>
            
            {/* Profile Completion Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-warmgray-550">
                <span>Profile Completion</span>
                <span className="text-brand-500">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-warmgray-100 h-1.5 rounded-full dark:bg-warmgray-900 overflow-hidden">
                <div className="bg-brand-500 h-full rounded-full transition-all" style={{ width: `${profileCompletion}%` }}></div>
              </div>
            </div>

            {/* Saved address */}
            <div className="space-y-1 pt-2 border-t border-warmgray-50 dark:border-warmgray-700">
              <p className="text-[10px] font-bold text-warmgray-450 uppercase tracking-widest flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span>Primary Shipping Address</span>
              </p>
              <p className="text-xs text-warmgray-650 dark:text-warmgray-300 leading-relaxed font-semibold">
                {profileAddress || 'No address saved yet. Please edit your profile to add one.'}
              </p>
            </div>

            {/* Payment methods */}
            <div className="space-y-1 pt-2 border-t border-warmgray-50 dark:border-warmgray-700">
              <p className="text-[10px] font-bold text-warmgray-455 uppercase tracking-widest flex items-center space-x-1">
                <CreditCard className="w-3.5 h-3.5 text-brand-500" />
                <span>Default Payment Option</span>
              </p>
              <p className="text-xs text-warmgray-650 dark:text-warmgray-300 font-semibold">
                Cash on Delivery / Instant UPI (Scan QR)
              </p>
            </div>
          </div>

          {/* WhatsApp / SMS mock settings */}
          {aiData?.reminderMessage && (
            <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
              <h3 className="text-sm font-bold font-display text-warmgray-900 dark:text-white border-b border-warmgray-50 dark:border-warmgray-700 pb-3 flex items-center space-x-1.5">
                <MessageCircle className="w-4.5 h-4.5 text-green-500" />
                <span>WhatsApp Alerts Preview</span>
              </h3>
              
              <div className="bg-warmgray-50 p-4 rounded-2xl border border-warmgray-150 dark:bg-warmgray-900 dark:border-warmgray-750 text-[10px] text-warmgray-600 dark:text-warmgray-350 italic space-y-2 leading-relaxed">
                <p className="font-bold text-[9px] uppercase tracking-wider text-green-600">Sample Renewal Message:</p>
                <p>"{aiData.reminderMessage}"</p>
              </div>

              {whatsappResult && (
                <p className="text-[10px] font-semibold text-green-600 text-center">{whatsappResult}</p>
              )}

              <button
                onClick={handleSendWhatsapp}
                disabled={sendingWhatsapp}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{sendingWhatsapp ? 'Sending Mockup...' : 'Test Send WhatsApp Alert'}</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Edit Profile Details"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {profileError && (
            <div className="p-3 bg-red-50 text-red-650 rounded-xl text-xs flex items-center space-x-1.5 dark:bg-red-950/45 dark:text-red-400">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}
          {profileSuccess && (
            <div className="p-3 bg-green-50 text-green-600 rounded-xl text-xs dark:bg-green-950/45 dark:text-green-400">
              {profileSuccess}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-warmgray-500 uppercase tracking-wider mb-1">Full Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-4 py-2.5 bg-warmgray-50 border border-warmgray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-warmgray-900 dark:border-warmgray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-warmgray-500 uppercase tracking-wider mb-1">Phone Number</label>
            <input
              type="text"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-warmgray-50 border border-warmgray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-warmgray-900 dark:border-warmgray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-warmgray-500 uppercase tracking-wider mb-1">Delivery Address</label>
            <textarea
              value={profileAddress}
              onChange={(e) => setProfileAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-warmgray-50 border border-warmgray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-warmgray-900 dark:border-warmgray-700 dark:text-white h-24 resize-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="px-4 py-2 border border-warmgray-200 hover:bg-warmgray-50 rounded-xl text-xs font-bold text-warmgray-500 dark:border-warmgray-750 dark:hover:bg-warmgray-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={profileSubmitting}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              {profileSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerDashboard;
