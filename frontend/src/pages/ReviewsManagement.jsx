import React, { useState, useEffect } from 'react';
import {
  Star, Flag, Trash2, RefreshCw, Search, Filter,
  TrendingUp, TrendingDown, MessageSquare, AlertTriangle,
  CheckCircle2, X, Package, Award, BarChart3
} from 'lucide-react';
import API from '../utils/api';

// ── Star display component ────────────────────────────────────────────────────
const StarRating = ({ rating, size = 'sm' }) => {
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star
          key={s}
          className={`${sz} ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-warmgray-200 dark:text-warmgray-600'}`}
        />
      ))}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, color, badge }) => (
  <div className="bg-white dark:bg-warmgray-800 rounded-2xl p-5 border border-warmgray-100 dark:border-warmgray-700 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
          {badge}
        </span>
      )}
    </div>
    <p className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">{value}</p>
    <p className="text-xs text-warmgray-500 dark:text-warmgray-400 mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-warmgray-400 mt-0.5">{sub}</p>}
  </div>
);

const ReviewsManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [productStats, setProductStats] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [flagFilter, setFlagFilter] = useState('all'); // all | flagged | clean
  const [ratingFilter, setRatingFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('reviews'); // reviews | analytics
  const [message, setMessage] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [reviewsRes, analyticsRes] = await Promise.all([
        API.get('/reviews', { params: { flagged: flagFilter === 'flagged' ? 'true' : undefined } }),
        API.get('/reviews/analytics'),
      ]);
      setReviews(reviewsRes.data.reviews || []);
      setProductStats(reviewsRes.data.productStats || []);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleFlag = async (reviewId, currentFlag) => {
    try {
      await API.put(`/reviews/${reviewId}/flag`, { flag: !currentFlag });
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, is_flagged: !currentFlag } : r
      ));
      setMessage(currentFlag ? 'Review unflagged.' : 'Review flagged as inappropriate.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Flag error:', err);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await API.delete(`/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setMessage('Review deleted.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Unique products for filter dropdown
  const uniqueProducts = [...new Map(reviews.map(r => [r.product_id, r.product_name])).entries()];

  const filtered = reviews.filter(r => {
    const matchSearch = !search
      || r.customer_name?.toLowerCase().includes(search.toLowerCase())
      || r.product_name?.toLowerCase().includes(search.toLowerCase())
      || r.review_text?.toLowerCase().includes(search.toLowerCase());
    const matchProduct = productFilter === 'all' || String(r.product_id) === productFilter;
    const matchFlag = flagFilter === 'all' || (flagFilter === 'flagged' ? r.is_flagged : !r.is_flagged);
    const matchRating = ratingFilter === 'all' || String(r.rating) === ratingFilter;
    return matchSearch && matchProduct && matchFlag && matchRating;
  });

  const avgAll = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '–';

  return (
    <div className="p-6 space-y-6 animate-fadein">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">Reviews & Ratings</h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Manage customer feedback and product ratings</p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {message && (
        <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-100 dark:bg-green-950/30 dark:text-green-400">
          ✓ {message}
        </div>
      )}

      {/* Tab Toggle */}
      <div className="flex gap-2">
        {[{id: 'reviews', label: 'All Reviews', icon: MessageSquare}, {id: 'analytics', label: 'Rating Analytics', icon: BarChart3}].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              activeTab === t.id
                ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                : 'border-warmgray-200 dark:border-warmgray-600 text-warmgray-600 dark:text-warmgray-400 hover:border-brand-300'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-warmgray-400 animate-pulse">Loading reviews…</div>
      ) : activeTab === 'analytics' ? (
        /* ── Analytics Tab ─────────────────────────────── */
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Reviews"  value={analytics?.totalReviews || 0}  icon={MessageSquare} color="bg-brand-50 text-brand-600 dark:bg-brand-950/40" />
            <StatCard label="Overall Rating" value={analytics?.overallAvg || '–'}   icon={Star}          color="bg-amber-50 text-amber-600 dark:bg-amber-950/40" badge="★" />
            <StatCard label="Flagged Reviews" value={analytics?.flaggedCount || 0}  icon={Flag}          color="bg-red-50 text-red-600 dark:bg-red-950/40" />
            <StatCard
              label="Highest Rated"
              value={analytics?.highest ? `${analytics.highest.avg_rating}★` : '–'}
              sub={analytics?.highest?.name}
              icon={TrendingUp}
              color="bg-green-50 text-green-600 dark:bg-green-950/40"
            />
            <StatCard
              label="Lowest Rated"
              value={analytics?.lowest ? `${analytics.lowest.avg_rating}★` : '–'}
              sub={analytics?.lowest?.name}
              icon={TrendingDown}
              color="bg-rose-50 text-rose-600 dark:bg-rose-950/40"
            />
            <StatCard
              label="Most Reviewed"
              value={analytics?.mostReviewed ? `${analytics.mostReviewed.review_count} reviews` : '–'}
              sub={analytics?.mostReviewed?.name}
              icon={Award}
              color="bg-purple-50 text-purple-600 dark:bg-purple-950/40"
            />
          </div>

          {/* Per-Product Ratings Table */}
          <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-warmgray-50 dark:border-warmgray-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-bold text-warmgray-800 dark:text-white">Average Rating per Product</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-warmgray-50 dark:bg-warmgray-900">
                  <tr>
                    <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Product</th>
                    <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Avg Rating</th>
                    <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Reviews</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Rating Bar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700">
                  {productStats.map(ps => (
                    <tr key={ps.id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-700/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-warmgray-800 dark:text-warmgray-200">{ps.name}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <StarRating rating={Math.round(parseFloat(ps.avg_rating || 0))} size="sm" />
                          <span className="font-bold text-warmgray-700 dark:text-warmgray-300">
                            {ps.avg_rating ? parseFloat(ps.avg_rating).toFixed(1) : '–'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-warmgray-600 dark:text-warmgray-400">{ps.review_count}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-warmgray-100 dark:bg-warmgray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all"
                              style={{ width: `${((parseFloat(ps.avg_rating || 0) / 5) * 100).toFixed(0)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-warmgray-400 w-8">{ps.avg_rating ? `${parseFloat(ps.avg_rating).toFixed(1)}/5` : '0/5'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ── Reviews Tab ────────────────────────────────── */
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-warmgray-800 rounded-xl px-4 py-3 border border-warmgray-100 dark:border-warmgray-700 text-center">
              <p className="text-xl font-extrabold text-warmgray-900 dark:text-white">{reviews.length}</p>
              <p className="text-[10px] text-warmgray-400 uppercase tracking-wider font-bold mt-0.5">Total</p>
            </div>
            <div className="bg-white dark:bg-warmgray-800 rounded-xl px-4 py-3 border border-warmgray-100 dark:border-warmgray-700 text-center">
              <p className="text-xl font-extrabold text-amber-500">{avgAll}</p>
              <p className="text-[10px] text-warmgray-400 uppercase tracking-wider font-bold mt-0.5">Avg Rating</p>
            </div>
            <div className="bg-white dark:bg-warmgray-800 rounded-xl px-4 py-3 border border-warmgray-100 dark:border-warmgray-700 text-center">
              <p className="text-xl font-extrabold text-red-500">{reviews.filter(r => r.is_flagged).length}</p>
              <p className="text-[10px] text-warmgray-400 uppercase tracking-wider font-bold mt-0.5">Flagged</p>
            </div>
            <div className="bg-white dark:bg-warmgray-800 rounded-xl px-4 py-3 border border-warmgray-100 dark:border-warmgray-700 text-center">
              <p className="text-xl font-extrabold text-green-500">{reviews.filter(r => r.rating >= 4).length}</p>
              <p className="text-[10px] text-warmgray-400 uppercase tracking-wider font-bold mt-0.5">4–5 Star</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warmgray-400" />
              <input
                type="text"
                placeholder="Search by customer, product or review text…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-warmgray-200 dark:border-warmgray-600 rounded-xl bg-white dark:bg-warmgray-800 text-warmgray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="text-xs border border-warmgray-200 dark:border-warmgray-600 rounded-xl px-3 py-2.5 bg-white dark:bg-warmgray-800 text-warmgray-700 dark:text-warmgray-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="all">All Products</option>
              {uniqueProducts.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <select
              value={ratingFilter}
              onChange={e => setRatingFilter(e.target.value)}
              className="text-xs border border-warmgray-200 dark:border-warmgray-600 rounded-xl px-3 py-2.5 bg-white dark:bg-warmgray-800 text-warmgray-700 dark:text-warmgray-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="all">All Ratings</option>
              <option value="5">★★★★★ 5 Star</option>
              <option value="4">★★★★ 4 Star</option>
              <option value="3">★★★ 3 Star</option>
              <option value="2">★★ 2 Star</option>
              <option value="1">★ 1 Star</option>
            </select>
            <div className="flex gap-2">
              {['all', 'clean', 'flagged'].map(f => (
                <button
                  key={f}
                  onClick={() => setFlagFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                    flagFilter === f
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-warmgray-200 dark:border-warmgray-600 text-warmgray-600 dark:text-warmgray-400 hover:border-brand-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'flagged' ? '🚩 Flagged' : '✓ Clean'}
                </button>
              ))}
            </div>
          </div>

          {/* Reviews List */}
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-warmgray-400 border border-dashed border-warmgray-200 dark:border-warmgray-700 rounded-2xl">
              No reviews found matching your filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(review => (
                <div
                  key={review.id}
                  className={`bg-white dark:bg-warmgray-800 rounded-2xl border shadow-sm p-5 transition-all ${
                    review.is_flagged
                      ? 'border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10'
                      : 'border-warmgray-100 dark:border-warmgray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center text-brand-600 dark:text-brand-400 font-extrabold text-sm flex-shrink-0">
                          {review.customer_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-warmgray-800 dark:text-white">{review.customer_name}</p>
                          <p className="text-[10px] text-warmgray-400">{review.customer_email}</p>
                        </div>
                        <StarRating rating={review.rating} />
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                          {review.rating}/5
                        </span>
                        {review.is_flagged && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/40">
                            🚩 Flagged
                          </span>
                        )}
                      </div>

                      {/* Product badge */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-brand-400" />
                        <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-2 py-0.5 rounded-md">
                          {review.product_name}
                        </span>
                      </div>

                      {/* Review text */}
                      {review.review_text && (
                        <p className="mt-2 text-sm text-warmgray-600 dark:text-warmgray-300 leading-relaxed italic">
                          "{review.review_text}"
                        </p>
                      )}

                      <p className="mt-1.5 text-[10px] text-warmgray-400">
                        {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {review.updated_at !== review.created_at && ' (edited)'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleFlag(review.id, review.is_flagged)}
                        title={review.is_flagged ? 'Unflag review' : 'Flag as inappropriate'}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                          review.is_flagged
                            ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900/40'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-900/40'
                        }`}
                      >
                        {review.is_flagged ? <><CheckCircle2 className="w-3 h-3" /> Unflag</> : <><Flag className="w-3 h-3" /> Flag</>}
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        title="Delete review"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border bg-warmgray-50 text-warmgray-600 border-warmgray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors dark:bg-warmgray-900 dark:border-warmgray-700 dark:text-warmgray-400"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewsManagement;
