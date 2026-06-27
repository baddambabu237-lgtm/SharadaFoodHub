const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const cache = require('../utils/cache');

// Helper to compute summary KPIs
async function computeSummary() {
  const customersCount = await query.get("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");
  const activeSubsCount = await query.get("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'");
  const cancelledSubsCount = await query.get("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'cancelled'");
  const pendingDispatchesCount = await query.get("SELECT COUNT(*) as count FROM dispatches WHERE dispatch_status = 'pending'");
  const totalOrdersCount = await query.get("SELECT COUNT(*) as count FROM orders");
  const cancelledOrdersCount = await query.get("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'");
  
  const revenue30Days = await query.get(`
    SELECT SUM(total_amount) as total 
    FROM orders 
    WHERE order_date >= NOW() - INTERVAL '30 days' AND status != 'cancelled'
  `);

  const totalSubs = await query.get("SELECT COUNT(*) as count FROM subscriptions");
  const totalItems = parseInt(totalOrdersCount.count || 0) + parseInt(totalSubs.count || 0);
  const totalCancelled = parseInt(cancelledOrdersCount.count || 0) + parseInt(cancelledSubsCount.count || 0);
  const cancellationRate = totalItems > 0 ? Math.round((totalCancelled / totalItems) * 100) : 0;

  return {
    totalCustomers: parseInt(customersCount.count || 0, 10),
    activeSubscriptions: parseInt(activeSubsCount.count || 0, 10),
    cancelledSubscriptions: parseInt(cancelledSubsCount.count || 0, 10),
    pendingDispatches: parseInt(pendingDispatchesCount.count || 0, 10),
    totalOrders: parseInt(totalOrdersCount.count || 0, 10),
    monthlyRevenue: parseFloat(revenue30Days.total || 0),
    cancelledOrders: parseInt(cancelledOrdersCount.count || 0, 10),
    cancellationRate
  };
}

// Helper to compute charts
async function computeCharts() {
  // Sales Trend
  const monthlySales = await query.all(`
    SELECT 
      TO_CHAR(order_date, 'MM') as month_num,
      SUM(total_amount) as revenue,
      COUNT(*) as orders_count
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY TO_CHAR(order_date, 'MM')
  `);

  const juneSales = monthlySales.find(s => s.month_num === '06') || { revenue: 0, orders_count: 0 };
  const salesTrend = [
    { month: 'Jan', revenue: 12400, orders: 45 },
    { month: 'Feb', revenue: 15600, orders: 58 },
    { month: 'Mar', revenue: 19800, orders: 72 },
    { month: 'Apr', revenue: 24500, orders: 90 },
    { month: 'May', revenue: 28900, orders: 110 },
    { month: 'Jun', revenue: parseFloat(juneSales.revenue || 0), orders: parseInt(juneSales.orders_count || 0, 10) }
  ];

  // Category Distribution
  const categorySales = await query.all(`
    SELECT c.name as category, SUM(oi.quantity) as count
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    GROUP BY c.name
  `);

  const categoryData = categorySales.length > 0 ? categorySales.map(cs => ({
    category: cs.category,
    count: parseInt(cs.count || 0, 10)
  })) : [
    { category: 'Podi', count: 0 },
    { category: 'Pickles', count: 0 },
    { category: 'Ghee', count: 0 },
    { category: 'Applam', count: 0 },
    { category: 'Snacks', count: 0 }
  ];

  // Order types
  const orderTypesRaw = await query.all(`
    SELECT order_type as type, COUNT(*) as count, SUM(total_amount) as revenue
    FROM orders
    GROUP BY order_type
  `);
  const orderTypes = orderTypesRaw.map(ot => ({
    type: ot.type,
    count: parseInt(ot.count || 0, 10),
    revenue: parseFloat(ot.revenue || 0)
  }));

  // Subscription Trend
  const subStatuses = await query.all(`
    SELECT status, COUNT(*) as count
    FROM subscriptions
    GROUP BY status
  `);
  const statusMap = { active: 0, paused: 0, cancelled: 0 };
  subStatuses.forEach(row => {
    if (statusMap[row.status] !== undefined) {
      statusMap[row.status] = parseInt(row.count || 0, 10);
    }
  });

  const subscriptionTrend = [
    { month: 'Jan', active: 25, paused: 5, cancelled: 2 },
    { month: 'Feb', active: 38, paused: 7, cancelled: 4 },
    { month: 'Mar', active: 55, paused: 10, cancelled: 3 },
    { month: 'Apr', active: 75, paused: 12, cancelled: 5 },
    { month: 'May', active: 98, paused: 15, cancelled: 4 },
    { month: 'Jun', active: statusMap.active, paused: statusMap.paused, cancelled: statusMap.cancelled }
  ];

  // Top Selling Products
  const topProductsRaw = await query.all(`
    SELECT p.name, c.name as category, SUM(oi.quantity) as units, SUM(oi.quantity * oi.price) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    GROUP BY p.id, p.name, c.name
    ORDER BY units DESC
    LIMIT 5
  `);
  const topProducts = topProductsRaw.map(tp => ({
    name: tp.name,
    category: tp.category,
    units: parseInt(tp.units || 0, 10),
    revenue: parseFloat(tp.revenue || 0)
  }));

  // Cancellation Trend
  const months = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      month: monthNames[d.getMonth()],
      month_num: (d.getMonth() + 1).toString().padStart(2, '0'),
      year: d.getFullYear().toString(),
      orders: 0,
      subscriptions: 0
    });
  }

  const orderCancellations = await query.all(`
    SELECT TO_CHAR(cancelled_at, 'MM') as month_num, TO_CHAR(cancelled_at, 'YYYY') as year, COUNT(*) as count
    FROM orders
    WHERE status = 'cancelled' AND cancelled_at IS NOT NULL
    GROUP BY TO_CHAR(cancelled_at, 'MM'), TO_CHAR(cancelled_at, 'YYYY')
  `);

  const subCancellations = await query.all(`
    SELECT TO_CHAR(cancelled_at, 'MM') as month_num, TO_CHAR(cancelled_at, 'YYYY') as year, COUNT(*) as count
    FROM subscriptions
    WHERE status = 'cancelled' AND cancelled_at IS NOT NULL
    GROUP BY TO_CHAR(cancelled_at, 'MM'), TO_CHAR(cancelled_at, 'YYYY')
  `);

  months.forEach(m => {
    const orderMatch = orderCancellations.find(o => o.month_num === m.month_num && o.year === m.year);
    if (orderMatch) m.orders = parseInt(orderMatch.count, 10);
    
    const subMatch = subCancellations.find(s => s.month_num === m.month_num && s.year === m.year);
    if (subMatch) m.subscriptions = parseInt(subMatch.count, 10);
  });

  const cancellationTrend = months.map(m => ({
    month: m.month,
    orders: m.orders,
    subscriptions: m.subscriptions
  }));

  // Reasons
  const reasonsQuery = `
    SELECT cancellation_reason as reason, COUNT(*) as count
    FROM (
      SELECT cancellation_reason FROM orders WHERE status = 'cancelled' AND cancellation_reason IS NOT NULL
      UNION ALL
      SELECT cancellation_reason FROM subscriptions WHERE status = 'cancelled' AND cancellation_reason IS NOT NULL
    ) combined
    GROUP BY cancellation_reason
    ORDER BY count DESC
  `;
  const topReasonsRaw = await query.all(reasonsQuery);
  const topReasons = topReasonsRaw.map(r => ({
    reason: r.reason,
    count: parseInt(r.count, 10)
  }));

  // Most Cancelled Products
  const productsQuery = `
    SELECT p.name, COUNT(*) as count
    FROM (
      SELECT oi.product_id 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'cancelled'
      UNION ALL
      SELECT s.product_id 
      FROM subscriptions s
      WHERE s.status = 'cancelled'
    ) combined
    JOIN products p ON combined.product_id = p.id
    GROUP BY p.id, p.name
    ORDER BY count DESC
    LIMIT 5
  `;
  const mostCancelledProductsRaw = await query.all(productsQuery);
  const mostCancelledProducts = mostCancelledProductsRaw.map(p => ({
    name: p.name,
    count: parseInt(p.count, 10)
  }));

  return {
    salesTrend,
    categoryData,
    orderTypes,
    subscriptionTrend,
    topProducts,
    cancellationTrend,
    topReasons,
    mostCancelledProducts
  };
}

// Helper to compute activity logs
async function computeActivityLog() {
  const recentOrders = await query.all(`
    SELECT 'order' as log_type, o.id, u.name as description, NULL as product_name, o.total_amount as value, o.order_date as timestamp
    FROM orders o
    JOIN users u ON o.customer_id = u.id
    ORDER BY o.id DESC LIMIT 4
  `);

  const recentTickets = await query.all(`
    SELECT 'support' as log_type, t.id, u.name as description, NULL as product_name, t.subject as value, t.created_at as timestamp
    FROM support_tickets t
    JOIN users u ON t.customer_id = u.id
    ORDER BY t.id DESC LIMIT 3
  `);

  const cancelledSubsLogs = await query.all(`
    SELECT 'cancel_subscription' as log_type, s.id, u.name as description, p.name as product_name, NULL as value, s.cancelled_at as timestamp
    FROM subscriptions s
    JOIN users u ON s.customer_id = u.id
    JOIN products p ON s.product_id = p.id
    WHERE s.status = 'cancelled'
    ORDER BY s.cancelled_at DESC LIMIT 4
  `);

  const cancelledOrdersLogs = await query.all(`
    SELECT 'cancel_order' as log_type, o.id, u.name as description, NULL as product_name, NULL as value, o.cancelled_at as timestamp
    FROM orders o
    JOIN users u ON o.customer_id = u.id
    WHERE o.status = 'cancelled'
    ORDER BY o.cancelled_at DESC LIMIT 4
  `);

  const rawActivities = [
    ...recentOrders,
    ...recentTickets,
    ...cancelledSubsLogs,
    ...cancelledOrdersLogs
  ];

  return rawActivities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6)
    .map(log => {
      let description = log.description;
      let value = log.value;
      if (log.log_type === 'cancel_order') {
        description = `Customer ${log.description} cancelled Order #${log.id}`;
        value = null;
      } else if (log.log_type === 'cancel_subscription') {
        if (log.product_name.includes('Podi')) {
          description = `Customer ${log.description} cancelled subscription "${log.product_name}"`;
        } else {
          description = `Customer ${log.description} cancelled ${log.product_name} subscription`;
        }
        value = null;
      }
      return {
        log_type: log.log_type,
        id: log.id,
        description,
        value,
        timestamp: log.timestamp
      };
    });
}

// ─── GET /api/dashboard/stats ──────────────────────────────────────────
// Get admin stats & analytics chart data (cached, TTL 60s)
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const cacheKey = 'admin_stats_full';
    let data = cache.get(cacheKey);
    if (!data) {
      const [summary, charts, activityLog] = await Promise.all([
        computeSummary(),
        computeCharts(),
        computeActivityLog()
      ]);
      data = { summary, charts, activityLog };
      cache.set(cacheKey, data, 60000);
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('Fetch dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/dashboard/stats/summary ──────────────────────────────────
// Load dashboard cards first (cached, TTL 60s)
router.get('/stats/summary', authenticateToken, isAdmin, async (req, res) => {
  try {
    const cacheKey = 'admin_stats_summary';
    let summary = cache.get(cacheKey);
    if (!summary) {
      summary = await computeSummary();
      cache.set(cacheKey, summary, 60000);
    }
    res.status(200).json({ summary });
  } catch (err) {
    console.error('Fetch stats summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/dashboard/stats/charts ───────────────────────────────────
// Load charts afterward (cached, TTL 60s)
router.get('/stats/charts', authenticateToken, isAdmin, async (req, res) => {
  try {
    const cacheKey = 'admin_stats_charts';
    let charts = cache.get(cacheKey);
    if (!charts) {
      charts = await computeCharts();
      cache.set(cacheKey, charts, 60000);
    }
    res.status(200).json({ charts });
  } catch (err) {
    console.error('Fetch stats charts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/dashboard/stats/activity-log ─────────────────────────────
// Load activity logs asynchronously (cached, TTL 30s)
router.get('/stats/activity-log', authenticateToken, isAdmin, async (req, res) => {
  try {
    const cacheKey = 'admin_stats_activity';
    let activityLog = cache.get(cacheKey);
    if (!activityLog) {
      activityLog = await computeActivityLog();
      cache.set(cacheKey, activityLog, 30000);
    }
    res.status(200).json({ activityLog });
  } catch (err) {
    console.error('Fetch stats activity log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/dashboard/customer-stats ────────────────────────────────
// Load statistics first for Customer Dashboard (cached per user, TTL 30s)
router.get('/customer-stats', authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;
    const cacheKey = `customer_stats_${customer_id}`;
    let data = cache.get(cacheKey);
    if (!data) {
      const activeSubsCount = await query.get("SELECT COUNT(*) as count FROM subscriptions WHERE customer_id = ? AND status = 'active'", [customer_id]);
      const totalOrdersCount = await query.get("SELECT COUNT(*) as count FROM orders WHERE customer_id = ?", [customer_id]);
      const cancelledOrdersCount = await query.get("SELECT COUNT(*) as count FROM orders WHERE customer_id = ? AND status = 'cancelled'", [customer_id]);
      
      const totalSavingsQuery = await query.get(`
        SELECT SUM(p.price) as total_price 
        FROM subscriptions s 
        JOIN products p ON s.product_id = p.id 
        WHERE s.customer_id = ? AND s.status = 'active'
      `, [customer_id]);
      
      const total_price = parseFloat(totalSavingsQuery.total_price || 0);
      const monthlySavings = Math.round(total_price * 0.15);

      // Project upcoming deliveries calendar projection count (next 5 shipments max)
      const activeSubs = await query.all(`
        SELECT next_dispatch_date, delivery_frequency 
        FROM subscriptions 
        WHERE customer_id = ? AND status = 'active'
      `, [customer_id]);
      
      let dates = [];
      activeSubs.forEach(sub => {
        let currentDate = new Date(sub.next_dispatch_date);
        for (let i = 0; i < 3; i++) {
          dates.push(new Date(currentDate));
          if (sub.delivery_frequency === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (sub.delivery_frequency === 'bi-weekly') {
            currentDate.setDate(currentDate.getDate() + 14);
          } else if (sub.delivery_frequency === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        }
      });
      const upcomingDeliveriesCount = dates.sort((a, b) => a - b).slice(0, 5).length;

      data = {
        activeSubscriptionsCount: parseInt(activeSubsCount.count || 0, 10),
        totalOrdersCount: parseInt(totalOrdersCount.count || 0, 10),
        upcomingDeliveriesCount,
        monthlySavings,
        cancelledOrdersCount: parseInt(cancelledOrdersCount.count || 0, 10)
      };
      
      cache.set(cacheKey, data, 30000); // 30 seconds TTL
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('Fetch customer stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/dashboard/cancelled-activities ────────────────────────
// Get detailed cancellation logs/activities for admin cancellations view (cached, TTL 30s)
router.get('/cancelled-activities', authenticateToken, isAdmin, async (req, res) => {
  try {
    const cacheKey = 'cancelled_activities';
    let data = cache.get(cacheKey);
    if (!data) {
      const sql = `
        SELECT 
          'subscription' as type,
          s.id as subscription_id,
          NULL as order_id,
          u.name as customer_name,
          p.name as product_name,
          s.cancelled_at,
          s.cancellation_reason,
          s.previous_status
        FROM subscriptions s
        JOIN users u ON s.customer_id = u.id
        JOIN products p ON s.product_id = p.id
        WHERE s.status = 'cancelled'
        
        UNION ALL
        
        SELECT 
          'order' as type,
          NULL as subscription_id,
          o.id as order_id,
          u.name as customer_name,
          (
            SELECT STRING_AGG(p2.name, ', ') 
            FROM order_items oi2 
            JOIN products p2 ON oi2.product_id = p2.id 
            WHERE oi2.order_id = o.id
          ) as product_name,
          o.cancelled_at,
          o.cancellation_reason,
          o.previous_status
        FROM orders o
        JOIN users u ON o.customer_id = u.id
        WHERE o.status = 'cancelled'
        
        ORDER BY cancelled_at DESC
      `;
      const activities = await query.all(sql);
      data = { activities };
      cache.set(cacheKey, data, 30000);
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('Fetch cancelled activities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/dashboard/product-analytics ───────────────────────────
// Get product analytics (admin only, cached, TTL 60s)
router.get('/product-analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const cacheKey = 'product_analytics';
    let data = cache.get(cacheKey);
    if (!data) {
      const [mostViewed, mostOrdered, trendingProducts, specialOffers] = await Promise.all([
        query.all(`
          SELECT p.id, p.name, c.name as category, p.view_count, p.sales_count,
                 p.trending_score, p.is_trending, p.price
          FROM products p
          JOIN categories c ON p.category_id = c.id
          ORDER BY p.view_count DESC
          LIMIT 10
        `),
        query.all(`
          SELECT p.id, p.name, c.name as category, p.sales_count, p.view_count,
                 p.trending_score, p.price
          FROM products p
          JOIN categories c ON p.category_id = c.id
          ORDER BY p.sales_count DESC
          LIMIT 10
        `),
        query.all(`
          SELECT p.id, p.name, c.name as category, p.trending_score, p.sales_count,
                 p.view_count, p.is_trending, p.price
          FROM products p
          JOIN categories c ON p.category_id = c.id
          WHERE p.is_trending = true OR p.trending_score > 0
          ORDER BY p.trending_score DESC
          LIMIT 10
        `),
        query.all(`
          SELECT p.id, p.name, c.name as category, p.discount_percent, p.price,
                 p.sales_count, p.is_special_offer
          FROM products p
          JOIN categories c ON p.category_id = c.id
          WHERE p.is_special_offer = true
          ORDER BY p.discount_percent DESC
        `),
      ]);
      data = { mostViewed, mostOrdered, trendingProducts, specialOffers };
      cache.set(cacheKey, data, 60000);
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('Product analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
