import React, { useState, useEffect } from 'react';
import { Star, Edit2, Trash2, Package, CheckCircle2, PenLine, RefreshCw, X } from 'lucide-react';
import API from '../utils/api';

// ── Interactive Star Picker ───────────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              s <= (hovered || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-warmgray-300 dark:text-warmgray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

// ── Star Display ─────────────────────────────────────────────────────────────
const StarDisplay = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(s => (
      <Star
        key={s}
        className={`w-3.5 h-3.5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-warmgray-200 dark:text-warmgray-600'}`}
      />
    ))}
  </div>
);

// ── Review Form (write or edit) ───────────────────────────────────────────────
const ReviewForm = ({ product, existingReview, onSubmitted, onCancel }) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [text, setText] = useState(existingReview?.review_text || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please select a star rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      if (existingReview) {
        await API.put(`/reviews/${existingReview.id}`, { rating, review_text: text });
      } else {
        await API.post('/reviews', { product_id: product.id, rating, review_text: text });
      }
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent!' };

  return (
    <form onSubmit={handleSubmit} className="bg-brand-50/60 dark:bg-brand-950/15 border border-brand-100 dark:border-brand-900/40 rounded-2xl p-5 space-y-4 animate-fadein">
      <div className="flex items-center gap-3">
        <img
          src={product.image_url || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=80'}
          alt={product.name}
          className="w-12 h-12 rounded-xl object-cover border border-brand-100"
          loading="lazy"
        />
        <div>
          <p className="font-bold text-warmgray-900 dark:text-white text-sm">{product.name}</p>
          <p className="text-[10px] text-warmgray-400">{product.weight}</p>
        </div>
      </div>

      {/* Star Picker */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-warmgray-700 dark:text-warmgray-300">Your Rating *</label>
        <div className="flex items-center gap-3">
          <StarPicker value={rating} onChange={setRating} />
          {rating > 0 && (
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 animate-fadein">
              {ratingLabels[rating]}
            </span>
          )}
        </div>
      </div>

      {/* Text Review */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-warmgray-700 dark:text-warmgray-300">Your Review (optional)</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Tell us about your experience with this product…"
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-warmgray-800 border border-warmgray-200 dark:border-warmgray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 text-warmgray-800 dark:text-white"
        />
        <p className="text-[10px] text-warmgray-400 text-right">{text.length}/500</p>
      </div>

      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !rating}
          className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Star className="w-4 h-4" />
          {submitting ? 'Submitting…' : existingReview ? 'Update Review' : 'Submit Review'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-warmgray-200 dark:border-warmgray-600 text-warmgray-600 dark:text-warmgray-400 font-bold rounded-xl text-sm hover:bg-warmgray-50 dark:hover:bg-warmgray-900 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MyReviews = () => {
  const [myReviews, setMyReviews]     = useState([]);
  const [eligible, setEligible]       = useState([]);
  const [activeForm, setActiveForm]   = useState(null); // { product, existingReview? }
  const [loading, setLoading]         = useState(true);
  const [successMsg, setSuccessMsg]   = useState('');
  const [activeTab, setActiveTab]     = useState('reviews'); // 'reviews' | 'eligible'

  const loadData = async () => {
    setLoading(true);
    try {
      const [myRes, eligRes] = await Promise.all([
        API.get('/reviews/my'),
        API.get('/reviews/eligible'),
      ]);
      setMyReviews(myRes.data.reviews || []);
      setEligible(eligRes.data.eligibleProducts || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleFormSubmitted = () => {
    setActiveForm(null);
    setSuccessMsg('Your review has been saved! ✓');
    setTimeout(() => setSuccessMsg(''), 4000);
    loadData();
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await API.delete(`/reviews/${reviewId}`);
      setSuccessMsg('Review deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-warmgray-400 animate-pulse">Loading your reviews…</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fadein">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">My Reviews</h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400 mt-0.5">
            Rate and review products from your delivered orders
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-xl border border-warmgray-200 dark:border-warmgray-600 text-warmgray-500 hover:bg-warmgray-50 dark:hover:bg-warmgray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm font-semibold rounded-xl border border-green-100 dark:border-green-900/40 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Active Review Form */}
      {activeForm && (
        <ReviewForm
          product={activeForm.product}
          existingReview={activeForm.existingReview}
          onSubmitted={handleFormSubmitted}
          onCancel={() => setActiveForm(null)}
        />
      )}

      {/* Tab selector */}
      <div className="flex gap-2 border-b border-warmgray-100 dark:border-warmgray-700 pb-0">
        {[
          { id: 'reviews', label: `My Reviews (${myReviews.length})`, icon: Star },
          { id: 'eligible', label: `Write a Review (${eligible.length})`, icon: PenLine },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition-all -mb-px ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-warmgray-500 hover:text-warmgray-700 dark:text-warmgray-400'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: My Reviews */}
      {activeTab === 'reviews' && (
        <>
          {myReviews.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-warmgray-200 dark:border-warmgray-700 rounded-2xl">
              <Star className="w-8 h-8 text-warmgray-300 mx-auto" />
              <p className="text-warmgray-400 font-semibold">No reviews yet</p>
              <p className="text-xs text-warmgray-400">Reviews you submit will appear here.</p>
              <button
                onClick={() => setActiveTab('eligible')}
                className="mt-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Write a Review
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myReviews.map(r => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-5"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={r.image_url || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=80'}
                      alt={r.product_name}
                      className="w-14 h-14 rounded-xl object-cover border border-warmgray-100 dark:border-warmgray-700 flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-warmgray-900 dark:text-white truncate">{r.product_name}</p>
                        <StarDisplay rating={r.rating} />
                        <span className="text-[10px] font-bold text-amber-500">{r.rating}/5</span>
                      </div>
                      {r.review_text && (
                        <p className="mt-1.5 text-sm text-warmgray-600 dark:text-warmgray-300 leading-relaxed italic">
                          "{r.review_text}"
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-warmgray-400">
                        Reviewed on {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {r.updated_at && r.updated_at !== r.created_at && ' · Edited'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setActiveForm({ product: { id: r.product_id, name: r.product_name, image_url: r.image_url }, existingReview: r })}
                        className="p-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/30 text-brand-600 transition-colors"
                        title="Edit review"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg bg-warmgray-50 hover:bg-red-50 text-warmgray-400 hover:text-red-600 dark:bg-warmgray-900 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Eligible to Review */}
      {activeTab === 'eligible' && (
        <>
          {eligible.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-warmgray-200 dark:border-warmgray-700 rounded-2xl">
              <Package className="w-8 h-8 text-warmgray-300 mx-auto" />
              <p className="text-warmgray-400 font-semibold">No products to review</p>
              <p className="text-xs text-warmgray-400">
                You can review products from delivered orders that you haven't reviewed yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eligible.map(p => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-4 flex items-center gap-4"
                >
                  <img
                    src={p.image_url || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=80'}
                    alt={p.name}
                    className="w-14 h-14 rounded-xl object-cover border border-warmgray-100 dark:border-warmgray-700 flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-warmgray-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-warmgray-400">{p.weight}</p>
                    <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                      ✓ From delivered order
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveForm({ product: p });
                      setActiveTab('reviews');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-shrink-0 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    Rate
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyReviews;
