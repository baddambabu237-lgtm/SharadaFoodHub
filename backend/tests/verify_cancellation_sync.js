require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../db/db');

async function runTest() {
  console.log('--- STARTING CANCELLATION SYNC BACKEND VERIFICATION ---');

  try {
    // 1. Fetch a user and product for test data creation
    const user = await query.get("SELECT id FROM users WHERE role = 'customer' LIMIT 1");
    if (!user) {
      console.error('❌ Error: No customer user found in database.');
      process.exit(1);
    }
    const product = await query.get("SELECT id FROM products LIMIT 1");
    if (!product) {
      console.error('❌ Error: No product found in database.');
      process.exit(1);
    }

    console.log(`Using Customer User ID: ${user.id}, Product ID: ${product.id}`);

    // 2. Create and Cancel an Order
    console.log('Creating a test order...');
    const orderRes = await query.run(
      "INSERT INTO orders (customer_id, order_type, total_amount, status) VALUES (?, 'one-time', 150.00, 'pending')",
      [user.id]
    );
    const orderId = orderRes.id;
    console.log(`Created Order ID: ${orderId}`);

    // Insert order items for the order (necessary for products cancelled stats)
    await query.run(
      "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, 2, 75.00)",
      [orderId, product.id]
    );

    console.log('Cancelling the test order with reason "Ordered by mistake"...');
    // Simulate cancellation
    const cancelReason = 'Ordered by mistake';
    await query.run(
      "UPDATE orders SET status = 'cancelled', cancellation_reason = ?, cancelled_at = NOW(), cancelled_by = 'customer', previous_status = 'pending' WHERE id = ?",
      [cancelReason, orderId]
    );

    // Verify order cancellations fields stored
    const cancelledOrder = await query.get("SELECT * FROM orders WHERE id = ?", [orderId]);
    console.log('Cancelled Order details:', {
      id: cancelledOrder.id,
      status: cancelledOrder.status,
      reason: cancelledOrder.cancellation_reason,
      cancelled_at: cancelledOrder.cancelled_at,
      cancelled_by: cancelledOrder.cancelled_by,
      previous_status: cancelledOrder.previous_status
    });

    if (
      cancelledOrder.status === 'cancelled' &&
      cancelledOrder.cancellation_reason === cancelReason &&
      cancelledOrder.cancelled_at &&
      cancelledOrder.cancelled_by === 'customer' &&
      cancelledOrder.previous_status === 'pending'
    ) {
      console.log('✅ Success: Order cancellation details stored correctly in DB.');
    } else {
      console.error('❌ Error: Order cancellation details not stored correctly.');
      process.exit(1);
    }

    // 3. Create and Cancel a Subscription
    console.log('Creating a test subscription...');
    const subRes = await query.run(
      "INSERT INTO subscriptions (customer_id, product_id, delivery_frequency, status, start_date, next_dispatch_date) VALUES (?, ?, 'weekly', 'active', CURRENT_DATE, CURRENT_DATE)",
      [user.id, product.id]
    );
    const subId = subRes.id;
    console.log(`Created Subscription ID: ${subId}`);

    console.log('Cancelling the test subscription with reason "Too expensive"...');
    const subCancelReason = 'Too expensive';
    await query.run(
      "UPDATE subscriptions SET status = 'cancelled', cancellation_reason = ?, cancelled_at = NOW(), cancelled_by = 'customer', previous_status = 'active' WHERE id = ?",
      [subCancelReason, subId]
    );

    // Verify subscription cancellation fields stored
    const cancelledSub = await query.get("SELECT * FROM subscriptions WHERE id = ?", [subId]);
    console.log('Cancelled Subscription details:', {
      id: cancelledSub.id,
      status: cancelledSub.status,
      reason: cancelledSub.cancellation_reason,
      cancelled_at: cancelledSub.cancelled_at,
      cancelled_by: cancelledSub.cancelled_by,
      previous_status: cancelledSub.previous_status
    });

    if (
      cancelledSub.status === 'cancelled' &&
      cancelledSub.cancellation_reason === subCancelReason &&
      cancelledSub.cancelled_at &&
      cancelledSub.cancelled_by === 'customer' &&
      cancelledSub.previous_status === 'active'
    ) {
      console.log('✅ Success: Subscription cancellation details stored correctly in DB.');
    } else {
      console.error('❌ Error: Subscription cancellation details not stored correctly.');
      process.exit(1);
    }

    // 4. Test statistics queries and calculations
    console.log('Testing analytics/stats query logic...');
    
    // Test the top reasons query
    const reasonsQuery = `
      SELECT cancellation_reason as reason, COUNT(*) as count
      FROM (
        SELECT cancellation_reason FROM orders WHERE status = 'cancelled' AND cancellation_reason IS NOT NULL
        UNION ALL
        SELECT cancellation_reason FROM subscriptions WHERE status = 'cancelled' AND cancellation_reason IS NOT NULL
      ) combined
      GROUP BY cancellation_reason
    `;
    const reasons = await query.all(reasonsQuery);
    console.log('Cancellation reasons breakdown:', reasons);
    
    // Test most cancelled products query
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
    `;
    const products = await query.all(productsQuery);
    console.log('Most cancelled products:', products);

    // Test cancelled-activities query
    const sqlActivities = `
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
    const activities = await query.all(sqlActivities);
    console.log(`Cancelled activities returned ${activities.length} records.`);
    
    // Verify our test records exist in the activities result
    const foundOrderAct = activities.find(a => a.type === 'order' && a.order_id === orderId);
    const foundSubAct = activities.find(a => a.type === 'subscription' && a.subscription_id === subId);
    
    if (foundOrderAct && foundSubAct) {
      console.log('✅ Success: Both cancelled activities returned in unified log query.');
    } else {
      console.error('❌ Error: Unified activity log query is missing test records.');
      process.exit(1);
    }

    // Clean up test database records
    console.log('Cleaning up test data...');
    await query.run("DELETE FROM order_items WHERE order_id = ?", [orderId]);
    await query.run("DELETE FROM orders WHERE id = ?", [orderId]);
    await query.run("DELETE FROM subscriptions WHERE id = ?", [subId]);
    console.log('Cleanup completed.');

    console.log('--- CANCELLATION SYNC BACKEND VERIFICATION PASSED ---');
    process.exit(0);

  } catch (err) {
    console.error('❌ Verification script encountered an error:', err);
    process.exit(1);
  }
}

runTest();
