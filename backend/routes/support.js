const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

// Static FAQs list
router.get('/faqs', (req, res) => {
  const faqs = [
    {
      question: 'How do food subscriptions work?',
      answer: 'Our subscription system allows you to receive regular deliveries of your favorite homemade items like podi, ghee, and pickles. You choose your preferred delivery frequency (weekly, bi-weekly, or monthly) when ordering. Future orders are generated automatically and shipped right to your door.'
    },
    {
      question: 'Can I pause or cancel my subscription?',
      answer: 'Yes! You can pause, resume, or cancel your subscription at any time from your Customer Dashboard under the "Subscription Management" section. Pausing stops future dispatches immediately without cancelling your history.'
    },
    {
      question: 'How are dispatches tracked?',
      answer: 'When a new cycle begins or a one-time order is generated, we compile a dispatch record. You can view the status of your upcoming deliveries (e.g., Pending, Shipped, Delivered) in real-time from the "Delivery Tracker" on your dashboard.'
    },
    {
      question: 'What is the shelf life of your products?',
      answer: 'Since we do not use artificial preservatives, our shelf lives vary by item. Ghee lasts up to 12 months, pickles up to 9 months, podis up to 6 months, applams up to 4 months, and crispy snacks up to 2 months. Expiry dates are printed on each package and monitored in our system.'
    },
    {
      question: 'How do I change my delivery address?',
      answer: 'You can update your default delivery address in your Profile section. For an active subscription, the next dispatch will automatically route to your updated address.'
    }
  ];
  res.status(200).json({ faqs });
});

// Get tickets (customer gets their own, admin gets all)
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'admin') {
      sql = `
        SELECT t.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
        FROM support_tickets t
        JOIN users u ON t.customer_id = u.id
        ORDER BY t.id DESC
      `;
      params = [];
    } else {
      sql = `
        SELECT t.*
        FROM support_tickets t
        WHERE t.customer_id = ?
        ORDER BY t.id DESC
      `;
      params = [req.user.id];
    }

    const tickets = await query.all(sql, params);
    res.status(200).json({ tickets });
  } catch (err) {
    console.error('Fetch tickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new ticket
router.post('/tickets', authenticateToken, async (req, res) => {
  try {
    const { subject, description, priority } = req.body;
    const customer_id = req.user.id;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }

    const assignedPriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';

    const result = await query.run(
      'INSERT INTO support_tickets (customer_id, subject, description, status, priority) VALUES (?, ?, ?, ?, ?)',
      [customer_id, subject, description, 'open', assignedPriority]
    );

    // Alert admins
    const admins = await query.all("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await query.run(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [admin.id, `New support ticket #${result.id} opened: "${subject}" (Priority: ${assignedPriority})`, 'alert']
      );
    }

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticketId: result.id
    });
  } catch (err) {
    console.error('Create support ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update ticket status / priority (Customers can close their own, Admin has full rights)
router.put('/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;

    const ticket = await query.get('SELECT * FROM support_tickets WHERE id = ?', [id]);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (req.user.role !== 'admin') {
      if (ticket.customer_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      if (status !== 'closed' && status !== 'resolved') {
        return res.status(400).json({ error: 'Customers can only close or resolve their own tickets' });
      }
    }

    const updateFields = [];
    const params = [];

    if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
      updateFields.push('status = ?');
      params.push(status);
    }

    if (priority && ['low', 'medium', 'high'].includes(priority)) {
      updateFields.push('priority = ?');
      params.push(priority);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid update parameters provided' });
    }

    params.push(id);
    await query.run(`UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = ?`, params);

    // Notify customer
    if (status) {
      await query.run(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [ticket.customer_id, `Your support ticket #${id} status has been updated to "${status}".`, 'info']
      );
    }

    res.status(200).json({ message: 'Ticket updated successfully' });
  } catch (err) {
    console.error('Update ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
