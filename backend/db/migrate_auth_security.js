const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('./db');

(async () => {
  console.log('=== Sharadha Auth Security Migration ===');
  try {
    // Add security fields to users
    await query.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0');
    await query.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP DEFAULT NULL');
    console.log('✅ users table updated with failed_attempts and locked_until columns');
    console.log('=== Migration complete ===');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
})();
