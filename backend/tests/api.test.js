const http = require('http');
const express = require('express');
const cors = require('cors');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const authRoutes = require('../routes/auth');
const productRoutes = require('../routes/products');
const subscriptionRoutes = require('../routes/subscriptions');
const { db } = require('../db/db');

// Setup a test server
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

let server;
const PORT = 5001;

function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('Test server closed.');
      db.end().then(resolve); // Close pg connection pool
    });
  });
}

// Simple helper to make GET requests
function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: JSON.parse(data)
        });
      });
    }).on('error', reject);
  });
}

// Simple helper to make POST requests
function post(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyStr.length
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: JSON.parse(data)
        });
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING INTEGRATION TESTS ---');
  await startServer();
  let failures = 0;

  try {
    // Test 1: Fetch Products
    console.log('Running Test 1: GET /api/products...');
    const productsRes = await get('/api/products');
    if (productsRes.statusCode === 200 && Array.isArray(productsRes.data.products)) {
      console.log(`✅ Passed: Found ${productsRes.data.products.length} products in database.`);
    } else {
      console.error('❌ Failed GET /api/products', productsRes);
      failures++;
    }

    // Test 2: Login Customer
    console.log('Running Test 2: POST /api/auth/login...');
    const loginRes = await post('/api/auth/login', {
      email: 'customer@example.com',
      password: 'customer123'
    });
    if (loginRes.statusCode === 200 && loginRes.data.token) {
      console.log('✅ Passed: Customer authenticated, token received.');
    } else {
      console.error('❌ Failed POST /api/auth/login', loginRes);
      failures++;
    }

    // Test 3: Login Admin
    console.log('Running Test 3: POST /api/auth/login (Admin)...');
    const adminLoginRes = await post('/api/auth/login', {
      email: 'admin@sharadafoodhub.com',
      password: 'admin123'
    });
    if (adminLoginRes.statusCode === 200 && adminLoginRes.data.user.role === 'admin') {
      console.log('✅ Passed: Admin authenticated and verified.');
    } else {
      console.error('❌ Failed Admin Login', adminLoginRes);
      failures++;
    }

  } catch (err) {
    console.error('Test runner encountered an error:', err);
    failures++;
  } finally {
    await stopServer();
    console.log('--- TEST SUITE COMPLETE ---');
    if (failures === 0) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED!');
      process.exit(0);
    } else {
      console.error(`😢 TEST SUITE FAILED WITH ${failures} ERRORS.`);
      process.exit(1);
    }
  }
}

runTests();
