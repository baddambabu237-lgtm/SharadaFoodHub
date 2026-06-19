import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, ShieldCheck, Heart, ShoppingBag } from 'lucide-react';
import API from '../utils/api';

const ProductDetails = ({ addToCart }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [frequency, setFrequency] = useState('weekly');
  const [purchaseType, setPurchaseType] = useState('one-time'); // 'one-time' or 'subscription'
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('sharadha_token');
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const res = await API.get(`/products/${id}`);
        setProduct(res.data.product);
      } catch (err) {
        console.error('Error fetching product details:', err);
        setError('Failed to fetch product details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [id]);

  const handleAction = async () => {
    setError('');
    setSuccess('');

    if (purchaseType === 'one-time') {
      // Add to cart immediately
      addToCart(product);
      setSuccess('Added to cart successfully!');
      setTimeout(() => {
        navigate('/cart');
      }, 1000);
    } else {
      if (!token) {
        navigate('/login');
        return;
      }
      // Create Subscription directly
      setSubscribing(true);
      try {
        const res = await API.post('/subscriptions', {
          product_id: product.id,
          delivery_frequency: frequency
        });
        setSuccess('Subscription activated successfully! First order created.');
        setTimeout(() => {
          navigate('/dashboard/subscriptions');
        }, 1500);
      } catch (err) {
        console.error('Error creating subscription:', err);
        setError(err.response?.data?.error || 'Failed to create subscription.');
      } finally {
        setSubscribing(false);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-warmgray-400">Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center space-y-4">
        <p className="text-warmgray-400">Product not found.</p>
        <Link to="/catalog" className="text-brand-600 font-bold hover:underline">Back to Catalog</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fadein">
      {/* Back Button */}
      <Link
        to="/catalog"
        className="inline-flex items-center space-x-2 text-sm text-warmgray-500 hover:text-warmgray-800 dark:text-warmgray-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Catalog</span>
      </Link>

      {/* Main Details Panel */}
      <div className="bg-white rounded-3xl border border-warmgray-100 shadow-xl overflow-hidden dark:bg-warmgray-800 dark:border-warmgray-700 flex flex-col md:flex-row gap-8 p-6 md:p-8">
        
        {/* Left: Product Image */}
        <div className="flex-1 max-w-md w-full mx-auto">
          <div className="relative rounded-2xl overflow-hidden bg-warmgray-50 border border-warmgray-100 aspect-square">
            <img
              src={product.image_url || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=600'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-4 right-4 bg-brand-500 text-white font-bold text-xs px-3.5 py-1 rounded-full shadow-sm">
              {product.weight}
            </span>
          </div>
        </div>

        {/* Right: Info & Actions */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs uppercase font-bold text-brand-600 dark:text-brand-400 tracking-wider">
                {product.category_name}
              </span>
              <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">
                {product.name}
              </h1>
            </div>

            <p className="text-2xl font-black text-brand-600 dark:text-brand-400">
              ₹{product.price}
            </p>

            <p className="text-sm text-warmgray-500 leading-relaxed dark:text-warmgray-300">
              {product.description || 'Prepared using premium natural ingredients. Handcrafted with traditional stone-ground milling and cold-pressed sesame oil to deliver authentic homemade taste.'}
            </p>

            {/* Specifications */}
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-warmgray-50 dark:border-warmgray-700">
              <div>
                <p className="text-[10px] uppercase font-bold text-warmgray-400 tracking-wider">Net Weight</p>
                <p className="text-sm font-bold text-warmgray-700 dark:text-white">{product.weight || '250g'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-warmgray-400 tracking-wider">Shelf Life</p>
                <p className="text-sm font-bold text-warmgray-700 dark:text-white">{product.shelf_life_days} Days</p>
              </div>
            </div>
          </div>

          {/* Action selector */}
          <div className="space-y-4">
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            {success && <p className="text-xs font-bold text-green-600">{success}</p>}

            {isAdmin ? (
              <div className="p-4 bg-warmgray-50 border border-warmgray-200 text-warmgray-500 rounded-2xl text-xs font-bold text-center dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-warmgray-400">
                🔒 Admin accounts cannot purchase products.
              </div>
            ) : (
              <>
                {/* Purchase Mode selector */}
                <div className="grid grid-cols-2 gap-2 bg-warmgray-50 p-1.5 rounded-2xl border border-warmgray-150 dark:bg-warmgray-900 dark:border-warmgray-700">
                  <button
                    onClick={() => setPurchaseType('one-time')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${purchaseType === 'one-time' ? 'bg-white text-warmgray-900 shadow-sm dark:bg-warmgray-800 dark:text-white' : 'text-warmgray-500 hover:text-warmgray-900 dark:text-warmgray-400'}`}
                  >
                    One-Time Order
                  </button>
                  <button
                    onClick={() => setPurchaseType('subscription')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${purchaseType === 'subscription' ? 'bg-brand-500 text-white shadow-sm' : 'text-warmgray-500 hover:text-warmgray-900 dark:text-warmgray-400'}`}
                  >
                    Subscribe & Save 15%
                  </button>
                </div>

                {/* Subscription Frequency Dropdown */}
                {purchaseType === 'subscription' && (
                  <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 dark:bg-brand-950/10 dark:border-brand-900/40 space-y-2 animate-fadein">
                    <label className="text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-brand-500" />
                      <span>Choose Delivery Cycle</span>
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-brand-200 text-xs font-semibold focus:outline-none dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
                    >
                      <option value="weekly">Every Week (Weekly)</option>
                      <option value="bi-weekly">Every 2 Weeks (Bi-Weekly)</option>
                      <option value="monthly">Every Month (Monthly)</option>
                    </select>
                    <p className="text-[10px] text-brand-600 dark:text-brand-400">
                      Deliveries trigger automatically on this schedule. Free shipping applies to active subscriptions.
                    </p>
                  </div>
                )}

                {/* Main Action Button */}
                <button
                  onClick={handleAction}
                  disabled={subscribing}
                  className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-500/10 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>
                    {purchaseType === 'one-time'
                      ? 'Add to Cart'
                      : subscribing
                      ? 'Activating Subscription...'
                      : 'Subscribe & Start Deliveries'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
