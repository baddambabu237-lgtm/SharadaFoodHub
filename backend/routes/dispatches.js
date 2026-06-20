const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get dispatch queue
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'admin') {
      sql = `
        SELECT d.*, o.order_type, o.total_amount, o.cancellation_reason, o.status as order_status, u.name as customer_name, u.email as customer_email, u.phone as customer_phone, u.address as customer_address, s.delivery_frequency
        FROM dispatches d
        LEFT JOIN orders o ON d.order_id = o.id
        LEFT JOIN subscriptions s ON d.subscription_id = s.id
        JOIN users u ON (o.customer_id = u.id OR s.customer_id = u.id)
        ORDER BY d.id DESC
      `;
      params = [];
    } else {
      sql = `
        SELECT d.*, o.order_type, o.total_amount, o.cancellation_reason, o.status as order_status, s.delivery_frequency
        FROM dispatches d
        LEFT JOIN orders o ON d.order_id = o.id
        LEFT JOIN subscriptions s ON d.subscription_id = s.id
        WHERE (o.customer_id = ? OR s.customer_id = ?)
        ORDER BY d.id DESC
      `;
      params = [req.user.id, req.user.id];
    }

    const dispatches = await query.all(sql, params);
    res.status(200).json({ dispatches });
  } catch (err) {
    console.error('Fetch dispatches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update dispatch status (Admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { dispatch_status, tracking_number, estimated_delivery } = req.body;

    if (!dispatch_status) {
      return res.status(400).json({ error: 'Dispatch status is required' });
    }

    const dispatch = await query.get('SELECT * FROM dispatches WHERE id = ?', [id]);
    if (!dispatch) {
      return res.status(404).json({ error: 'Dispatch record not found' });
    }

    const dispatchDate = dispatch_status === 'shipped' || dispatch_status === 'delivered'
      ? new Date().toISOString().split('T')[0]
      : dispatch.dispatch_date;

    await query.run(
      'UPDATE dispatches SET dispatch_status = ?, tracking_number = ?, estimated_delivery = ?, dispatch_date = ? WHERE id = ?',
      [dispatch_status, tracking_number || dispatch.tracking_number, estimated_delivery || dispatch.estimated_delivery, dispatchDate, id]
    );

    // Get order ID and customer ID to send notification / update order status
    let customerId = null;
    let orderId = dispatch.order_id;

    if (orderId) {
      const order = await query.get('SELECT customer_id FROM orders WHERE id = ?', [orderId]);
      if (order) {
        customerId = order.customer_id;
        
        // Update order status if status changed
        if (dispatch_status === 'delivered') {
          await query.run("UPDATE orders SET status = 'delivered' WHERE id = ?", [orderId]);
        } else if (dispatch_status === 'shipped' || dispatch_status === 'dispatched') {
          await query.run("UPDATE orders SET status = 'dispatched' WHERE id = ?", [orderId]);
        } else if (dispatch_status === 'confirmed') {
          await query.run("UPDATE orders SET status = 'confirmed' WHERE id = ?", [orderId]);
        } else if (dispatch_status === 'pending') {
          await query.run("UPDATE orders SET status = 'pending' WHERE id = ?", [orderId]);
        } else if (dispatch_status === 'failed') {
          await query.run("UPDATE orders SET status = 'failed' WHERE id = ?", [orderId]);
        }
      }
    }

    if (!customerId && dispatch.subscription_id) {
      const sub = await query.get('SELECT customer_id FROM subscriptions WHERE id = ?', [dispatch.subscription_id]);
      if (sub) customerId = sub.customer_id;
    }

    if (customerId) {
      let msg = `Your delivery status has been updated to "${dispatch_status}".`;
      if (dispatch_status === 'shipped') {
        msg = `Good news! Your order has been dispatched. Tracking number: ${tracking_number || 'N/A'}.`;
      } else if (dispatch_status === 'delivered') {
        msg = `Your homemade treats have been delivered! Enjoy your fresh food.`;
      }

      await query.run(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [customerId, msg, 'info']
      );
    }

    res.status(200).json({ message: 'Dispatch status updated successfully' });
  } catch (err) {
    console.error('Update dispatch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upcoming dispatch calendar schedule (Admin only)
router.get('/calendar', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Return all future dispatches + subscriptions next_dispatch_dates
    const dispatches = await query.all(`
      SELECT d.id, d.estimated_delivery as date, u.name as customer_name, 'one-time' as type, p.name as product_name
      FROM dispatches d
      LEFT JOIN orders o ON d.order_id = o.id
      JOIN users u ON o.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE d.dispatch_status = 'pending' AND d.estimated_delivery IS NOT NULL
    `);

    const subscriptions = await query.all(`
      SELECT s.id, s.next_dispatch_date as date, u.name as customer_name, 'subscription' as type, p.name as product_name
      FROM subscriptions s
      JOIN users u ON s.customer_id = u.id
      JOIN products p ON s.product_id = p.id
      WHERE s.status = 'active'
    `);

    // Combine
    const calendar = [...dispatches, ...subscriptions].map(item => ({
      id: `${item.type}-${item.id}`,
      title: `${item.customer_name} - ${item.product_name} (${item.type})`,
      date: item.date,
      type: item.type
    }));

    res.status(200).json({ calendar });
  } catch (err) {
    console.error('Fetch calendar schedule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
