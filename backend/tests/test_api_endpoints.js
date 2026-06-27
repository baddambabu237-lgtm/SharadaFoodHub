require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');

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

async function runAudit() {
  console.log('========================================================');
  console.log('🚀 STARTING BACKEND CONNECTIVITY AND ENDPOINT AUDIT');
  console.log('========================================================');

  let adminToken = '';
  let customerToken = '';

  // 1. Audit Admin Login & JWT
  try {
    console.log('\n[AUDIT] Testing Admin Authentication (POST /api/auth/login)...');
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
      console.log('✅ Admin login succeeded. JWT token retrieved.');
      adminToken = loginRes.data.token;
    } else {
      console.error('❌ Admin login failed:', loginRes.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Admin login failed with error:', err.message);
    process.exit(1);
  }

  // 2. Audit Admin Dashboard Stats API
  try {
    console.log('\n[AUDIT] Testing Admin Dashboard Stats (GET /api/dashboard/stats)...');
    const statsRes = await request({
      hostname: HOST,
      port: PORT,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (statsRes.statusCode === 200 && statsRes.data.summary && statsRes.data.charts) {
      console.log('✅ Admin Dashboard Stats API succeeded. Received valid JSON with summary & charts.');
      console.log('Summary metrics:', statsRes.data.summary);
      console.log('Chart datasets keys:', Object.keys(statsRes.data.charts));
    } else {
      console.error('❌ Admin Dashboard Stats API failed:', statsRes.statusCode, statsRes.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Admin Dashboard Stats API failed with error:', err.message);
    process.exit(1);
  }

  // 3. Audit Customer Login
  try {
    console.log('\n[AUDIT] Testing Customer Authentication (POST /api/auth/login)...');
    const loginRes = await request({
      hostname: HOST,
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'customer@example.com',
      password: 'customer123'
    });

    if (loginRes.statusCode === 200 && loginRes.data.token) {
      console.log('✅ Customer login succeeded. JWT token retrieved.');
      customerToken = loginRes.data.token;
    } else {
      console.error('❌ Customer login failed:', loginRes.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Customer login failed with error:', err.message);
    process.exit(1);
  }

  // 4. Audit Subscription Fetch & Toggle Lifecycle
  try {
    console.log('\n[AUDIT] Testing Customer Subscriptions Fetch (GET /api/subscriptions)...');
    const subsRes = await request({
      hostname: HOST,
      port: PORT,
      path: '/api/subscriptions',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    });

    if (subsRes.statusCode === 200 && Array.isArray(subsRes.data.subscriptions)) {
      console.log(`✅ Subscriptions fetch succeeded. Found ${subsRes.data.subscriptions.length} subscriptions.`);
      
      const targetSub = subsRes.data.subscriptions.find(s => s.status === 'active');
      if (!targetSub) {
        console.log('[WARNING] No active subscription found to test pause/resume. Skipping pause/resume toggle test.');
      } else {
        const subId = targetSub.id;
        console.log(`\n[AUDIT] Testing Subscription Pause (PUT /api/subscriptions/${subId}/pause)...`);
        const pauseRes = await request({
          hostname: HOST,
          port: PORT,
          path: `/api/subscriptions/${subId}/pause`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
          }
        });

        if (pauseRes.statusCode === 200) {
          console.log('✅ Pause subscription API succeeded.');
        } else {
          console.error('❌ Pause subscription API failed:', pauseRes.statusCode, pauseRes.data);
          process.exit(1);
        }

        console.log(`\n[AUDIT] Testing Subscription Resume (PUT /api/subscriptions/${subId}/resume)...`);
        const resumeRes = await request({
          hostname: HOST,
          port: PORT,
          path: `/api/subscriptions/${subId}/resume`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
          }
        });

        if (resumeRes.statusCode === 200 && resumeRes.data.next_dispatch_date) {
          console.log(`✅ Resume subscription API succeeded. Recalculated next dispatch: ${resumeRes.data.next_dispatch_date}`);
        } else {
          console.error('❌ Resume subscription API failed:', resumeRes.statusCode, resumeRes.data);
          process.exit(1);
        }
      }
    } else {
      console.error('❌ Subscriptions fetch failed:', subsRes.statusCode, subsRes.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Subscriptions audit failed with error:', err.message);
    process.exit(1);
  }

  console.log('\n========================================================');
  console.log('🎉 ALL BACKEND CONNECTIVITY AND ENDPOINT AUDITS PASSED!');
  console.log('========================================================');
  process.exit(0);
}

runAudit();
