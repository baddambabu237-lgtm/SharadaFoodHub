import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Truck, RefreshCw, Heart, ShieldCheck, Flame, Star, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import API from '../utils/api';

// ─── Horizontal Scroll Product Card ──────────────────────────────────────────
const ProductScrollCard = ({ prod, isAdmin }) => {
  const discountedPrice = prod.is_special_offer && prod.discount_percent > 0
    ? (parseFloat(prod.price) * (1 - prod.discount_percent / 100)).toFixed(0)
    : null;

  const trackView = async () => {
    try { await API.post(`/products/view/${prod.id}`); } catch (_) {}
  };

  return (
    <div className="flex-shrink-0 w-56 bg-white rounded-2xl overflow-hidden border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex flex-col product-card-hover">
      <div className="h-36 overflow-hidden bg-warmgray-50 relative">
        <img
          src={prod.image_url || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=300'}
          alt={prod.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {prod.is_special_offer && prod.discount_percent > 0 && (
          <span className="absolute top-2 left-2 bg-green-500 text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-md">
            {prod.discount_percent}% OFF
          </span>
        )}
        {prod.is_trending && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-md">
            🔥 HOT
          </span>
        )}
        {!prod.is_trending && prod.weight && (
          <span className="absolute top-2 right-2 bg-brand-500 text-white font-bold text-[9px] uppercase px-1.5 py-0.5 rounded-md">
            {prod.weight}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 space-y-1.5">
        <span className="text-[9px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
          {prod.category_name}
        </span>
        <h4 className="text-sm font-bold font-display text-warmgray-900 dark:text-white line-clamp-1">{prod.name}</h4>
        <p className="text-[10px] text-warmgray-400 line-clamp-2 flex-1">{prod.description}</p>
        <div className="flex justify-between items-center pt-2 border-t border-warmgray-50 dark:border-warmgray-700 mt-auto">
          <div className="flex flex-col">
            {discountedPrice ? (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-green-600">₹{discountedPrice}</span>
                <span className="text-[9px] text-warmgray-400 line-through">₹{prod.price}</span>
              </div>
            ) : (
              <span className="text-sm font-black text-warmgray-900 dark:text-white">₹{prod.price}</span>
            )}
          </div>
          <Link
            to={isAdmin ? '/admin/products' : `/products/${prod.id}`}
            onClick={trackView}
            className="px-3 py-1 text-[10px] font-bold text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
          >
            {isAdmin ? 'Manage' : 'Order'}
          </Link>
        </div>
      </div>
    </div>
  );
};

// ─── Horizontal Scroll Row ────────────────────────────────────────────────────
const ProductScrollRow = ({ title, subtitle, emoji, products, isAdmin, viewAllFilter }) => {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 240, behavior: 'smooth' });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-warmgray-900 dark:text-white flex items-center gap-2">
            <span>{emoji}</span>{title}
          </h2>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll(-1)}
            className="p-1.5 rounded-full bg-white border border-warmgray-200 hover:bg-warmgray-50 dark:bg-warmgray-800 dark:border-warmgray-700 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 text-warmgray-500" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="p-1.5 rounded-full bg-white border border-warmgray-200 hover:bg-warmgray-50 dark:bg-warmgray-800 dark:border-warmgray-700 transition-colors shadow-sm"
          >
            <ChevronRight className="w-4 h-4 text-warmgray-500" />
          </button>
          <Link
            to={`/catalog${viewAllFilter ? `?filter=${viewAllFilter}` : ''}`}
            className="text-brand-600 font-bold hover:text-brand-700 flex items-center space-x-1 dark:text-brand-500 text-sm ml-2"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((prod) => (
          <ProductScrollCard key={prod.id} prod={prod} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  );
};

// ─── LandingPage ──────────────────────────────────────────────────────────────
const LandingPage = () => {
  const [sections, setSections] = useState({ trending: [], newlyAdded: [], bestSellers: [] });
  const [loading, setLoading] = useState(true);
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await API.get('/products/featured-sections');
        setSections({
          trending:    res.data.trending    || [],
          newlyAdded:  res.data.newlyAdded  || [],
          bestSellers: res.data.bestSellers || [],
        });
      } catch (err) {
        console.error('Error fetching featured sections:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSections();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-warmgray-50 dark:bg-warmgray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-brand-50 to-orange-100/35 dark:from-warmgray-900 dark:to-warmgray-850">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
          <div className="flex-1 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center space-x-2 bg-brand-100 text-brand-700 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider dark:bg-brand-950/40 dark:text-brand-400">
              <Sparkles className="w-4.5 h-4.5 text-brand-600 dark:text-brand-500" />
              <span>100% Traditional Homemade Recipes</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-warmgray-900 tracking-tight font-display leading-[1.15] dark:text-white">
              Fresh Homemade Treats, <span className="text-brand-500">Delivered Weekly.</span>
            </h1>
            <p className="text-base sm:text-lg text-warmgray-600 max-w-xl mx-auto lg:mx-0 dark:text-warmgray-300">
              Subscribe to automated recurring deliveries of your favorite southern pantry staples: hand-churned Ghee, traditional stone-ground Podi, fresh-spiced Pickles, and crispy evening snacks.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <Link
                to="/catalog"
                className="px-8 py-4 bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 shadow-lg shadow-brand-500/20 flex items-center justify-center space-x-2 transition-all duration-150"
              >
                <span>Shop the Catalog</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              {!isAdmin && (
                <Link
                  to="/login?register=true"
                  className="px-8 py-4 bg-white text-warmgray-800 font-bold rounded-2xl hover:bg-warmgray-50 border border-warmgray-200 dark:bg-warmgray-800 dark:text-white dark:border-warmgray-700 flex items-center justify-center transition-all duration-150"
                >
                  Subscribe &amp; Save 15%
                </Link>
              )}
            </div>
          </div>
          <div className="flex-1 w-full max-w-md lg:max-w-none">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-warmgray-800">
              <img
                src="/images/hero_banner.png"
                alt="Traditional Indian Ghee and Podi spread"
                className="object-cover w-full h-[350px] lg:h-[450px]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 p-5 bg-white/90 backdrop-blur-md rounded-2xl dark:bg-warmgray-850/90">
                <p className="text-sm font-bold text-warmgray-900 dark:text-white">Traditional Podi &amp; Ghee combo</p>
                <p className="text-xs text-warmgray-500 dark:text-warmgray-400">Freshly prepared in small batches by homemakers in Chennai.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold font-display text-warmgray-900 dark:text-white">How Our Subscription Works</h2>
          <p className="text-warmgray-500 max-w-xl mx-auto dark:text-warmgray-400">Get automated dispatch of your favorite food bundles. No commitment, pause or skip anytime.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-warmgray-100 shadow-sm text-center space-y-4 dark:bg-warmgray-800 dark:border-warmgray-700">
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mx-auto dark:bg-brand-950/40">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-display text-warmgray-900 dark:text-white">1. Choose Your Frequency</h3>
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Select standard delivery cycles: Weekly, Bi-weekly, or Monthly. Customize the quantity for each product.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-warmgray-100 shadow-sm text-center space-y-4 dark:bg-warmgray-800 dark:border-warmgray-700">
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mx-auto dark:bg-brand-950/40">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-display text-warmgray-900 dark:text-white">2. Automatic Dispatch</h3>
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Our system triggers future orders automatically. We ship them fresh from our kitchen straight to your home.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-warmgray-100 shadow-sm text-center space-y-4 dark:bg-warmgray-800 dark:border-warmgray-700">
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mx-auto dark:bg-brand-950/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-display text-warmgray-900 dark:text-white">3. Total Control</h3>
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Pause subscriptions, resume deliveries, or update your calendar in one click on your dashboard.</p>
          </div>
        </div>
      </section>

      {/* Dynamic Product Sections */}
      <section className="py-16 bg-warmgray-100/50 px-4 sm:px-6 lg:px-8 dark:bg-warmgray-900/50">
        <div className="max-w-7xl mx-auto space-y-14">
          {loading ? (
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="h-8 w-48 bg-warmgray-200 dark:bg-warmgray-700 rounded-xl animate-pulse" />
                  <div className="flex gap-4 overflow-hidden">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="flex-shrink-0 w-56 h-56 bg-warmgray-200 dark:bg-warmgray-700 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <ProductScrollRow
                emoji="🔥"
                title="Trending Right Now"
                subtitle="Products our customers can't get enough of"
                products={sections.trending}
                isAdmin={isAdmin}
                viewAllFilter="trending"
              />
              <ProductScrollRow
                emoji="🆕"
                title="Newly Added"
                subtitle="Fresh arrivals from our kitchen to your doorstep"
                products={sections.newlyAdded}
                isAdmin={isAdmin}
                viewAllFilter="new"
              />
              <ProductScrollRow
                emoji="⭐"
                title="Best Sellers"
                subtitle="Our most loved products, ordered again and again"
                products={sections.bestSellers}
                isAdmin={isAdmin}
                viewAllFilter="bestsellers"
              />
            </>
          )}
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold font-display text-warmgray-900 dark:text-white">Loved by Families</h2>
          <p className="text-warmgray-500 dark:text-warmgray-400">Here is why our subscription plans are a hit among corporate professionals and home cooks alike.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-warmgray-100 shadow-sm space-y-4 dark:bg-warmgray-850 dark:border-warmgray-700">
            <div className="flex text-amber-500">{"★".repeat(5)}</div>
            <p className="text-sm italic text-warmgray-600 dark:text-warmgray-300">"The cow ghee smells just like what my grandmother used to make. The monthly subscription is a lifesaver; we never run out of pure ghee for our kids."</p>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-brand-200 flex items-center justify-center font-bold font-display text-brand-700">P</div>
              <div>
                <h4 className="text-xs font-bold text-warmgray-900 dark:text-white">Priya Sundar</h4>
                <p className="text-[10px] text-warmgray-400">Software Engineer, Chennai</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-warmgray-100 shadow-sm space-y-4 dark:bg-warmgray-850 dark:border-warmgray-700">
            <div className="flex text-amber-500">{"★".repeat(5)}</div>
            <p className="text-sm italic text-warmgray-600 dark:text-warmgray-300">"Idli Milagai Podi has the perfect spice kick. We set up a bi-weekly subscription and love how fresh it tastes compared to store brands."</p>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-brand-200 flex items-center justify-center font-bold font-display text-brand-700">R</div>
              <div>
                <h4 className="text-xs font-bold text-warmgray-900 dark:text-white">Ramesh Krishnan</h4>
                <p className="text-[10px] text-warmgray-400">Bank Manager, Bangalore</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-warmgray-100 shadow-sm space-y-4 dark:bg-warmgray-850 dark:border-warmgray-700">
            <div className="flex text-amber-500">{"★".repeat(5)}</div>
            <p className="text-sm italic text-warmgray-600 dark:text-warmgray-300">"Outstanding customer service. When I had to travel, pausing my subscription took just one tap on the website. Highly recommend."</p>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-brand-200 flex items-center justify-center font-bold font-display text-brand-700">A</div>
              <div>
                <h4 className="text-xs font-bold text-warmgray-900 dark:text-white">Ananya Rao</h4>
                <p className="text-[10px] text-warmgray-400">Consultant, Hyderabad</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer banner */}
      <section className="py-16 bg-brand-600 text-white text-center px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-extrabold font-display leading-tight">Bring Back the Taste of Home</h2>
          <p className="text-brand-100 max-w-xl mx-auto text-sm sm:text-base">Join over 500+ households who enjoy fresh, chemical-free homemade food delivered automatically.</p>
          {!isAdmin && (
            <Link
              to="/login?register=true"
              className="inline-flex px-8 py-4 bg-white text-brand-700 font-bold rounded-2xl hover:bg-brand-50 shadow-lg shadow-black/10 transition-colors"
            >
              Create Your Subscription Plan
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
