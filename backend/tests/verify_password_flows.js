require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
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
  console.log('--- STARTING PASSWORD FLOWS INTEGRATION TESTS ---');

  try {
    // 1. Initial Login
    console.log('Logging in with current customer credentials...');
    let loginRes;
    try {
      loginRes = await request('/auth/login', 'POST', {
        email: 'customer@example.com',
        password: 'customer123'
      });
      if (loginRes.statusCode !== 200) {
        throw new Error(`Login responded with status code ${loginRes.statusCode}`);
      }
      console.log('✅ Success: Login passed.');
    } catch (err) {
      console.error('❌ Error: Initial login failed. Please ensure backend server is running.', err.message);
      process.exit(1);
    }

    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Change Password Validations
    console.log('Testing Change Password validations...');
    
    // Fails on short new password
    let res = await request('/auth/change-password', 'POST', {
      currentPassword: 'customer123',
      newPassword: 'short',
      confirmNewPassword: 'short'
    }, authHeaders);
    if (res.statusCode === 400) {
      console.log('✅ Passed: Short password rejected correctly:', res.data.error);
    } else {
      console.error('❌ Error: Change password should have failed on short password, got status:', res.statusCode);
      process.exit(1);
    }

    // Fails on mismatch confirm password
    res = await request('/auth/change-password', 'POST', {
      currentPassword: 'customer123',
      newPassword: 'newcustomerpassword123',
      confirmNewPassword: 'mismatchpassword'
    }, authHeaders);
    if (res.statusCode === 400) {
      console.log('✅ Passed: Confirm password mismatch rejected correctly:', res.data.error);
    } else {
      console.error('❌ Error: Change password should have failed on password mismatch, got status:', res.statusCode);
      process.exit(1);
    }

    // Fails on incorrect current password
    res = await request('/auth/change-password', 'POST', {
      currentPassword: 'wrongpassword',
      newPassword: 'newcustomerpassword123',
      confirmNewPassword: 'newcustomerpassword123'
    }, authHeaders);
    if (res.statusCode === 400) {
      console.log('✅ Passed: Incorrect current password rejected correctly:', res.data.error);
    } else {
      console.error('❌ Error: Change password should have failed on incorrect current password, got status:', res.statusCode);
      process.exit(1);
    }

    // Succeeds on valid parameters
    console.log('Changing password to "newcustomerpassword123"...');
    res = await request('/auth/change-password', 'POST', {
      currentPassword: 'customer123',
      newPassword: 'newcustomerpassword123',
      confirmNewPassword: 'newcustomerpassword123'
    }, authHeaders);
    if (res.statusCode === 200) {
      console.log('✅ Passed:', res.data.message);
    } else {
      console.error('❌ Error: Change password failed with status:', res.statusCode, res.data);
      process.exit(1);
    }

    // 3. Verify old credentials no longer work, and new credentials work immediately
    console.log('Verifying old credentials are rejected...');
    res = await request('/auth/login', 'POST', {
      email: 'customer@example.com',
      password: 'customer123'
    });
    if (res.statusCode === 401) {
      console.log('✅ Passed: Old credentials rejected successfully.');
    } else {
      console.error('❌ Error: Login with old password should have been rejected, got status:', res.statusCode);
      process.exit(1);
    }

    console.log('Verifying new credentials log in successfully...');
    const newLoginRes = await request('/auth/login', 'POST', {
      email: 'customer@example.com',
      password: 'newcustomerpassword123'
    });
    if (newLoginRes.statusCode === 200) {
      console.log('✅ Passed: Logged in successfully using new credentials.');
    } else {
      console.error('❌ Error: New credentials failed to login, status:', newLoginRes.statusCode);
      process.exit(1);
    }
    const newToken = newLoginRes.data.token;
    const newAuthHeaders = { Authorization: `Bearer ${newToken}` };

    // 4. Restore original password using change-password endpoint
    console.log('Restoring password back to default "customer123"...');
    res = await request('/auth/change-password', 'POST', {
      currentPassword: 'newcustomerpassword123',
      newPassword: 'customer123',
      confirmNewPassword: 'customer123'
    }, newAuthHeaders);
    if (res.statusCode === 200) {
      console.log('✅ Passed: Restored original password.');
    } else {
      console.error('❌ Error: Failed to restore password, status:', res.statusCode);
      process.exit(1);
    }

    // 5. Forgot Password Flow
    console.log('Testing Forgot Password flow...');
    
    // Step 1: Request OTP
    console.log('Requesting OTP for "customer@example.com"...');
    const forgotRes = await request('/auth/forgot-password', 'POST', {
      email: 'customer@example.com'
    });
    if (forgotRes.statusCode === 200) {
      console.log('✅ Passed: Reset Link/OTP Sent.');
    } else {
      console.error('❌ Error: Forgot password request failed, status:', forgotRes.statusCode);
      process.exit(1);
    }
    const otp = forgotRes.data.otp;
    console.log(`Received OTP from API: ${otp}`);

    // Step 2: Verify OTP
    console.log('Verifying OTP...');
    
    // Fails on incorrect OTP
    res = await request('/auth/verify-otp', 'POST', {
      email: 'customer@example.com',
      otp: '999999'
    });
    if (res.statusCode === 400) {
      console.log('✅ Passed: Incorrect OTP rejected correctly:', res.data.error);
    } else {
      console.error('❌ Error: Verify OTP should have failed on incorrect OTP, status:', res.statusCode);
      process.exit(1);
    }

    // Succeeds on correct OTP
    const verifyRes = await request('/auth/verify-otp', 'POST', {
      email: 'customer@example.com',
      otp: otp
    });
    if (verifyRes.statusCode === 200) {
      console.log('✅ Passed: OTP verified successfully.');
    } else {
      console.error('❌ Error: OTP verification failed, status:', verifyRes.statusCode);
      process.exit(1);
    }
    const resetToken = verifyRes.data.resetToken;

    // Step 3: Reset Password using resetToken
    console.log('Resetting password to "resetcustomerpassword123"...');
    
    // Fails on password length < 8
    res = await request('/auth/reset-password', 'POST', {
      resetToken,
      newPassword: 'short',
      confirmPassword: 'short'
    });
    if (res.statusCode === 400) {
      console.log('✅ Passed: Short password rejected on reset:', res.data.error);
    } else {
      console.error('❌ Error: Reset password should have failed on short password, status:', res.statusCode);
      process.exit(1);
    }

    // Succeeds on valid fields
    const resetRes = await request('/auth/reset-password', 'POST', {
      resetToken,
      newPassword: 'resetcustomerpassword123',
      confirmPassword: 'resetcustomerpassword123'
    });
    if (resetRes.statusCode === 200) {
      console.log('✅ Passed:', resetRes.data.message);
    } else {
      console.error('❌ Error: Reset password failed, status:', resetRes.statusCode);
      process.exit(1);
    }

    // 6. Login with newly reset password
    console.log('Verifying login with reset password works...');
    const resetLoginRes = await request('/auth/login', 'POST', {
      email: 'customer@example.com',
      password: 'resetcustomerpassword123'
    });
    if (resetLoginRes.statusCode === 200) {
      console.log('✅ Passed: Login succeeds with reset password.');
    } else {
      console.error('❌ Error: Login failed with reset password, status:', resetLoginRes.statusCode);
      process.exit(1);
    }
    const resetUserToken = resetLoginRes.data.token;

    // 7. Clean up and restore original password
    console.log('Cleaning up: restoring password back to default "customer123"...');
    res = await request('/auth/change-password', 'POST', {
      currentPassword: 'resetcustomerpassword123',
      newPassword: 'customer123',
      confirmNewPassword: 'customer123'
    }, { Authorization: `Bearer ${resetUserToken}` });
    if (res.statusCode === 200) {
      console.log('✅ Passed: Restored original credentials.');
    } else {
      console.error('❌ Error: Failed to restore password, status:', res.statusCode);
      process.exit(1);
    }

    console.log('--- ALL PASSWORD FLOWS TESTS PASSED SUCCESSFULLY ---');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
    process.exit(1);
  }
}

runTest();
