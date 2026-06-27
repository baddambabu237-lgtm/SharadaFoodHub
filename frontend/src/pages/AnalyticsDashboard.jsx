import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, ShoppingBag, IndianRupee, RefreshCw, Package, AlertTriangle, Eye, Flame, Star, Tag } from 'lucide-react';
import API from '../utils/api';

const ORANGE_PALETTE = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fff7ed'];
const GREEN_PALETTE = ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'];

const MOCK_REVENUE = [
  { month: 'Jan', revenue: 42000, orders: 87 },
  { month: 'Feb', revenue: 58000, orders: 112 },
  { month: 'Mar', revenue: 53000, orders: 98 },
  { month: 'Apr', revenue: 71000, orders: 145 },
  { month: 'May', revenue: 67000, orders: 132 },
  { month: 'Jun', revenue: 89000, orders: 178 },
];

const MOCK_CATEGORIES = [
  { name: 'Podi', value: 35 },
  { name: 'Pickles', value: 28 },
  { name: 'Ghee', value: 18 },
  { name: 'Snacks', value: 12 },
  { name: 'Appalam', value: 7 },
];

const MOCK_SUBSCRIPTIONS = [
  { month: 'Jan', active: 45, paused: 8, cancelled: 3 },
  { month: 'Feb', active: 62, paused: 11, cancelled: 5 },
  { month: 'Mar', active: 71, paused: 9, cancelled: 4 },
  { month: 'Apr', active: 89, paused: 14, cancelled: 6 },
  { month: 'May', active: 95, paused: 12, cancelled: 7 },
  { month: 'Jun', active: 118, paused: 16, cancelled: 5 },
];

const MOCK_CANCEL_TREND = [
  { month: 'Jan', orders: 2, subscriptions: 1 },
  { month: 'Feb', orders: 1, subscriptions: 3 },
  { month: 'Mar', orders: 3, subscriptions: 2 },
  { month: 'Apr', orders: 4, subscriptions: 1 },
  { month: 'May', orders: 2, subscriptions: 4 },
  { month: 'Jun', orders: 1, subscriptions: 2 },
];

const MOCK_CANCEL_REASONS = [
  { reason: 'Ordered by mistake', count: 12 },
  { reason: 'Too expensive', count: 8 },
  { reason: 'No longer needed', count: 5 },
  { reason: 'Delivery issue', count: 3 },
  { reason: 'Product issue', count: 2 },
];

const MOCK_CANCEL_PRODUCTS = [
  { name: 'Idli Milagai Podi', count: 6 },
  { name: 'Ribbon Pakoda', count: 4 },
  { name: 'Pure Cow Ghee', count: 3 },
  { name: 'Mango Pickle', count: 2 },
  { name: 'Assorted Snacks', count: 1 },
];

const StatCard = ({ label, value, icon: Icon, change, color }) => (
  <div className="bg-white dark:bg-warmgray-800 rounded-2xl p-5 border border-warmgray-100 dark:border-warmgray-700 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      {change && (
        <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-2 py-0.5 rounded-full">
          +{change}%
        </span>
      )}
    </div>
    <p className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">{value}</p>
    <p className="text-xs text-warmgray-500 dark:text-warmgray-400 mt-0.5">{label}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-warmgray-800 border border-warmgray-100 dark:border-warmgray-700 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-bold text-warmgray-700 dark:text-warmgray-300 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="font-semibold">
            {entry.name}: {typeof entry.value === 'number' && entry.name.includes('evenue') ? `₹${entry.value.toLocaleString('en-IN')}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [productAnalytics, setProductAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, prodRes] = await Promise.all([
          API.get('/dashboard/stats'),
          API.get('/dashboard/product-analytics'),
        ]);
        setStats(statsRes.data);
        setProductAnalytics(prodRes.data);
      } catch {
        // Use mock stats
        setStats({
          summary: {
            totalCustomers: 284,
            activeSubscriptions: 118,
            pendingDispatches: 23,
            monthlyRevenue: 89000,
            totalOrders: 1420,
          }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-warmgray-400 animate-pulse py-20">Loading analytics...</div>;
  }

  // Handle dynamic data transformations for Recharts
  const rawCategories = stats?.charts?.categoryData || [];
  const totalCategorySales = rawCategories.reduce((sum, c) => sum + (c.count || 0), 0);
  const categoryData = totalCategorySales > 0 
    ? rawCategories.map(cat => ({ name: cat.category, value: cat.count || 0 }))
    : MOCK_CATEGORIES;

  const topProducts = stats?.charts?.topProducts?.length > 0
    ? stats.charts.topProducts
    : TOP_PRODUCTS;

  const cancellationTrend = stats?.charts?.cancellationTrend || MOCK_CANCEL_TREND;
  const topReasons = stats?.charts?.topReasons || MOCK_CANCEL_REASONS;
  const mostCancelledProducts = stats?.charts?.mostCancelledProducts || MOCK_CANCEL_PRODUCTS;

  return (
    <div className="p-6 space-y-6 animate-fadein">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">Analytics Dashboard</h1>
        <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Business performance overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total Customers"
          value={stats?.summary?.totalCustomers?.toLocaleString('en-IN') || '0'}
          icon={Users}
          change={12}
          color="bg-blue-50 text-blue-600 dark:bg-blue-950/40"
        />
        <StatCard
          label="Active Subscriptions"
          value={stats?.summary?.activeSubscriptions?.toLocaleString('en-IN') || '0'}
          icon={RefreshCw}
          change={18}
          color="bg-brand-50 text-brand-600 dark:bg-brand-950/40"
        />
        <StatCard
          label="Pending Dispatches"
          value={stats?.summary?.pendingDispatches?.toLocaleString('en-IN') || '0'}
          icon={Package}
          color="bg-amber-50 text-amber-600 dark:bg-amber-950/40"
        />
        <StatCard
          label="Monthly Revenue"
          value={`₹${(stats?.summary?.monthlyRevenue || 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          change={24}
          color="bg-green-50 text-green-600 dark:bg-green-950/40"
        />
        <StatCard
          label="Total Orders"
          value={stats?.summary?.totalOrders?.toLocaleString('en-IN') || '0'}
          icon={ShoppingBag}
          change={9}
          color="bg-purple-50 text-purple-600 dark:bg-purple-950/40"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-5">
        <h2 className="text-sm font-bold text-warmgray-800 dark:text-white mb-4 font-display">Monthly Revenue & Orders</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={stats?.charts?.salesTrend || MOCK_REVENUE}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#78716c' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#78716c' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#f97316" fill="url(#revGrad)" strokeWidth={2.5} dot={{ r: 4, fill: '#f97316' }} />
            <Area yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#3b82f6" fill="url(#ordGrad)" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3, fill: '#3b82f6' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Row: Subscriptions + Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Subscription Trends */}
        <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-5">
          <h2 className="text-sm font-bold text-warmgray-800 dark:text-white mb-4 font-display">Subscription Trends</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.charts?.subscriptionTrend || MOCK_SUBSCRIPTIONS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="active" name="Active" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="paused" name="Paused" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Pie */}
        <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-5">
          <h2 className="text-sm font-bold text-warmgray-800 dark:text-white mb-4 font-display">Sales by Category</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={85} innerRadius={50} dataKey="value" paddingAngle={3}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={ORANGE_PALETTE[i % ORANGE_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {categoryData.map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ORANGE_PALETTE[i % ORANGE_PALETTE.length] }} />
                    <span className="text-xs text-warmgray-600 dark:text-warmgray-400">{cat.name}</span>
                  </div>
                  <span className="text-xs font-bold text-warmgray-800 dark:text-white">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-5">
        <h2 className="text-sm font-bold text-warmgray-800 dark:text-white mb-4 font-display">Top Selling Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-warmgray-100 dark:border-warmgray-700">
                {['Product', 'Category', 'Units Sold', 'Revenue', 'Growth'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700/50">
              {topProducts.map((p, i) => (
                <tr key={i} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-700/20 transition-colors">
                  <td className="py-3 px-3 text-sm font-semibold text-warmgray-800 dark:text-white">{p.name}</td>
                  <td className="py-3 px-3 text-xs text-warmgray-500">{p.category}</td>
                  <td className="py-3 px-3 text-sm font-bold text-warmgray-700 dark:text-warmgray-300">{p.units || 0}</td>
                  <td className="py-3 px-3 text-sm font-bold text-warmgray-900 dark:text-white">₹{(p.revenue || 0).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-2 py-0.5 rounded-full">+{p.growth || 0}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellations Analytics Section */}
      <div className="border-t border-warmgray-200 dark:border-warmgray-700 pt-6">
        <h2 className="text-lg font-bold text-warmgray-900 dark:text-white mb-4 font-display flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
          <span>Cancellations & Health Metrics</span>
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cancellation Trends Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-warmgray-800 dark:text-white font-display">Cancellation Trend (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cancellationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="orders" name="Cancelled Orders" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="subscriptions" name="Cancelled Subscriptions" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cancellation Reasons Breakdowns */}
          <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-105 dark:border-warmgray-700 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-warmgray-800 dark:text-white font-display">Top Cancellation Reasons</h3>
            <div className="space-y-3">
              {topReasons.length === 0 ? (
                <p className="text-xs text-warmgray-400 text-center py-10">No cancellations recorded yet.</p>
              ) : (
                topReasons.map((reason, idx) => {
                  const maxCount = Math.max(...topReasons.map(r => r.count));
                  const percentage = maxCount > 0 ? (reason.count / maxCount) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-warmgray-700 dark:text-warmgray-300">{reason.reason || 'Other'}</span>
                        <span className="text-warmgray-900 dark:text-white font-bold">{reason.count}</span>
                      </div>
                      <div className="w-full h-2 bg-warmgray-100 dark:bg-warmgray-750 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Most Cancelled Products Table */}
        <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-5 mt-6 space-y-4">
          <h3 className="text-sm font-bold text-warmgray-800 dark:text-white font-display">Most Cancelled Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-warmgray-100 dark:border-warmgray-700">
                  <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-400">Product Name</th>
                  <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-400 text-right pr-6">Cancellation Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700/50">
                {mostCancelledProducts.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center py-4 text-warmgray-400">No cancellations recorded.</td>
                  </tr>
                ) : (
                  mostCancelledProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-700/20 transition-colors">
                      <td className="py-2.5 px-3 text-sm font-semibold text-warmgray-800 dark:text-white">{p.name}</td>
                      <td className="py-2.5 px-3 text-sm font-bold text-red-650 text-right pr-6">{p.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Product Intelligence Section ─────────────────────────────── */}
      {productAnalytics && (
        <div className="mt-10 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold font-display text-warmgray-900 dark:text-white">Product Intelligence</h2>
          </div>

          {/* KPI badges */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-xl dark:bg-orange-950/20 dark:border-orange-900/30">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-orange-700 dark:text-orange-400">{productAnalytics.trendingProducts?.length || 0} Trending Products</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-xl dark:bg-green-950/20 dark:border-green-900/30">
              <Tag className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold text-green-700 dark:text-green-400">{productAnalytics.specialOffers?.length || 0} Special Offers</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl dark:bg-blue-950/20 dark:border-blue-900/30">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                {productAnalytics.mostViewed?.reduce((s, p) => s + parseInt(p.view_count || 0), 0)} Total Views
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Ordered Bar Chart */}
            <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-6">
              <h3 className="text-sm font-bold text-warmgray-800 dark:text-white mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" /> Most Ordered Products
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={productAnalytics.mostOrdered?.slice(0, 6)} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(v) => [`${v} units`, 'Sales']} />
                  <Bar dataKey="sales_count" name="Units Sold" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 10 Product Table */}
            <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-warmgray-50 dark:border-warmgray-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-warmgray-800 dark:text-white">Product Trending Scores</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-warmgray-50 dark:bg-warmgray-900 text-warmgray-400 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-center">Sales</th>
                      <th className="px-4 py-2 text-center">Views</th>
                      <th className="px-4 py-2 text-center">Score</th>
                      <th className="px-4 py-2 text-center">Label</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700">
                    {(productAnalytics.trendingProducts?.length > 0
                      ? productAnalytics.trendingProducts
                      : productAnalytics.mostOrdered
                    )?.slice(0, 8).map((p, i) => (
                      <tr key={p.id} className="hover:bg-warmgray-50 dark:hover:bg-warmgray-900/40 transition-colors">
                        <td className="px-4 py-2.5 text-warmgray-400 font-bold">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-warmgray-800 dark:text-warmgray-200 truncate max-w-[140px]">{p.name}</div>
                          <div className="text-[9px] text-warmgray-400">{p.category}</div>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-brand-600">{p.sales_count || 0}</td>
                        <td className="px-4 py-2.5 text-center text-blue-500">{p.view_count || 0}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-bold text-orange-500">{parseFloat(p.trending_score || 0).toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {p.is_trending
                            ? <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[8px] font-bold rounded-md">🔥 HOT</span>
                            : <span className="text-warmgray-300 text-[9px]">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Special Offers row */}
          {productAnalytics.specialOffers?.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-100 dark:border-green-900/30 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-green-800 dark:text-green-400 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Active Special Offers
              </h3>
              <div className="flex flex-wrap gap-3">
                {productAnalytics.specialOffers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-warmgray-800 rounded-xl px-4 py-2 border border-green-100 dark:border-green-900/30 shadow-sm">
                    <span className="text-xs font-bold text-warmgray-800 dark:text-white">{p.name}</span>
                    <span className="px-2 py-0.5 bg-green-500 text-white text-[9px] font-black rounded-md">{p.discount_percent}% OFF</span>
                    <span className="text-[10px] text-warmgray-400">{p.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TOP_PRODUCTS = [
  { name: 'Idli Podi 250g', category: 'Podi', units: 342, revenue: 34200, growth: 28 },
  { name: 'Mango Pickle 500g', category: 'Pickles', units: 289, revenue: 57800, growth: 22 },
  { name: 'Pure Cow Ghee 1L', category: 'Ghee', units: 198, revenue: 89100, growth: 35 },
  { name: 'Appalam Pack (25 pcs)', category: 'Appalam', units: 156, revenue: 15600, growth: 18 },
  { name: 'Snack Pack (Assorted)', category: 'Snacks', units: 134, revenue: 26800, growth: 14 },
];

export default AnalyticsDashboard;
