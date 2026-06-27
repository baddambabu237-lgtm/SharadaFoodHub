import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, ShieldCheck, Heart, ShoppingBag, Star, MessageSquare, Sparkles } from 'lucide-react';
import API from '../utils/api';
import Modal from '../components/Modal';
import { triggerFlyAnimation } from '../utils/animations';

// Small star display for product reviews section
const StarDisplay = ({ rating, size = 'sm' }) => {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`${sz} ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-warmgray-200 dark:text-warmgray-600'}`} />
      ))}
    </span>
  );
};

const ProductDetails = ({ addToCart }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [frequency, setFrequency] = useState('weekly');
  const [purchaseType, setPurchaseType] = useState('one-time');
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('cart');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);

  const token = localStorage.getItem('sharadha_token');
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin';

  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [productNotFound, setProductNotFound] = useState(false);

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      setError('');
      setProductNotFound(false);
      try {
        const productRes = await API.get(`/products/${id}`);
        const productData = productRes.data.product;
        setProduct(productData);
        
        // Fallback reviews and rating stats from main details API
        setReviews(productData.reviews || []);
        setReviewStats(productData.rating || null);

        // Fetch reviews separately, fail gracefully
        try {
          const reviewsRes = await API.get(`/reviews/product/${id}`);
          if (reviewsRes.data) {
            setReviews(reviewsRes.data.reviews || []);
            setReviewStats(reviewsRes.data.stats || null);
          }
        } catch (revErr) {
          console.warn('Graceful fallback for reviews endpoint failure:', revErr);
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        if (err.response?.status === 404) {
          setProductNotFound(true);
        } else {
          setError('Failed to fetch product details.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [id]);

  useEffect(() => {
    if (productNotFound) {
      API.get('/products')
        .then(res => {
          const list = (res.data.products || []).filter(p => String(p.id) !== String(id)).slice(0, 4);
          setSuggestedProducts(list);
        })
        .catch(err => console.error('Error fetching suggestions:', err));
    }
  }, [productNotFound, id]);

  // Handle auto-action after login redirect
  useEffect(() => {
    if (token && product && user?.role !== 'admin') {
      const pendingCart = sessionStorage.getItem('pending_cart_product');
      const pendingSub = sessionStorage.getItem('pending_subscription_product');

      if (pendingCart) {
        const parsed = JSON.parse(pendingCart);
        if (parsed.id === product.id) {
          sessionStorage.removeItem('pending_cart_product');
          addToCart(product);
          setSuccess('Product added to cart successfully.');
          setTimeout(() => {
            navigate('/cart');
          }, 1500);
        }
      } else if (pendingSub) {
        const parsed = JSON.parse(pendingSub);
        if (parsed.product_id === product.id) {
          sessionStorage.removeItem('pending_subscription_product');
          const createPendingSub = async () => {
            setSubscribing(true);
            try {
              const res = await API.post('/subscriptions', {
                product_id: product.id,
                delivery_frequency: parsed.frequency
              });
              setSuccess('Subscription activated successfully! First order created.');
              setTimeout(() => {
                navigate('/dashboard');
              }, 1500);
            } catch (err) {
              console.error('Error creating pending subscription:', err);
              setError(err.response?.data?.error || 'Failed to create subscription.');
            } finally {
              setSubscribing(false);
            }
          };
          createPendingSub();
        }
      }
    }
  }, [product, token, user]);

  const handleAction = async (e) => {
    setError('');
    setSuccess('');

    if (purchaseType === 'one-time') {
      if (!token) {
        setModalMode('cart');
        setIsLoginModalOpen(true);
        return;
      }
      // Add to cart immediately and play flying animation
      if (e) triggerFlyAnimation(e);
      addToCart(product);
      setSuccess('Added to cart successfully!');
      setTimeout(() => {
        navigate('/cart');
      }, 1000);
    } else {
      if (!token) {
        setModalMode('subscribe');
        setIsLoginModalOpen(true);
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
          navigate('/dashboard');
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

  if (productNotFound || (!loading && !product)) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-12 animate-fadein">
        {/* Back Button */}
        <Link
          to="/catalog"
          className="inline-flex items-center space-x-2 text-sm text-warmgray-500 hover:text-warmgray-850 dark:text-warmgray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </Link>

        {/* Error Card */}
        <div className="bg-white dark:bg-warmgray-800 rounded-3xl border border-warmgray-100 dark:border-warmgray-700 shadow-md p-10 text-center max-w-2xl mx-auto space-y-5">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 rotate-180" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">
              Product unavailable or removed.
            </h1>
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400 max-w-md mx-auto">
              The specialty food you are looking for might be out of stock, temporarily disabled, or has been removed from our catalog.
            </p>
          </div>
          <Link
            to="/catalog"
            className="inline-block px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl shadow-md transition-colors text-sm"
          >
            Back to Products
          </Link>
        </div>

        {/* Suggested products */}
        {suggestedProducts.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold font-display text-warmgray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <span>Suggested Products</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {suggestedProducts.map(p => {
                const discountedPrice = p.is_special_offer && p.discount_percent > 0
                  ? (parseFloat(p.price) * (1 - p.discount_percent / 100)).toFixed(0)
                  : null;
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-3xl overflow-hidden border border-warmgray-100 shadow-sm hover:shadow-md transition-all dark:bg-warmgray-800 dark:border-warmgray-700 flex flex-col h-full"
                  >
                    <div className="h-36 overflow-hidden bg-warmgray-50 relative">
                      <img
                        src={p.image_url || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=300'}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute top-2.5 right-2.5 bg-brand-500 text-white font-bold text-[8px] uppercase px-1.5 py-0.5 rounded-md shadow-sm">
                        {p.weight}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col flex-1 space-y-1.5">
                      <span className="text-[8px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                        {p.category_name}
                      </span>
                      <h4 className="text-sm font-bold font-display text-warmgray-900 dark:text-white line-clamp-1">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-warmgray-450 line-clamp-2 dark:text-warmgray-400 flex-1">
                        {p.description}
                      </p>
                      <div className="flex justify-between items-center pt-2 border-t border-warmgray-50 dark:border-warmgray-700 mt-auto">
                        <div className="flex flex-col">
                          {discountedPrice ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-black text-green-600">₹{discountedPrice}</span>
                              <span className="text-[9px] text-warmgray-400 line-through">₹{p.price}</span>
                            </div>
                          ) : (
                            <span className="text-sm font-black text-warmgray-900 dark:text-white">₹{p.price}</span>
                          )}
                        </div>
                        <Link
                          to={`/products/${p.id}`}
                          className="px-3 py-1.5 text-[9px] font-bold text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
              loading="lazy"
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
              {reviewStats && parseInt(reviewStats.review_count) > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  <StarDisplay rating={Math.round(parseFloat(reviewStats.avg_rating || 0))} size="sm" />
                  <span className="text-sm font-extrabold text-warmgray-850 dark:text-warmgray-200">
                    {parseFloat(reviewStats.avg_rating).toFixed(1)}
                  </span>
                  <span className="text-xs text-warmgray-400 font-medium">
                    ({reviewStats.review_count} {parseInt(reviewStats.review_count) === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}
            </div>

            <p className="text-2xl font-black text-brand-600 dark:text-brand-400">
              ₹{product.price}
            </p>

            <p className="text-sm text-warmgray-500 leading-relaxed dark:text-warmgray-300">
              {product.description || 'Prepared using premium natural ingredients. Handcrafted with traditional stone-ground milling and cold-pressed sesame oil to deliver authentic homemade taste.'}
            </p>

            {/* Specifications */}
            <div className="grid grid-cols-3 gap-4 py-4 border-y border-warmgray-50 dark:border-warmgray-700">
              <div>
                <p className="text-[10px] uppercase font-bold text-warmgray-400 tracking-wider">Net Weight</p>
                <p className="text-sm font-bold text-warmgray-700 dark:text-white">{product.weight || '250g'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-warmgray-400 tracking-wider">Shelf Life</p>
                <p className="text-sm font-bold text-warmgray-700 dark:text-white">{product.shelf_life_days} Days</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-warmgray-400 tracking-wider">Availability</p>
                <p className={`text-sm font-bold ${product.availability > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                  {product.availability > 0 ? `${product.availability} units` : 'Out of Stock'}
                </p>
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
                  disabled={subscribing || product.availability <= 0}
                  className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-500/10 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:bg-warmgray-300 dark:disabled:bg-warmgray-700"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>
                    {product.availability <= 0
                      ? 'Sold Out (Out of Stock)'
                      : purchaseType === 'one-time'
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

      {/* Reviews Section */}
      <div className="bg-white rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-warmgray-50 dark:border-warmgray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-500" />
            <h2 className="text-base font-bold text-warmgray-900 dark:text-white font-display">
              Customer Reviews
            </h2>
            {reviewStats && (
              <span className="text-xs text-warmgray-400">({reviewStats.review_count} reviews)</span>
            )}
          </div>
          {/* Avg Rating Badge */}
          {reviewStats && parseInt(reviewStats.review_count) > 0 && (
            <div className="flex items-center gap-2">
              <StarDisplay rating={Math.round(parseFloat(reviewStats.avg_rating || 0))} size="sm" />
              <span className="text-sm font-extrabold text-warmgray-900 dark:text-white">
                {parseFloat(reviewStats.avg_rating).toFixed(1)}
              </span>
              <span className="text-xs text-warmgray-400">/ 5</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Rating Breakdown bars */}
          {reviewStats && parseInt(reviewStats.review_count) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Big avg display */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-5xl font-extrabold text-warmgray-900 dark:text-white font-display leading-none">
                    {parseFloat(reviewStats.avg_rating).toFixed(1)}
                  </p>
                  <StarDisplay rating={Math.round(parseFloat(reviewStats.avg_rating))} size="lg" />
                  <p className="text-xs text-warmgray-400 mt-1">{reviewStats.review_count} reviews</p>
                </div>
                {/* Breakdown bars */}
                <div className="flex-1 space-y-1.5">
                  {[5,4,3,2,1].map(star => {
                    const count = parseInt(reviewStats[`${['one','two','three','four','five'][star-1]}_star`] || 0);
                    const pct = reviewStats.review_count > 0 ? (count / reviewStats.review_count) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-right text-warmgray-500 font-bold">{star}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-warmgray-100 dark:bg-warmgray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct.toFixed(0)}%` }}
                          />
                        </div>
                        <span className="w-5 text-[10px] text-warmgray-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Write a review CTA */}
              {!isAdmin && (
                <div className="flex flex-col items-center justify-center p-5 bg-brand-50/50 dark:bg-brand-950/10 rounded-2xl border border-brand-100 dark:border-brand-900/40 text-center space-y-3">
                  <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
                  <p className="text-sm font-bold text-warmgray-800 dark:text-white">Have this product?</p>
                  <p className="text-xs text-warmgray-500 dark:text-warmgray-400">Share your experience with other customers</p>
                  {token ? (
                    <Link
                      to="/reviews"
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      Write a Review
                    </Link>
                  ) : (
                    <button
                      onClick={() => navigate('/login')}
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      Sign In to Review
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-warmgray-200 dark:border-warmgray-700 rounded-2xl">
              <Star className="w-7 h-7 text-warmgray-300 mx-auto" />
              <p className="text-sm font-semibold text-warmgray-400">No reviews yet</p>
              <p className="text-xs text-warmgray-400">Be the first to review this product!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="flex gap-4 py-4 border-b border-warmgray-50 dark:border-warmgray-700 last:border-0">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center text-brand-600 dark:text-brand-400 font-extrabold text-sm flex-shrink-0">
                    {r.customer_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-warmgray-800 dark:text-white">{r.customer_name}</p>
                      <StarDisplay rating={r.rating} />
                      <span className="text-[10px] font-bold text-amber-500">{r.rating}/5</span>
                    </div>
                    {r.review_text && (
                      <p className="mt-1.5 text-sm text-warmgray-600 dark:text-warmgray-300 leading-relaxed">
                        {r.review_text}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-warmgray-400">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Login Required Modal Dialog */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Login Required"
      >
        <div className="space-y-6">
          <p className="text-sm text-warmgray-600 dark:text-warmgray-300">
            {modalMode === 'cart'
              ? 'You must sign in or create an account before adding products to your cart.'
              : 'Please sign in to start a subscription.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (modalMode === 'cart') {
                  sessionStorage.setItem('pending_cart_product', JSON.stringify(product));
                } else {
                  sessionStorage.setItem('pending_subscription_product', JSON.stringify({ product_id: product.id, frequency }));
                }
                navigate('/login', { state: { from: location } });
              }}
              className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-center shadow-md transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                if (modalMode === 'cart') {
                  sessionStorage.setItem('pending_cart_product', JSON.stringify(product));
                } else {
                  sessionStorage.setItem('pending_subscription_product', JSON.stringify({ product_id: product.id, frequency }));
                }
                navigate('/login?register=true', { state: { from: location } });
              }}
              className="flex-1 py-3 bg-white hover:bg-warmgray-50 text-warmgray-800 border border-warmgray-200 font-bold rounded-xl text-center transition-colors dark:bg-warmgray-700 dark:hover:bg-warmgray-650 dark:border-warmgray-600 dark:text-white"
            >
              Create Account
            </button>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(false)}
            className="w-full py-2.5 text-xs font-bold text-warmgray-400 hover:text-warmgray-650 dark:hover:text-white transition-colors"
          >
            Continue Browsing
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductDetails;
