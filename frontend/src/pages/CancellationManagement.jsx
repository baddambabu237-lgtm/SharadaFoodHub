import React, { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, AlertTriangle, Search, Filter, RefreshCw, ShoppingBag } from 'lucide-react';
import API from '../utils/api';

const CancellationManagement = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterReason, setFilterReason] = useState('all');

  useEffect(() => {
    const fetchCancellations = async () => {
      try {
        const res = await API.get('/dashboard/cancelled-activities');
        setActivities(res.data.activities || []);
      } catch (err) {
        console.error('Error fetching cancellations:', err);
        setError('Failed to load cancellations database.');
      } finally {
        setLoading(false);
      }
    };
    fetchCancellations();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-warmgray-400">Loading cancellations database...</div>;
  }

  // Get unique cancellation reasons for filtering
  const reasons = ['all', ...new Set(activities.map(a => a.cancellation_reason).filter(Boolean))];

  // Filtering & Search logic
  const filteredActivities = activities.filter(act => {
    const matchesSearch = 
      (act.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (act.product_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (act.order_id?.toString() || '').includes(searchTerm) ||
      (act.subscription_id?.toString() || '').includes(searchTerm);

    const matchesType = 
      filterType === 'all' || act.type === filterType;

    const matchesReason = 
      filterReason === 'all' || act.cancellation_reason === filterReason;

    return matchesSearch && matchesType && matchesReason;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadein">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Cancelled Orders & Subscriptions</h1>
        <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Track and review cancelled customer orders and subscription plans</p>
      </div>

      {error && <p className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">{error}</p>}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warmgray-400" />
          <input
            type="text"
            placeholder="Search by customer, product, order or sub ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-warmgray-50 border border-warmgray-200 dark:border-warmgray-700 dark:bg-warmgray-900 dark:text-white rounded-2xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-warmgray-455" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-warmgray-50 border border-warmgray-200 dark:border-warmgray-700 dark:bg-warmgray-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="order">Orders Only</option>
              <option value="subscription">Subscriptions Only</option>
            </select>
          </div>

          <select
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value)}
            className="px-3 py-2 bg-warmgray-50 border border-warmgray-200 dark:border-warmgray-700 dark:bg-warmgray-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none"
          >
            <option value="all">All Reasons</option>
            {reasons.filter(r => r !== 'all').map(reason => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-20 text-warmgray-400 border border-dashed border-warmgray-200 rounded-3xl dark:border-warmgray-700">
          No cancellations found matching filters.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-warmgray-50 text-warmgray-450 uppercase tracking-wider font-bold border-b border-warmgray-100 dark:bg-warmgray-900 dark:border-warmgray-700">
                  <th className="p-4 pl-6">Type</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Subscription ID</th>
                  <th className="p-4">Cancellation Date</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4 pr-6">Previous Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700 text-warmgray-750 dark:text-warmgray-300">
                {filteredActivities.map((act, index) => (
                  <tr key={index} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-900/30 transition-colors">
                    <td className="p-4 pl-6">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center w-max gap-1 ${
                        act.type === 'subscription' 
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' 
                          : 'bg-purple-50 text-purple-650 dark:bg-purple-950/40 dark:text-purple-400'
                      }`}>
                        {act.type === 'subscription' ? <RefreshCw className="w-2.5 h-2.5" /> : <ShoppingBag className="w-2.5 h-2.5" />}
                        {act.type}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-warmgray-900 dark:text-white">{act.customer_name}</td>
                    <td className="p-4 font-semibold max-w-xs truncate" title={act.product_name}>{act.product_name || 'N/A'}</td>
                    <td className="p-4 font-mono font-bold text-warmgray-600 dark:text-warmgray-400">
                      {act.order_id ? `OR-${act.order_id}` : '-'}
                    </td>
                    <td className="p-4 font-mono font-bold text-warmgray-600 dark:text-warmgray-400">
                      {act.subscription_id ? `SUB-${act.subscription_id}` : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-warmgray-400" />
                        <span>{new Date(act.cancelled_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-red-50 text-red-650 dark:bg-red-950/30 dark:text-red-400 rounded-md font-semibold">
                        {act.cancellation_reason || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 capitalize">
                      <span className="px-2 py-0.5 bg-warmgray-100 text-warmgray-600 dark:bg-warmgray-700 dark:text-warmgray-300 rounded-md font-medium text-[10px] uppercase">
                        {act.previous_status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancellationManagement;
