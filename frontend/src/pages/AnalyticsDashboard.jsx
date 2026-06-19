import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, ShoppingBag, IndianRupee, RefreshCw, Package } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/dashboard/stats');
        setStats(res.data);
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
