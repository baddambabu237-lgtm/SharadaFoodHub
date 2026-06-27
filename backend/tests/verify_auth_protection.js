const http = require('http');

const PORT = 5000;
const HOST = 'localhost';

function request(path, method, postData = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    const options = {
      hostname: HOST,
      port: PORT,
      path: `/api${path}`,
      method: method,
      headers: defaultHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: { raw: data } });
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

async function runTest() {
  console.log('--- STARTING SHOPPING AUTH PROTECTION INTEGRATION TESTS ---');

  try {
    // 1. Guest routes access validation
    console.log('\n[GUEST TESTS] Validating route locks for unauthenticated guests...');

    const subFetchRes = await request('/subscriptions', 'GET');
    if (subFetchRes.statusCode === 401) {
      console.log('✅ Passed: Guest subscriptions fetch blocked with 401 Unauthorized.');
    } else {
      throw new Error(`Expected 401 for guest subscriptions fetch, got ${subFetchRes.statusCode}`);
    }

    const orderFetchRes = await request('/orders', 'GET');
    if (orderFetchRes.statusCode === 401) {
      console.log('✅ Passed: Guest order history fetch blocked with 401 Unauthorized.');
    } else {
      throw new Error(`Expected 401 for guest orders fetch, got ${orderFetchRes.statusCode}`);
    }

    const subCreateRes = await request('/subscriptions', 'POST', {
      product_id: 1,
      delivery_frequency: 'weekly'
    });
    if (subCreateRes.statusCode === 401) {
      console.log('✅ Passed: Guest subscription creation blocked with 401 Unauthorized.');
    } else {
      throw new Error(`Expected 401 for guest subscription creation, got ${subCreateRes.statusCode}`);
    }

    const orderCreateRes = await request('/orders', 'POST', {
      items: [{ product_id: 1, quantity: 1 }],
      shipping_address: '123 Guest St'
    });
    if (orderCreateRes.statusCode === 401) {
      console.log('✅ Passed: Guest checkout order placement blocked with 401 Unauthorized.');
    } else {
      throw new Error(`Expected 401 for guest order placement, got ${orderCreateRes.statusCode}`);
    }

    // 2. Logged In User validation
    console.log('\n[LOGGED-IN USER TESTS] Logging in as customer...');
    const loginRes = await request('/auth/login', 'POST', {
      email: 'customer@example.com',
      password: 'customer123'
    });

    if (loginRes.statusCode !== 200) {
      throw new Error(`Customer login failed with status code ${loginRes.statusCode}`);
    }
    const token = loginRes.data.token;
    const authHeader = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Logged in successfully. Token acquired.');

    console.log('Validating route access for authenticated customer...');
    const authSubFetch = await request('/subscriptions', 'GET', null, authHeader);
    if (authSubFetch.statusCode === 200) {
      console.log('✅ Passed: Logged-in customer subscriptions fetch succeeded.');
    } else {
      throw new Error(`Expected 200 for logged-in subscriptions, got ${authSubFetch.statusCode}`);
    }

    const authOrderFetch = await request('/orders', 'GET', null, authHeader);
    if (authOrderFetch.statusCode === 200) {
      console.log('✅ Passed: Logged-in customer orders fetch succeeded.');
    } else {
      throw new Error(`Expected 200 for logged-in orders, got ${authOrderFetch.statusCode}`);
    }

    console.log('\n--- ALL SHOPPING AUTH PROTECTION TESTS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('\n❌ Test execution failed:', err.message);
    process.exit(1);
  }
}

runTest();
