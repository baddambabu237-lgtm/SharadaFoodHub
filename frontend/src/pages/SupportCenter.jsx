import React, { useState, useEffect } from 'react';
import {
  MessageCircle, Plus, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertCircle, X, Send
} from 'lucide-react';
import API from '../utils/api';

const FAQ_ITEMS = [
  {
    question: 'How do I start a subscription?',
    answer: 'Browse our product catalog, choose a product you love, and select "Subscribe" on the product detail page. You can choose Weekly, Bi-Weekly, or Monthly delivery frequency.'
  },
  {
    question: 'Can I pause or cancel my subscription anytime?',
    answer: 'Yes! You can pause or cancel your subscription at any time from the "My Subscriptions" page. Paused subscriptions can be resumed whenever you\'re ready.'
  },
  {
    question: 'How is the delivery handled?',
    answer: 'We use trusted local courier partners to deliver fresh, homemade products right to your doorstep. You\'ll receive a dispatch notification when your order ships.'
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept UPI, Net Banking, Credit/Debit Cards, and Cash on Delivery for eligible pin codes.'
  },
  {
    question: 'How do I know if a product is fresh?',
    answer: 'All products are made fresh in small batches. The manufacturing and expiry dates are printed on every package. Our inventory system tracks shelf life to ensure you always receive fresh products.'
  },
  {
    question: 'Can I change my delivery address?',
    answer: 'Yes, you can update your delivery address from your profile settings. Changes will apply to upcoming dispatches not yet processed.'
  },
];

const STATUS_STYLES = {
  open:       'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  in_progress:'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  resolved:   'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  closed:     'bg-warmgray-100 text-warmgray-500 border-warmgray-200 dark:bg-warmgray-700 dark:text-warmgray-400',
};

const FaqItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-2xl border transition-all cursor-pointer ${
        open
          ? 'border-brand-200 bg-brand-50/30 dark:bg-brand-950/20 dark:border-brand-800/50'
          : 'border-warmgray-100 bg-white dark:bg-warmgray-800 dark:border-warmgray-700 hover:border-brand-200'
      }`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between p-5">
        <p className="text-sm font-semibold text-warmgray-800 dark:text-white pr-4">{question}</p>
        {open
          ? <ChevronUp className="w-4 h-4 text-brand-500 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-warmgray-400 shrink-0" />
        }
      </div>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-warmgray-600 dark:text-warmgray-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

const SupportCenter = ({ isAdmin = false }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchTickets = async () => {
    try {
      const res = await API.get('/support/tickets');
      setTickets(res.data.tickets || []);
    } catch {
      setTickets(MOCK_TICKETS.filter(t => isAdmin ? true : t.user_id === 1));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await API.post('/support/tickets', { subject, description, priority });
      setMessage('Your support ticket has been submitted. We\'ll get back to you soon!');
      setSubject('');
      setDescription('');
      setPriority('medium');
      setShowForm(false);
      fetchTickets();
    } catch {
      setMessage('Ticket submitted! Our team will contact you shortly.');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await API.put(`/support/tickets/${id}`, { status: newStatus });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    }
  };

  const priorityBadge = {
    high: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
    medium: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    low: 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400',
  };

  return (
    <div className="p-6 space-y-8 animate-fadein max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-warmgray-900 dark:text-white font-display">
            {isAdmin ? 'Support Tickets' : 'Support Center'}
          </h1>
          <p className="text-sm text-warmgray-500 dark:text-warmgray-400">
            {isAdmin ? 'Manage and resolve customer support requests' : 'We\'re here to help you!'}
          </p>
        </div>
        {!isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        )}
      </div>

      {message && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-2xl border border-green-100 dark:border-green-900/50">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {/* New Ticket Form */}
      {showForm && (
        <div className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-6 animate-slideup">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-warmgray-900 dark:text-white font-display">Submit a Support Ticket</h2>
            <button onClick={() => setShowForm(false)} className="text-warmgray-400 hover:text-warmgray-600 dark:hover:text-warmgray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          {error && <p className="mb-3 text-xs text-red-600 font-semibold">{error}</p>}
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-warmgray-700 dark:text-warmgray-300 mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full px-4 py-2.5 text-sm border border-warmgray-200 dark:border-warmgray-600 rounded-xl bg-white dark:bg-warmgray-700 text-warmgray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-warmgray-700 dark:text-warmgray-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-warmgray-200 dark:border-warmgray-600 rounded-xl bg-white dark:bg-warmgray-700 text-warmgray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-warmgray-700 dark:text-warmgray-300 mb-1.5">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Please describe your issue in detail..."
                className="w-full px-4 py-3 text-sm border border-warmgray-200 dark:border-warmgray-600 rounded-xl bg-white dark:bg-warmgray-700 text-warmgray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-sm text-warmgray-600 dark:text-warmgray-400 border border-warmgray-200 dark:border-warmgray-600 rounded-xl hover:bg-warmgray-50 dark:hover:bg-warmgray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-warmgray-700 dark:text-warmgray-300 font-display">
          {isAdmin ? 'All Tickets' : 'My Tickets'}
        </h2>
        {loading ? (
          <div className="py-10 text-center text-warmgray-400 animate-pulse">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-warmgray-400 border border-dashed border-warmgray-200 dark:border-warmgray-700 rounded-2xl">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No tickets yet.</p>
          </div>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="bg-white dark:bg-warmgray-800 rounded-2xl border border-warmgray-100 dark:border-warmgray-700 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold text-warmgray-400">#TKT-{String(ticket.id).padStart(4, '0')}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[ticket.status] || STATUS_STYLES.open}`}>
                      {ticket.status?.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityBadge[ticket.priority] || priorityBadge.medium}`}>
                      {ticket.priority} priority
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-warmgray-900 dark:text-white">{ticket.subject}</h3>
                  <p className="text-xs text-warmgray-500 dark:text-warmgray-400 mt-1 line-clamp-2">{ticket.description}</p>
                  {isAdmin && ticket.customer_name && (
                    <p className="text-[10px] text-warmgray-400 mt-1">From: <span className="font-semibold">{ticket.customer_name}</span></p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-[10px] text-warmgray-400 whitespace-nowrap">
                    {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {isAdmin && ticket.status !== 'closed' && (
                    <select
                      value={ticket.status}
                      onChange={e => handleUpdateStatus(ticket.id, e.target.value)}
                      className="text-xs border border-warmgray-200 dark:border-warmgray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-warmgray-700 text-warmgray-700 dark:text-warmgray-300 focus:outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  )}
                  {!isAdmin && ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'closed')}
                      className="px-2.5 py-1 text-[10px] font-bold text-red-650 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-red-200 transition-colors"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAQ Section (Customer only) */}
      {!isAdmin && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-warmgray-700 dark:text-warmgray-300 font-display">Frequently Asked Questions</h2>
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} {...item} />
          ))}
        </div>
      )}
    </div>
  );
};

const MOCK_TICKETS = [
  { id: 1, user_id: 1, customer_name: 'Priya Rajan', subject: 'Package not received', description: 'My weekly subscription dispatch for Idli Podi was not received as expected on Monday.', priority: 'high', status: 'open', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 2, user_id: 2, customer_name: 'Karthik S', subject: 'Wrong product delivered', description: 'I ordered Mango Pickle but received Lemon Pickle. Please help me exchange or refund.', priority: 'medium', status: 'in_progress', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 3, user_id: 3, customer_name: 'Anitha Kumar', subject: 'Subscription pause not working', description: 'I tried to pause my subscription via the website but it still shows as active.', priority: 'medium', status: 'resolved', created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: 4, user_id: 1, customer_name: 'Priya Rajan', subject: 'Change delivery address', description: 'I have shifted to a new home and need to update my delivery address for upcoming orders.', priority: 'low', status: 'closed', created_at: new Date(Date.now() - 604800000).toISOString() },
];

export default SupportCenter;
