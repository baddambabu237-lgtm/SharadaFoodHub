import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowRight } from 'lucide-react';
import API from '../utils/api';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await API.get('/products/categories/all');
        setCategories(res.data.categories);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products based on search and category
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.categoryId = selectedCategory;

      const res = await API.get('/products', { params });
      setProducts(res.data.products);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadein">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Homemade Product Catalog</h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Order one-time or subscribe to automate fresh food deliveries</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warmgray-400" />
            <input
              type="text"
              placeholder="Search podi, ghee, pickles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-warmgray-200 focus:outline-none focus:border-brand-500 dark:bg-warmgray-800 dark:border-warmgray-700 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-sm transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-warmgray-100 dark:border-warmgray-700">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${!selectedCategory ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-warmgray-600 hover:bg-warmgray-50 border border-warmgray-200 dark:bg-warmgray-800 dark:text-warmgray-300 dark:border-warmgray-700'}`}
        >
          All Specialties
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${selectedCategory === cat.id ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-warmgray-600 hover:bg-warmgray-50 border border-warmgray-200 dark:bg-warmgray-800 dark:text-warmgray-300 dark:border-warmgray-700'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-20 text-warmgray-400">Loading catalog...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-warmgray-400 border border-dashed border-warmgray-200 rounded-3xl dark:border-warmgray-700">
          No products found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-3xl overflow-hidden border border-warmgray-100 shadow-sm hover:shadow-md transition-shadow dark:bg-warmgray-800 dark:border-warmgray-700 flex flex-col h-full"
            >
              {/* Product Image */}
              <div className="h-44 overflow-hidden bg-warmgray-50 relative">
                <img
                  src={prod.image_url || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400'}
                  alt={prod.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3.5 right-3.5 bg-brand-500 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                  {prod.weight}
                </span>
              </div>

              {/* Product Body */}
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

                {/* Price & Action */}
                <div className="flex justify-between items-center pt-3 border-t border-warmgray-50 dark:border-warmgray-700">
                  <div className="flex flex-col">
                    <span className="text-lg font-black text-warmgray-900 dark:text-white">₹{prod.price}</span>
                    <span className="text-[8px] text-warmgray-400 font-semibold uppercase tracking-wider">Shelf Life: {prod.shelf_life_days} Days</span>
                  </div>
                  <Link
                    to={`/products/${prod.id}`}
                    className="p-2 bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white rounded-xl transition-all duration-150 group"
                  >
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
