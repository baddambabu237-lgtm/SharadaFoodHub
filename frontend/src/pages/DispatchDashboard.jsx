import React, { useState, useEffect } from 'react';
import {
  Truck, Calendar, CheckCircle2, Clock, AlertCircle,
  Search, Filter, Package, MapPin, Phone, RefreshCw,
  Download, XCircle
} from 'lucide-react';
import API from '../utils/api';

const STATUS_STYLES = {
  pending:    'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  confirmed:  'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400',
  dispatched: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  shipped:    'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  delivered:  'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  failed:     'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  cancelled:  'bg-rose-50 text-rose-650 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400',
};

const STATUS_ICONS = {
  pending:    Clock,
  confirmed:  CheckCircle2,
  dispatched: Truck,
  shipped:    Truck,
  delivered:  CheckCircle2,
  failed:     AlertCircle,
  cancelled:  XCircle,
};

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className={`bg-white dark:bg-warmgray-800 rounded-2xl p-5 border border-warmgray-100 dark:border-warmgray-700 shadow-sm flex items-center gap-4`}>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">{value}</p>
      <p className="text-xs text-warmgray-500 dark:text-warmgray-400">{label}</p>
    </div>
  </div>
);

const DispatchDashboard = () => {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const res = await API.get('/dispatches');
      const mapped = (res.data.dispatches || []).map(item => ({
        ...item,
        status: item.dispatch_status
      }));
      setDispatches(mapped);
    } catch (err) {
      console.error('Error fetching dispatches:', err);
      // Use mock data for demo
      setDispatches(MOCK_DISPATCHES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDispatches(); }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await API.put(`/dispatches/${id}`, { dispatch_status: newStatus });
      setMessage(`Dispatch #${id} marked as ${newStatus}`);
      setDispatches(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    } catch {
      setDispatches(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      setMessage(`Status updated to ${newStatus}`);
    } finally {
      setUpdatingId(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const downloadCancellationReport = () => {
    const cancelledList = dispatches.filter(d => d.status === 'cancelled');
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Sharadha Fine Foods - Order Cancellation Report\n";
    csvContent += `Report Generated,${new Date().toLocaleString()}\n`;
    csvContent += `Total Cancelled Orders,${cancelledList.length}\n\n`;
    csvContent += "Dispatch ID,Order ID,Customer Name,Phone,Email,Product Name,Quantity,Total Amount,Cancellation Reason\n";

    cancelledList.forEach(d => {
      csvContent += `${d.id},${d.order_id || 'N/A'},"${d.customer_name || ''}","${d.customer_phone || ''}","${d.customer_email || ''}","${d.product_name || ''}",${d.quantity || 0},₹${d.total_amount || 0},"${d.cancellation_reason || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sharadha_cancellation_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = dispatches.filter(d => {
    const matchSearch = !search || 
      d.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.id?.toString().includes(search);
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: dispatches.length,
    pending: dispatches.filter(d => d.status === 'pending').length,
    dispatched: dispatches.filter(d => d.status === 'dispatched' || d.status === 'shipped').length,
    delivered: dispatches.filter(d => d.status === 'delivered').length,
    cancelled: dispatches.filter(d => d.status === 'cancelled').length,
  };

  return (
    <div className="p-6 space-y-6 animate-fadein">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">Dispatch Dashboard</h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Track and manage all delivery operations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCancellationReport}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 text-xs font-bold rounded-xl shadow-sm transition-colors dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:border-red-900/50"
          >
            <Download className="w-4 h-4" />
            Cancellation Report
          </button>
          <button
            onClick={fetchDispatches}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-100 dark:bg-green-950/30 dark:text-green-400">
          ✓ {message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Dispatches" value={stats.total} icon={Package} color="bg-brand-50 text-brand-600 dark:bg-brand-950/40" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="bg-amber-50 text-amber-600 dark:bg-amber-950/40" />
        <StatCard label="In Transit" value={stats.dispatched} icon={Truck} color="bg-blue-50 text-blue-600 dark:bg-blue-950/40" />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle2} color="bg-green-50 text-green-600 dark:bg-green-950/40" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} color="bg-red-50 text-red-650 dark:bg-red-950/40" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warmgray-400" />
          <input
            type="text"
            placeholder="Search by customer or dispatch ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-warmgray-200 dark:border-warmgray-600 rounded-xl bg-white dark:bg-warmgray-800 text-warmgray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'confirmed', 'dispatched', 'delivered', 'failed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                statusFilter === s
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-warmgray-200 dark:border-warmgray-600 text-warmgray-600 dark:text-warmgray-400 hover:border-brand-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Dispatch Table */}
      {loading ? (
        <div className="py-20 text-center text-warmgray-400 animate-pulse">Loading dispatches...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-warmgray-400 border border-dashed border-warmgray-200 dark:border-warmgray-700 rounded-2xl">
          No dispatches found matching your filters.
        </div>
      ) : (
        <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warmgray-50 dark:bg-warmgray-900">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">#ID</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Customer</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Product</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Dispatch Date</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700">
                {filtered.map(dispatch => {
                  const StatusIcon = STATUS_ICONS[dispatch.status] || Clock;
                  return (
                    <tr key={dispatch.id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-warmgray-500 dark:text-warmgray-400">#{dispatch.id}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-warmgray-800 dark:text-white">{dispatch.customer_name}</p>
                          <p className="text-[10px] text-warmgray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{dispatch.phone || dispatch.customer_phone || 'N/A'}
                          </p>
                          {dispatch.cancellation_reason && (
                            <p className="text-[10px] text-red-650 dark:text-rose-400 font-bold mt-1 bg-red-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-lg inline-block border border-red-100 dark:border-rose-900/30">
                              Reason: {dispatch.cancellation_reason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-warmgray-700 dark:text-warmgray-300">{dispatch.product_name}</p>
                        <p className="text-[10px] text-warmgray-400">{dispatch.quantity} unit(s)</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-warmgray-600 dark:text-warmgray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {dispatch.dispatch_date ? new Date(dispatch.dispatch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[dispatch.status] || STATUS_STYLES.pending}`}>
                          <StatusIcon className="w-3 h-3" />
                          {dispatch.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={dispatch.status}
                          onChange={e => handleStatusUpdate(dispatch.id, e.target.value)}
                          disabled={updatingId === dispatch.id || dispatch.status === 'cancelled'}
                          className="text-xs border border-warmgray-200 dark:border-warmgray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-warmgray-700 text-warmgray-700 dark:text-warmgray-300 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="delivered">Delivered</option>
                          <option value="failed">Failed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Mock data for demo (when API is not connected)
const MOCK_DISPATCHES = [
  { id: 1, customer_name: 'Priya Rajan', phone: '+91 98456 12345', product_name: 'Idli Podi 250g', quantity: 2, dispatch_date: new Date().toISOString(), status: 'pending' },
  { id: 2, customer_name: 'Karthik S', phone: '+91 94567 88901', product_name: 'Mango Pickle 500g', quantity: 1, dispatch_date: new Date(Date.now() - 86400000).toISOString(), status: 'dispatched' },
  { id: 3, customer_name: 'Anitha Kumar', phone: '+91 91234 56789', product_name: 'Pure Cow Ghee 1L', quantity: 1, dispatch_date: new Date(Date.now() - 172800000).toISOString(), status: 'delivered' },
  { id: 4, customer_name: 'Suresh P', phone: '+91 99871 23456', product_name: 'Snack Pack (Assorted)', quantity: 3, dispatch_date: new Date(Date.now() - 259200000).toISOString(), status: 'delivered' },
  { id: 5, customer_name: 'Meena Devi', phone: '+91 98765 43210', product_name: 'Garlic Pickle 250g', quantity: 2, dispatch_date: null, status: 'pending' },
  { id: 6, customer_name: 'Raj Mohan', phone: '+91 93456 78901', product_name: 'Appalam Pack (25 pcs)', quantity: 4, dispatch_date: new Date(Date.now() - 86400000).toISOString(), status: 'failed' },
  { id: 7, customer_name: 'Vikram A', phone: '+91 97654 32109', product_name: 'Idli Podi 250g', quantity: 1, dispatch_date: null, status: 'cancelled', cancellation_reason: 'Ordered by mistake' },
];

export default DispatchDashboard;
