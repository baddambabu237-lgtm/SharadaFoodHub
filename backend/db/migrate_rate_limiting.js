require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('./db');

async function migrate() {
  console.log('--- STARTING RATE LIMITING DATABASE MIGRATION ---');
  try {
    // Add otp_requested_at column to users table
    console.log('Adding otp_requested_at column to PostgreSQL users table...');
    await query.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_requested_at TIMESTAMP');
    console.log('✅ Success: Database migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during database migration:', err);
    process.exit(1);
  }
}

migrate();
