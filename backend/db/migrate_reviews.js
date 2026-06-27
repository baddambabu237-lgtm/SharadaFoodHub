require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('./db');

(async () => {
  console.log('=== Sharadha Reviews Migration ===');
  try {
    // Create reviews table
    await query.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id          SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        review_text TEXT DEFAULT '',
        is_flagged  BOOLEAN DEFAULT false,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (customer_id, product_id)
      )
    `);
    console.log('✅ reviews table created/verified');

    // Seed some demo reviews (only if table is empty)
    const existing = await query.get('SELECT COUNT(*) AS count FROM reviews');
    if (parseInt(existing.count) === 0) {
      const customers = await query.all("SELECT id FROM users WHERE role = 'customer' LIMIT 3");
      const products  = await query.all('SELECT id FROM products ORDER BY id LIMIT 5');

      const demoReviews = [
        { cIdx: 0, pIdx: 0, rating: 5, text: 'Absolutely love the Idli Podi! Perfect spice level and the aroma is exactly like homemade. Will order again!' },
        { cIdx: 0, pIdx: 1, rating: 4, text: 'The Mango Pickle is tangy and delicious. Packaging is secure. Just wish the quantity was a bit more.' },
        { cIdx: 1, pIdx: 2, rating: 5, text: 'Pure Cow Ghee is absolutely authentic. The fragrance is amazing and it enhances every dish.' },
        { cIdx: 1, pIdx: 0, rating: 4, text: 'Good quality Podi. Tastes fresh and natural. Delivery was quick.' },
        { cIdx: 0, pIdx: 3, rating: 3, text: 'Applam is okay. Could be crispier. The flavour is decent though.' },
        { cIdx: 1, pIdx: 4, rating: 5, text: 'The Kai Murukku is crispy and not too oily. Family loved it!' },
      ];

      for (const demo of demoReviews) {
        const cust = customers[demo.cIdx];
        const prod = products[demo.pIdx];
        if (!cust || !prod) continue;

        // Only insert if this customer has a delivered order containing this product
        // (For demo purposes we relax this check in migration)
        try {
          await query.run(
            'INSERT INTO reviews (customer_id, product_id, rating, review_text) VALUES (?, ?, ?, ?)',
            [cust.id, prod.id, demo.rating, demo.text]
          );
        } catch (e) {
          // Skip duplicates
        }
      }
      console.log('✅ Demo reviews seeded');
    } else {
      console.log('ℹ️  Reviews table already has data, skipping seed');
    }

    console.log('=== Migration complete ===');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
})();
