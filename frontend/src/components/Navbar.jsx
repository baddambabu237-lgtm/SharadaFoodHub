import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Bell, LogOut, Moon, Sun, User, Utensils } from 'lucide-react';
import API from '../utils/api';

const Navbar = ({ cartCount, toggleDarkMode, isDarkMode }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('sharadha_token');
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications if logged in
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.notifications.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [token]);

  const handleMarkAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sharadha_token');
    localStorage.removeItem('sharadha_user');
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="p-2 bg-brand-100 rounded-xl dark:bg-brand-900/40">
                <Utensils className="w-6 h-6 text-brand-600 dark:text-brand-500" />
              </div>
              <span className="text-xl font-extrabold text-warmgray-900 font-display dark:text-white">
                Sharadha
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold bg-brand-50 text-brand-600 rounded-md dark:bg-brand-950/50 dark:text-brand-400">
                Food Hub
              </span>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-warmgray-500 rounded-xl hover:bg-warmgray-50 dark:text-warmgray-400 dark:hover:bg-warmgray-700 transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Cart icon (For customers and guests) */}
            {(!user || user?.role !== 'admin') && (
              <Link
                to="/cart"
                className="relative p-2 text-warmgray-600 rounded-xl hover:bg-warmgray-50 dark:text-warmgray-300 dark:hover:bg-warmgray-700 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-brand-500 rounded-full border-2 border-white dark:border-warmgray-800">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {token && (
              <Link
                to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                className="px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl dark:bg-brand-950/40 dark:text-brand-400 transition-colors"
              >
                Dashboard
              </Link>
            )}

            {token ? (
              <>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-warmgray-600 rounded-xl hover:bg-warmgray-50 dark:text-warmgray-300 dark:hover:bg-warmgray-700 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-warmgray-800 animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-warmgray-100 overflow-hidden dark:bg-warmgray-800 dark:border-warmgray-700 divide-y divide-warmgray-50 dark:divide-warmgray-700 animate-slideup">
                      <div className="p-4 flex items-center justify-between">
                        <span className="font-bold text-sm text-warmgray-900 dark:text-white">Notifications</span>
                        <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full dark:bg-brand-950/40 dark:text-brand-400 font-semibold">{unreadCount} New</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-warmgray-400">No notifications yet.</div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-4 flex flex-col gap-1 transition-colors ${!notif.is_read ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''}`}
                            >
                              <p className="text-xs text-warmgray-700 dark:text-warmgray-300">{notif.message}</p>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] text-warmgray-400">
                                  {new Date(notif.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                </span>
                                {!notif.is_read && (
                                  <button
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className="text-[10px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                                  >
                                    Mark read
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile / Role Tag */}
                <div className="flex items-center space-x-2 pl-2 border-l border-warmgray-100 dark:border-warmgray-700">
                  <Link
                    to={user?.role === 'admin' ? '/admin' : '/account'}
                    className="hidden md:block text-right hover:text-brand-500 transition-colors"
                    title="View Profile"
                  >
                    <p className="text-xs font-bold text-warmgray-900 dark:text-white truncate max-w-[120px]">{user?.name}</p>
                    <p className="text-[10px] font-semibold text-warmgray-500 uppercase tracking-wider dark:text-warmgray-400">{user?.role}</p>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-warmgray-500 rounded-xl hover:bg-red-50 hover:text-red-600 dark:text-warmgray-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-warmgray-600 rounded-xl hover:bg-warmgray-50 dark:text-warmgray-300 dark:hover:bg-warmgray-700 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/login?register=true"
                  className="px-4 py-2 text-sm font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 shadow-sm shadow-brand-500/10 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
