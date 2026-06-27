import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Flame, Star, Sparkles, TrendingUp, Eye } from 'lucide-react';
import API from '../utils/api';
import Modal from '../components/Modal';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [weight, setWeight] = useState('');
  const [shelfLifeDays, setShelfLifeDays] = useState('');
  // Product marking states
  const [isTrending, setIsTrending] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSpecialOffer, setIsSpecialOffer] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('');

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        API.get('/products'),
        API.get('/products/categories/all')
      ]);
      setProducts(prodRes.data.products);
      setCategories(catRes.data.categories);
    } catch (err) {
      console.error('Error fetching catalog data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setWeight('250g');
    setShelfLifeDays('180');
    setIsTrending(false);
    setIsFeatured(false);
    setIsSpecialOffer(false);
    setDiscountPercent('');
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategoryId(prod.category_id);
    setDescription(prod.description);
    setPrice(prod.price);
    setImageUrl(prod.image_url);
    setWeight(prod.weight);
    setShelfLifeDays(prod.shelf_life_days);
    setIsTrending(prod.is_trending || false);
    setIsFeatured(prod.is_featured || false);
    setIsSpecialOffer(prod.is_special_offer || false);
    setDiscountPercent(prod.discount_percent || '');
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Pre-submit validation
    if (!name || name.trim().length === 0) {
      setError('Product name is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal <= 0) {
      setError('Price must be a positive number.');
      return;
    }
    const shelfLifeVal = parseInt(shelfLifeDays);
    if (isNaN(shelfLifeVal) || shelfLifeVal <= 0) {
      setError('Shelf life must be a positive number of days.');
      return;
    }

    const DEFAULT_PLACEHOLDER = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300';
    const isValidUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      return url.startsWith('http://') || url.startsWith('https://');
    };
    const finalImageUrl = isValidUrl(imageUrl) ? imageUrl : DEFAULT_PLACEHOLDER;

    const payload = {
      category_id: parseInt(categoryId),
      name,
      description,
      price: priceVal,
      image_url: finalImageUrl,
      weight,
      shelf_life_days: shelfLifeVal,
      is_trending: isTrending,
      is_featured: isFeatured,
      is_special_offer: isSpecialOffer,
      discount_percent: isSpecialOffer ? (parseInt(discountPercent) || 0) : 0,
    };

    try {
      if (editingProduct) {
        await API.put(`/products/${editingProduct.id}`, payload);
        setSuccess('Product updated successfully!');
      } else {
        await API.post('/products', payload);
        setSuccess('Product added successfully!');
      }
      fetchData();
      setTimeout(() => setModalOpen(false), 1000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save product details.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? All inventory and subscriptions for this product will be impacted.')) return;
    try {
      await API.delete(`/products/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete product.');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-warmgray-400">Loading catalog management...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fadein">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Product Catalog Management</h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Add, edit, or remove homemade products and categories</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-sm text-xs transition-colors flex items-center justify-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-warmgray-50 text-warmgray-450 uppercase tracking-wider font-bold border-b border-warmgray-100 dark:bg-warmgray-900 dark:border-warmgray-700">
                <th className="p-4 pl-6">Product Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Labels</th>
                <th className="p-4">Sales / Views</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700 text-warmgray-750 dark:text-warmgray-300">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-900/30 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center space-x-3">
                      <img src={prod.image_url} alt={prod.name} className="w-12 h-12 object-cover rounded-xl bg-warmgray-50 shrink-0" loading="lazy" />
                      <div>
                        <div className="font-bold text-warmgray-900 dark:text-white text-sm">{prod.name}</div>
                        <div className="text-[10px] text-warmgray-400 line-clamp-1 max-w-xs">{prod.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-650 font-bold uppercase tracking-wider dark:bg-brand-950/40 dark:text-brand-400 text-[9px]">
                      <Tag className="w-3 h-3" />
                      <span>{prod.category_name}</span>
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-warmgray-900 dark:text-white">₹{prod.price}</div>
                    {prod.is_special_offer && prod.discount_percent > 0 && (
                      <div className="text-[9px] text-green-600 font-bold">{prod.discount_percent}% OFF applied</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {prod.is_trending && <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[8px] font-bold rounded-md"><Flame className="w-2.5 h-2.5" />Trending</span>}
                      {prod.is_featured && <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-bold rounded-md"><Star className="w-2.5 h-2.5" />Featured</span>}
                      {prod.is_special_offer && <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded-md">🏷️ Offer</span>}
                      {!prod.is_trending && !prod.is_featured && !prod.is_special_offer && <span className="text-warmgray-300 text-[9px]">—</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-[10px] text-warmgray-500">
                      <span className="flex items-center gap-0.5"><TrendingUp className="w-3 h-3 text-brand-500" />{prod.sales_count || 0} sold</span>
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3 text-blue-400" />{prod.view_count || 0}</span>
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right space-x-2 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(prod)}
                      className="p-1.5 bg-warmgray-50 hover:bg-brand-50 hover:text-brand-600 rounded-lg dark:bg-warmgray-900 transition-all text-warmgray-500"
                      title="Edit Product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id)}
                      className="p-1.5 bg-warmgray-50 hover:bg-red-50 hover:text-red-650 rounded-lg dark:bg-warmgray-900 transition-all text-warmgray-500"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Edit Product Details' : 'Add New Specialty Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && <p className="p-2 bg-red-50 text-red-700 font-bold rounded-lg">{error}</p>}
          {success && <p className="p-2 bg-green-50 text-green-700 font-bold rounded-lg">{success}</p>}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Product Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Idli Milagai Podi"
              className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Net Weight / Vol</label>
              <input
                type="text"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="250g or 500ml"
                className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Unit Price (₹)</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150"
                className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Shelf Life (Days)</label>
              <input
                type="number"
                required
                value={shelfLifeDays}
                onChange={(e) => setShelfLifeDays(e.target.value)}
                placeholder="180"
                className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Spiced powder mix for idlis..."
              className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white resize-none"
            />
          </div>

          {/* Product Marking */}
          <div className="space-y-2 pt-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Product Labels &amp; Visibility</label>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-warmgray-200 dark:border-warmgray-700 cursor-pointer hover:bg-warmgray-50 dark:hover:bg-warmgray-900 transition-colors">
                <input
                  type="checkbox"
                  checked={isTrending}
                  onChange={(e) => setIsTrending(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <Flame className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-xs font-bold text-warmgray-800 dark:text-white">Mark as Trending</div>
                  <div className="text-[10px] text-warmgray-400">Appears in 🔥 Trending filter and homepage section</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-warmgray-200 dark:border-warmgray-700 cursor-pointer hover:bg-warmgray-50 dark:hover:bg-warmgray-900 transition-colors">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 accent-purple-500"
                />
                <Star className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-xs font-bold text-warmgray-800 dark:text-white">Mark as Featured / Premium</div>
                  <div className="text-[10px] text-warmgray-400">Shown in 👑 Premium filter (also auto-applied for price ≥ ₹250)</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-warmgray-200 dark:border-warmgray-700 cursor-pointer hover:bg-warmgray-50 dark:hover:bg-warmgray-900 transition-colors">
                <input
                  type="checkbox"
                  checked={isSpecialOffer}
                  onChange={(e) => setIsSpecialOffer(e.target.checked)}
                  className="w-4 h-4 accent-green-500"
                />
                <Sparkles className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-xs font-bold text-warmgray-800 dark:text-white">Mark as Special Offer</div>
                  <div className="text-[10px] text-warmgray-400">Shows discount ribbon on product cards</div>
                </div>
              </label>
              {isSpecialOffer && (
                <div className="ml-7 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-green-300 dark:bg-warmgray-900 dark:border-warmgray-700 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Analytics info (edit mode only) */}
          {editingProduct && (
            <div className="flex gap-4 p-3 bg-warmgray-50 dark:bg-warmgray-900 rounded-lg text-[10px] text-warmgray-500">
              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-brand-500" /><strong>{editingProduct.sales_count || 0}</strong> units sold</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-blue-400" /><strong>{editingProduct.view_count || 0}</strong> views</span>
              <span className="flex items-center gap-1">⚡ Score: <strong>{editingProduct.trending_score || 0}</strong></span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg shadow-md transition-colors text-xs"
          >
            {editingProduct ? 'Save Updates' : 'Add Product'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ProductManagement;
