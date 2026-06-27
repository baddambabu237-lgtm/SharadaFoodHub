import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, AlertCircle } from 'lucide-react';
import API from '../utils/api';
import Modal from '../components/Modal';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [dispatchInfo, setDispatchInfo] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Cancellation States
  const [cancelReason, setCancelReason] = useState('');
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchOrders = async () => {
    try {
      const res = await API.get('/orders');
      setOrders(res.data.orders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleViewDetails = async (orderId) => {
    setFetchingDetails(true);
    try {
      const res = await API.get(`/orders/${orderId}`);
      setSelectedOrder(res.data.order);
      setOrderItems(res.data.items);
      setDispatchInfo(res.data.dispatch);
      setModalOpen(true);
    } catch (err) {
      console.error('Error fetching order details:', err);
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleCancelOrderClick = () => {
    if (!cancelReason) {
      setCancelError('Please select a cancellation reason.');
      return;
    }
    setCancelError('');
    setShowConfirmCancel(true);
  };

  const confirmCancelOrder = async () => {
    if (!selectedOrder || !cancelReason) return;
    setCancelling(true);
    setCancelError('');
    try {
      await API.post(`/orders/${selectedOrder.id}/cancel`, { reason: cancelReason });
      
      setSuccessMessage(`🎉 Order OR-${selectedOrder.id} has been cancelled successfully!`);
      setShowConfirmCancel(false);
      setCancelReason('');
      
      // Refresh list and details
      await fetchOrders();
      
      // Refresh selected order view info
      const res = await API.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(res.data.order);
      setOrderItems(res.data.items);
      setDispatchInfo(res.data.dispatch);
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error(err);
      setCancelError(err.response?.data?.error || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };


  // CSV Export function for a single order
  const handleExportCSV = (order, items) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Sharadha Subscription Order System - Invoice\n";
    csvContent += `Order ID,OR-${order.id}\n`;
    csvContent += `Date,${new Date(order.order_date).toLocaleString()}\n`;
    csvContent += `Type,${order.order_type === 'subscription_renewal' ? 'Subscription Renewal' : 'One-time Purchase'}\n`;
    csvContent += `Status,${order.status}\n\n`;
    csvContent += "Product Name,Weight,Price,Quantity,Subtotal\n";

    items.forEach(item => {
      const productName = item.product_name || item.name || 'Unknown Product';
      csvContent += `"${productName}","${item.weight || ''}",${item.price},${item.quantity},${item.price * item.quantity}\n`;
    });

    csvContent += `,,,,Total Amount,₹${order.total_amount}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sharadha_invoice_OR-${order.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable Invoice function
  const handlePrintInvoice = (order, items, dispatch) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    const itemsHtml = items.map(item => {
      const productName = item.product_name || item.name || 'Unknown Product';
      return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${productName} (${item.weight || ''})</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">₹${item.price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${item.price * item.quantity}</td>
      </tr>
    `;
    }).join('');

    const trackingHtml = dispatch ? `
      <div style="margin-top: 20px; padding: 15px; background: #fafafa; border-radius: 12px; border: 1px solid #eee;">
        <h4 style="margin: 0 0 10px 0; color: #f97316;">Delivery & Dispatch Details</h4>
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td><strong>Tracking Code:</strong> ${dispatch.tracking_number || 'Awaiting Shipment'}</td>
            <td><strong>Status:</strong> <span style="text-transform: capitalize;">${dispatch.dispatch_status}</span></td>
          </tr>
          ${dispatch.estimated_delivery ? `
          <tr>
            <td><strong>Est. Delivery:</strong> ${new Date(dispatch.estimated_delivery).toLocaleDateString()}</td>
            <td>&nbsp;</td>
          </tr>
          ` : ''}
        </table>
      </div>
    ` : '';

    const content = `
      <html>
        <head>
          <title>Invoice Receipt OR-${order.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; padding: 40px; }
            .title { font-size: 24px; font-weight: bold; color: #111; }
            .invoice-details { text-align: right; font-size: 13px; }
            .meta { margin-bottom: 30px; font-size: 13px; }
            .table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
            .table th { background: #f4f4f5; padding: 10px; text-align: left; font-weight: bold; border-bottom: 1px solid #ddd; }
            .totals { margin-top: 20px; text-align: right; font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print()">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 20px;">
            <div>
              <div class="title">Sharadha Fine Foods</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Premium Subscription & Delicacies Order System</div>
            </div>
            <div class="invoice-details">
              <strong>INVOICE OR-${order.id}</strong><br>
              Date: ${new Date(order.order_date).toLocaleDateString()}<br>
              Type: ${order.order_type === 'subscription_renewal' ? 'Subscription' : 'One-time'}
            </div>
          </div>
          
          <div class="meta">
            <strong>Bill To:</strong><br>
            Customer ID: #${order.customer_id}<br>
            Status: <span style="text-transform: capitalize;">${order.status}</span>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th style="text-align: left;">Product Details</th>
                <th style="text-align: center;">Price</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            Grand Total Paid: <span style="color: #f97316; font-size: 18px; margin-left: 10px;">₹${order.total_amount}</span>
          </div>

          ${trackingHtml}

          <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
            Thank you for shopping with Sharadha Fine Foods!<br>
            For support or questions, contact us via the Support Center in your dashboard.
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
  };

  if (loading) {
    return <div className="text-center py-20 text-warmgray-400">Loading order records...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fadein">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Order History</h1>
        <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Track current dispatches and review past purchases</p>
      </div>

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-150 dark:bg-green-950/35 dark:text-green-400 dark:border-green-900/50">
          {successMessage}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-20 text-warmgray-400 border border-dashed border-warmgray-200 rounded-3xl dark:border-warmgray-700">
          No orders found. Buy something from the catalog.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-warmgray-50 text-warmgray-450 uppercase tracking-wider font-bold border-b border-warmgray-100 dark:bg-warmgray-900 dark:border-warmgray-700">
                  <th className="p-4 pl-6">Order ID</th>
                  <th className="p-4">Order Type</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700 text-warmgray-700 dark:text-warmgray-300">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-900/30 transition-colors">
                    <td className="p-4 pl-6 font-bold text-warmgray-900 dark:text-white">OR-{order.id}</td>
                    <td className="p-4 capitalize">
                      {order.order_type === 'subscription_renewal' ? '🔄 Subscription' : '📦 One-Time'}
                    </td>
                    <td className="p-4">{new Date(order.order_date).toLocaleString()}</td>
                    <td className="p-4 font-bold">₹{order.total_amount}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'completed' ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' :
                        order.status === 'processing' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                        order.status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
                        'bg-red-50 text-red-650 dark:bg-red-950/40'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <button
                        onClick={() => handleViewDetails(order.id)}
                        className="p-1.5 bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setShowConfirmCancel(false); setCancelReason(''); setCancelError(''); }}
        title={selectedOrder ? `Invoice Receipt OR-${selectedOrder.id}` : 'Order Details'}
      >
        {selectedOrder && (
          <div className="space-y-6 text-xs">
            {successMessage && (
              <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-150 dark:bg-green-950/35 dark:text-green-400 dark:border-green-900/50">
                {successMessage}
              </div>
            )}
            {/* Header info */}
            <div className="flex justify-between border-b border-warmgray-50 pb-4 dark:border-warmgray-700">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Purchase Mode</p>
                <p className="font-bold text-warmgray-700 dark:text-white capitalize">
                  {selectedOrder.order_type === 'subscription_renewal' ? '🔄 Subscription Delivery' : '📦 One-Time Order'}
                </p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-[10px] font-bold text-warmgray-400 uppercase tracking-wider">Invoice Date</p>
                <p className="font-semibold text-warmgray-600 dark:text-warmgray-300">
                  {new Date(selectedOrder.order_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* List of items purchased */}
            <div className="space-y-3">
              <p className="font-bold font-display text-warmgray-900 dark:text-white">Order Items</p>
              <div className="divide-y divide-warmgray-50 dark:divide-warmgray-700 border border-warmgray-100 rounded-2xl overflow-hidden dark:border-warmgray-700">
              {orderItems.length === 0 ? (
                <div className="p-4 text-center text-warmgray-400 text-xs italic">
                  No product details found for this order.
                </div>
              ) : (
                orderItems.map((item) => {
                  const productName = item.product_name || item.name || 'Unknown Product';
                  return (
                    <div key={item.id || item.product_id || productName} className="p-3 bg-warmgray-50/40 dark:bg-warmgray-900/20 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-warmgray-800 dark:text-white">{productName}</p>
                        <p className="text-[10px] text-warmgray-400">{item.weight || ''} x {item.quantity}</p>
                      </div>
                      <span className="font-bold text-warmgray-950 dark:text-white">₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  );
                })
              )}
                <div className="p-3 flex justify-between items-center font-bold bg-warmgray-50 dark:bg-warmgray-900 text-warmgray-900 dark:text-white border-t border-warmgray-100 dark:border-warmgray-700">
                  <span>Grand Total Paid</span>
                  <span className="text-brand-600 dark:text-brand-400">₹{selectedOrder.total_amount}</span>
                </div>
              </div>
            </div>

            {/* Step Tracking Timeline or Cancelled Notice */}
            {selectedOrder.status.toLowerCase() === 'cancelled' ? (
              <div className="p-4 bg-red-50 text-red-750 text-xs font-semibold rounded-2xl border border-red-150 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>This order has been Cancelled</span>
                </p>
                {selectedOrder.cancellation_reason && (
                  <p className="font-medium text-[11px] text-red-650 dark:text-red-300 pl-5">
                    Cancellation Reason: "{selectedOrder.cancellation_reason}"
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-bold font-display text-warmgray-900 dark:text-white">Delivery Timeline</p>
                <div className="relative flex justify-between items-center py-4 px-2">
                  {/* Horizontal progress bar background */}
                  <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-warmgray-200 dark:bg-warmgray-700 z-0"></div>
                  {/* Active progress bar highlight */}
                  <div 
                    className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-brand-500 z-0 transition-all duration-500"
                    style={{
                      width: 
                        selectedOrder.status === 'delivered' || dispatchInfo?.dispatch_status === 'delivered' || selectedOrder.status === 'completed' ? '100%' :
                        selectedOrder.status === 'dispatched' || dispatchInfo?.dispatch_status === 'shipped' || dispatchInfo?.dispatch_status === 'dispatched' ? '66%' :
                        selectedOrder.status === 'confirmed' || selectedOrder.status === 'processing' ? '33%' : '0%'
                    }}
                  ></div>

                  {/* Steps */}
                  {[
                    { label: 'Pending', active: true },
                    { label: 'Confirmed', active: selectedOrder.status === 'confirmed' || selectedOrder.status === 'dispatched' || selectedOrder.status === 'delivered' || selectedOrder.status === 'processing' || selectedOrder.status === 'completed' },
                    { label: 'Dispatched', active: selectedOrder.status === 'dispatched' || selectedOrder.status === 'delivered' || dispatchInfo?.dispatch_status === 'shipped' || dispatchInfo?.dispatch_status === 'dispatched' || selectedOrder.status === 'completed' },
                    { label: 'Delivered', active: selectedOrder.status === 'delivered' || dispatchInfo?.dispatch_status === 'delivered' || selectedOrder.status === 'completed' }
                  ].map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center z-10 space-y-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        step.active 
                          ? 'bg-brand-500 text-white ring-4 ring-brand-100 dark:ring-brand-950/40' 
                          : 'bg-warmgray-200 text-warmgray-400 dark:bg-warmgray-700 dark:text-warmgray-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-[10px] font-bold ${
                        step.active ? 'text-warmgray-850 dark:text-white' : 'text-warmgray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dispatch Tracking status */}
            {dispatchInfo && selectedOrder.status.toLowerCase() !== 'cancelled' && (
              <div className="p-4 bg-brand-50/20 rounded-2xl border border-brand-100 dark:bg-brand-950/10 dark:border-brand-900/40 space-y-2">
                <p className="font-bold font-display text-brand-700 dark:text-brand-300">Delivery Status Logs</p>
                <div className="grid grid-cols-2 gap-4 text-[10px]">
                  <div>
                    <span className="text-warmgray-400">Tracking Code:</span>
                    <p className="font-bold text-warmgray-700 dark:text-white">{dispatchInfo.tracking_number || 'Awaiting Shipment'}</p>
                  </div>
                  <div>
                    <span className="text-warmgray-400">Delivery Status:</span>
                    <p className="font-bold text-brand-600 dark:text-brand-400 capitalize">{dispatchInfo.dispatch_status}</p>
                  </div>
                  {dispatchInfo.dispatch_date && (
                    <div>
                      <span className="text-warmgray-400">Dispatched On:</span>
                      <p className="font-semibold">{new Date(dispatchInfo.dispatch_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {dispatchInfo.estimated_delivery && (
                    <div>
                      <span className="text-warmgray-400">Estimated Delivery:</span>
                      <p className="font-semibold">{new Date(dispatchInfo.estimated_delivery).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancel Order Options Area (Pending or Confirmed/Processing status) */}
            {(selectedOrder.status.toLowerCase() === 'pending' || selectedOrder.status.toLowerCase() === 'confirmed' || selectedOrder.status.toLowerCase() === 'processing') && (
              <div className="p-4 bg-warmgray-50 border border-warmgray-150 rounded-2xl dark:bg-warmgray-900 dark:border-warmgray-750 space-y-3">
                <h4 className="font-bold text-warmgray-800 dark:text-white flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>Cancel Order Request</span>
                </h4>
                
                {showConfirmCancel ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-red-650">Are you sure you want to cancel this order?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={confirmCancelOrder}
                        disabled={cancelling}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors"
                      >
                        {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                      </button>
                      <button
                        onClick={() => setShowConfirmCancel(false)}
                        className="flex-1 py-2 bg-warmgray-200 hover:bg-warmgray-300 text-warmgray-700 font-bold rounded-xl text-xs transition-colors dark:bg-warmgray-850 dark:hover:bg-warmgray-750 dark:text-warmgray-300"
                      >
                        No, Keep Order
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] text-warmgray-500 leading-relaxed">
                      Orders can be cancelled before they are dispatched. Please select a reason below to cancel this order:
                    </p>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-warmgray-800 border border-warmgray-250 dark:border-warmgray-700 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="">-- Choose cancellation reason --</option>
                      <option value="Ordered by mistake">Ordered by mistake</option>
                      <option value="Too expensive">Too expensive</option>
                      <option value="No longer needed">No longer needed</option>
                      <option value="Delivery issue">Delivery issue</option>
                      <option value="Product issue">Product issue</option>
                      <option value="Other">Other</option>
                    </select>

                    {cancelError && (
                      <p className="text-[10px] font-bold text-red-650">{cancelError}</p>
                    )}

                    <button
                      onClick={handleCancelOrderClick}
                      disabled={!cancelReason}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded-xl text-xs transition-colors border border-red-200 disabled:opacity-50"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Export and download actions */}
            <div className="flex gap-2 border-t border-warmgray-100 dark:border-warmgray-700 pt-4">
              <button
                onClick={() => handleExportCSV(selectedOrder, orderItems)}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Invoice (CSV)</span>
              </button>
              <button
                onClick={() => handlePrintInvoice(selectedOrder, orderItems, dispatchInfo)}
                className="py-2.5 px-4 border border-warmgray-200 hover:bg-warmgray-50 text-warmgray-600 rounded-xl transition-all dark:border-warmgray-700 dark:text-warmgray-300 dark:hover:bg-warmgray-900"
                title="Print Invoice"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderHistory;
