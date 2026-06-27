const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');
const cache = require('../utils/cache');

// Get orders (customer gets their own, admin gets all)
// Admin response includes nested `items` array with product details
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'admin') {
      sql = `
        SELECT o.*,
               u.name    AS customer_name,
               u.email   AS customer_email,
               u.phone   AS customer_phone,
               u.address AS customer_address
        FROM orders o
        JOIN users u ON o.customer_id = u.id
        ORDER BY o.id DESC
      `;
      params = [];
    } else {
      sql = `
        SELECT o.*
        FROM orders o
        WHERE o.customer_id = ?
        ORDER BY o.id DESC
      `;
      params = [req.user.id];
    }

    const orders = await query.all(sql, params);

    // For admin: attach items (product name, qty, price) to every order
    if (req.user.role === 'admin') {
      const orderIds = orders.map(o => o.id);
      let orderItemsMap = {};
      if (orderIds.length > 0) {
        // Query database once for all order items
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
      const enriched = orders.map(order => ({
        ...order,
        items: orderItemsMap[order.id] || []
      }));
      return res.status(200).json({ orders: enriched });
    }

    res.status(200).json({ orders });
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order details by ID (includes customer info for admin)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let order;
    if (req.user.role === 'admin') {
      order = await query.get(
        `SELECT o.*, u.name AS customer_name, u.email AS customer_email,
                u.phone AS customer_phone, u.address AS customer_address
         FROM orders o
         JOIN users u ON o.customer_id = u.id
         WHERE o.id = ?`,
        [id]
      );
    } else {
      order = await query.get('SELECT * FROM orders WHERE id = ?', [id]);
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check permissions
    if (order.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const items = await query.all(
      `SELECT oi.id, oi.quantity, oi.price,
              p.id AS product_id,
              p.name AS name,
              p.name AS product_name,
              p.weight, p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [id]
    );

    if (items.length === 0) {
      console.warn(`[Order ${id}] WARNING: No items found in order_items for this order`);
    }

    const dispatch = await query.get('SELECT * FROM dispatches WHERE order_id = ?', [id]);

    res.status(200).json({ order, items, dispatch });
  } catch (err) {
    console.error('Fetch order details error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Checkout (Create one-time order)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Admins are not allowed to place orders' });
    }

    const { items, total_amount } = req.body;
    const customer_id = req.user.id;

    if (!items || !items.length || !total_amount) {
      return res.status(400).json({ error: 'Items list and total amount are required' });
    }

    // Pre-check stock validation for all items
    for (const item of items) {
      const product = await query.get('SELECT name FROM products WHERE id = ?', [item.product_id]);
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.product_id} not found` });
      }
      const totalStock = await query.get(
        'SELECT SUM(remaining_qty) as total FROM inventory_batches WHERE product_id = ?',
        [item.product_id]
      );
      const available = totalStock ? (totalStock.total || 0) : 0;
      if (available < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${available}, Requested: ${item.quantity}` });
      }
    }

    // 1. Create order record
    const orderResult = await query.run(
      'INSERT INTO orders (customer_id, order_type, total_amount, status) VALUES (?, ?, ?, ?)',
      [customer_id, 'one-time', total_amount, 'pending']
    );
    const orderId = orderResult.id;

    // 2. Add order items & adjust inventory
    for (const item of items) {
      await query.run(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      // Deduct from inventory batches (oldest batch first)
      let quantityToDeduct = item.quantity;
      const batches = await query.all(
        'SELECT * FROM inventory_batches WHERE product_id = ? AND remaining_qty > 0 ORDER BY expiry_date ASC',
        [item.product_id]
      );

      for (const batch of batches) {
        if (quantityToDeduct <= 0) break;
        
        const deductAmt = Math.min(batch.remaining_qty, quantityToDeduct);
        await query.run(
          'UPDATE inventory_batches SET remaining_qty = remaining_qty - ? WHERE id = ?',
          [deductAmt, batch.id]
        );
        quantityToDeduct -= deductAmt;
      }

      // ── Increment sales_count and recalculate trending_score ──────────────
      await query.run(
        `UPDATE products
         SET sales_count = sales_count + ?,
             trending_score = ROUND(((sales_count + ?) * 0.6 + view_count * 0.4)::NUMERIC, 2)
         WHERE id = ?`,
        [item.quantity, item.quantity, item.product_id]
      );

      // Check if product stock is low after deduction
      const totalStock = await query.get(
        'SELECT SUM(remaining_qty) as total FROM inventory_batches WHERE product_id = ?',
        [item.product_id]
      );
      if (totalStock.total < 15) {
        // Send alert to admin
        const product = await query.get('SELECT name FROM products WHERE id = ?', [item.product_id]);
        
        // Find admins
        const admins = await query.all("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of admins) {
          await query.run(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [admin.id, `ALERT: ${product.name} stock is low (${totalStock.total || 0} remaining). Please restock.`, 'alert']
          );
        }
      }

    }

    // 3. Create dispatch queue record
    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 3); // 3 days for one-time deliveries
    
    await query.run(
      'INSERT INTO dispatches (order_id, subscription_id, dispatch_status, estimated_delivery) VALUES (?, ?, ?, ?)',
      [orderId, null, 'pending', estDelivery.toISOString().split('T')[0]]
    );

    // 4. Send customer notification
    await query.run(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [customer_id, `Your order for ₹${total_amount} was placed successfully! Tracking ID: OR-${orderId}.`, 'info']
    );

    // Invalidate stats caches
    cache.deletePattern('stats');

    res.status(201).json({
      message: 'Order placed successfully',
      orderId
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel Order (Customer cancels their own, admin can cancel any)
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    const order = await query.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check permissions: customer can only cancel their own order, admin can cancel any
    if (order.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to cancel this order' });
    }

    // Check eligibility: status must be pending or confirmed (processing is equivalent to confirmed/processing before dispatch)
    const nonCancellable = ['dispatched', 'delivered', 'cancelled', 'completed'];
    if (nonCancellable.includes(order.status.toLowerCase())) {
      return res.status(400).json({ error: `Order cannot be cancelled because its status is "${order.status}"` });
    }

    // 1. Update order record status, reason, cancelled_at, cancelled_by, and previous_status
    await query.run(
      'UPDATE orders SET status = ?, cancellation_reason = ?, cancelled_at = NOW(), cancelled_by = ?, previous_status = ? WHERE id = ?',
      ['cancelled', reason, req.user.role, order.status, id]
    );

    // 2. Update dispatch record status to cancelled
    await query.run(
      'UPDATE dispatches SET dispatch_status = ? WHERE order_id = ?',
      ['cancelled', id]
    );

    // 3. Restore inventory stock automatically
    const items = await query.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
    for (const item of items) {
      // Find the latest active inventory batch for this product
      const batch = await query.get(
        'SELECT id FROM inventory_batches WHERE product_id = ? ORDER BY id DESC LIMIT 1',
        [item.product_id]
      );
      if (batch) {
        await query.run(
          'UPDATE inventory_batches SET remaining_qty = remaining_qty + ? WHERE id = ?',
          [item.quantity, batch.id]
        );
      }
    }

    // 4. Send customer notification
    await query.run(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [order.customer_id, `Your order OR-${id} has been cancelled successfully. Reason: ${reason}.`, 'info']
    );

    // 5. Send admin notification
    const user = await query.get('SELECT name FROM users WHERE id = ?', [order.customer_id]);
    const admins = await query.all("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await query.run(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [admin.id, `New Cancellation Request: Customer ${user.name} cancelled Order #${id}.`, 'alert']
      );
    }

    // Invalidate stats caches
    cache.deletePattern('stats');

    res.status(200).json({
      message: 'Order cancelled successfully',
      orderId: id
    });

  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
