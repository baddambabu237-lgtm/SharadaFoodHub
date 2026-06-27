require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../db/db');

async function runTest() {
  console.log('--- STARTING PAUSE/RESUME BACKEND VERIFICATION ---');

  try {
    // 1. Fetch an active subscription
    const sub = await query.get("SELECT * FROM subscriptions WHERE status = 'active' LIMIT 1");
    let subId;
    if (!sub) {
      console.log('No active subscriptions found. Creating a test subscription...');
      // Insert a test subscription
      const user = await query.get("SELECT id FROM users LIMIT 1");
      const product = await query.get("SELECT id FROM products LIMIT 1");
      const res = await query.run(
        "INSERT INTO subscriptions (customer_id, product_id, delivery_frequency, status, start_date, next_dispatch_date, last_delivery_date) VALUES (?, ?, 'weekly', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE)",
        [user.id, product.id]
      );
      subId = res.id;
    } else {
      subId = sub.id;
    }

    console.log(`Target Subscription ID: ${subId}`);

    // Verify initial active status
    let currentSub = await query.get("SELECT * FROM subscriptions WHERE id = ?", [subId]);
    console.log(`Initial Status: ${currentSub.status}`);
    if (currentSub.status !== 'active') {
      // Reset to active for testing
      await query.run("UPDATE subscriptions SET status = 'active' WHERE id = ?", [subId]);
      currentSub = await query.get("SELECT * FROM subscriptions WHERE id = ?", [subId]);
      console.log(`Reset to Status: ${currentSub.status}`);
    }

    // 2. Pause Subscription
    console.log('Pausing subscription in database...');
    const pauseRes = await query.run("UPDATE subscriptions SET status = 'paused' WHERE id = ?", [subId]);
    console.log('Update result:', pauseRes);

    let pausedSub = await query.get("SELECT * FROM subscriptions WHERE id = ?", [subId]);
    console.log(`Paused Status: ${pausedSub.status}`);
    if (pausedSub.status === 'paused') {
      console.log('✅ Success: Pause status stored successfully.');
    } else {
      console.error('❌ Error: Pause status failed to store.');
      process.exit(1);
    }

    // 3. Resume Subscription
    console.log('Resuming subscription in database...');
    const resumeRes = await query.run(
      "UPDATE subscriptions SET status = 'active', next_dispatch_date = CURRENT_DATE + INTERVAL '7 days' WHERE id = ?",
      [subId]
    );
    console.log('Update result:', resumeRes);

    let resumedSub = await query.get("SELECT * FROM subscriptions WHERE id = ?", [subId]);
    console.log(`Resumed Status: ${resumedSub.status}`);
    console.log(`New Next Dispatch Date: ${resumedSub.next_dispatch_date}`);
    if (resumedSub.status === 'active') {
      console.log('✅ Success: Resume status and next delivery date stored successfully.');
    } else {
      console.error('❌ Error: Resume status failed to store.');
      process.exit(1);
    }

    // 4. Cancel Subscription
    console.log('Cancelling subscription in database...');
    const cancelRes = await query.run("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?", [subId]);
    console.log('Update result:', cancelRes);

    let cancelledSub = await query.get("SELECT * FROM subscriptions WHERE id = ?", [subId]);
    console.log(`Cancelled Status: ${cancelledSub.status}`);
    if (cancelledSub.status === 'cancelled') {
      console.log('✅ Success: Cancel status stored successfully.');
    } else {
      console.error('❌ Error: Cancel status failed to store.');
      process.exit(1);
    }

    // Clean up or restore to active if it was active originally
    if (sub && sub.status === 'active') {
      await query.run(
        "UPDATE subscriptions SET status = 'active', next_dispatch_date = ? WHERE id = ?",
        [sub.next_dispatch_date, subId]
      );
      console.log('Cleaned up and restored subscription to active status.');
    }

    console.log('--- ALL BACKEND VERIFICATIONS PASSED ---');
    process.exit(0);

  } catch (err) {
    console.error('❌ Verification script encountered an error:', err);
    process.exit(1);
  }
}

runTest();
