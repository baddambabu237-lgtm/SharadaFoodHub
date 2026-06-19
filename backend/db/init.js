const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { query } = require('./db');

async function init() {
  try {
    console.log('Starting database initialization...');
    
    // Read and run schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await query.exec(schemaSql);
    console.log('Database schema created successfully.');

    // Check if we already have users (to avoid double seeding)
    const userCount = await query.get('SELECT COUNT(*) as count FROM users');
    if (parseInt(userCount.count) > 0) {
      console.log('Database already initialized. Skipping seed.');
      process.exit(0);
    }

    console.log('Seeding database...');

    // 1. Seed Users
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const customerPasswordHash = await bcrypt.hash('customer123', 10);

    const adminUser = await query.run(
      'INSERT INTO users (name, email, password_hash, phone, role, address) VALUES (?, ?, ?, ?, ?, ?)',
      ['Sharadha Admin', 'admin@sharadha.com', adminPasswordHash, '9876543210', 'admin', 'Admin HQ, Chennai']
    );
    const customerUser = await query.run(
      'INSERT INTO users (name, email, password_hash, phone, role, address) VALUES (?, ?, ?, ?, ?, ?)',
      ['Rajesh Kumar', 'customer@example.com', customerPasswordHash, '9812345678', 'customer', 'Flat 402, Sunshine Apts, Adyar, Chennai - 600020']
    );

    console.log('Users seeded.');

    // 2. Seed Categories
    const categories = [
      { name: 'Podi', desc: 'Flavorful spiced powders for rice, idli, and dosa.' },
      { name: 'Pickles', desc: 'Traditional homemade pickles with cold-pressed oil.' },
      { name: 'Ghee', desc: 'Clarified butter made from pure cow milk.' },
      { name: 'Applam', desc: 'Crispy sun-dried papads made with traditional recipes.' },
      { name: 'Snacks', desc: 'Crispy, savory evening snacks made in small batches.' }
    ];

    const categoryMap = {};
    for (const cat of categories) {
      const res = await query.run(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [cat.name, cat.desc]
      );
      categoryMap[cat.name] = res.id;
    }
    console.log('Categories seeded.');

    // 3. Seed Products
    const products = [
      {
        catName: 'Podi',
        name: 'Idli Milagai Podi',
        desc: 'Traditional gunpowder spice mix made of lentils, red chilies, and sesame seeds. Best served with hot sesame oil or ghee.',
        price: 150,
        weight: '250g',
        shelfLife: 180,
        img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400'
      },
      {
        catName: 'Podi',
        name: 'Paruppu Podi',
        desc: 'Roasted lentil powder with pepper, cumin, and garlic. Tastes divine when mixed with hot rice and ghee.',
        price: 160,
        weight: '250g',
        shelfLife: 180,
        img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400'
      },
      {
        catName: 'Pickles',
        name: 'Avakaya Mango Pickle',
        desc: 'Classic Andhra style raw mango pickle prepared with cold-pressed sesame oil, mustard powder, and freshly ground spices.',
        price: 220,
        weight: '500g',
        shelfLife: 270,
        img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400'
      },
      {
        catName: 'Pickles',
        name: 'Gongura Pickle',
        desc: 'Spicy and tangy sorrel leaves pickle, cooked slowly with red chilies and garlic chunks. An absolute South Indian staple.',
        price: 200,
        weight: '500g',
        shelfLife: 270,
        img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400'
      },
      {
        catName: 'Ghee',
        name: 'Pure Cow Ghee',
        desc: 'Golden clarified butter made from fresh cow milk, cooked slowly in small batches to give a rich aroma and granular texture.',
        price: 450,
        weight: '500ml',
        shelfLife: 365,
        img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400'
      },
      {
        catName: 'Ghee',
        name: 'Pure A2 Desi Cow Ghee',
        desc: 'Premium ghee prepared using the traditional Bilona method (churned curd) from free-range A2 Gir cow milk. Rich in nutrients.',
        price: 750,
        weight: '500ml',
        shelfLife: 365,
        img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400'
      },
      {
        catName: 'Applam',
        name: 'Traditional Pepper Applam',
        desc: 'Sun-dried black gram papads seasoned with crushed black peppercorns. Crispy, spicy, and perfectly light.',
        price: 80,
        weight: '200g',
        shelfLife: 120,
        img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400'
      },
      {
        catName: 'Applam',
        name: 'Jeera Applam',
        desc: 'Classic sun-dried papads seasoned with cumin seeds. Offers a soothing cumin flavor with every crunch.',
        price: 80,
        weight: '200g',
        shelfLife: 120,
        img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400'
      },
      {
        catName: 'Snacks',
        name: 'Kai Murukku Pack',
        desc: 'Crispy rice flour spirals hand-shaped by expert home cooks and deep-fried to golden perfection. Standard festival specialty.',
        price: 120,
        weight: '300g',
        shelfLife: 60,
        img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400'
      },
      {
        catName: 'Snacks',
        name: 'Ribbon Pakoda Pack',
        desc: 'Light, crunchy flat ribbon-like savory snacks flavored with garlic and a touch of chili powder. Perfect tea-time snack.',
        price: 110,
        weight: '300g',
        shelfLife: 60,
        img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400'
      }
    ];

    const today = new Date();
    const productMap = {};

    for (const prod of products) {
      const catId = categoryMap[prod.catName];
      const res = await query.run(
        'INSERT INTO products (category_id, name, description, price, image_url, weight, shelf_life_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [catId, prod.name, prod.desc, prod.price, prod.img, prod.weight, prod.shelfLife]
      );
      const productId = res.id;
      productMap[prod.name] = productId;

      // 4. Seed Inventory Batches for each product
      // Create two batches: one near-expiry/active, and one fresh batch
      const mfgDate1 = new Date();
      mfgDate1.setDate(today.getDate() - Math.floor(prod.shelfLife * 0.7)); // 70% elapsed
      const expDate1 = new Date(mfgDate1);
      expDate1.setDate(mfgDate1.getDate() + prod.shelfLife);

      await query.run(
        'INSERT INTO inventory_batches (product_id, batch_number, manufacture_date, expiry_date, quantity, remaining_qty) VALUES (?, ?, ?, ?, ?, ?)',
        [productId, `BATCH-${productId}-01`, mfgDate1.toISOString().split('T')[0], expDate1.toISOString().split('T')[0], 50, 12]
      );

      const mfgDate2 = new Date();
      mfgDate2.setDate(today.getDate() - 5); // 5 days old
      const expDate2 = new Date(mfgDate2);
      expDate2.setDate(mfgDate2.getDate() + prod.shelfLife);

      await query.run(
        'INSERT INTO inventory_batches (product_id, batch_number, manufacture_date, expiry_date, quantity, remaining_qty) VALUES (?, ?, ?, ?, ?, ?)',
        [productId, `BATCH-${productId}-02`, mfgDate2.toISOString().split('T')[0], expDate2.toISOString().split('T')[0], 100, 95]
      );
    }
    console.log('Products & Inventory batches seeded.');

    // 5. Seed Subscriptions
    const subStartDate1 = new Date();
    subStartDate1.setDate(today.getDate() - 20); // 20 days ago
    const nextDispatch1 = new Date();
    nextDispatch1.setDate(today.getDate() + 5); // 5 days in the future

    const subStartDate2 = new Date();
    subStartDate2.setDate(today.getDate() - 40); // 40 days ago
    const nextDispatch2 = new Date();
    nextDispatch2.setDate(today.getDate() + 10); // 10 days in future

    const sub1 = await query.run(
      'INSERT INTO subscriptions (customer_id, product_id, delivery_frequency, status, start_date, next_dispatch_date, last_renewed_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customerUser.id, productMap['Idli Milagai Podi'], 'weekly', 'active', subStartDate1.toISOString().split('T')[0], nextDispatch1.toISOString().split('T')[0], subStartDate1.toISOString().split('T')[0]]
    );

    const sub2 = await query.run(
      'INSERT INTO subscriptions (customer_id, product_id, delivery_frequency, status, start_date, next_dispatch_date, last_renewed_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customerUser.id, productMap['Pure Cow Ghee'], 'monthly', 'active', subStartDate2.toISOString().split('T')[0], nextDispatch2.toISOString().split('T')[0], subStartDate2.toISOString().split('T')[0]]
    );

    const sub3 = await query.run(
      'INSERT INTO subscriptions (customer_id, product_id, delivery_frequency, status, start_date, next_dispatch_date, last_renewed_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customerUser.id, productMap['Ribbon Pakoda Pack'], 'bi-weekly', 'paused', subStartDate2.toISOString().split('T')[0], nextDispatch2.toISOString().split('T')[0], subStartDate2.toISOString().split('T')[0]]
    );

    console.log('Subscriptions seeded.');

    // 6. Seed Orders & OrderItems
    const order1 = await query.run(
      'INSERT INTO orders (customer_id, order_type, total_amount, status, order_date) VALUES (?, ?, ?, ?, ?)',
      [customerUser.id, 'one-time', 380, 'completed', new Date(today.getTime() - 86400000 * 15).toISOString()] // 15 days ago
    );
    await query.run(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
      [order1.id, productMap['Idli Milagai Podi'], 2, 150]
    );
    await query.run(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
      [order1.id, productMap['Traditional Pepper Applam'], 1, 80]
    );

    const order2 = await query.run(
      'INSERT INTO orders (customer_id, order_type, total_amount, status, order_date) VALUES (?, ?, ?, ?, ?)',
      [customerUser.id, 'subscription_renewal', 450, 'completed', new Date(today.getTime() - 86400000 * 7).toISOString()] // 7 days ago
    );
    await query.run(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
      [order2.id, productMap['Pure Cow Ghee'], 1, 450]
    );

    const order3 = await query.run(
      'INSERT INTO orders (customer_id, order_type, total_amount, status, order_date) VALUES (?, ?, ?, ?, ?)',
      [customerUser.id, 'subscription_renewal', 150, 'pending', new Date().toISOString()] // today
    );
    await query.run(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
      [order3.id, productMap['Idli Milagai Podi'], 1, 150]
    );

    console.log('Orders seeded.');

    // 7. Seed Dispatches
    await query.run(
      'INSERT INTO dispatches (order_id, subscription_id, dispatch_status, dispatch_date, tracking_number, estimated_delivery) VALUES (?, ?, ?, ?, ?, ?)',
      [order1.id, null, 'delivered', new Date(today.getTime() - 86400000 * 14).toISOString().split('T')[0], 'TRK-ORDER-001', new Date(today.getTime() - 86400000 * 12).toISOString().split('T')[0]]
    );
    await query.run(
      'INSERT INTO dispatches (order_id, subscription_id, dispatch_status, dispatch_date, tracking_number, estimated_delivery) VALUES (?, ?, ?, ?, ?, ?)',
      [order2.id, sub2.id, 'delivered', new Date(today.getTime() - 86400000 * 6).toISOString().split('T')[0], 'TRK-SUB-002', new Date(today.getTime() - 86400000 * 4).toISOString().split('T')[0]]
    );
    await query.run(
      'INSERT INTO dispatches (order_id, subscription_id, dispatch_status, dispatch_date, tracking_number, estimated_delivery) VALUES (?, ?, ?, ?, ?, ?)',
      [order3.id, sub1.id, 'pending', null, null, new Date(today.getTime() + 86400000 * 2).toISOString().split('T')[0]]
    );

    console.log('Dispatches seeded.');

    // 8. Seed Notifications
    await query.run(
      'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, ?)',
      [customerUser.id, 'Welcome to Sharadha Subscription Order System! Complete your profile to get personalized recommendations.', 'info', false]
    );
    await query.run(
      'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, ?)',
      [customerUser.id, 'Your subscription for Pure Cow Ghee will renew in 5 days.', 'reminder', false]
    );
    await query.run(
      'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, ?)',
      [adminUser.id, 'ALERT: Idli Milagai Podi BATCH-1-01 stock is low (12 items remaining).', 'alert', false]
    );

    console.log('Notifications seeded.');

    // 9. Seed Support Tickets
    await query.run(
      'INSERT INTO support_tickets (customer_id, subject, description, status, priority) VALUES (?, ?, ?, ?, ?)',
      [customerUser.id, 'Delay in Ghee Delivery', 'My monthly subscription for Cow Ghee is delayed by 2 days. Can you please check?', 'open', 'medium']
    );
    await query.run(
      'INSERT INTO support_tickets (customer_id, subject, description, status, priority) VALUES (?, ?, ?, ?, ?)',
      [customerUser.id, 'Incorrect item received', 'I subscribed to Pepper Applam but received Jeera Applam. The box was sealed.', 'resolved', 'high']
    );

    console.log('Support Tickets seeded.');

    // 10. Seed AI Recommendation History
    await query.run(
      'INSERT INTO recommendation_history (user_id, product_id, recommendation_reason) VALUES (?, ?, ?)',
      [customerUser.id, productMap['Paruppu Podi'], 'Based on your purchase of Idli Milagai Podi, you might enjoy our traditional Paruppu Podi.']
    );

    console.log('Database seeded successfully!');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

init();
