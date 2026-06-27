require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('./db');

(async () => {
  console.log('=== Sharadha Performance Indexes Migration ===');
  try {
    // 1. Indexes for Products
    console.log('Creating indexes for products...');
    await query.run('CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_products_trending ON products(is_trending, trending_score DESC)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_products_sales ON products(sales_count DESC)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_products_special_offer ON products(is_special_offer)');

    // 2. Indexes for Orders
    console.log('Creating indexes for orders...');
    await query.run('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');

    // 3. Indexes for Users (role check)
    console.log('Creating indexes for users...');
    await query.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');

    // 4. Indexes for Subscriptions
    console.log('Creating indexes for subscriptions...');
    await query.run('CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON subscriptions(product_id)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_subscriptions_next_dispatch ON subscriptions(next_dispatch_date)');

    // 5. Indexes for Order Items
    console.log('Creating indexes for order items...');
    await query.run('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)');

    // 6. Indexes for Dispatches
    console.log('Creating indexes for dispatches...');
    await query.run('CREATE INDEX IF NOT EXISTS idx_dispatches_order_id ON dispatches(order_id)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_dispatches_subscription_id ON dispatches(subscription_id)');
    await query.run('CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(dispatch_status)');

    console.log('✅ All performance indexes created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
})();
