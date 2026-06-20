const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

// Get recommendations and insights for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;

    // 1. Fetch user purchase history
    const userOrders = await query.all(`
      SELECT DISTINCT oi.product_id, p.name, p.category_id, c.name as category_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE o.customer_id = ?
    `, [customer_id]);

    const purchasedProductIds = userOrders.map(o => o.product_id);
    const categoriesBought = [...new Set(userOrders.map(o => o.category_name))];

    // 2. Build Recommendations
    let recommendedProducts = [];
    let reason = '';

    if (purchasedProductIds.length === 0) {
      // New user recommendations
      recommendedProducts = await query.all('SELECT * FROM products ORDER BY price DESC LIMIT 3');
      reason = 'Since you are new, here are our best-selling homemade products!';
    } else {
      // Recommendation based on category
      if (categoriesBought.includes('Podi')) {
        // Recommend Ghee
        recommendedProducts = await query.all("SELECT p.* FROM products p JOIN categories c ON p.category_id = c.id WHERE c.name = 'Ghee' LIMIT 2");
        reason = 'Spicy Podis taste best with pure ghee. Check out our homemade ghee options!';
      } else if (categoriesBought.includes('Ghee')) {
        // Recommend Applam
        recommendedProducts = await query.all("SELECT p.* FROM products p JOIN categories c ON p.category_id = c.id WHERE c.name = 'Applam' LIMIT 2");
        reason = 'Pair your ghee-soaked rice with our crispy, sun-dried traditional applams!';
      } else {
        // Default to any product they haven't bought yet
        recommendedProducts = await query.all(
          `SELECT * FROM products WHERE id NOT IN (${purchasedProductIds.join(',')}) LIMIT 2`
        );
        reason = 'Explore new tastes from our homemade kitchen!';
      }
    }

    // Fallback if no recommended products
    if (recommendedProducts.length === 0) {
      recommendedProducts = await query.all('SELECT * FROM products LIMIT 2');
      reason = 'Handcrafted fresh food items you might love!';
    }

    // 3. Generate Combo Suggestions
    const combos = [
      {
        name: 'South Indian Breakfast Combo',
        products: ['Idli Milagai Podi', 'Pure Cow Ghee', 'Traditional Pepper Applam'],
        price: 610, // 150 + 450 + 80 = 680 (10% off approx)
        discount: '10% OFF',
        desc: 'Elevate your daily breakfast with traditional lentil gunpowder, aromatic cow ghee, and crisp pepper applams.'
      },
      {
        name: 'Teatime Crunch Combo',
        products: ['Kai Murukku Pack', 'Ribbon Pakoda Pack', 'Pure Cow Ghee'],
        price: 600, // 120 + 110 + 450 = 680 (12% off approx)
        discount: '12% OFF',
        desc: 'Enjoy authentic handmade savories accompanied by pure cow ghee for healthy snacks.'
      }
    ];

    // 4. Generate Customer Insights
    const insights = [];
    if (purchasedProductIds.length > 0) {
      insights.push(`You have purchased from ${categoriesBought.join(', ')} categories. Your most-visited category is "${categoriesBought[0] || 'Podi'}".`);
      
      const activeSubs = await query.get("SELECT COUNT(*) as count FROM subscriptions WHERE customer_id = ? AND status = 'active'", [customer_id]);
      if (activeSubs.count > 0) {
        insights.push(`With ${activeSubs.count} active subscription(s), you save an estimated 15% on shipping and automated dispatch processing compared to one-time orders!`);
      } else {
        insights.push('Choose a subscription on your favorite Podi or Ghee to unlock free deliveries and automate your weekly/monthly needs!');
      }
    } else {
      insights.push('Welcome to Sharadha! Subscribe to recurring deliveries (Weekly/Monthly) to enjoy up to 15% discount on homemade foods.');
    }

    // 5. Generate Renewal Reminder Message
    let reminderMessage = 'Hi there! We are preparing your fresh batch of homemade food. Keep your address updated for a smooth delivery! - Team Sharadha.';
    if (purchasedProductIds.length > 0) {
      const activeSub = await query.get(
        "SELECT s.*, p.name as product_name FROM subscriptions s JOIN products p ON s.product_id = p.id WHERE s.customer_id = ? AND s.status = 'active' LIMIT 1",
        [customer_id]
      );
      if (activeSub) {
        reminderMessage = `Hi ${req.user.name}, your fresh-batch "${activeSub.product_name}" subscription is scheduled for dispatch on ${activeSub.next_dispatch_date}. Let us know if you'd like to pause or change delivery frequency! - Sharadha Food Hub.`;
      }
    }

    res.status(200).json({
      recommendations: recommendedProducts,
      reason,
      combos,
      insights,
      reminderMessage
    });

  } catch (err) {
    console.error('Fetch recommendations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
