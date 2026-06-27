import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Flame, Sparkles, Star, Tag, Filter } from 'lucide-react';
import API from '../utils/api';

// Static smart filters (not category-based)
const SMART_FILTERS = [
  { key: 'trending',       label: 'Trending',      icon: Flame,    color: 'text-orange-500', emoji: '🔥' },
  { key: 'new',            label: 'Newly Added',   icon: Sparkles, color: 'text-blue-500',   emoji: '🆕' },
  { key: 'bestsellers',    label: 'Best Sellers',  icon: Star,     color: 'text-yellow-500', emoji: '⭐' },
  { key: 'special_offers', label: 'Special Offers',icon: Tag,      color: 'text-green-600',  emoji: '🏷️' },
];

// Category names to show as pills (matched against API categories by name)
const CATEGORY_PILL_ORDER = ['Pickles', 'Podi', 'Ghee', 'Snacks'];

const BADGE_INFO = {
  trending:       { label: 'HOT',        bg: 'bg-orange-500' },
  new:            { label: 'NEW',        bg: 'bg-blue-500'   },
  bestsellers:    { label: 'TOP SELLER', bg: 'bg-yellow-500' },
  special_offers: { label: 'OFFER',      bg: 'bg-green-600'  },
};

const isNewProduct = (createdAt) => {
  if (!createdAt) return false;
  const diffDays = (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
  return diffDays <= 90;
};

const getProductBadges = (prod) => {
  const badges = [];
  if (prod.is_trending)                                      badges.push('trending');
  if (prod.created_at && isNewProduct(prod.created_at))     badges.push('new');
  if (prod.is_special_offer && prod.discount_percent > 0)   badges.push('special_offers');
  return badges;
};

const ProductCatalog = () => {
  const [products, setProducts]           = useState([]);
  const [categories, setCategories]       = useState([]);
  const [search, setSearch]               = useState('');
  const [activeFilter, setActiveFilter]   = useState('');   // smart filter key
  const [activeCatId, setActiveCatId]     = useState('');   // category id
  const [loading, setLoading]             = useState(false);
  const [currentPage, setCurrentPage]     = useState(1);
  const [totalPages, setTotalPages]       = useState(1);

  // Fetch categories once on mount
  useEffect(() => {
    API.get('/products/categories/all')
      .then(res => setCategories(res.data.categories))
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  // Fetch products whenever filters change
  const fetchProducts = useCallback(async (filter, catId, searchTerm, pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 8 };
      if (searchTerm) params.search   = searchTerm;
      if (catId)      params.categoryId = catId;
      if (filter)     params.filter   = filter;
      const res = await API.get('/products', { params });
      
      setProducts(res.data.products || []);
      setTotalPages(res.data.totalPages || 1);
      setCurrentPage(res.data.currentPage || 1);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(activeFilter, activeCatId, '', 1);
    setSearch('');
  }, [activeFilter, activeCatId, fetchProducts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(activeFilter, activeCatId, search, 1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchProducts(activeFilter, activeCatId, search, newPage);
      // Smooth scroll to top of catalog section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Select a smart filter pill → clear category
  const selectSmartFilter = (key) => {
    setActiveFilter(key === activeFilter ? '' : key);
    setActiveCatId('');
  };

  // Select a category pill → clear smart filter
  const selectCategory = (catId) => {
    setActiveCatId(catId === activeCatId ? '' : catId);
    setActiveFilter('');
  };

  // Clear all
  const clearAll = () => {
    setActiveFilter('');
    setActiveCatId('');
  };

  const trackView = async (productId) => {
    try { await API.post(`/products/view/${productId}`); } catch (_) {}
  };

  // Build ordered category pills from CATEGORY_PILL_ORDER
  const categoryPills = CATEGORY_PILL_ORDER
    .map(name => categories.find(c => c.name === name))
    .filter(Boolean);

  const activeLabel = activeFilter
    ? SMART_FILTERS.find(f => f.key === activeFilter)?.label
    : activeCatId
      ? categories.find(c => c.id === activeCatId)?.name
      : null;

  const getEmptyMessage = () => {
    if (activeFilter === 'trending')       return 'No trending products yet. Trending is calculated from sales and views.';
    if (activeFilter === 'new')            return 'No recently added products.';
    if (activeFilter === 'bestsellers')    return 'No sales data yet.';
    if (activeFilter === 'special_offers') return 'No special offers active right now.';
    if (activeCatId) return `No products found in ${categories.find(c => c.id === activeCatId)?.name || 'this category'}.`;
    return 'No products found matching your search.';
  };

  const isNothingSelected = !activeFilter && !activeCatId;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadein">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">
            Homemade Product Catalog
          </h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">
            Order one-time or subscribe to automate fresh food deliveries
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warmgray-400" />
            <input
              type="text"
              placeholder="Search podi, ghee, pickles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-sm transition-colors text-sm"
          >
            Search
          </button>
        </form>
      </div>

      {/* ── Unified Filter Pill Row ──────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <Filter className="w-4 h-4 text-warmgray-400 shrink-0" />

        {/* All */}
        <button
          onClick={clearAll}
          className={`px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all shrink-0 ${
            isNothingSelected
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'bg-white text-warmgray-600 hover:bg-warmgray-50 border border-warmgray-200 dark:bg-warmgray-800 dark:text-warmgray-300 dark:border-warmgray-700'
          }`}
        >
          All Specialties
        </button>

        {/* Smart filters */}
        {SMART_FILTERS.map(f => {
          const Icon = f.icon;
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => selectSmartFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'bg-white text-warmgray-600 hover:bg-warmgray-50 border border-warmgray-200 dark:bg-warmgray-800 dark:text-warmgray-300 dark:border-warmgray-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : f.color}`} />
              {f.emoji} {f.label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-5 bg-warmgray-200 dark:bg-warmgray-700 shrink-0 mx-1" />

        {/* Category pills (Pickles, Podi, Ghee, Snacks) */}
        {categoryPills.map(cat => {
          const isActive = activeCatId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.id)}
              className={`px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-warmgray-900 text-white shadow-md dark:bg-white dark:text-warmgray-900'
                  : 'bg-white text-warmgray-600 hover:bg-warmgray-50 border border-warmgray-200 dark:bg-warmgray-800 dark:text-warmgray-300 dark:border-warmgray-700'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* ── Active filter banner ─────────────────────────────────────── */}
      {activeLabel && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 border border-brand-100 rounded-xl dark:bg-brand-950/30 dark:border-brand-900/40">
          <span className="text-sm font-semibold text-brand-700 dark:text-brand-400">
            {activeLabel}
          </span>
          <span className="ml-auto text-xs text-brand-600 dark:text-brand-500 font-semibold">
            {products.length} result{products.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={clearAll}
            className="text-xs text-warmgray-400 hover:text-warmgray-600 ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Products Grid ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden border border-warmgray-100 dark:bg-warmgray-800 dark:border-warmgray-700 flex flex-col h-[350px]">
              <div className="h-44 skeleton-pulse" />
              <div className="p-5 flex-1 space-y-3 flex flex-col">
                <div className="h-3 skeleton-pulse rounded w-1/3" />
                <div className="h-4 skeleton-pulse rounded w-3/4" />
                <div className="h-3 skeleton-pulse rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-warmgray-200 rounded-3xl dark:border-warmgray-700">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-warmgray-500 dark:text-warmgray-400">{getEmptyMessage()}</p>
          <button
            onClick={clearAll}
            className="mt-4 text-sm text-brand-600 hover:text-brand-700 font-bold"
          >
            ← Show all products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(prod => {
            const badges = getProductBadges(prod);
            const discountedPrice = prod.is_special_offer && prod.discount_percent > 0
              ? (parseFloat(prod.price) * (1 - prod.discount_percent / 100)).toFixed(0)
              : null;

            return (
              <div
                key={prod.id}
                className="bg-white rounded-3xl overflow-hidden border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex flex-col h-full product-card-hover"
              >
                {/* Image */}
                <div className="h-44 overflow-hidden bg-warmgray-50 relative">
                  <img
                    src={prod.image_url || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400'}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Weight badge */}
                  <span className="absolute top-3.5 right-3.5 bg-brand-500 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                    {prod.weight}
                  </span>
                  {/* Special offer ribbon */}
                  {prod.is_special_offer && prod.discount_percent > 0 && (
                    <span className="absolute top-3.5 left-3.5 bg-green-500 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                      {prod.discount_percent}% OFF
                    </span>
                  )}
                  {/* Other badges */}
                  {!prod.is_special_offer && badges.length > 0 && (
                    <div className="absolute top-3.5 left-3.5 flex gap-1">
                      {badges.slice(0, 1).map(b => {
                        const info = BADGE_INFO[b];
                        return info ? (
                          <span key={b} className={`${info.bg} text-white font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm`}>
                            {info.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1 space-y-2">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                    {prod.category_name}
                  </span>
                  <h3 className="text-base font-bold font-display text-warmgray-900 dark:text-white line-clamp-1">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-warmgray-400 line-clamp-2 dark:text-warmgray-400 flex-1">
                    {prod.description}
                  </p>

                  {/* Price & action */}
                  <div className="flex justify-between items-center pt-3 border-t border-warmgray-50 dark:border-warmgray-700">
                    <div className="flex flex-col">
                      {discountedPrice ? (
                        <>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-green-600">₹{discountedPrice}</span>
                            <span className="text-xs text-warmgray-400 line-through">₹{prod.price}</span>
                          </div>
                          <span className="text-[8px] text-warmgray-400 font-semibold uppercase tracking-wider">
                            Shelf Life: {prod.shelf_life_days} Days
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-black text-warmgray-900 dark:text-white">₹{prod.price}</span>
                          <span className="text-[8px] text-warmgray-400 font-semibold uppercase tracking-wider">
                            Shelf Life: {prod.shelf_life_days} Days
                          </span>
                        </>
                      )}
                    </div>
                    <Link
                      to={`/products/${prod.id}`}
                      onClick={() => trackView(prod.id)}
                      className="p-2 bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white rounded-xl transition-all duration-150 group"
                    >
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white dark:bg-warmgray-800 text-warmgray-600 dark:text-warmgray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-warmgray-50 dark:hover:bg-warmgray-750 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-warmgray-500 dark:text-warmgray-450">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white dark:bg-warmgray-800 text-warmgray-600 dark:text-warmgray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-warmgray-50 dark:hover:bg-warmgray-750 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
