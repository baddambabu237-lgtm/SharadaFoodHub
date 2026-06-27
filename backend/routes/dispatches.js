const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const cache = require('../utils/cache');

// ─────────────────────────────────────────────────────────────────
// GET /dispatches  —  list all dispatches with product details
// ─────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'admin') {
      sql = `
        SELECT
          d.*,
          o.order_type,
          o.total_amount,
          o.cancellation_reason,
          o.order_date,
          o.status           AS order_status,
          u.name             AS customer_name,
          u.email            AS customer_email,
          u.phone            AS customer_phone,
          u.address          AS customer_address,
          s.delivery_frequency,
          s.product_id       AS sub_product_id
        FROM dispatches d
        LEFT JOIN orders o        ON d.order_id = o.id
        LEFT JOIN subscriptions s ON d.subscription_id = s.id
        JOIN  users u             ON (o.customer_id = u.id OR s.customer_id = u.id)
        ORDER BY d.id DESC
      `;
      params = [];
    } else {
      sql = `
        SELECT
          d.*,
          o.order_type,
          o.total_amount,
          o.cancellation_reason,
          o.order_date,
          o.status           AS order_status,
          s.delivery_frequency
        FROM dispatches d
        LEFT JOIN orders o        ON d.order_id = o.id
        LEFT JOIN subscriptions s ON d.subscription_id = s.id
        WHERE (o.customer_id = ? OR s.customer_id = ?)
        ORDER BY d.id DESC
      `;
      params = [req.user.id, req.user.id];
    }

    const dispatches = await query.all(sql, params);

    // For each dispatch, attach product items using bulk queries
    const orderIds = dispatches.filter(d => d.order_id).map(d => d.order_id);
    let orderItemsMap = {};
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const items = await query.all(
        `SELECT oi.order_id, oi.id, oi.quantity, oi.price,
                p.id AS product_id,
                p.name AS name,
                p.name AS product_name,
                p.weight, p.image_url
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id IN (${placeholders})`,
        orderIds
      );
      items.forEach(item => {
        if (!orderItemsMap[item.order_id]) {
          orderItemsMap[item.order_id] = [];
        }
        orderItemsMap[item.order_id].push(item);
      });
    }

    const subIds = dispatches.filter(d => d.subscription_id).map(d => d.subscription_id);
    let subMap = {};
    if (subIds.length > 0) {
      const placeholders = subIds.map(() => '?').join(',');
      const subs = await query.all(
        `SELECT s.id AS subscription_id, p.name AS name, p.name AS product_name, p.weight, p.image_url, 1 AS quantity
         FROM subscriptions s
         JOIN products p ON s.product_id = p.id
         WHERE s.id IN (${placeholders})`,
        subIds
      );
      subs.forEach(s => {
        subMap[s.subscription_id] = s;
      });
    }

    const enriched = dispatches.map((d) => {
      let items = [];
      if (d.order_id) {
        items = orderItemsMap[d.order_id] || [];
      } else if (d.sub_product_id || d.subscription_id) {
        const sub = subMap[d.subscription_id];
        if (sub) items = [sub];
      }

      // Convenience fields for backward compat
      const product_name = items.length === 1
        ? items[0].product_name
        : items.length > 1
          ? items.map(i => i.product_name).join(', ')
          : null;
      const quantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

      return { ...d, status: d.dispatch_status, items, product_name, quantity };
    });

    res.status(200).json({ dispatches: enriched });
  } catch (err) {
    console.error('Fetch dispatches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /dispatches/:id  —  single dispatch with full order details
// ─────────────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const dispatch = await query.get(
      `SELECT d.*,
              o.order_type, o.total_amount, o.cancellation_reason, o.order_date, o.status AS order_status,
              u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone, u.address AS customer_address,
              s.delivery_frequency
       FROM dispatches d
       LEFT JOIN orders       o ON d.order_id = o.id
       LEFT JOIN subscriptions s ON d.subscription_id = s.id
       JOIN  users            u ON (o.customer_id = u.id OR s.customer_id = u.id)
       WHERE d.id = ?`,
      [id]
    );

    if (!dispatch) return res.status(404).json({ error: 'Dispatch not found' });

    let items = [];
    if (dispatch.order_id) {
      items = await query.all(
        `SELECT oi.quantity, oi.price, p.name AS product_name, p.weight, p.image_url
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [dispatch.order_id]
      );
    } else if (dispatch.subscription_id) {
      const sub = await query.get(
        `SELECT p.name AS product_name, p.weight, p.image_url, 1 AS quantity
         FROM subscriptions s
         JOIN products p ON s.product_id = p.id
         WHERE s.id = ?`,
        [dispatch.subscription_id]
      );
      if (sub) items = [sub];
    }

    res.status(200).json({ dispatch: { ...dispatch, status: dispatch.dispatch_status }, items });
  } catch (err) {
    console.error('Fetch single dispatch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /dispatches/:id  —  update dispatch status (Admin only)
// ─────────────────────────────────────────────────────────────────
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

    // Invalidate stats caches
    cache.deletePattern('stats');

    // Sync order status
    let customerId = null;
    const orderId = dispatch.order_id;

    if (orderId) {
      const order = await query.get('SELECT customer_id FROM orders WHERE id = ?', [orderId]);
      if (order) {
        customerId = order.customer_id;
        const statusMap = {
          delivered: 'delivered',
          shipped: 'dispatched',
          dispatched: 'dispatched',
          confirmed: 'confirmed',
          pending: 'pending',
          failed: 'failed',
        };
        if (statusMap[dispatch_status]) {
          await query.run('UPDATE orders SET status = ? WHERE id = ?', [statusMap[dispatch_status], orderId]);
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
        msg = `Good news! Your order has been dispatched. Tracking: ${tracking_number || 'N/A'}.`;
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

// ─────────────────────────────────────────────────────────────────
// GET /dispatches/calendar  —  upcoming dispatch schedule (Admin)
// ─────────────────────────────────────────────────────────────────
router.get('/calendar', authenticateToken, isAdmin, async (req, res) => {
  try {
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
