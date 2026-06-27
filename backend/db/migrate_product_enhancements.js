require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('./db');

async function migrate() {
  console.log('========================================================');
  console.log('Running Product Enhancements Migration...');
  console.log('========================================================');

  const alterations = [
    { col: 'is_trending',      sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false" },
    { col: 'is_featured',      sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false" },
    { col: 'is_special_offer', sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_special_offer BOOLEAN DEFAULT false" },
    { col: 'discount_percent', sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0" },
    { col: 'sales_count',      sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0" },
    { col: 'view_count',       sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0" },
    { col: 'trending_score',   sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS trending_score NUMERIC DEFAULT 0" },
  ];

  for (const alt of alterations) {
    try {
      await query.exec(alt.sql);
      console.log(`  ✅ Column "${alt.col}" ensured.`);
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        console.log(`  ⚠️  Column "${alt.col}" already exists. Skipping.`);
      } else {
        console.error(`  ❌ Failed to add column "${alt.col}":`, err.message);
        throw err;
      }
    }
  }

  // Backfill sales_count from order_items for existing products
  console.log('\nBackfilling sales_count from existing order_items...');
  try {
    await query.exec(`
      UPDATE products p
      SET sales_count = COALESCE((
        SELECT SUM(oi.quantity)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = p.id AND o.status != 'cancelled'
      ), 0)
    `);
    console.log('  ✅ sales_count backfilled from order history.');
  } catch (err) {
    console.error('  ❌ sales_count backfill failed:', err.message);
    throw err;
  }

  // Recalculate trending_score: (sales_count * 0.6) + (view_count * 0.4)
  console.log('\nCalculating initial trending_score values...');
  try {
    await query.exec(`
      UPDATE products
      SET trending_score = ROUND((sales_count * 0.6 + view_count * 0.4)::NUMERIC, 2)
    `);
    console.log('  ✅ trending_score calculated for all products.');
  } catch (err) {
    console.error('  ❌ trending_score calculation failed:', err.message);
    throw err;
  }

  // Seed is_trending for the top 3 products by sales_count (for demo)
  console.log('\nAuto-marking top 3 products by sales as trending...');
  try {
    await query.exec(`
      UPDATE products
      SET is_trending = true
      WHERE id IN (
        SELECT id FROM products ORDER BY sales_count DESC, id ASC LIMIT 3
      )
    `);
    console.log('  ✅ Top 3 products marked as trending.');
  } catch (err) {
    console.error('  ❌ Trending auto-seed failed:', err.message);
    throw err;
  }

  // Mark Ghee products as featured (premium price category)
  console.log('\nAuto-marking Ghee/high-price products as featured...');
  try {
    await query.exec(`
      UPDATE products
      SET is_featured = true
      WHERE price >= 250
    `);
    console.log('  ✅ High-price products (price >= 250) marked as featured.');
  } catch (err) {
    console.error('  ❌ Featured auto-seed failed:', err.message);
    throw err;
  }

  // Seed one special offer product for demo
  console.log('\nSeeding a demo special offer product...');
  try {
    await query.exec(`
      UPDATE products
      SET is_special_offer = true, discount_percent = 15
      WHERE id IN (SELECT id FROM products WHERE category_id IN (SELECT id FROM categories WHERE name='Snacks') LIMIT 1)
    `);
    console.log('  ✅ Demo special offer seeded (15% off on one Snacks product).');
  } catch (err) {
    console.error('  ❌ Special offer seed failed:', err.message);
  }

  // Verify final state
  console.log('\nVerifying migration...');
  const result = await query.all(`
    SELECT id, name, price, is_trending, is_featured, is_special_offer,
           discount_percent, sales_count, view_count, trending_score
    FROM products ORDER BY id
  `);
  console.log('\nProduct enhancement column values:');
  console.table(result.map(r => ({
    id: r.id,
    name: r.name.substring(0, 20),
    price: r.price,
    trending: r.is_trending,
    featured: r.is_featured,
    special: r.is_special_offer,
    disc: r.discount_percent,
    sales: r.sales_count,
    views: r.view_count,
    score: r.trending_score,
  })));

  console.log('\n========================================================');
  console.log('✅ Migration complete!');
  console.log('========================================================');
  process.exit(0);
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
