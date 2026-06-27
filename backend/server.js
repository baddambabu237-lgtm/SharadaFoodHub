require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const subscriptionRoutes = require('./routes/subscriptions');
const orderRoutes = require('./routes/orders');
const dispatchRoutes = require('./routes/dispatches');
const inventoryRoutes = require('./routes/inventory');
const supportRoutes = require('./routes/support');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const reviewsRoutes = require('./routes/reviews');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(compression());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/recommendations', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', analyticsRoutes);
app.use('/api/reviews', reviewsRoutes);

// Static directory for file assets (if any)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[API ERROR] ${req.method} ${req.url} | Body: ${JSON.stringify(req.body)} | Query: ${JSON.stringify(req.query)} | Error:`, err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`Sharadha Subscription Backend Server running on port ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`========================================================`);
  
  // Database connectivity validation check
  const { query } = require('./db/db');
  query.get("SELECT 1 AS connection_test")
    .then(() => console.log("✅ Database connectivity check passed successfully."))
    .catch(dbErr => console.error("❌ Database connectivity check failed at startup:", dbErr));
});
