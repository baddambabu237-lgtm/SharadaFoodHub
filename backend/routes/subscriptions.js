const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

// Helper to compute next dispatch date
function calculateNextDispatchDate(frequency, baseDate = new Date()) {
  const nextDate = new Date(baseDate);
  if (frequency === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frequency === 'bi-weekly') {
    nextDate.setDate(nextDate.getDate() + 14);
  } else if (frequency === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1); // Fixed from setDate to setMonth
  }
  return nextDate.toISOString().split('T')[0];
}

// Create bulk subscriptions from cart items
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Admins are not allowed to create subscriptions' });
    }

    const { items, delivery_frequency } = req.body;
    const customer_id = req.user.id;

    if (!items || !items.length || !delivery_frequency) {
      return res.status(400).json({ error: 'Items list and delivery frequency are required' });
    }

    if (!['weekly', 'bi-weekly', 'monthly'].includes(delivery_frequency)) {
      return res.status(400).json({ error: 'Invalid delivery frequency. Must be weekly, bi-weekly, or monthly' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nextDispatchStr = calculateNextDispatchDate(delivery_frequency);

    const subscriptionIds = [];
    let totalAmount = 0;
    const validatedItems = [];

    // Validate all products, compute total amount, and check stock
    for (const item of items) {
      const product = await query.get('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (!product) {
        return res.status(404).json({ error: `Product with ID ${item.product_id} not found` });
      }

      const totalStock = await query.get(
        'SELECT SUM(remaining_qty) as total FROM inventory_batches WHERE product_id = ?',
        [item.product_id]
      );
      const available = totalStock ? (totalStock.total || 0) : 0;
      if (available < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${available}, Requested: ${item.quantity}` });
      }

      validatedItems.push({
        product,
        quantity: item.quantity,
        price: product.price
      });
      totalAmount += product.price * item.quantity;
    }

    // 1. Create a single combined order of type 'subscription_renewal'
    const orderResult = await query.run(
      'INSERT INTO orders (customer_id, order_type, total_amount, status) VALUES (?, ?, ?, ?)',
      [customer_id, 'subscription_renewal', totalAmount, 'processing']
    );
    const orderId = orderResult.id;

    // 2. Loop through validated items to create subscription, order item, and dispatch record
    for (const valItem of validatedItems) {
      const { product, quantity, price } = valItem;

      // Create subscription
      const subResult = await query.run(
        'INSERT INTO subscriptions (customer_id, product_id, delivery_frequency, status, start_date, next_dispatch_date, last_renewed_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [customer_id, product.id, delivery_frequency, 'active', todayStr, nextDispatchStr, todayStr]
      );
      const subscriptionId = subResult.id;
      subscriptionIds.push(subscriptionId);

      // Create order item
      await query.run(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, product.id, quantity, price]
      );

      // Deduct from inventory batches (oldest batch first)
      let quantityToDeduct = quantity;
      const batches = await query.all(
        'SELECT * FROM inventory_batches WHERE product_id = ? AND remaining_qty > 0 ORDER BY expiry_date ASC',
        [product.id]
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

      // Create dispatch record for this subscription item
      await query.run(
        'INSERT INTO dispatches (order_id, subscription_id, dispatch_status, estimated_delivery) VALUES (?, ?, ?, ?)',
        [orderId, subscriptionId, 'pending', nextDispatchStr]
      );

      // Check if product stock is low after deduction
      const totalStock = await query.get(
        'SELECT SUM(remaining_qty) as total FROM inventory_batches WHERE product_id = ?',
        [product.id]
      );
      if (totalStock.total < 15) {
        const admins = await query.all("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of admins) {
          await query.run(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [admin.id, `ALERT: ${product.name} stock is low (${totalStock.total || 0} remaining). Please restock.`, 'alert']
          );
        }
      }
    }

    // 3. Send customer notification
    await query.run(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [customer_id, `Your subscription for ${items.length} items was activated successfully! First order tracking: OR-${orderId}.`, 'info']
    );

    res.status(201).json({
      message: 'Subscriptions created and first order generated',
      orderId,
      subscriptionIds,
      next_dispatch_date: nextDispatchStr
    });

  } catch (err) {
    console.error('Create bulk subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new subscription
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Admins are not allowed to create subscriptions' });
    }

    const { product_id, delivery_frequency } = req.body;
    const customer_id = req.user.id;

    if (!product_id || !delivery_frequency) {
      return res.status(400).json({ error: 'Product ID and delivery frequency are required' });
    }

    if (!['weekly', 'bi-weekly', 'monthly'].includes(delivery_frequency)) {
      return res.status(400).json({ error: 'Invalid delivery frequency. Must be weekly, bi-weekly, or monthly' });
    }

    const product = await query.get('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Pre-check stock validation
    const totalStock = await query.get(
      'SELECT SUM(remaining_qty) as total FROM inventory_batches WHERE product_id = ?',
      [product_id]
    );
    const available = totalStock ? (totalStock.total || 0) : 0;
    if (available < 1) {
      return res.status(400).json({ error: `Insufficient stock for ${product.name}. Out of stock.` });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nextDispatchStr = calculateNextDispatchDate(delivery_frequency);

    // 1. Insert subscription
    const result = await query.run(
      'INSERT INTO subscriptions (customer_id, product_id, delivery_frequency, status, start_date, next_dispatch_date, last_renewed_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customer_id, product_id, delivery_frequency, 'active', todayStr, nextDispatchStr, todayStr]
    );
    const subscriptionId = result.id;

    // 2. Automatically generate the FIRST order for this subscription
    const orderResult = await query.run(
      'INSERT INTO orders (customer_id, order_type, total_amount, status) VALUES (?, ?, ?, ?)',
      [customer_id, 'subscription_renewal', product.price, 'processing']
    );
    const orderId = orderResult.id;

    // 3. Add order item
    await query.run(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
      [orderId, product_id, 1, product.price]
    );

    // Deduct stock (oldest batch first)
    let quantityToDeduct = 1;
    const batches = await query.all(
      'SELECT * FROM inventory_batches WHERE product_id = ? AND remaining_qty > 0 ORDER BY expiry_date ASC',
      [product_id]
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

    // Check if product stock is low after deduction
    const totalStockPost = await query.get(
      'SELECT SUM(remaining_qty) as total FROM inventory_batches WHERE product_id = ?',
      [product_id]
    );
    if (totalStockPost.total < 15) {
      const admins = await query.all("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of admins) {
        await query.run(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [admin.id, `ALERT: ${product.name} stock is low (${totalStockPost.total || 0} remaining). Please restock.`, 'alert']
        );
      }
    }

    // 4. Create dispatch record in queue
    await query.run(
      'INSERT INTO dispatches (order_id, subscription_id, dispatch_status, estimated_delivery) VALUES (?, ?, ?, ?)',
      [orderId, subscriptionId, 'pending', nextDispatchStr]
    );

    // 5. Send customer notification
    await query.run(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [customer_id, `Your subscription for ${product.name} has been activated successfully!`, 'info']
    );

    res.status(201).json({
      message: 'Subscription created and first order generated',
      subscriptionId,
      next_dispatch_date: nextDispatchStr
    });

  } catch (err) {
    console.error('Create subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer's subscriptions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await query.all(`
      SELECT s.*, p.name as product_name, p.price as product_price, p.weight, p.image_url, p.description as product_desc
      FROM subscriptions s
      JOIN products p ON s.product_id = p.id
      WHERE s.customer_id = ?
      ORDER BY s.id DESC
    `, [req.user.id]);

    res.status(200).json({ subscriptions });
  } catch (err) {
    console.error('Fetch customer subscriptions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pause subscription
router.put('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await query.get('SELECT * FROM subscriptions WHERE id = ?', [id]);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Check ownership
    if (subscription.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await query.run('UPDATE subscriptions SET status = "paused" WHERE id = ?', [id]);

    // Send notification
    await query.run(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [subscription.customer_id, 'Your subscription has been paused. We will not generate new deliveries until you resume.', 'info']
    );

    res.status(200).json({ message: 'Subscription paused successfully' });
  } catch (err) {
    console.error('Pause subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resume subscription
router.put('/:id/resume', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await query.get('SELECT * FROM subscriptions WHERE id = ?', [id]);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Check ownership
    if (subscription.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Recalculate next dispatch from today
    const nextDispatch = calculateNextDispatchDate(subscription.delivery_frequency);

    await query.run(
      'UPDATE subscriptions SET status = "active", next_dispatch_date = ? WHERE id = ?',
      [nextDispatch, id]
    );

    // Send notification
    await query.run(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [subscription.customer_id, `Your subscription has been resumed. Your next delivery is scheduled for ${nextDispatch}.`, 'info']
    );

    res.status(200).json({ message: 'Subscription resumed successfully', next_dispatch_date: nextDispatch });
  } catch (err) {
    console.error('Resume subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel subscription
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await query.get('SELECT * FROM subscriptions WHERE id = ?', [id]);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Check ownership
    if (subscription.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await query.run('UPDATE subscriptions SET status = "cancelled" WHERE id = ?', [id]);

    // Send notification
    await query.run(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [subscription.customer_id, 'Your subscription has been cancelled. Thank you for shopping with us!', 'info']
    );

    res.status(200).json({ message: 'Subscription cancelled successfully' });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin get all subscriptions
router.get('/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const subscriptions = await query.all(`
      SELECT s.*, p.name as product_name, p.price as product_price, p.weight, u.name as customer_name, u.email as customer_email
      FROM subscriptions s
      JOIN products p ON s.product_id = p.id
      JOIN users u ON s.customer_id = u.id
      ORDER BY s.id DESC
    `);

    res.status(200).json({ subscriptions });
  } catch (err) {
    console.error('Admin fetch subscriptions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
