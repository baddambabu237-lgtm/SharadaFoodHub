require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('./db');

async function migrate() {
  try {
    console.log('Running PostgreSQL password fields schema migration...');

    // Alter users table
    console.log('Altering users table...');
    await query.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code TEXT");
    await query.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP");

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
