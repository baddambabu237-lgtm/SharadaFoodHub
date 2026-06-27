require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const { query } = require('../db/db');
const authRoutes = require('../routes/auth');

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
  console.log('--- STARTING REAL OTP FLOW & SECURITY POLICY VERIFICATION ---');

  const email = 'customer@example.com';

  try {
    // Clean up any existing rate limit lock in DB first
    await query.run('UPDATE users SET otp_requested_at = NULL WHERE email = ?', [email]);

    // 1. Validate Rate Limiting
    console.log('\n[TEST 1] Testing OTP Request Rate Limiting (60s block)...');
    
    // First request - should succeed
    const firstRes = await request('/auth/forgot-password', 'POST', { email });
    if (firstRes.statusCode === 200) {
      console.log('✅ Passed: First OTP request succeeded.');
    } else {
      throw new Error(`Expected 200 on first request, got status ${firstRes.statusCode}`);
    }

    // Second request immediately - should fail with 429
    const secondRes = await request('/auth/forgot-password', 'POST', { email });
    if (secondRes.statusCode === 429 && secondRes.data.error.includes('wait at least 60 seconds')) {
      console.log('✅ Passed: Rapid second OTP request blocked with 429 Too Many Requests.');
      console.log('Returned error:', secondRes.data.error);
    } else {
      throw new Error(`Expected 429 on rapid second request, got status ${secondRes.statusCode} and data: ${JSON.stringify(secondRes.data)}`);
    }

    // Reset rate limit in DB to continue testing
    await query.run('UPDATE users SET otp_requested_at = NULL WHERE email = ?', [email]);

    // Retrieve the OTP that was saved in DB
    const userRow = await query.get('SELECT otp_code FROM users WHERE email = ?', [email]);
    const otp = userRow.otp_code;
    console.log(`Retrieved OTP from database for validation: ${otp}`);

    // 2. Validate OTP Reuse Prevention
    console.log('\n[TEST 2] Testing OTP Reuse Prevention...');
    
    // First verify attempt - should succeed
    const verify1 = await request('/auth/verify-otp', 'POST', { email, otp });
    if (verify1.statusCode === 200 && verify1.data.resetToken) {
      console.log('✅ Passed: First OTP verification succeeded and returned reset token.');
    } else {
      throw new Error(`Expected 200 on first verification, got status ${verify1.statusCode}`);
    }

    // Second verify attempt with same OTP - should fail
    const verify2 = await request('/auth/verify-otp', 'POST', { email, otp });
    if (verify2.statusCode === 400 && verify2.data.error === 'Incorrect OTP') {
      console.log('✅ Passed: Re-use of verified OTP blocked (returned 400 Incorrect OTP since code was cleared).');
    } else {
      throw new Error(`Expected 400 on OTP reuse, got status ${verify2.statusCode} and data: ${JSON.stringify(verify2.data)}`);
    }

    // 3. Validate Production Mode Masking
    console.log('\n[TEST 3] Testing Production Mode OTP Masking (Router Handler Isolation)...');
    
    // Configure production env parameters
    const origNodeEnv = process.env.NODE_ENV;
    const origEmailUser = process.env.EMAIL_USER;
    const origEmailPass = process.env.EMAIL_PASSWORD;

    process.env.NODE_ENV = 'production';
    process.env.EMAIL_USER = 'testuser@gmail.com';
    process.env.EMAIL_PASSWORD = 'testpassword';

    // Clear rate limit to bypass lock
    await query.run('UPDATE users SET otp_requested_at = NULL WHERE email = ?', [email]);

    // Find Express route handler
    const forgotRoute = authRoutes.stack.find(layer => layer.route && layer.route.path === '/forgot-password');
    if (!forgotRoute) {
      throw new Error('Forgot password route handler not found in auth routes stack');
    }
    const handler = forgotRoute.route.stack[0].handle;

    // Define mock req/res
    const mockReq = { body: { email } };
    const mockRes = {
      statusCode: 200,
      responseData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.responseData = data;
        return this;
      }
    };

    // Stub mailer to avoid real SMTP request during production test
    const mailer = require('../utils/mailer');
    const origSendOtpEmail = mailer.sendOtpEmail;
    mailer.sendOtpEmail = async () => ({ sent: true }); // stub success

    // Run route handler
    await handler(mockReq, mockRes);

    // Reset mailer stub
    mailer.sendOtpEmail = origSendOtpEmail;

    if (mockRes.statusCode === 200) {
      if (mockRes.responseData.otp === undefined) {
        console.log('✅ Passed: Production mode correctly hid the OTP from the JSON response.');
        console.log('Response returned to client:', mockRes.responseData);
      } else {
        throw new Error('OTP was exposed in response despite NODE_ENV=production!');
      }
    } else {
      throw new Error(`Expected 200 on stubbed production request, got status ${mockRes.statusCode} and data: ${JSON.stringify(mockRes.responseData)}`);
    }

    // Restore original env variables
    if (origNodeEnv) process.env.NODE_ENV = origNodeEnv;
    else delete process.env.NODE_ENV;

    if (origEmailUser) process.env.EMAIL_USER = origEmailUser;
    else delete process.env.EMAIL_USER;

    if (origEmailPass) process.env.EMAIL_PASSWORD = origEmailPass;
    else delete process.env.EMAIL_PASSWORD;

    console.log('\n--- ALL OTP SECURITY POLICY TESTS PASSED SUCCESSFULLY ---');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test execution failed:', err.message);
    process.exit(1);
  }
}

runTest();
