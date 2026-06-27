const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const cache = require('../utils/cache');

const DEFAULT_PLACEHOLDER = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300';

const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

// Helper: recalculate trending_score for a product
const updateTrendingScore = async (productId) => {
  await query.run(
    `UPDATE products SET trending_score = ROUND((sales_count * 0.6 + view_count * 0.4)::NUMERIC, 2) WHERE id = ?`,
    [productId]
  );
};

// ─── GET /api/products/featured-sections ─────────────────────────────────────
// Public endpoint — returns three curated product sets for the homepage
router.get('/featured-sections', async (req, res) => {
  try {
    const baseSelect = `
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
    `;

    const [trending, newlyAdded, bestSellers] = await Promise.all([
      query.all(`${baseSelect} WHERE p.is_trending = true OR p.trending_score > 0 ORDER BY p.trending_score DESC, p.sales_count DESC LIMIT 8`),
      query.all(`${baseSelect} WHERE p.created_at >= NOW() - INTERVAL '90 days' ORDER BY p.created_at DESC LIMIT 8`),
      query.all(`${baseSelect} ORDER BY p.sales_count DESC LIMIT 8`),
    ]);

    // If newlyAdded is empty (all products are older), just return newest 8
    const newlyAddedFinal = newlyAdded.length > 0
      ? newlyAdded
      : await query.all(`${baseSelect} ORDER BY p.created_at DESC LIMIT 8`);

    res.status(200).json({ trending, newlyAdded: newlyAddedFinal, bestSellers });
  } catch (err) {
    console.error('Featured sections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/products/categories/all ────────────────────────────────────────
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await query.all('SELECT * FROM categories ORDER BY id ASC');
    res.status(200).json({ categories });
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/products ────────────────────────────────────────────────────────
// Supports: ?search=, ?categoryId=, ?filter=trending|new|bestsellers|premium|special_offers, ?page=, ?limit=
router.get('/', async (req, res) => {
  try {
    const { search, categoryId, filter, page, limit } = req.query;

    const cacheKey = `products_list_cat_${categoryId || 'all'}_filter_${filter || 'none'}_search_${search || 'none'}_page_${page || 'all'}_limit_${limit || 'all'}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    let sqlBase = `
      FROM products p
      JOIN categories c ON p.category_id = c.id
    `;
    const params = [];
    const conditions = [];

    // Smart filter
    if (filter === 'trending') {
      conditions.push('(p.is_trending = true OR p.trending_score > 0)');
    } else if (filter === 'new') {
      conditions.push("p.created_at >= NOW() - INTERVAL '90 days'");
    } else if (filter === 'special_offers') {
      conditions.push('p.is_special_offer = true AND p.discount_percent > 0');
    } else if (filter === 'premium') {
      conditions.push('p.price >= 250');
    }

    // Category filter
    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(parseInt(categoryId));
    }

    // Text search
    if (search) {
      conditions.push('(p.name ILIKE ? OR p.description ILIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      sqlBase += ' WHERE ' + conditions.join(' AND ');
    }

    // Determine count
    const countQuery = `SELECT COUNT(*) as count ${sqlBase}`;
    const totalCountRow = await query.get(countQuery, params);
    const totalCount = parseInt(totalCountRow.count || 0, 10);

    // Sorting
    let orderBy = ' ORDER BY p.id DESC';
    if (filter === 'trending') {
      orderBy = ' ORDER BY p.trending_score DESC, p.sales_count DESC';
    } else if (filter === 'new') {
      orderBy = ' ORDER BY p.created_at DESC';
    } else if (filter === 'bestsellers') {
      orderBy = ' ORDER BY p.sales_count DESC';
    } else if (filter === 'premium') {
      orderBy = ' ORDER BY p.price DESC';
    }

    let sql = `SELECT p.*, c.name as category_name ${sqlBase} ${orderBy}`;
    
    // Pagination
    let paginated = false;
    let pageNum = 1;
    let limitNum = 8;
    let totalPages = 1;
    
    if (page) {
      paginated = true;
      pageNum = parseInt(page) || 1;
      limitNum = parseInt(limit) || 8;
      const offset = (pageNum - 1) * limitNum;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limitNum, offset);
      totalPages = Math.ceil(totalCount / limitNum);
    }

    const products = await query.all(sql, params);
    
    const responseData = paginated ? {
      products,
      totalCount,
      totalPages,
      currentPage: pageNum,
      limit: limitNum
    } : {
      products
    };

    cache.set(cacheKey, responseData, 300000); // 5 min TTL
    res.status(200).json(responseData);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/products/view/:id ──────────────────────────────────────────────
// Public endpoint — increments view_count and recalculates trending_score
router.post('/view/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query.run(
      `UPDATE products SET view_count = view_count + 1 WHERE id = ?`,
      [id]
    );
    await updateTrendingScore(id);
    res.status(200).json({ message: 'View recorded' });
  } catch (err) {
    console.error('View track error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `product_details_${id}`;
    let product = cache.get(cacheKey);
    
    if (!product) {
      const dbProd = await query.get(`
        SELECT p.*, c.name as category_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `, [id]);

      if (!dbProd) {
        return res.status(404).json({ error: 'Product not found' });
      }
      product = dbProd;

      // 1. Fetch Availability from inventory batches
      const availabilityQuery = await query.get(`
        SELECT COALESCE(SUM(remaining_qty), 0) AS count
        FROM inventory_batches
        WHERE product_id = ? AND expiry_date >= CURRENT_DATE
      `, [id]);
      product.availability = parseInt(availabilityQuery.count || 0, 10);

      // 2. Fetch Reviews list
      const reviews = await query.all(`
        SELECT r.id, r.rating, r.review_text, r.created_at, r.updated_at, r.is_flagged,
               u.name AS customer_name,
               u.id   AS customer_id
        FROM reviews r
        JOIN users u ON r.customer_id = u.id
        WHERE r.product_id = ? AND r.is_flagged = false
        ORDER BY r.created_at DESC
      `, [id]);
      product.reviews = reviews || [];

      // 3. Fetch Rating statistics
      const stats = await query.get(`
        SELECT
           COUNT(*)                          AS review_count,
           ROUND(AVG(rating)::NUMERIC, 1)    AS avg_rating,
           COUNT(CASE WHEN rating = 5 THEN 1 END) AS five_star,
           COUNT(CASE WHEN rating = 4 THEN 1 END) AS four_star,
           COUNT(CASE WHEN rating = 3 THEN 1 END) AS three_star,
           COUNT(CASE WHEN rating = 2 THEN 1 END) AS two_star,
           COUNT(CASE WHEN rating = 1 THEN 1 END) AS one_star
         FROM reviews
         WHERE product_id = ? AND is_flagged = false
      `, [id]);

      product.rating = stats ? {
        review_count: parseInt(stats.review_count || 0, 10),
        avg_rating: stats.avg_rating ? parseFloat(stats.avg_rating) : 0,
        five_star: parseInt(stats.five_star || 0, 10),
        four_star: parseInt(stats.four_star || 0, 10),
        three_star: parseInt(stats.three_star || 0, 10),
        two_star: parseInt(stats.two_star || 0, 10),
        one_star: parseInt(stats.one_star || 0, 10),
      } : {
        review_count: 0,
        avg_rating: 0,
        five_star: 0,
        four_star: 0,
        three_star: 0,
        two_star: 0,
        one_star: 0,
      };

      cache.set(cacheKey, product, 300000); // 5 min TTL
    }

    res.status(200).json({ product });
  } catch (err) {
    console.error('Fetch product details error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/products (Admin only) ─────────────────────────────────────────
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const {
    category_id, name, description, price, image_url, weight, shelf_life_days,
    is_trending, is_featured, is_special_offer, discount_percent
  } = req.body;

  try {
    const priceNum = parseFloat(price);
    const shelfLifeNum = parseInt(shelf_life_days);
    const categoryIdNum = parseInt(category_id);
    const discountNum = parseInt(discount_percent) || 0;

    if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
      return res.status(400).json({ error: 'Valid Category ID is required' });
    }
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Product name cannot be empty' });
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    if (isNaN(shelfLifeNum) || shelfLifeNum <= 0) {
      return res.status(400).json({ error: 'Shelf life days must be a positive integer' });
    }

    const finalImageUrl = isValidUrl(image_url) ? image_url : DEFAULT_PLACEHOLDER;
    const isTrendingBool = is_trending === true || is_trending === 'true';
    const isFeaturedBool = is_featured === true || is_featured === 'true';
    const isSpecialOfferBool = is_special_offer === true || is_special_offer === 'true';

    const result = await query.run(
      `INSERT INTO products (category_id, name, description, price, image_url, weight, shelf_life_days,
        is_trending, is_featured, is_special_offer, discount_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [categoryIdNum, name, description || '', priceNum, finalImageUrl, weight || '', shelfLifeNum,
       isTrendingBool, isFeaturedBool, isSpecialOfferBool, discountNum]
    );

    // Auto-seed inventory batch
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + shelfLifeNum);
    await query.run(
      `INSERT INTO inventory_batches (product_id, batch_number, manufacture_date, expiry_date, quantity, remaining_qty)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [result.id, `BATCH-${result.id}-AUTO`, today.toISOString().split('T')[0], expiry.toISOString().split('T')[0], 50, 50]
    );

    cache.deletePattern('products_');
    cache.deletePattern('stats');
    res.status(201).json({ message: 'Product created successfully', productId: result.id });
  } catch (err) {
    console.error('[PRODUCT CREATION FAILURE]', {
      timestamp: new Date().toISOString(),
      payload: req.body,
      error_message: err.message,
      error_stack: err.stack,
      db_error_code: err.code
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/products/:id (Admin only) ──────────────────────────────────────
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    category_id, name, description, price, image_url, weight, shelf_life_days,
    is_trending, is_featured, is_special_offer, discount_percent
  } = req.body;

  try {
    const priceNum = parseFloat(price);
    const shelfLifeNum = parseInt(shelf_life_days);
    const categoryIdNum = parseInt(category_id);
    const discountNum = parseInt(discount_percent) || 0;

    if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
      return res.status(400).json({ error: 'Valid Category ID is required' });
    }
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Product name cannot be empty' });
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    if (isNaN(shelfLifeNum) || shelfLifeNum <= 0) {
      return res.status(400).json({ error: 'Shelf life days must be a positive integer' });
    }

    const product = await query.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const finalImageUrl = isValidUrl(image_url) ? image_url : DEFAULT_PLACEHOLDER;
    const isTrendingBool = is_trending === true || is_trending === 'true';
    const isFeaturedBool = is_featured === true || is_featured === 'true';
    const isSpecialOfferBool = is_special_offer === true || is_special_offer === 'true';

    await query.run(
      `UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?,
        weight = ?, shelf_life_days = ?, is_trending = ?, is_featured = ?,
        is_special_offer = ?, discount_percent = ?
       WHERE id = ?`,
      [categoryIdNum, name, description || '', priceNum, finalImageUrl, weight || '', shelfLifeNum,
       isTrendingBool, isFeaturedBool, isSpecialOfferBool, discountNum, id]
    );

    cache.deletePattern('products_');
    cache.del(`product_details_${id}`);
    cache.deletePattern('stats');
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error('[PRODUCT UPDATE FAILURE]', {
      id,
      timestamp: new Date().toISOString(),
      payload: req.body,
      error_message: err.message,
      error_stack: err.stack,
      db_error_code: err.code
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/products/:id (Admin only) ────────────────────────────────────
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await query.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await query.run('DELETE FROM products WHERE id = ?', [id]);
    cache.deletePattern('products_');
    cache.del(`product_details_${id}`);
    cache.deletePattern('stats');
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
