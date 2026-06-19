const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all inventory batches and check low stock / expiry alerts
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const batches = await query.all(`
      SELECT b.*, p.name as product_name, p.weight, p.shelf_life_days, c.name as category_name
      FROM inventory_batches b
      JOIN products p ON b.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      ORDER BY b.expiry_date ASC
    `);

    const today = new Date();
    
    // Add warnings dynamically
    const processedBatches = batches.map(batch => {
      const expDate = new Date(batch.expiry_date);
      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...batch,
        days_to_expiry: diffDays,
        is_expired: diffDays <= 0,
        expiry_warning: diffDays > 0 && diffDays <= 14, // 14 days warning
        low_stock_warning: batch.remaining_qty < 15
      };
    });

    res.status(200).json({ batches: processedBatches });
  } catch (err) {
    console.error('Fetch inventory batches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new batch (Admin only)
router.post('/batches', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { product_id, batch_number, manufacture_date, expiry_date, quantity } = req.body;

    if (!product_id || !batch_number || !manufacture_date || !expiry_date || !quantity) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const product = await query.get('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await query.run(
      'INSERT INTO inventory_batches (product_id, batch_number, manufacture_date, expiry_date, quantity, remaining_qty) VALUES (?, ?, ?, ?, ?, ?)',
      [product_id, batch_number, manufacture_date, expiry_date, quantity, quantity]
    );

    // Send admin notification
    await query.run(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [req.user.id, `New batch ${batch_number} added for ${product.name} with quantity ${quantity}.`, 'info']
    );

    res.status(201).json({
      message: 'Batch added successfully',
      batchId: result.id
    });
  } catch (err) {
    console.error('Create batch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Adjust batch stock (Admin only)
router.put('/batches/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { remaining_qty } = req.body;

    if (remaining_qty === undefined || remaining_qty < 0) {
      return res.status(400).json({ error: 'Valid remaining quantity is required' });
    }

    const batch = await query.get('SELECT * FROM inventory_batches WHERE id = ?', [id]);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    await query.run(
      'UPDATE inventory_batches SET remaining_qty = ? WHERE id = ?',
      [remaining_qty, id]
    );

    res.status(200).json({ message: 'Batch quantity updated successfully' });
  } catch (err) {
    console.error('Update batch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
