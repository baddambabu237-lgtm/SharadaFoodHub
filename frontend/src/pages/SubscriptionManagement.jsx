import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, RefreshCw, Play, Pause, Trash2, ArrowRight } from 'lucide-react';
import API from '../utils/api';
import Modal from '../components/Modal';

const SubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchSubscriptions = async () => {
    try {
      const res = await API.get('/subscriptions');
      setSubscriptions(res.data.subscriptions);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to fetch subscription records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handlePause = async (id) => {
    setError('');
    setMessage('');
    try {
      await API.put(`/subscriptions/${id}/pause`);
      setMessage('Subscription paused successfully.');
      fetchSubscriptions();
    } catch (err) {
      console.error('Error pausing subscription:', err);
      setError(err.response?.data?.error || 'Failed to pause subscription.');
    }
  };

  const handleResume = async (id) => {
    setError('');
    setMessage('');
    try {
      const res = await API.put(`/subscriptions/${id}/resume`);
      setMessage(`Subscription resumed! Next dispatch: ${res.data.next_dispatch_date}.`);
      fetchSubscriptions();
    } catch (err) {
      console.error('Error resuming subscription:', err);
      setError(err.response?.data?.error || 'Failed to resume subscription.');
    }
  };

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const handleCancelClick = (id) => {
    setSelectedSubId(id);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const confirmCancelSubscription = async () => {
    if (!selectedSubId || !cancelReason) return;
    setCancelling(true);
    setError('');
    setMessage('');
    try {
      await API.post(`/subscriptions/${selectedSubId}/cancel`, { reason: cancelReason });
      setMessage('Subscription cancelled successfully.');
      setCancelModalOpen(false);
      fetchSubscriptions();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to cancel subscription.');
      setCancelModalOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-warmgray-400">Loading your subscriptions...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fadein">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">My Subscriptions</h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Manage recurring deliveries and adjust schedules</p>
        </div>
        <Link
          to="/catalog"
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-sm text-xs transition-colors flex items-center justify-center space-x-1.5"
        >
          <span>Subscribe to New Items</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {error && <p className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">{error}</p>}
      {message && <p className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50">{message}</p>}

      {subscriptions.length === 0 ? (
        <div className="text-center py-20 text-warmgray-400 border border-dashed border-warmgray-200 rounded-3xl dark:border-warmgray-700">
          <p className="mb-4">You have no active subscription plans.</p>
          <Link to="/catalog" className="text-brand-600 font-bold hover:underline">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white p-5 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4"
            >
              <div className="flex gap-4">
                <img
                  src={sub.image_url}
                  alt={sub.product_name}
                  className="w-16 h-16 object-cover rounded-2xl bg-warmgray-50"
                  loading="lazy"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] uppercase font-bold text-brand-600 dark:text-brand-400">{sub.weight} • ₹{sub.product_price}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      sub.status === 'active' ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' :
                      sub.status === 'paused' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
                      'bg-warmgray-100 text-warmgray-500 dark:bg-warmgray-700'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-display text-warmgray-900 dark:text-white mt-1">
                    {sub.product_name}
                  </h3>
                  <p className="text-xs text-warmgray-400">Frequency: <span className="font-semibold uppercase text-brand-600 dark:text-brand-400">{sub.delivery_frequency}</span></p>
                </div>
              </div>

              {/* Schedule details */}
              <div className="grid grid-cols-2 gap-4 py-3 bg-warmgray-50 rounded-2xl dark:bg-warmgray-900 px-4 text-[10px] text-warmgray-500 dark:text-warmgray-400">
                <div className="space-y-0.5">
                  <p className="uppercase font-bold text-warmgray-400 text-[8px]">Start Date</p>
                  <p className="font-bold text-warmgray-700 dark:text-white">{new Date(sub.start_date).toLocaleDateString()}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="uppercase font-bold text-warmgray-400 text-[8px]">Next Delivery</p>
                  <p className="font-bold text-brand-600 dark:text-brand-400">{sub.status === 'active' ? new Date(sub.next_dispatch_date).toLocaleDateString() : 'Paused'}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                {sub.status === 'active' ? (
                  <button
                    onClick={() => handlePause(sub.id)}
                    className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors dark:bg-amber-950/30 dark:text-amber-400"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause Plan</span>
                  </button>
                ) : sub.status === 'paused' ? (
                  <button
                    onClick={() => handleResume(sub.id)}
                    className="flex-1 py-2 bg-green-50 hover:bg-green-150 text-green-600 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors dark:bg-green-950/30 dark:text-green-400"
                  >
                    <Play className="w-4 h-4" />
                    <span>Resume Plan</span>
                  </button>
                ) : null}

                {sub.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancelClick(sub.id)}
                    className="px-3 py-2 border border-warmgray-200 hover:border-red-200 text-warmgray-400 hover:text-red-650 rounded-xl transition-all dark:border-warmgray-700"
                    title="Cancel Subscription"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Subscription Plan"
      >
        <div className="space-y-4 text-xs animate-fadein">
          <p className="text-warmgray-500 leading-relaxed">
            We are sorry to see you go! Please let us know the reason for cancelling your subscription plan below:
          </p>
          <div>
            <label className="block text-[10px] font-bold text-warmgray-400 uppercase tracking-wider mb-2">
              Cancellation Reason
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-750 rounded-xl text-xs font-semibold focus:outline-none dark:text-white"
            >
              <option value="">-- Choose cancellation reason --</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Too expensive">Too expensive</option>
              <option value="No longer needed">No longer needed</option>
              <option value="Delivery issue">Delivery issue</option>
              <option value="Product issue">Product issue</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={confirmCancelSubscription}
              disabled={!cancelReason || cancelling}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
            <button
              onClick={() => setCancelModalOpen(false)}
              className="flex-1 py-2.5 bg-warmgray-100 hover:bg-warmgray-200 text-warmgray-750 font-bold rounded-xl text-xs transition-colors dark:bg-warmgray-850 dark:hover:bg-warmgray-750 dark:text-warmgray-300"
            >
              Keep Subscription
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SubscriptionManagement;
