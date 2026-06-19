const { query } = require('./db');

async function migrate() {
  try {
    console.log('Starting migration...');

    // 1. Get orders table info
    const tableInfo = await query.all("PRAGMA table_info(orders)");
    const hasReason = tableInfo.some(col => col.name === 'cancellation_reason');

    // 2. Recreate orders table to update CHECK constraint and add cancellation_reason
    console.log('Rebuilding orders table...');
    await query.exec("ALTER TABLE orders RENAME TO orders_old");

    await query.exec(`
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        order_type TEXT CHECK(order_type IN ('one-time', 'subscription_renewal')) NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT CHECK(status IN ('pending', 'confirmed', 'dispatched', 'delivered', 'cancelled', 'processing', 'completed')) DEFAULT 'pending',
        cancellation_reason TEXT,
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    const columns = tableInfo.map(col => col.name).join(', ');
    if (hasReason) {
      await query.exec(`INSERT INTO orders (${columns}) SELECT ${columns} FROM orders_old`);
    } else {
      await query.exec(`INSERT INTO orders (${columns}, cancellation_reason) SELECT ${columns}, NULL FROM orders_old`);
    }

    await query.exec("DROP TABLE orders_old");
    console.log('orders table rebuilt successfully.');

    // 3. Recreate dispatches table to update CHECK constraint
    console.log('Rebuilding dispatches table...');
    await query.exec("ALTER TABLE dispatches RENAME TO dispatches_old");

    await query.exec(`
      CREATE TABLE dispatches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        subscription_id INTEGER,
        dispatch_status TEXT CHECK(dispatch_status IN ('pending', 'confirmed', 'dispatched', 'delivered', 'failed', 'cancelled', 'shipped')) DEFAULT 'pending',
        dispatch_date DATE,
        tracking_number TEXT,
        estimated_delivery DATE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
      )
    `);

    const dispTableInfo = await query.all("PRAGMA table_info(dispatches_old)");
    const dispCols = dispTableInfo.map(col => col.name).join(', ');
    await query.exec(`INSERT INTO dispatches (${dispCols}) SELECT ${dispCols} FROM dispatches_old`);

    await query.exec("DROP TABLE dispatches_old");
    console.log('dispatches table rebuilt successfully.');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
