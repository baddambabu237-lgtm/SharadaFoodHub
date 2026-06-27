const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const cache = require('../utils/cache');

// ─────────────────────────────────────────────────────────────
// GET /reviews/product/:productId  — Public: get reviews for a product
// ─────────────────────────────────────────────────────────────
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await query.all(
      `SELECT r.id, r.rating, r.review_text, r.created_at, r.updated_at, r.is_flagged,
              u.name AS customer_name,
              u.id   AS customer_id
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.product_id = ? AND r.is_flagged = false
       ORDER BY r.created_at DESC`,
      [productId]
    );

    const stats = await query.get(
      `SELECT
         COUNT(*)                          AS review_count,
         ROUND(AVG(rating)::NUMERIC, 1)    AS avg_rating,
         COUNT(CASE WHEN rating = 5 THEN 1 END) AS five_star,
         COUNT(CASE WHEN rating = 4 THEN 1 END) AS four_star,
         COUNT(CASE WHEN rating = 3 THEN 1 END) AS three_star,
         COUNT(CASE WHEN rating = 2 THEN 1 END) AS two_star,
         COUNT(CASE WHEN rating = 1 THEN 1 END) AS one_star
       FROM reviews
       WHERE product_id = ? AND is_flagged = false`,
      [productId]
    );

    res.status(200).json({ reviews, stats });
  } catch (err) {
    console.error('Fetch product reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /reviews/my  — Customer: get own reviews
// ─────────────────────────────────────────────────────────────
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const reviews = await query.all(
      `SELECT r.id, r.rating, r.review_text, r.created_at, r.updated_at, r.is_flagged,
              p.name AS product_name, p.image_url, p.id AS product_id
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       WHERE r.customer_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.status(200).json({ reviews });
  } catch (err) {
    console.error('Fetch my reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /reviews/eligible  — Customer: get delivered orders they can review
// ─────────────────────────────────────────────────────────────
router.get('/eligible', authenticateToken, async (req, res) => {
  try {
    // Find all products the customer has received (delivered orders)
    const eligibleProducts = await query.all(
      `SELECT DISTINCT p.id, p.name, p.image_url, p.weight,
              o.id AS order_id, o.order_date
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.customer_id = ?
         AND o.status IN ('delivered', 'completed')
         AND NOT EXISTS (
           SELECT 1 FROM reviews r
           WHERE r.customer_id = ? AND r.product_id = p.id
         )
       ORDER BY o.order_date DESC`,
      [req.user.id, req.user.id]
    );
    res.status(200).json({ eligibleProducts });
  } catch (err) {
    console.error('Fetch eligible review products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /reviews  — Customer: submit a new review
// ─────────────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot submit reviews' });
    }

    const { product_id, rating, review_text } = req.body;

    if (!product_id || !rating) {
      return res.status(400).json({ error: 'product_id and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if product exists
    const product = await query.get('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check delivery eligibility: must have a delivered/completed order with this product
    const delivered = await query.get(
      `SELECT o.id FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.customer_id = ? AND oi.product_id = ?
         AND o.status IN ('delivered', 'completed')
       LIMIT 1`,
      [req.user.id, product_id]
    );
    if (!delivered) {
      return res.status(403).json({
        error: 'You can only review products from delivered orders'
      });
    }

    // Check if already reviewed this product
    const existing = await query.get(
      'SELECT id FROM reviews WHERE customer_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );
    if (existing) {
      return res.status(409).json({
        error: 'You have already reviewed this product. Use edit to update.',
        reviewId: existing.id
      });
    }

    const result = await query.run(
      'INSERT INTO reviews (customer_id, product_id, rating, review_text) VALUES (?, ?, ?, ?)',
      [req.user.id, product_id, rating, review_text || '']
    );

    // Invalidate caches
    cache.deletePattern('products_');
    cache.del(`product_details_${product_id}`);
    cache.deletePattern('stats');

    res.status(201).json({
      message: 'Review submitted successfully',
      reviewId: result.id
    });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /reviews/:id  — Customer: edit own review
// ─────────────────────────────────────────────────────────────
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review_text } = req.body;

    const review = await query.get('SELECT * FROM reviews WHERE id = ?', [id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (review.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to edit this review' });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    await query.run(
      'UPDATE reviews SET rating = ?, review_text = ?, updated_at = NOW() WHERE id = ?',
      [rating || review.rating, review_text ?? review.review_text, id]
    );

    // Invalidate caches
    cache.deletePattern('products_');
    cache.del(`product_details_${review.product_id}`);
    cache.deletePattern('stats');

    res.status(200).json({ message: 'Review updated successfully' });
  } catch (err) {
    console.error('Edit review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /reviews/:id  — Customer or Admin: delete a review
// ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const review = await query.get('SELECT * FROM reviews WHERE id = ?', [id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (review.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this review' });
    }

    await query.run('DELETE FROM reviews WHERE id = ?', [id]);

    // Invalidate caches
    cache.deletePattern('products_');
    cache.del(`product_details_${review.product_id}`);
    cache.deletePattern('stats');

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /reviews  — Admin: get ALL reviews
// ─────────────────────────────────────────────────────────────
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { product_id, flagged } = req.query;
    let sql = `
      SELECT r.id, r.rating, r.review_text, r.created_at, r.updated_at, r.is_flagged,
             u.name AS customer_name, u.email AS customer_email,
             p.name AS product_name, p.id AS product_id, p.image_url
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (product_id) { sql += ' AND r.product_id = ?'; params.push(product_id); }
    if (flagged === 'true') { sql += ' AND r.is_flagged = true'; }
    sql += ' ORDER BY r.created_at DESC';

    const reviews = await query.all(sql, params);

    // Overall rating stats per product
    const productStats = await query.all(
      `SELECT p.id, p.name,
              COUNT(r.id)                       AS review_count,
              ROUND(AVG(r.rating)::NUMERIC, 1)  AS avg_rating
       FROM products p
       LEFT JOIN reviews r ON p.id = r.product_id AND r.is_flagged = false
       GROUP BY p.id, p.name
       ORDER BY avg_rating DESC NULLS LAST`
    );

    res.status(200).json({ reviews, productStats });
  } catch (err) {
    console.error('Admin fetch reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /reviews/:id/flag  — Admin: flag/unflag a review
// ─────────────────────────────────────────────────────────────
router.put('/:id/flag', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { flag } = req.body; // true to flag, false to unflag

    const review = await query.get('SELECT id, product_id, is_flagged FROM reviews WHERE id = ?', [id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const newFlag = flag !== undefined ? flag : !review.is_flagged;
    await query.run('UPDATE reviews SET is_flagged = ? WHERE id = ?', [newFlag, id]);

    // Invalidate caches
    cache.deletePattern('products_');
    cache.del(`product_details_${review.product_id}`);
    cache.deletePattern('stats');

    res.status(200).json({
      message: newFlag ? 'Review flagged as inappropriate' : 'Review unflagged',
      is_flagged: newFlag
    });
  } catch (err) {
    console.error('Flag review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /reviews/analytics  — Admin: rating analytics
// ─────────────────────────────────────────────────────────────
router.get('/analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const highest = await query.get(
      `SELECT p.id, p.name, p.image_url, ROUND(AVG(r.rating)::NUMERIC, 1) AS avg_rating, COUNT(r.id) AS review_count
       FROM reviews r JOIN products p ON r.product_id = p.id
       WHERE r.is_flagged = false
       GROUP BY p.id, p.name, p.image_url
       HAVING COUNT(r.id) >= 1
       ORDER BY avg_rating DESC LIMIT 1`
    );
    const lowest = await query.get(
      `SELECT p.id, p.name, p.image_url, ROUND(AVG(r.rating)::NUMERIC, 1) AS avg_rating, COUNT(r.id) AS review_count
       FROM reviews r JOIN products p ON r.product_id = p.id
       WHERE r.is_flagged = false
       GROUP BY p.id, p.name, p.image_url
       HAVING COUNT(r.id) >= 1
       ORDER BY avg_rating ASC LIMIT 1`
    );
    const mostReviewed = await query.get(
      `SELECT p.id, p.name, p.image_url, COUNT(r.id) AS review_count, ROUND(AVG(r.rating)::NUMERIC, 1) AS avg_rating
       FROM reviews r JOIN products p ON r.product_id = p.id
       WHERE r.is_flagged = false
       GROUP BY p.id, p.name, p.image_url
       ORDER BY review_count DESC LIMIT 1`
    );
    const totalReviews = await query.get('SELECT COUNT(*) AS count FROM reviews WHERE is_flagged = false');
    const flaggedCount = await query.get('SELECT COUNT(*) AS count FROM reviews WHERE is_flagged = true');
    const overallAvg = await query.get('SELECT ROUND(AVG(rating)::NUMERIC, 1) AS avg FROM reviews WHERE is_flagged = false');

    res.status(200).json({
      highest,
      lowest,
      mostReviewed,
      totalReviews: totalReviews.count,
      flaggedCount: flaggedCount.count,
      overallAvg: overallAvg.avg
    });
  } catch (err) {
    console.error('Reviews analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
