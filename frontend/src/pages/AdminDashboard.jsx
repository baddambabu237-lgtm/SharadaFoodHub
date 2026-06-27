import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, RefreshCw, Truck, IndianRupee, ShoppingBag, BellRing, ChevronRight, AlertCircle, Percent } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import API from '../utils/api';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#eab308'];

const StatCardSkeleton = () => (
  <div className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center space-x-3.5 animate-pulse">
    <div className="p-3 bg-warmgray-100 dark:bg-warmgray-750 rounded-xl w-11 h-11 shrink-0"></div>
    <div className="space-y-2 w-full">
      <div className="h-5 bg-warmgray-100 dark:bg-warmgray-750 rounded w-12"></div>
      <div className="h-3 bg-warmgray-100 dark:bg-warmgray-750 rounded w-20"></div>
    </div>
  </div>
);

const ChartSkeleton = ({ title }) => (
  <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
    <h3 className="text-base font-bold font-display text-warmgray-900 dark:text-white">{title}</h3>
    <div className="h-72 w-full bg-warmgray-50/50 dark:bg-warmgray-750/30 rounded-2xl animate-pulse flex items-center justify-center text-warmgray-400">
      Loading analytics...
    </div>
  </div>
);

const ActivityLogSkeleton = () => (
  <div className="divide-y divide-warmgray-50 dark:divide-warmgray-750 text-xs">
    {[1, 2, 3, 4].map(n => (
      <div key={n} className="py-3 flex items-center justify-between gap-4 animate-pulse">
        <div className="flex items-center space-x-3 w-full">
          <div className="p-2 bg-warmgray-100 dark:bg-warmgray-750 rounded-lg w-8 h-8 shrink-0"></div>
          <div className="space-y-2 w-full">
            <div className="h-3.5 bg-warmgray-100 dark:bg-warmgray-750 rounded w-2/3"></div>
            <div className="h-2.5 bg-warmgray-100 dark:bg-warmgray-750 rounded w-1/3"></div>
          </div>
        </div>
        <div className="h-3 bg-warmgray-100 dark:bg-warmgray-750 rounded w-16 shrink-0"></div>
      </div>
    ))}
  </div>
);

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [activityLog, setActivityLog] = useState(null);

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await API.get('/dashboard/stats/summary');
        setSummary(res.data.summary);
      } catch (err) {
        console.error('Error fetching dashboard summary:', err);
        setError(true);
      } finally {
        setSummaryLoading(false);
      }
    };

    const fetchCharts = async () => {
      try {
        const res = await API.get('/dashboard/stats/charts');
        setCharts(res.data.charts);
      } catch (err) {
        console.error('Error fetching dashboard charts:', err);
      } finally {
        setChartsLoading(false);
      }
    };

    const fetchActivity = async () => {
      try {
        const res = await API.get('/dashboard/stats/activity-log');
        setActivityLog(res.data.activityLog);
      } catch (err) {
        console.error('Error fetching dashboard activity log:', err);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchSummary();
    fetchCharts();
    fetchActivity();
  }, []);

  if (error && !summary) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Admin Control Center</h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">System overview, sales analytics, and operational tracking</p>
        </div>
        <div className="p-6 text-center text-red-600 bg-red-50 rounded-2xl border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30">
          <p className="font-bold">Error loading dashboard statistics.</p>
          <p className="text-xs mt-1">Please ensure the backend server is running and database configuration is correct, then refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadein">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Admin Control Center</h1>
        <p className="text-sm text-warmgray-500 dark:text-warmgray-400">System overview, sales analytics, and operational tracking</p>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {summaryLoading ? (
          Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {/* Total Customers */}
            <div className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center space-x-3.5">
              <div className="p-3 bg-brand-50 text-brand-650 rounded-xl dark:bg-brand-950/40">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-warmgray-900 dark:text-white">{summary.totalCustomers}</p>
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Customers</p>
              </div>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center space-x-3.5">
              <div className="p-3 bg-blue-50 text-blue-650 rounded-xl dark:bg-blue-950/40">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-warmgray-900 dark:text-white">{summary.activeSubscriptions}</p>
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Active Subs</p>
              </div>
            </div>

            {/* Cancelled Subscriptions */}
            <div className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center space-x-3.5">
              <div className="p-3 bg-red-50 text-red-650 rounded-xl dark:bg-red-950/40">
                <AlertCircle className="w-5 h-5 text-red-650" />
              </div>
              <div>
                <p className="text-xl font-black text-red-650">{summary.cancelledSubscriptions || 0}</p>
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Cancelled Subs</p>
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center space-x-3.5">
              <div className="p-3 bg-purple-50 text-purple-650 rounded-xl dark:bg-purple-950/40">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-warmgray-900 dark:text-white">{summary.totalOrders}</p>
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Total Orders</p>
              </div>
            </div>

            {/* Cancelled Orders */}
            <div className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center space-x-3.5">
              <div className="p-3 bg-red-50 text-red-650 rounded-xl dark:bg-red-950/40">
                <AlertCircle className="w-5 h-5 text-red-650" />
              </div>
              <div>
                <p className="text-xl font-black text-red-650">{summary.cancelledOrders || 0}</p>
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Cancelled Orders</p>
              </div>
            </div>

            {/* Cancellation Rate */}
            <div className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center space-x-3.5">
              <div className="p-3 bg-amber-50 text-amber-650 rounded-xl dark:bg-amber-950/40">
                <Percent className="w-5 h-5 text-amber-650" />
              </div>
              <div>
                <p className="text-xl font-black text-amber-650">{summary.cancellationRate || 0}%</p>
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Cancel Rate</p>
              </div>
            </div>

            {/* Pending Dispatches */}
            <div className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center space-x-3.5">
              <div className="p-3 bg-amber-50 text-amber-650 rounded-xl dark:bg-amber-950/40">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-warmgray-900 dark:text-white">{summary.pendingDispatches}</p>
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Pending Disp</p>
              </div>
            </div>

            {/* Monthly Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center space-x-3.5">
              <div className="p-3 bg-green-50 text-green-650 rounded-xl dark:bg-green-950/40">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-warmgray-900 dark:text-white">₹{summary.monthlyRevenue}</p>
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Monthly Rev</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {chartsLoading || !charts ? (
          <>
            <div className="lg:col-span-2">
              <ChartSkeleton title="Monthly Sales Growth Trend" />
            </div>
            <ChartSkeleton title="Product Category Breakdown" />
          </>
        ) : (
          <>
            {/* Sales Trend Line Chart (2/3 width on desktop) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
              <h3 className="text-base font-bold font-display text-warmgray-900 dark:text-white">Monthly Sales Growth Trend</h3>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#f97316" strokeWidth={3} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="orders" name="Orders Count" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Sales Distribution Pie Chart */}
            <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
              <h3 className="text-base font-bold font-display text-warmgray-900 dark:text-white">Product Category Breakdown</h3>
              <div className="h-72 w-full text-xs flex flex-col justify-between">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="category"
                      >
                        {charts.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legends */}
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {charts.categoryData.map((entry, idx) => (
                    <div key={idx} className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span className="text-[10px] text-warmgray-500 dark:text-warmgray-400 capitalize">{entry.category || entry.name} ({entry.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Grid: Audit Trail Activity Log & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Recent Activity Log (Audit Trail) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-warmgray-50 dark:border-warmgray-700">
            <h3 className="text-base font-bold font-display text-warmgray-900 dark:text-white">System Activity & Audit Log</h3>
            <span className="text-[10px] bg-brand-50 text-brand-650 px-2 py-0.5 rounded-md dark:bg-brand-950/40 dark:text-brand-400 font-bold uppercase tracking-wider">Live Logs</span>
          </div>

          {activityLoading || !activityLog ? (
            <ActivityLogSkeleton />
          ) : (
            <div className="divide-y divide-warmgray-50 dark:divide-warmgray-750 text-xs">
              {activityLog.map((log, index) => {
                let iconColor = 'bg-blue-50 text-blue-600 dark:bg-blue-950/40';
                if (log.log_type === 'order') {
                  iconColor = 'bg-green-50 text-green-600 dark:bg-green-950/40';
                } else if (log.log_type.startsWith('cancel')) {
                  iconColor = 'bg-red-50 text-red-600 dark:bg-red-950/40';
                }
                return (
                  <div key={index} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${iconColor}`}>
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-warmgray-800 dark:text-white">
                          {log.log_type === 'order' ? `New Order generated by ${log.description}` :
                           log.log_type === 'support' ? `Support ticket opened by ${log.description}` :
                           log.description}
                        </p>
                        <p className="text-[10px] text-warmgray-400">
                          {log.log_type === 'order' ? `Amount: ₹${log.value}` :
                           log.log_type === 'support' ? `Subject: "${log.value}"` :
                           'Status: Cancelled'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-warmgray-400 shrink-0">
                      {new Date(log.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Operations quick shortcuts */}
        <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 space-y-4">
          <h3 className="text-sm font-bold font-display text-warmgray-900 dark:text-white border-b border-warmgray-50 dark:border-warmgray-700 pb-3">Operational Shortcuts</h3>
          <div className="flex flex-col gap-2">
            <Link
              to="/admin/products"
              className="p-3 bg-warmgray-50 hover:bg-brand-50 hover:text-brand-650 rounded-2xl flex items-center justify-between dark:bg-warmgray-900 dark:hover:bg-warmgray-750 transition-colors"
            >
              <span className="text-xs font-bold">Manage Products & Pricing</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/admin/inventory"
              className="p-3 bg-warmgray-50 hover:bg-brand-50 hover:text-brand-650 rounded-2xl flex items-center justify-between dark:bg-warmgray-900 dark:hover:bg-warmgray-750 transition-colors"
            >
              <span className="text-xs font-bold">Inventory Batches & Expiry</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/admin/dispatches"
              className="p-3 bg-warmgray-50 hover:bg-brand-50 hover:text-brand-650 rounded-2xl flex items-center justify-between dark:bg-warmgray-900 dark:hover:bg-warmgray-750 transition-colors"
            >
              <span className="text-xs font-bold">Dispatch Operations & Tracker</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/admin/support"
              className="p-3 bg-warmgray-50 hover:bg-brand-50 hover:text-brand-650 rounded-2xl flex items-center justify-between dark:bg-warmgray-900 dark:hover:bg-warmgray-750 transition-colors"
            >
              <span className="text-xs font-bold">Support Center Tickets</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
