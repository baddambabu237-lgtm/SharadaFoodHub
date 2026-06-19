const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all products (with search and category filter)
router.get('/', async (req, res) => {
  try {
    const { search, categoryId } = req.query;
    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
    `;
    const params = [];

    if (search || categoryId) {
      sql += ' WHERE ';
      const conditions = [];
      
      if (search) {
        conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (categoryId) {
        conditions.push('p.category_id = ?');
        params.push(categoryId);
      }
      
      sql += conditions.join(' AND ');
    }

    sql += ' ORDER BY p.id DESC';

    const products = await query.all(sql, params);
    res.status(200).json({ products });
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await query.get(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ product });
  } catch (err) {
    console.error('Fetch product details error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all categories
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await query.all('SELECT * FROM categories ORDER BY id ASC');
    res.status(200).json({ categories });
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (Admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { category_id, name, description, price, image_url, weight, shelf_life_days } = req.body;

    if (!category_id || !name || !price || !shelf_life_days) {
      return res.status(400).json({ error: 'Category ID, name, price, and shelf life days are required' });
    }

    const result = await query.run(
      'INSERT INTO products (category_id, name, description, price, image_url, weight, shelf_life_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [category_id, name, description || '', image_url || '', weight || '', shelf_life_days]
    );

    // Seed a default batch in inventory for this new product
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + parseInt(shelf_life_days));
    
    await query.run(
      'INSERT INTO inventory_batches (product_id, batch_number, manufacture_date, expiry_date, quantity, remaining_qty) VALUES (?, ?, ?, ?, ?, ?)',
      [result.id, `BATCH-${result.id}-AUTO`, today.toISOString().split('T')[0], expiry.toISOString().split('T')[0], 50, 50]
    );

    res.status(201).json({
      message: 'Product created successfully',
      productId: result.id
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (Admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, description, price, image_url, weight, shelf_life_days } = req.body;

    if (!category_id || !name || !price || !shelf_life_days) {
      return res.status(400).json({ error: 'Category ID, name, price, and shelf life days are required' });
    }

    const product = await query.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await query.run(
      'UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, weight = ?, shelf_life_days = ? WHERE id = ?',
      [category_id, name, description || '', price, image_url || '', weight || '', shelf_life_days, id]
    );

    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await query.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await query.run('DELETE FROM products WHERE id = ?', [id]);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
