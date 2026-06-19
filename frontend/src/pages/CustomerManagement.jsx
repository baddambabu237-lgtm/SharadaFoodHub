import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Calendar } from 'lucide-react';
import API from '../utils/api';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await API.get('/auth/customers');
        setCustomers(res.data.customers);
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError('Failed to load customers database.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-warmgray-400">Loading customers database...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fadein">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Customer Database</h1>
        <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Review registered accounts and shipping addresses</p>
      </div>

      {error && <p className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">{error}</p>}

      {customers.length === 0 ? (
        <div className="text-center py-20 text-warmgray-400 border border-dashed border-warmgray-200 rounded-3xl dark:border-warmgray-700">
          No registered customer accounts found.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-warmgray-50 text-warmgray-450 uppercase tracking-wider font-bold border-b border-warmgray-100 dark:bg-warmgray-900 dark:border-warmgray-700">
                  <th className="p-4 pl-6">ID</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Contact info</th>
                  <th className="p-4">Delivery Address</th>
                  <th className="p-4 pr-6 text-right">Joined On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warmgray-50 dark:divide-warmgray-700 text-warmgray-750 dark:text-warmgray-300">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-warmgray-50/50 dark:hover:bg-warmgray-900/30 transition-colors">
                    <td className="p-4 pl-6 font-bold text-warmgray-900 dark:text-white">CUST-{cust.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-warmgray-900 dark:text-white text-sm">{cust.name}</div>
                      <div className="text-[10px] text-warmgray-400 uppercase tracking-wider font-semibold mt-0.5">{cust.role}</div>
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-warmgray-400 shrink-0" />
                        <span>{cust.email}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-warmgray-400 shrink-0" />
                        <span>+91 {cust.phone}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="flex items-start space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-warmgray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{cust.address || 'No address set'}</span>
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right text-warmgray-400">
                      <div className="flex items-center justify-end space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(cust.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
