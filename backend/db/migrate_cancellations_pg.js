require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('./db');

async function migrate() {
  try {
    console.log('Running PostgreSQL cancellation schema migration...');

    // 1. Alter subscriptions table
    console.log('Altering subscriptions table...');
    await query.exec("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT");
    await query.exec("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP");
    await query.exec("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_by TEXT");
    await query.exec("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS previous_status TEXT");

    // 2. Alter orders table
    console.log('Altering orders table...');
    await query.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP");
    await query.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT");
    await query.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS previous_status TEXT");

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
