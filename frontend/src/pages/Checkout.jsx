import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Truck, Shield, Calendar } from 'lucide-react';
import API from '../utils/api';

const Checkout = ({ cart, clearCart }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const isSubscription = mode === 'subscription';

  const token = localStorage.getItem('sharadha_token');
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' or 'upi'
  const [frequency, setFrequency] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = isSubscription ? Math.round(subtotal * 0.15) : 0;
  const shippingFee = subtotal >= 200 ? 0 : 50;
  const totalDue = subtotal - discount + shippingFee;

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const items = cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      price: item.price
    }));

    try {
      if (isSubscription) {
        await API.post('/subscriptions/bulk', {
          items,
          delivery_frequency: frequency
        });
        setSuccess('Subscription activated successfully! Redirecting to subscriptions...');
        setTimeout(() => {
          clearCart();
          navigate('/subscriptions');
        }, 1500);
      } else {
        await API.post('/orders', {
          items,
          total_amount: totalDue
        });
        setSuccess('Order placed successfully! Redirecting to orders...');
        setTimeout(() => {
          clearCart();
          navigate('/orders');
        }, 1500);
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setError(err.response?.data?.error || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !success) {
    return (
      <div className="p-6 text-center py-20 text-warmgray-400">
        <p>No items in cart to checkout.</p>
        <Link to="/catalog" className="text-brand-600 font-bold hover:underline">Go to Catalog</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fadein">
      <Link
        to="/cart"
        className="inline-flex items-center space-x-2 text-sm text-warmgray-500 hover:text-warmgray-850 dark:text-warmgray-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Cart</span>
      </Link>

      <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">
        {isSubscription ? 'Subscription Checkout' : 'Shipping & Payment'}
      </h1>

      <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-8">
        
        {/* Left: Address and Payment */}
        <div className="flex-1 space-y-6">
          
          {/* Section 1: Shipping Address */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
            <h3 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
              <Truck className="w-5 h-5 text-brand-500" />
              <span>Delivery Details</span>
            </h3>

            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            {success && <p className="text-xs font-bold text-green-600">{success}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Recipient Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Delivery Address</label>
              <textarea
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white resize-none"
              />
            </div>
          </div>

          {isSubscription && (
            <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
              <h3 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-brand-500" />
                <span>Subscription Delivery Cycle</span>
              </h3>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Choose Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-4 py-2.5 bg-warmgray-50 rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
                >
                  <option value="weekly">Every Week (Weekly)</option>
                  <option value="bi-weekly">Every 2 Weeks (Bi-Weekly)</option>
                  <option value="monthly">Every Month (Monthly)</option>
                </select>
                <p className="text-xs text-brand-600 dark:text-brand-400 mt-1 font-semibold">
                  🎉 You save 15% on all items in this subscription order!
                </p>
              </div>
            </div>
          )}

          {/* Section 2: Payment Selector */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
            <h3 className="text-lg font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-brand-500" />
              <span>Payment Method</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-4 border rounded-2xl flex flex-col gap-1 cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/20' : 'border-warmgray-200 dark:border-warmgray-700'}`}>
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="sr-only"
                />
                <span className="text-xs font-bold text-warmgray-850 dark:text-white">Cash on Delivery</span>
                <span className="text-[10px] text-warmgray-400">Pay cash/UPI at delivery</span>
              </label>

              <label className={`p-4 border rounded-2xl flex flex-col gap-1 cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/20' : 'border-warmgray-200 dark:border-warmgray-700'}`}>
                <input
                  type="radio"
                  name="payment"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                  className="sr-only"
                />
                <span className="text-xs font-bold text-warmgray-850 dark:text-white">UPI / Instant QR</span>
                <span className="text-[10px] text-warmgray-400">Pay using GPay/PhonePe</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Order Summary Column */}
        <div className="w-full lg:w-80">
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-xl dark:bg-warmgray-800 dark:border-warmgray-700 space-y-6 sticky top-24">
            <h3 className="text-lg font-bold font-display text-warmgray-900 dark:text-white border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
              Summary
            </h3>

            {/* List of items */}
            <div className="max-h-40 overflow-y-auto space-y-3.5 pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <span className="text-warmgray-600 dark:text-warmgray-300 font-semibold truncate max-w-[140px]">
                    {item.name} <span className="text-warmgray-400">x{item.quantity}</span>
                  </span>
                  <span className="font-bold text-warmgray-900 dark:text-white">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {subtotal < 200 ? (
                <div className="p-3 bg-brand-50 text-brand-700 rounded-2xl text-[11px] font-bold dark:bg-brand-950/20 dark:text-brand-400">
                  🚚 Add ₹{200 - subtotal} more to get FREE Shipping
                </div>
              ) : (
                <div className="p-3 bg-green-50 text-green-700 rounded-2xl text-[11px] font-bold dark:bg-green-950/20 dark:text-green-400">
                  🎉 You have unlocked FREE Shipping
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-warmgray-50 dark:border-warmgray-700 pt-3">
              <div className="flex justify-between text-xs text-warmgray-500">
                <span>Items Subtotal</span>
                <span className="font-semibold text-warmgray-800 dark:text-white">₹{subtotal}</span>
              </div>
              {isSubscription && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Subscription Discount (15%)</span>
                  <span className="font-semibold">-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-warmgray-500">
                <span>Shipping Fees</span>
                <span className={`font-semibold ${shippingFee === 0 ? 'text-green-600' : 'text-warmgray-850 dark:text-white'}`}>
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-warmgray-900 dark:text-white border-t border-warmgray-50 dark:border-warmgray-700 pt-3">
                <span>Amount Due</span>
                <span className="text-brand-600 dark:text-brand-400">₹{totalDue}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Placing Order...' : 'Confirm & Place Order'}
            </button>

            <div className="flex items-center justify-center space-x-1.5 text-[9px] text-warmgray-400 uppercase font-bold">
              <Shield className="w-4 h-4 text-brand-500" />
              <span>Secure Checkout Guaranteed</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
