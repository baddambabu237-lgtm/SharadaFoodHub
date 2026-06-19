import React, { useState, useEffect } from 'react';
import { Package, Plus, Calendar, AlertTriangle, RefreshCw, Save } from 'lucide-react';
import API from '../utils/api';
import Modal from '../components/Modal';

const InventoryManagement = () => {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for adding batch
  const [productId, setProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');

  // Inline adjustment state
  const [adjustmentId, setAdjustmentId] = useState(null);
  const [adjustedQty, setAdjustedQty] = useState('');

  const fetchInventoryData = async () => {
    try {
      const [invRes, prodRes] = await Promise.all([
        API.get('/inventory'),
        API.get('/products')
      ]);
      setBatches(invRes.data.batches);
      setProducts(prodRes.data.products);
      if (prodRes.data.products.length > 0) {
        setProductId(prodRes.data.products[0].id);
      }
    } catch (err) {
      console.error('Error fetching inventory details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleOpenModal = () => {
    setBatchNumber(`BATCH-${productId || 1}-${Date.now().toString().slice(-4)}`);
    setManufactureDate(new Date().toISOString().split('T')[0]);
    // Set default expiry based on selected product shelf life
    const prod = products.find(p => p.id === parseInt(productId));
    const exp = new Date();
    exp.setDate(exp.getDate() + (prod?.shelf_life_days || 180));
    setExpiryDate(exp.toISOString().split('T')[0]);
    setQuantity('100');
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleProductChange = (e) => {
    const pId = e.target.value;
    setProductId(pId);
    const prod = products.find(p => p.id === parseInt(pId));
    
    // Auto adjust batch name and expiry
    setBatchNumber(`BATCH-${pId}-${Date.now().toString().slice(-4)}`);
    const exp = new Date(manufactureDate || new Date());
    exp.setDate(exp.getDate() + (prod?.shelf_life_days || 180));
    setExpiryDate(exp.toISOString().split('T')[0]);
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await API.post('/inventory/batches', {
        product_id: parseInt(productId),
        batch_number: batchNumber,
        manufacture_date: manufactureDate,
        expiry_date: expiryDate,
        quantity: parseInt(quantity)
      });

      setSuccess('Inventory batch added successfully!');
      fetchInventoryData();
      setTimeout(() => setModalOpen(false), 1000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to add batch.');
    }
  };

  const handleSaveAdjustment = async (id) => {
    if (adjustedQty === '' || parseInt(adjustedQty) < 0) return;
    try {
      await API.put(`/inventory/batches/${id}`, {
        remaining_qty: parseInt(adjustedQty)
      });
      setAdjustmentId(null);
      fetchInventoryData();
    } catch (err) {
      console.error(err);
      alert('Failed to update inventory level.');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-warmgray-400">Loading inventory tracking...</div>;
  }

  // Calculate alerts totals
  const lowStockBatches = batches.filter(b => b.low_stock_warning);
  const expiredBatches = batches.filter(b => b.is_expired);
  const nearExpiryBatches = batches.filter(b => b.expiry_warning);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fadein">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Batch & Inventory Management</h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Track shelf lives, low stock alerts, and manufacture batches</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-sm text-xs transition-colors flex items-center justify-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Record Food Batch</span>
        </button>
      </div>

      {/* Alerts Summary Box */}
      {(lowStockBatches.length > 0 || expiredBatches.length > 0 || nearExpiryBatches.length > 0) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl dark:bg-amber-950/20 dark:border-amber-900/40 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-xs">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-warmgray-700 dark:text-warmgray-300 font-semibold">
              <strong className="text-red-650 dark:text-red-400">{expiredBatches.length}</strong> Expired food batches
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="text-warmgray-700 dark:text-warmgray-300 font-semibold">
              <strong className="text-amber-600">{nearExpiryBatches.length}</strong> Near expiry batches (&lt;14 days)
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <AlertTriangle className="w-5 h-5 text-brand-500 shrink-0" />
            <span className="text-warmgray-700 dark:text-warmgray-300 font-semibold">
              <strong className="text-brand-600">{lowStockBatches.length}</strong> Low stock warnings (&lt;15 items)
            </span>
          </div>
        </div>
      )}

      {/* Batches Table */}
      <div className="bg-white rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-warmgray-50 text-warmgray-450 uppercase tracking-wider font-bold border-b border-warmgray-100 dark:bg-warmgray-900 dark:border-warmgray-700">
                <th className="p-4 pl-6">Product</th>
                <th className="p-4">Batch Number</th>
                <th className="p-4">Mfg Date</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Status / Days Left</th>
                <th className="p-4">Stock Level</th>
                <th className="p-4 pr-6 text-right">Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700 text-warmgray-750 dark:text-warmgray-300">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-900/30 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="font-bold text-warmgray-900 dark:text-white text-sm">{batch.product_name}</div>
                    <div className="text-[10px] text-warmgray-450 uppercase tracking-wider font-semibold mt-0.5">{batch.category_name} • {batch.weight}</div>
                  </td>
                  <td className="p-4 font-mono font-semibold text-warmgray-600 dark:text-warmgray-300">{batch.batch_number}</td>
                  <td className="p-4">{new Date(batch.manufacture_date).toLocaleDateString()}</td>
                  <td className="p-4">{new Date(batch.expiry_date).toLocaleDateString()}</td>
                  <td className="p-4">
                    {batch.is_expired ? (
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-650 font-bold uppercase dark:bg-red-950/40 text-[9px]">Expired</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${batch.expiry_warning ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' : 'bg-green-50 text-green-600 dark:bg-green-950/40'}`}>
                        {batch.days_to_expiry} Days left
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-bold">
                    <span className={batch.low_stock_warning ? 'text-red-500' : 'text-warmgray-900 dark:text-white'}>
                      {batch.remaining_qty} / {batch.quantity}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    {adjustmentId === batch.id ? (
                      <div className="flex items-center justify-end space-x-1.5">
                        <input
                          type="number"
                          value={adjustedQty}
                          onChange={(e) => setAdjustedQty(e.target.value)}
                          className="w-16 px-2 py-1 text-center bg-warmgray-50 border border-warmgray-300 rounded focus:outline-none dark:bg-warmgray-900"
                        />
                        <button
                          onClick={() => handleSaveAdjustment(batch.id)}
                          className="p-1 bg-brand-500 text-white rounded hover:bg-brand-600"
                          title="Save"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAdjustmentId(batch.id);
                          setAdjustedQty(batch.remaining_qty);
                        }}
                        className="text-brand-600 hover:text-brand-700 font-bold hover:underline"
                      >
                        Adjust
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Batch Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record New Food Batch"
      >
        <form onSubmit={handleAddBatch} className="space-y-4 text-xs">
          {error && <p className="p-2 bg-red-50 text-red-700 font-bold rounded-lg">{error}</p>}
          {success && <p className="p-2 bg-green-50 text-green-700 font-bold rounded-lg">{success}</p>}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Select Product</label>
            <select
              value={productId}
              onChange={handleProductChange}
              className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.weight})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Batch Code</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Batch Quantity</label>
              <input
                type="number"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Manufacture Date</label>
              <input
                type="date"
                required
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-warmgray-400">Expiry Date</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-warmgray-50 rounded-lg border border-warmgray-200 dark:bg-warmgray-900 dark:border-warmgray-750 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg shadow-md transition-colors text-xs"
          >
            Create Batch Record
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryManagement;
