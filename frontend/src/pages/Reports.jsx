import React, { useState, useEffect } from 'react';
import { ClipboardList, Download, RefreshCw, BarChart2, AlertTriangle, Printer } from 'lucide-react';
import API from '../utils/api';
import Sidebar from '../components/Sidebar';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [dispatches, setDispatches] = useState([]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [statsRes, invRes, subsRes, dispRes] = await Promise.all([
        API.get('/dashboard/stats'),
        API.get('/inventory'),
        API.get('/subscriptions/all'),
        API.get('/dispatches')
      ]);
      setStats(statsRes.data.summary ? {
        totalRevenue: statsRes.data.summary.monthlyRevenue || 0,
        totalOrders: statsRes.data.summary.totalOrders || 0,
        totalSubscriptions: statsRes.data.summary.activeSubscriptions || 0,
        cancelledOrders: statsRes.data.summary.cancelledOrders || 0,
        cancellationRate: statsRes.data.summary.cancellationRate || 0
      } : null);
      setInventory(invRes.data.inventory || []);
      setSubscriptions(subsRes.data.subscriptions || []);
      setDispatches(dispRes.data.dispatches || []);
    } catch (err) {
      console.error('Error fetching reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = (type) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = "";

    if (type === 'inventory') {
      csvContent += "Inventory Status Report\n";
      csvContent += "Product ID,Product Name,Remaining Stock,Status\n";
      inventory.forEach(item => {
        csvContent += `${item.product_id},"${item.product_name}",${item.total_qty},"${item.total_qty < 15 ? 'LOW STOCK' : 'IN STOCK'}"\n`;
      });
      filename = "inventory_report.csv";
    } else if (type === 'subscriptions') {
      csvContent += "Subscriptions Status Report\n";
      csvContent += "Subscription ID,Customer Name,Product,Frequency,Status,Next Dispatch\n";
      subscriptions.forEach(sub => {
        csvContent += `${sub.id},"${sub.customer_name}","${sub.product_name}","${sub.delivery_frequency}","${sub.status}",${sub.next_dispatch_date}\n`;
      });
      filename = "subscriptions_report.csv";
    } else if (type === 'cancellation') {
      csvContent += "Order Cancellation Report\n";
      csvContent += "Dispatch ID,Order ID,Customer Name,Phone,Email,Product Name,Quantity,Total Amount,Cancellation Reason\n";
      const cancelledList = dispatches.filter(d => d.status === 'cancelled' || d.dispatch_status === 'cancelled' || d.order_status === 'cancelled');
      cancelledList.forEach(d => {
        csvContent += `${d.id},${d.order_id || 'N/A'},"${d.customer_name || ''}","${d.customer_phone || ''}","${d.customer_email || ''}","${d.product_name || ''}",${d.quantity || 0},₹${d.total_amount || 0},"${d.cancellation_reason || ''}"\n`;
      });
      filename = "cancellation_report.csv";
    } else {
      csvContent += "System Revenue Stats Summary\n";
      csvContent += "Total Revenue,Total Orders,Total Active Subscriptions\n";
      if (stats) {
        csvContent += `₹${stats.totalRevenue},${stats.totalOrders},${stats.totalSubscriptions}\n`;
      }
      filename = "revenue_summary.csv";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="text-center py-20 text-warmgray-400">Loading reports and logs...</div>;
  }

  const lowStockItems = inventory.filter(item => item.total_qty < 15);

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar isAdmin={true} />
      <main className="flex-1 overflow-auto p-6 max-w-7xl mx-auto space-y-6 print:p-0 animate-fadein">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-warmgray-150 pb-4 dark:border-warmgray-700 print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Business Reports</h1>
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Generate, review, and export operational reports</p>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-md shadow-brand-500/10"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report Page</span>
          </button>
        </div>

        {/* Printable View Header */}
        <div className="hidden print:block border-b-2 border-brand-500 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-warmgray-900">Sharadha Fine Foods - Management Report</h1>
          <p className="text-xs text-warmgray-500">Date Generated: {new Date().toLocaleDateString()} | Admin Mode</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue Summary Card */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-850 dark:border-warmgray-700 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-warmgray-455 uppercase tracking-widest">Revenue Stats</span>
                <BarChart2 className="w-5 h-5 text-brand-500" />
              </div>
              <h3 className="text-2xl font-black text-warmgray-900 dark:text-white">₹{stats?.totalRevenue || 0}</h3>
              <p className="text-xs text-warmgray-400">Total accumulated revenue across orders.</p>
            </div>
            <button
              onClick={() => handleExportCSV('revenue')}
              className="mt-4 w-full py-2 bg-warmgray-50 hover:bg-warmgray-100 text-warmgray-600 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors dark:bg-warmgray-900 dark:hover:bg-warmgray-800 dark:text-warmgray-300 print:hidden"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV Summary</span>
            </button>
          </div>

          {/* Subscriptions Status Card */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-850 dark:border-warmgray-700 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-warmgray-455 uppercase tracking-widest">Active Cycles</span>
                <RefreshCw className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-warmgray-900 dark:text-white">{subscriptions.filter(s => s.status === 'active').length} Active</h3>
              <p className="text-xs text-warmgray-400">Total customer subscriptions running.</p>
            </div>
            <button
              onClick={() => handleExportCSV('subscriptions')}
              className="mt-4 w-full py-2 bg-warmgray-50 hover:bg-warmgray-100 text-warmgray-600 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors dark:bg-warmgray-900 dark:hover:bg-warmgray-800 dark:text-warmgray-300 print:hidden"
            >
              <Download className="w-4 h-4" />
              <span>Export Subscriptions</span>
            </button>
          </div>

          {/* Low Stock Inventory Card */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-850 dark:border-warmgray-700 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-warmgray-455 uppercase tracking-widest">Stock Alerts</span>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-red-650">{lowStockItems.length} Warnings</h3>
              <p className="text-xs text-warmgray-400">Products with total quantity under 15.</p>
            </div>
            <button
              onClick={() => handleExportCSV('inventory')}
              className="mt-4 w-full py-2 bg-warmgray-50 hover:bg-warmgray-100 text-warmgray-600 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors dark:bg-warmgray-900 dark:hover:bg-warmgray-800 dark:text-warmgray-300 print:hidden"
            >
              <Download className="w-4 h-4" />
              <span>Export Stock CSV</span>
            </button>
          </div>

          {/* Cancellation Stats Card */}
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-850 dark:border-warmgray-700 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-warmgray-455 uppercase tracking-widest">Cancellations</span>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-2xl font-black text-red-650">{stats?.cancelledOrders || 0} ({stats?.cancellationRate || 0}%)</h3>
              <p className="text-xs text-warmgray-400">Total orders cancelled by customers.</p>
            </div>
            <button
              onClick={() => handleExportCSV('cancellation')}
              className="mt-4 w-full py-2 bg-warmgray-50 hover:bg-warmgray-100 text-warmgray-600 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors dark:bg-warmgray-900 dark:hover:bg-warmgray-800 dark:text-warmgray-300 print:hidden"
            >
              <Download className="w-4 h-4" />
              <span>Export Cancellations</span>
            </button>
          </div>
        </div>

        {/* Detailed Low Stock Alert Table */}
        <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-850 dark:border-warmgray-700 space-y-4">
          <h3 className="text-base font-bold font-display text-warmgray-900 dark:text-white flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-brand-500" />
            <span>Low Stock Items Log</span>
          </h3>
          {lowStockItems.length === 0 ? (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">🎉 All products have sufficient inventory stock levels.</p>
          ) : (
            <div className="overflow-x-auto border border-warmgray-50 rounded-2xl dark:border-warmgray-700">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-warmgray-50 text-warmgray-450 font-bold uppercase tracking-wider dark:bg-warmgray-900">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Total Qty Remaining</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700 dark:text-warmgray-300">
                  {lowStockItems.map(item => (
                    <tr key={item.product_id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-900/30">
                      <td className="p-3 font-semibold text-warmgray-950 dark:text-white">{item.product_name}</td>
                      <td className="p-3 font-bold text-red-600">{item.total_qty} remaining</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-50 text-red-650 dark:bg-red-950/40">RESTOCK NOW</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default Reports;
