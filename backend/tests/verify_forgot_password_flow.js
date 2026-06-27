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
  console.log('--- STARTING FORGOT PASSWORD SMTP & EXPIRED TOKEN VERIFICATION TESTS ---');

  const email = 'customer@example.com';

  try {
    // Clear rate limit lock to prevent test pollution
    await query.run('UPDATE users SET otp_requested_at = NULL WHERE email = ?', [email]);

    // 1. Validate Dev Mode: SMTP Not Configured
    console.log('\n[TEST 1] Requesting OTP in Sandbox Mode (SMTP unconfigured)...');
    
    // Ensure no SMTP variables are set in test process env
    const origHost = process.env.SMTP_HOST;
    const origUser = process.env.SMTP_USER;
    const origPass = process.env.SMTP_PASS;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const devRes = await request('/auth/forgot-password', 'POST', { email });
    if (devRes.statusCode === 200 && devRes.data.otp) {
      console.log('✅ Passed: OTP successfully returned in API response for Sandbox Mode.');
      console.log(`Generated OTP code: ${devRes.data.otp}`);
    } else {
      throw new Error(`Expected 200 and otp field in Sandbox Mode, got status ${devRes.statusCode} and data: ${JSON.stringify(devRes.data)}`);
    }

    const otp = devRes.data.otp;

    // 2. Validate Expired OTP Handling
    console.log('\n[TEST 2] Verifying expired OTP handling...');
    
    // Manually expire the OTP in the PostgreSQL database
    console.log('Set OTP expiry to past timestamp in DB...');
    await query.run(
      "UPDATE users SET otp_expiry = NOW() - INTERVAL '1 minute' WHERE email = ?",
      [email]
    );

    const expiredRes = await request('/auth/verify-otp', 'POST', { email, otp });
    if (expiredRes.statusCode === 400 && expiredRes.data.error === 'Expired OTP') {
      console.log('✅ Passed: Expired OTP rejected with 400 Expired OTP.');
    } else {
      throw new Error(`Expected 400 Expired OTP, got status ${expiredRes.statusCode} and data: ${JSON.stringify(expiredRes.data)}`);
    }

    // 3. Request fresh OTP for validation
    console.log('\n[TEST 3] Requesting fresh OTP...');
    await query.run('UPDATE users SET otp_requested_at = NULL WHERE email = ?', [email]);
    const freshRes = await request('/auth/forgot-password', 'POST', { email });
    const freshOtp = freshRes.data.otp;
    console.log(`New OTP: ${freshOtp}`);

    // Verify incorrect OTP
    const wrongRes = await request('/auth/verify-otp', 'POST', { email, otp: '000000' });
    if (wrongRes.statusCode === 400 && wrongRes.data.error === 'Incorrect OTP') {
      console.log('✅ Passed: Incorrect OTP rejected correctly.');
    } else {
      throw new Error(`Expected 400 Incorrect OTP, got status ${wrongRes.statusCode}`);
    }

    // Verify correct OTP
    const verifyRes = await request('/auth/verify-otp', 'POST', { email, otp: freshOtp });
    if (verifyRes.statusCode === 200 && verifyRes.data.resetToken) {
      console.log('✅ Passed: OTP verified successfully. Reset token acquired.');
    } else {
      throw new Error(`Expected 200 and resetToken, got status ${verifyRes.statusCode}`);
    }

    const resetToken = verifyRes.data.resetToken;

    // Reset password
    console.log('Resetting password to "resetcustomerpassword123"...');
    const resetRes = await request('/auth/reset-password', 'POST', {
      resetToken,
      newPassword: 'resetcustomerpassword123',
      confirmPassword: 'resetcustomerpassword123'
    });
    if (resetRes.statusCode === 200) {
      console.log('✅ Passed: Password reset successful.');
    } else {
      throw new Error(`Expected 200 on reset password, got status ${resetRes.statusCode}`);
    }

    // Login with new password
    console.log('Verifying login with new password...');
    const loginRes = await request('/auth/login', 'POST', { email, password: 'resetcustomerpassword123' });
    if (loginRes.statusCode === 200) {
      console.log('✅ Passed: Logged in successfully with new password.');
    } else {
      throw new Error(`Expected 200 on login, got status ${loginRes.statusCode}`);
    }

    // Restore default password using change-password route
    const userToken = loginRes.data.token;
    console.log('Restoring default password...');
    const restoreRes = await request('/auth/change-password', 'POST', {
      currentPassword: 'resetcustomerpassword123',
      newPassword: 'customer123',
      confirmNewPassword: 'customer123'
    }, { 'Authorization': `Bearer ${userToken}` });

    if (restoreRes.statusCode === 200) {
      console.log('✅ Passed: Password restored successfully.');
    } else {
      throw new Error(`Expected 200 on password restore, got status ${restoreRes.statusCode}`);
    }

    // 4. Validate SMTP Configured But Fails Flow (Using Router Unit-Testing to bypass process isolation)
    console.log('\n[TEST 4] Simulating SMTP configuration and delivery failure (Router Handler Isolation)...');
    
    // Inject dummy SMTP environment parameters in this process
    process.env.SMTP_HOST = 'localhost';
    process.env.SMTP_PORT = '9999'; // Bad port to guarantee connection/delivery failure
    process.env.SMTP_USER = 'dummy';
    process.env.SMTP_PASS = 'dummy';

    await query.run('UPDATE users SET otp_requested_at = NULL WHERE email = ?', [email]);

    // Find the Express route handler
    const forgotRoute = authRoutes.stack.find(layer => layer.route && layer.route.path === '/forgot-password');
    if (!forgotRoute) {
      throw new Error('Forgot password route handler not found in auth routes stack');
    }
    const handler = forgotRoute.route.stack[0].handle;

    // Define mock req/res
    const mockReq = { body: { email: 'customer@example.com' } };
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

    // Run route handler
    await handler(mockReq, mockRes);

    if (mockRes.statusCode === 502 && mockRes.responseData.error.includes('Failed to deliver OTP email')) {
      console.log('✅ Passed: Isolated route handler successfully caught SMTP failure and returned 502 Bad Gateway.');
      console.log('Logged error response:', mockRes.responseData.error);
    } else {
      throw new Error(`Expected 502 with delivery failure error, got status ${mockRes.statusCode} and data: ${JSON.stringify(mockRes.responseData)}`);
    }

    // Restore original process env variables
    if (origHost) process.env.SMTP_HOST = origHost;
    else delete process.env.SMTP_HOST;

    if (origUser) process.env.SMTP_USER = origUser;
    else delete process.env.SMTP_USER;

    if (origPass) process.env.SMTP_PASS = origPass;
    else delete process.env.SMTP_PASS;

    console.log('\n--- ALL FORGOT PASSWORD FLOW & SMTP TESTS PASSED SUCCESSFULLY ---');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test execution failed:', err.message);
    process.exit(1);
  }
}

runTest();
