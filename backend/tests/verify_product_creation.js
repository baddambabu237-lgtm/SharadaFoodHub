require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const bcrypt = require('bcryptjs');
const { query } = require('../db/db');

const PORT = 5000;
const HOST = 'localhost';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, data: { raw: data } });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING PRODUCT CREATION INTEGRATION TESTS');
  console.log('========================================================');

  // Reset admin password to a known state to guarantee login succeeds
  try {
    const hash = await bcrypt.hash('admin123', 10);
    await query.run('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'admin@sharadafoodhub.com']);
    console.log('✅ Admin password hash reset in database.');
  } catch (err) {
    console.error('❌ Failed to reset admin password in database:', err.message);
  }

  let adminToken = '';

  // Get Admin Auth Token
  try {
    const loginRes = await request({
      hostname: HOST,
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'admin@sharadafoodhub.com',
      password: 'admin123'
    });

    if (loginRes.statusCode === 200 && loginRes.data.token) {
      adminToken = loginRes.data.token;
      console.log('✅ Logged in as Admin successfully.');
    } else {
      console.error('❌ Admin login failed:', loginRes.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Admin login error:', err.message);
    process.exit(1);
  }

  // Fetch a valid category ID to use
  let categoryId = 1;
  try {
    const categories = await query.all('SELECT id FROM categories LIMIT 1');
    if (categories.length > 0) {
      categoryId = categories[0].id;
    }
  } catch (err) {
    console.error('❌ Failed to fetch category ID from database:', err.message);
  }

  // Test Case 1: Validation Rules (Negative Price / Negative Shelf Life / Empty Name)
  console.log('\n[TEST 1] Creating product with invalid parameters...');
  try {
    const test1Res = await request({
      hostname: HOST,
      port: PORT,
      path: '/api/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      category_id: categoryId,
      name: '', // Empty name
      price: -100, // Negative price
      shelf_life_days: -5, // Negative shelf life
      weight: '250g'
    });

    if (test1Res.statusCode === 400) {
      console.log('✅ Test 1 Passed: Server correctly blocked product creation with 400 Bad Request.');
      console.log('Error message received:', test1Res.data.error);
    } else {
      console.error('❌ Test 1 Failed: Server returned status', test1Res.statusCode, 'instead of 400');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test 1 Error:', err.message);
    process.exit(1);
  }

  // Test Case 2: Success Flow with URL Validation & Image Fallback
  console.log('\n[TEST 2] Creating valid product with invalid image URL...');
  let createdProductId = null;
  const mockProductName = `Test Delicacy ${Date.now()}`;
  try {
    const test2Res = await request({
      hostname: HOST,
      port: PORT,
      path: '/api/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      category_id: categoryId,
      name: mockProductName,
      description: 'A test product description',
      price: 180.50,
      image_url: 'not-a-valid-url', // Should fallback to default placeholder
      weight: '500g',
      shelf_life_days: 90
    });

    if (test2Res.statusCode === 201 && test2Res.data.productId) {
      createdProductId = test2Res.data.productId;
      console.log(`✅ Test 2 Passed: Product created successfully. New ID: ${createdProductId}`);
    } else {
      console.error('❌ Test 2 Failed: Server returned status', test2Res.statusCode, test2Res.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test 2 Error:', err.message);
    process.exit(1);
  }

  // Test Case 3: Verify Database entries & Default Image Fallback & Seeding Inventory
  console.log('\n[TEST 3] Verifying database records for the created product...');
  try {
    // 1. Verify product properties & image fallback
    const productRecord = await query.get('SELECT * FROM products WHERE id = ?', [createdProductId]);
    if (!productRecord) {
      console.error('❌ Test 3 Failed: Product not found in database.');
      process.exit(1);
    }

    console.log('Product Name in DB:', productRecord.name);
    console.log('Product Price in DB:', productRecord.price);
    console.log('Product Image URL in DB:', productRecord.image_url);

    const expectedPlaceholder = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300';
    if (productRecord.image_url === expectedPlaceholder) {
      console.log('✅ Image URL fell back correctly to default food placeholder.');
    } else {
      console.error('❌ Image URL did not fallback. Found:', productRecord.image_url);
      process.exit(1);
    }

    // 2. Verify automatic inventory batch seeding
    const batchRecord = await query.get('SELECT * FROM inventory_batches WHERE product_id = ?', [createdProductId]);
    if (batchRecord) {
      console.log('✅ Automatic inventory batch created.');
      console.log('Batch details:', {
        batch_number: batchRecord.batch_number,
        quantity: batchRecord.quantity,
        remaining_qty: batchRecord.remaining_qty,
        manufacture_date: batchRecord.manufacture_date,
        expiry_date: batchRecord.expiry_date
      });
    } else {
      console.error('❌ Test 3 Failed: No automatic inventory batch created.');
      process.exit(1);
    }
    
    console.log('✅ Test 3 Database Validation Passed.');
  } catch (err) {
    console.error('❌ Test 3 Database verification failed:', err.message);
    process.exit(1);
  }

  // Test Case 4: Verify Product list fetched from endpoint
  console.log('\n[TEST 4] Fetching all products from API...');
  try {
    const listRes = await request({
      hostname: HOST,
      port: PORT,
      path: '/api/products',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (listRes.statusCode === 200 && listRes.data.products) {
      const found = listRes.data.products.find(p => p.id === createdProductId);
      if (found) {
        console.log('✅ Test 4 Passed: Newly created product appears in the public Product Catalog API.');
      } else {
        console.error('❌ Test 4 Failed: Created product not found in list response.');
        process.exit(1);
      }
    } else {
      console.error('❌ Test 4 Failed: Fetch list returned status', listRes.statusCode);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test 4 Error:', err.message);
    process.exit(1);
  }

  // Cleanup testing entries
  console.log('\n🧹 Cleaning up test product entries...');
  try {
    await query.run('DELETE FROM products WHERE id = ?', [createdProductId]);
    console.log('✅ Cleanup finished successfully.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  }

  console.log('\n========================================================');
  console.log('🎉 ALL PRODUCT CREATION WORKFLOW TESTS PASSED');
  console.log('========================================================');
  process.exit(0);
}

runTests();
