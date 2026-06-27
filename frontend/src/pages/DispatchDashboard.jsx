import React, { useState, useEffect } from 'react';
import {
  Truck, Calendar, CheckCircle2, Clock, AlertCircle,
  Search, Package, Phone, RefreshCw,
  Download, XCircle, Eye, X, MapPin, IndianRupee,
  ShoppingBag, User, Tag
} from 'lucide-react';
import API from '../utils/api';

// ─── Status styles / icons ────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:    'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  confirmed:  'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400',
  dispatched: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  shipped:    'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  delivered:  'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  failed:     'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  cancelled:  'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400',
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

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-warmgray-800 rounded-2xl p-5 border border-warmgray-100 dark:border-warmgray-700 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">{value}</p>
      <p className="text-xs text-warmgray-500 dark:text-warmgray-400">{label}</p>
    </div>
  </div>
);

// ─── Product items list renderer ──────────────────────────────────────────────
const ProductItems = ({ items }) => {
  if (!items || items.length === 0) {
    return <span className="text-warmgray-400 text-xs italic">No items found</span>;
  }
  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm font-medium text-warmgray-700 dark:text-warmgray-300">
            {item.product_name}
            {item.weight ? ` (${item.weight})` : ''}
          </span>
          <span className="text-xs text-warmgray-400 ml-auto flex-shrink-0">× {item.quantity}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Order Detail Modal ───────────────────────────────────────────────────────
const OrderModal = ({ dispatch, onClose }) => {
  if (!dispatch) return null;

  const fmt = (dateStr) => dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';

  const fmtCurrency = (n) => `₹${parseFloat(n || 0).toFixed(2)}`;

  const items = dispatch.items || [];
  const totalItems = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadein">
      <div className="bg-white dark:bg-warmgray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-warmgray-100 dark:border-warmgray-700">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-warmgray-100 dark:border-warmgray-700">
          <div>
            <h2 className="text-lg font-extrabold text-warmgray-900 dark:text-white font-display">
              Order Details
            </h2>
            <p className="text-xs text-warmgray-500 dark:text-warmgray-400">
              Dispatch #{dispatch.id} · Order #{dispatch.order_id || 'Sub-' + dispatch.subscription_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-warmgray-100 dark:hover:bg-warmgray-700 transition-colors"
          >
            <X className="w-5 h-5 text-warmgray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = STATUS_ICONS[dispatch.status] || Clock;
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${STATUS_STYLES[dispatch.status] || STATUS_STYLES.pending}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {dispatch.status}
                </span>
              );
            })()}
            {dispatch.order_type && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-warmgray-100 dark:bg-warmgray-700 text-warmgray-500 dark:text-warmgray-400 border border-warmgray-200 dark:border-warmgray-600">
                <Tag className="w-3 h-3" />
                {dispatch.order_type === 'one-time' ? 'One-Time Order' : 'Subscription'}
              </span>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-warmgray-50 dark:bg-warmgray-900 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-warmgray-400 dark:text-warmgray-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Customer
            </h3>
            <p className="text-sm font-semibold text-warmgray-800 dark:text-white">
              {dispatch.customer_name || 'N/A'}
            </p>
            {dispatch.customer_email && (
              <p className="text-xs text-warmgray-500 dark:text-warmgray-400">{dispatch.customer_email}</p>
            )}
            {(dispatch.customer_phone || dispatch.phone) && (
              <p className="text-xs text-warmgray-500 dark:text-warmgray-400 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {dispatch.customer_phone || dispatch.phone}
              </p>
            )}
            {dispatch.customer_address && (
              <p className="text-xs text-warmgray-500 dark:text-warmgray-400 flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {dispatch.customer_address}
              </p>
            )}
          </div>

          {/* Products Ordered */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-warmgray-400 dark:text-warmgray-500 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Products Ordered
            </h3>
            {items.length === 0 ? (
              <p className="text-sm text-warmgray-400 italic">No product information available</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-warmgray-50 dark:bg-warmgray-900 rounded-xl px-3 py-2.5 border border-warmgray-100 dark:border-warmgray-700">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-brand-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-warmgray-800 dark:text-white">{item.product_name}</p>
                        {item.weight && (
                          <p className="text-[10px] text-warmgray-400">{item.weight}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-warmgray-700 dark:text-warmgray-300">× {item.quantity}</p>
                      {item.price && (
                        <p className="text-[10px] text-warmgray-400">{fmtCurrency(item.price)} each</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-brand-50 dark:bg-brand-950/20 rounded-2xl p-4 space-y-2 border border-brand-100 dark:border-brand-900/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-500 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5" /> Order Summary
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-warmgray-600 dark:text-warmgray-400">Total Items</span>
              <span className="font-bold text-warmgray-800 dark:text-white">{totalItems}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-brand-100 dark:border-brand-900/30 pt-2">
              <span className="text-warmgray-600 dark:text-warmgray-400 font-semibold">Total Amount</span>
              <span className="font-extrabold text-brand-600 dark:text-brand-400">
                {fmtCurrency(dispatch.total_amount)}
              </span>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-warmgray-50 dark:bg-warmgray-900 rounded-xl p-3 border border-warmgray-100 dark:border-warmgray-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400 mb-1">Order Date</p>
              <p className="text-xs font-semibold text-warmgray-700 dark:text-warmgray-300">
                {fmt(dispatch.order_date || dispatch.dispatch_date)}
              </p>
            </div>
            <div className="bg-warmgray-50 dark:bg-warmgray-900 rounded-xl p-3 border border-warmgray-100 dark:border-warmgray-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400 mb-1">Est. Delivery</p>
              <p className="text-xs font-semibold text-warmgray-700 dark:text-warmgray-300">
                {fmt(dispatch.estimated_delivery)}
              </p>
            </div>
          </div>

          {/* Cancellation Reason */}
          {dispatch.cancellation_reason && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-3 border border-red-100 dark:border-red-900/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Cancellation Reason</p>
              <p className="text-xs text-red-600 dark:text-red-400">{dispatch.cancellation_reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DispatchDashboard = () => {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const res = await API.get('/dispatches');
      const mapped = (res.data.dispatches || []).map(item => ({
        ...item,
        status: item.dispatch_status || item.status,
      }));
      setDispatches(mapped);
    } catch (err) {
      console.error('Error fetching dispatches:', err);
      setDispatches([]);
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
      // If modal is open for this dispatch, update it too
      if (selectedDispatch?.id === id) {
        setSelectedDispatch(prev => ({ ...prev, status: newStatus }));
      }
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
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Sharadha Fine Foods - Order Cancellation Report\n';
    csv += `Report Generated,${new Date().toLocaleString()}\n`;
    csv += `Total Cancelled Orders,${cancelledList.length}\n\n`;
    csv += 'Dispatch ID,Order ID,Customer Name,Phone,Email,Products,Total Items,Total Amount,Cancellation Reason\n';
    cancelledList.forEach(d => {
      const products = (d.items || []).map(i => `${i.product_name} x${i.quantity}`).join(' | ');
      const totalItems = (d.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
      csv += `${d.id},${d.order_id || 'N/A'},"${d.customer_name || ''}","${d.customer_phone || d.phone || ''}","${d.customer_email || ''}","${products}",${totalItems},₹${d.total_amount || 0},"${d.cancellation_reason || ''}"\n`;
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `sharadha_cancellation_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = dispatches.filter(d => {
    const matchSearch = !search
      || d.customer_name?.toLowerCase().includes(search.toLowerCase())
      || String(d.id).includes(search)
      || (d.items || []).some(i => i.product_name?.toLowerCase().includes(search.toLowerCase()));
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
      {/* Order Detail Modal */}
      {selectedDispatch && (
        <OrderModal
          dispatch={selectedDispatch}
          onClose={() => setSelectedDispatch(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">Dispatch Dashboard</h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Track and manage all delivery operations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCancellationReport}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl shadow-sm transition-colors dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:border-red-900/50"
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
        <StatCard label="Total Dispatches" value={stats.total}     icon={Package}      color="bg-brand-50 text-brand-600 dark:bg-brand-950/40" />
        <StatCard label="Pending"          value={stats.pending}   icon={Clock}        color="bg-amber-50 text-amber-600 dark:bg-amber-950/40" />
        <StatCard label="In Transit"       value={stats.dispatched} icon={Truck}       color="bg-blue-50 text-blue-600 dark:bg-blue-950/40" />
        <StatCard label="Delivered"        value={stats.delivered} icon={CheckCircle2} color="bg-green-50 text-green-600 dark:bg-green-950/40" />
        <StatCard label="Cancelled"        value={stats.cancelled} icon={XCircle}      color="bg-red-50 text-red-600 dark:bg-red-950/40" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warmgray-400" />
          <input
            type="text"
            placeholder="Search by customer, product, or dispatch ID…"
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
        <div className="py-20 text-center text-warmgray-400 animate-pulse">Loading dispatches…</div>
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
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Products Ordered</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Total</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Dispatch Date</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-warmgray-500 dark:text-warmgray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700">
                {filtered.map(dispatch => {
                  const StatusIcon = STATUS_ICONS[dispatch.status] || Clock;
                  const items = dispatch.items || [];
                  const totalItems = items.reduce((s, i) => s + (i.quantity || 0), 0);

                  return (
                    <tr key={dispatch.id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-700/30 transition-colors">
                      {/* #ID */}
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-warmgray-500 dark:text-warmgray-400">#{dispatch.id}</span>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-warmgray-800 dark:text-white">{dispatch.customer_name}</p>
                          <p className="text-[10px] text-warmgray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {dispatch.customer_phone || dispatch.phone || 'N/A'}
                          </p>
                          {dispatch.cancellation_reason && (
                            <p className="text-[10px] text-red-600 dark:text-rose-400 font-bold mt-1 bg-red-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-lg inline-block border border-red-100 dark:border-rose-900/30">
                              Reason: {dispatch.cancellation_reason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Products Ordered */}
                      <td className="px-5 py-4 min-w-[200px]">
                        {items.length > 0 ? (
                          <ProductItems items={items} />
                        ) : (
                          <span className="text-xs text-warmgray-400 italic">—</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-bold text-warmgray-800 dark:text-white">
                            ₹{parseFloat(dispatch.total_amount || 0).toFixed(0)}
                          </p>
                          <p className="text-[10px] text-warmgray-400">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
                        </div>
                      </td>

                      {/* Dispatch Date */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-warmgray-600 dark:text-warmgray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {dispatch.dispatch_date
                            ? new Date(dispatch.dispatch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Pending'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[dispatch.status] || STATUS_STYLES.pending}`}>
                          <StatusIcon className="w-3 h-3" />
                          {dispatch.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {/* View Order Button */}
                          <button
                            onClick={() => setSelectedDispatch(dispatch)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-950/30 dark:hover:bg-brand-900/40 dark:text-brand-400 rounded-lg text-[10px] font-bold border border-brand-100 dark:border-brand-900/40 transition-colors"
                            title="View full order details"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          {/* Status Dropdown */}
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
                        </div>
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

export default DispatchDashboard;
