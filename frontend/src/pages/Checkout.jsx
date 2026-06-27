import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Truck, Shield, Calendar, Lock, CheckCircle2, Sparkles, X, Smartphone } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState('cod'); 
  const [frequency, setFrequency] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payment gateway states
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payStep, setPayStep] = useState('details'); // 'details' | 'processing' | 'success'
  const [payStatusText, setPayStatusText] = useState('');
  const [txnId, setTxnId] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = isSubscription ? Math.round(subtotal * 0.15) : 0;
  const shippingFee = subtotal >= 200 ? 0 : 50;
  const totalDue = subtotal - discount + shippingFee;

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token]);

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPayStep('details');
    setPayModalOpen(true);
  };

  const handleExecutePayment = async () => {
    setPayStep('processing');
    setPayStatusText('Initiating secure handshake...');
    
    // Status text transition animation
    const textStates = [
      'Contacting bank gateway node...',
      'Verifying account details & credit limits...',
      'Securing instant UPI settlement channel...',
      'Finalizing secure token transfer...'
    ];
    
    let stateIdx = 0;
    const interval = setInterval(() => {
      if (stateIdx < textStates.length) {
        setPayStatusText(textStates[stateIdx]);
        stateIdx++;
      }
    }, 700);

    // Wait 2.5 seconds
    await new Promise(resolve => setTimeout(resolve, 2500));
    clearInterval(interval);

    // Generate Transaction ID
    const generatedTxn = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
    setTxnId(generatedTxn);
    
    setPayStatusText('Registering order in database...');
    
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
        setPayStep('success');
        setSuccess('Subscription activated successfully!');
        setTimeout(() => {
          setPayModalOpen(false);
          clearCart();
          navigate('/subscriptions');
        }, 3000);
      } else {
        await API.post('/orders', {
          items,
          total_amount: totalDue
        });
        setPayStep('success');
        setSuccess('Order placed successfully!');
        setTimeout(() => {
          setPayModalOpen(false);
          clearCart();
          navigate('/orders');
        }, 3000);
      }
    } catch (err) {
      console.error('Payment order placement error:', err);
      setError(err.response?.data?.error || 'Failed to place order after payment.');
      setPayModalOpen(false);
    }
  };

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.substr(0, 16);
    let formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substr(0, 4);
    if (val.length > 2) {
      setCardExpiry(val.substr(0, 2) + '/' + val.substr(2));
    } else {
      setCardExpiry(val);
    }
  };

  const handleCvvChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 3) val = val.substr(0, 3);
    setCardCvv(val);
  };

  const getCardType = (num) => {
    const cleanNum = num.replace(/\s+/g, '');
    if (cleanNum.startsWith('4')) return 'Visa';
    if (cleanNum.startsWith('5')) return 'Mastercard';
    if (cleanNum.startsWith('6')) return 'RuPay';
    return 'Generic';
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
                <span className="text-[10px] text-warmgray-400">Scan QR or enter UPI ID</span>
              </label>

              <label className={`p-4 border rounded-2xl flex flex-col gap-1 cursor-pointer transition-all ${paymentMethod === 'credit_card' ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/20' : 'border-warmgray-200 dark:border-warmgray-700'}`}>
                <input
                  type="radio"
                  name="payment"
                  value="credit_card"
                  checked={paymentMethod === 'credit_card'}
                  onChange={() => setPaymentMethod('credit_card')}
                  className="sr-only"
                />
                <span className="text-xs font-bold text-warmgray-850 dark:text-white">Credit Card</span>
                <span className="text-[10px] text-warmgray-400">Pay securely via Credit Card</span>
              </label>

              <label className={`p-4 border rounded-2xl flex flex-col gap-1 cursor-pointer transition-all ${paymentMethod === 'debit_card' ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/20' : 'border-warmgray-200 dark:border-warmgray-700'}`}>
                <input
                  type="radio"
                  name="payment"
                  value="debit_card"
                  checked={paymentMethod === 'debit_card'}
                  onChange={() => setPaymentMethod('debit_card')}
                  className="sr-only"
                />
                <span className="text-xs font-bold text-warmgray-850 dark:text-white">Debit Card</span>
                <span className="text-[10px] text-warmgray-400">Pay securely via Debit Card</span>
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

      {/* Demo Payment Gateway Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 bg-warmgray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadein">
          <div className="bg-white dark:bg-warmgray-850 w-full max-w-md rounded-3xl border border-warmgray-150 dark:border-warmgray-750 shadow-2xl p-6 relative overflow-hidden flex flex-col space-y-5">
            
            <style>{`
              @keyframes scanLine {
                0% { transform: translateY(0); }
                50% { transform: translateY(140px); }
                100% { transform: translateY(0); }
              }
              .scanning-line {
                animation: scanLine 2.5s linear infinite;
              }
              @keyframes checkPop {
                0% { transform: scale(0.8); opacity: 0; }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
              }
              .checkmark-animated {
                animation: checkPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
              }
            `}</style>

            {/* Header */}
            {payStep === 'details' && (
              <div className="flex justify-between items-center border-b border-warmgray-100 dark:border-warmgray-700/60 pb-3">
                <div className="flex items-center space-x-1.5">
                  <Lock className="w-4 h-4 text-brand-500" />
                  <span className="text-sm font-bold font-display text-warmgray-900 dark:text-white">Secure Demo Payment</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="p-1 hover:bg-warmgray-100 dark:hover:bg-warmgray-800 rounded-full text-warmgray-400 hover:text-warmgray-600 dark:hover:text-warmgray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 1: Input details */}
            {payStep === 'details' && (
              <div className="space-y-4">
                <div className="text-center bg-brand-50/40 dark:bg-brand-950/10 p-3 rounded-2xl border border-brand-100/30">
                  <p className="text-[10px] text-warmgray-400 uppercase font-bold tracking-wider">Amount Due</p>
                  <p className="text-2xl font-black text-brand-600 dark:text-brand-400 font-display">₹{totalDue}</p>
                </div>

                {/* Render input screens based on paymentMethod */}
                {paymentMethod === 'cod' && (
                  <div className="space-y-4 text-center py-2">
                    <div className="inline-flex p-3 bg-orange-50 dark:bg-orange-950/20 text-orange-600 rounded-full">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-warmgray-850 dark:text-white">Cash on Delivery</h4>
                      <p className="text-[10px] text-warmgray-450 dark:text-warmgray-400 leading-relaxed px-4">
                        Please confirm your order. You will pay ₹{totalDue} in cash or via UPI when our delivery executive arrives at your doorstep.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExecutePayment}
                      className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md transition-colors text-xs"
                    >
                      Confirm Order (COD)
                    </button>
                  </div>
                )}

                {paymentMethod === 'upi' && (
                  <div className="space-y-4">
                    {/* QR Code scanning simulation */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative w-36 h-36 bg-white p-2 rounded-2xl border border-warmgray-250 shadow-sm flex items-center justify-center overflow-hidden">
                        {/* Red Scanning Laser Line */}
                        <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] scanning-line top-0"></div>
                        {/* SVG QR Code Graphic */}
                        <svg className="w-32 h-32 text-warmgray-900" viewBox="0 0 100 100">
                          <rect x="0" y="0" width="25" height="25" fill="currentColor" />
                          <rect x="5" y="5" width="15" height="15" fill="white" />
                          <rect x="75" y="0" width="25" height="25" fill="currentColor" />
                          <rect x="80" y="5" width="15" height="15" fill="white" />
                          <rect x="0" y="75" width="25" height="25" fill="currentColor" />
                          <rect x="5" y="80" width="15" height="15" fill="white" />
                          {/* Random dot patterns */}
                          <rect x="35" y="5" width="10" height="10" fill="currentColor" />
                          <rect x="55" y="15" width="5" height="15" fill="currentColor" />
                          <rect x="40" y="35" width="15" height="5" fill="currentColor" />
                          <rect x="15" y="45" width="20" height="10" fill="currentColor" />
                          <rect x="65" y="40" width="15" height="15" fill="currentColor" />
                          <rect x="85" y="65" width="10" height="20" fill="currentColor" />
                          <rect x="45" y="75" width="20" height="10" fill="currentColor" />
                          <rect x="35" y="60" width="10" height="10" fill="currentColor" />
                        </svg>
                      </div>
                      <p className="text-[9px] text-warmgray-400 font-bold uppercase tracking-wider text-center">Scan to Pay using GPAY / PhonePe / Paytm</p>
                    </div>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-warmgray-200 dark:border-warmgray-700"></div>
                      <span className="flex-shrink mx-3 text-[10px] text-warmgray-400 font-bold uppercase">OR</span>
                      <div className="flex-grow border-t border-warmgray-200 dark:border-warmgray-700"></div>
                    </div>

                    {/* UPI ID input */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-warmgray-500">Enter UPI ID</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="yourname@upi"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full px-4 py-2.5 bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-250 dark:border-warmgray-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-white pr-10"
                        />
                        <Smartphone className="w-4 h-4 text-warmgray-400 absolute right-3 top-3" />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleExecutePayment}
                        className="flex-1 py-2.5 bg-warmgray-100 hover:bg-warmgray-200 dark:bg-warmgray-800 dark:hover:bg-warmgray-750 text-warmgray-700 dark:text-white font-bold rounded-xl text-xs border border-warmgray-200 dark:border-warmgray-700 transition-colors"
                      >
                        Paid via QR
                      </button>
                      <button
                        type="button"
                        disabled={!upiId.includes('@') || upiId.length < 5}
                        onClick={handleExecutePayment}
                        className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-colors flex items-center justify-center space-x-1"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Verify & Pay</span>
                      </button>
                    </div>
                  </div>
                )}

                {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (
                  <div className="space-y-4">
                    {/* Visual Card Mockup */}
                    <div className="relative h-40 w-full rounded-2xl bg-gradient-to-br from-brand-500 to-orange-700 p-5 text-white flex flex-col justify-between shadow-lg overflow-hidden animate-fadein">
                      {/* background mesh/circles decoration */}
                      <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mb-8"></div>
                      <div className="absolute left-1/3 top-1/4 w-12 h-12 bg-white/5 rounded-full"></div>
                      
                      <div className="flex justify-between items-start">
                        {/* Chip */}
                        <div className="w-8 h-6 bg-amber-250/80 rounded-md flex flex-col justify-between p-1 shadow-sm border border-amber-300/40">
                          <div className="h-0.5 w-full bg-amber-400/40"></div>
                          <div className="h-0.5 w-full bg-amber-400/40"></div>
                          <div className="h-0.5 w-full bg-amber-400/40"></div>
                        </div>
                        {/* Card brand logo */}
                        <span className="text-[10px] font-black uppercase italic tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                          {getCardType(cardNumber)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Number */}
                        <p className="text-sm tracking-widest font-mono font-bold truncate">
                          {cardNumber || '•••• •••• •••• ••••'}
                        </p>

                        <div className="flex justify-between items-end">
                          <div className="space-y-0.5">
                            <span className="text-[7px] text-orange-100 uppercase tracking-widest block">Cardholder</span>
                            <p className="text-[9px] font-bold uppercase truncate max-w-[140px]">
                              {cardName || 'YOUR FULL NAME'}
                            </p>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <span className="text-[7px] text-orange-100 uppercase tracking-widest block">Expires</span>
                            <p className="text-[9px] font-bold font-mono">
                              {cardExpiry || 'MM/YY'}
                            </p>
                          </div>
                          <div className="space-y-0.5 text-right pl-2">
                            <span className="text-[7px] text-orange-100 uppercase tracking-widest block">CVV</span>
                            <p className="text-[9px] font-bold font-mono">
                              {cardCvv ? '•••' : 'CVV'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-2.5">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-warmgray-400">Card Number</label>
                        <input
                          type="text"
                          placeholder="4000 1234 5678 9010"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          className="w-full px-4 py-2 bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-250 dark:border-warmgray-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-white font-mono"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-warmgray-400">Cardholder Name</label>
                        <input
                          type="text"
                          placeholder="Rahul Kumar"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="w-full px-4 py-2 bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-250 dark:border-warmgray-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-warmgray-400">Expiry Date</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            className="w-full px-4 py-2 bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-250 dark:border-warmgray-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-white font-mono"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-warmgray-400">CVV</label>
                          <input
                            type="password"
                            placeholder="123"
                            value={cardCvv}
                            onChange={handleCvvChange}
                            className="w-full px-4 py-2 bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-250 dark:border-warmgray-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        cardNumber.replace(/\s+/g, '').length !== 16 ||
                        cardExpiry.length !== 5 ||
                        cardCvv.length !== 3 ||
                        cardName.trim().length === 0
                      }
                      onClick={handleExecutePayment}
                      className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md transition-colors text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Pay ₹{totalDue} Securely</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Processing screen */}
            {payStep === 'processing' && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                <div className="w-14 h-14 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin flex items-center justify-center">
                  <Lock className="w-5 h-5 text-brand-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-warmgray-850 dark:text-white">Authorizing Payment...</h4>
                  <p className="text-[10px] text-warmgray-450 dark:text-warmgray-400 font-semibold">{payStatusText}</p>
                </div>
                <p className="text-[9px] text-warmgray-450">Do not refresh this page or close your browser.</p>
              </div>
            )}

            {/* Step 3: Success screen */}
            {payStep === 'success' && (
              <div className="flex flex-col items-center justify-center py-6 space-y-5 text-center checkmark-animated">
                <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/30 text-green-500 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-extrabold text-green-600 dark:text-green-400">Payment Successful!</h4>
                  <p className="text-xs text-warmgray-600 dark:text-warmgray-300">Your order has been registered successfully.</p>
                </div>

                <div className="bg-warmgray-50 dark:bg-warmgray-900 border border-warmgray-150 dark:border-warmgray-800 p-4 rounded-2xl w-full text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-warmgray-400 font-semibold">Amount Paid:</span>
                    <span className="font-bold text-warmgray-800 dark:text-white">₹{totalDue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warmgray-400 font-semibold">Method:</span>
                    <span className="font-bold text-warmgray-800 dark:text-white uppercase">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-warmgray-400 font-semibold">Transaction ID:</span>
                    <span className="font-bold font-mono text-[10px] text-brand-650 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20 px-2 py-0.5 rounded border border-brand-100/40">
                      {txnId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px] text-warmgray-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500 fill-brand-500 animate-spin" />
                  <span>Creating order details...</span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
