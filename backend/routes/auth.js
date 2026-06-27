const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');
const mailer = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'sharadha_secret_key_123!';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, password, and phone are required' });
    }

    // Check if user already exists
    const existingUser = await query.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = role === 'admin' ? 'admin' : 'customer'; // Default to customer

    const result = await query.run(
      'INSERT INTO users (name, email, password_hash, phone, role, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, phone, assignedRole, address || '']
    );

    const token = jwt.sign(
      { id: result.id, name, email, role: assignedRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: result.id, name, email, role: assignedRole, phone, address }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await query.get('SELECT *, (locked_until > NOW()) AS is_locked FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email address.', field: 'email' });
    }

    // Check account lockout status
    if (user.is_locked) {
      return res.status(403).json({
        error: 'Too many failed login attempts. Please try again in 10 minutes or reset your password.',
        field: 'password'
      });
    }

    // Reset failed attempts if lockout expired
    if (user.locked_until && !user.is_locked) {
      await query.run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
      user.failed_attempts = 0;
      user.locked_until = null;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      const newAttempts = (user.failed_attempts || 0) + 1;
      if (newAttempts >= 5) {
        await query.run(
          "UPDATE users SET failed_attempts = ?, locked_until = NOW() + INTERVAL '10 minutes' WHERE id = ?",
          [newAttempts, user.id]
        );
        return res.status(403).json({
          error: 'Too many failed login attempts. Please try again in 10 minutes or reset your password.',
          field: 'password'
        });
      } else {
        await query.run('UPDATE users SET failed_attempts = ? WHERE id = ?', [newAttempts, user.id]);
        return res.status(401).json({
          error: 'Incorrect password. Please try again.',
          field: 'password'
        });
      }
    }

    // Successful login: reset stats
    await query.run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await query.get('SELECT id, name, email, phone, role, address, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (err) {
    console.error('Profile query error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const id = req.user.id;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone number are required' });
    }

    await query.run(
      'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
      [name, phone, address || '', id]
    );

    const updatedUser = await query.get('SELECT id, name, email, phone, role, address FROM users WHERE id = ?', [id]);
    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all customers (Admin only)
router.get('/customers', authenticateToken, async (req, res) => {
  try {
    // If not admin, restrict
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const customers = await query.all("SELECT id, name, email, phone, address, role, created_at FROM users WHERE role = 'customer'");
    res.status(200).json({ customers });
  } catch (err) {
    console.error('Customers fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change Password (Authenticated users)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: 'All password fields are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match' });
    }

    // Get user's current password hash
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    // Hash the new password and update
    const hash = await bcrypt.hash(newPassword, 10);
    await query.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password - Step 1: Request OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Retrieve user and check request rate limit dynamically in SQL (60 seconds block)
    const user = await query.get(
      "SELECT *, (otp_requested_at > NOW() - INTERVAL '60 seconds') AS is_rate_limited FROM users WHERE email = ?",
      [email]
    );

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    if (user.is_rate_limited) {
      return res.status(429).json({ error: 'Please wait at least 60 seconds before requesting another OTP.' });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[PASSWORD RESET OTP] Generated OTP: ${otp} for Email: ${email}`);

    const isProduction = process.env.NODE_ENV === 'production';
    const isMailerConfigured = mailer.isConfigured();

    if (isProduction && !isMailerConfigured) {
      console.error('[PASSWORD RESET OTP] Production mode active but SMTP/Gmail is not configured.');
      return res.status(503).json({ error: 'Email service is currently unavailable. Please try again later.' });
    }

    if (isMailerConfigured) {
      try {
        // Send real email first to ensure it succeeds before indicating success
        await mailer.sendOtpEmail(email, otp);
        
        // Save in DB (including otp_requested_at for rate limiting)
        await query.run(
          "UPDATE users SET otp_code = ?, otp_expiry = NOW() + INTERVAL '10 minutes', otp_requested_at = NOW() WHERE id = ?",
          [otp, user.id]
        );

        // Create system alert notification
        await query.run(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [user.id, `SECURITY ALERT: Password reset OTP requested. Code: ${otp} (expires in 10 minutes).`, 'alert']
        );

        const responsePayload = { message: 'Reset Link Sent' };
        if (!isProduction) {
          responsePayload.otp = otp; // Expose OTP on screen *only* in development
        }

        res.status(200).json(responsePayload);
      } catch (emailErr) {
        console.error(`[PASSWORD RESET OTP] Email sending failed for ${email}:`, emailErr.message);
        return res.status(502).json({ 
          error: `Failed to deliver OTP email. Please check your SMTP credentials. Error: ${emailErr.message}` 
        });
      }
    } else {
      console.log(`[PASSWORD RESET OTP] SMTP not configured. Falling back to development OTP console print.`);
      
      // Save in DB
      await query.run(
        "UPDATE users SET otp_code = ?, otp_expiry = NOW() + INTERVAL '10 minutes', otp_requested_at = NOW() WHERE id = ?",
        [otp, user.id]
      );

      // Create system alert notification
      await query.run(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
        [user.id, `SECURITY ALERT: Password reset OTP requested. Code: ${otp} (expires in 10 minutes).`, 'alert']
      );

      console.log(`[PASSWORD RESET OTP] Email: ${email} | OTP: ${otp}`);

      res.status(200).json({ 
        message: 'Reset Link Sent (Dev Mode)', 
        otp 
      });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password - Step 2: Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    const user = await query.get(
      'SELECT *, (otp_expiry > NOW()) as is_otp_valid FROM users WHERE email = ?',
      [email]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if OTP matches and is not expired
    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ error: 'Incorrect OTP' });
    }

    if (!user.is_otp_valid) {
      return res.status(400).json({ error: 'Expired OTP' });
    }

    // Clear OTP in DB to prevent reuse
    await query.run('UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE id = ?', [user.id]);

    // Generate a secure short-lived reset token (valid for 10 minutes)
    const resetToken = jwt.sign(
      { id: user.id, reset: true },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.status(200).json({ 
      message: 'OTP Verified Successfully', 
      resetToken 
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password - Step 3: Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired password reset session' });
    }

    if (!decoded.reset || !decoded.id) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }

    const userId = decoded.id;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash and store the new password, clear OTP
    const hash = await bcrypt.hash(newPassword, 10);
    await query.run(
      'UPDATE users SET password_hash = ?, otp_code = NULL, otp_expiry = NULL, failed_attempts = 0, locked_until = NULL WHERE id = ?',
      [hash, userId]
    );

    // Create system alert notification
    await query.run(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [userId, 'SECURITY ALERT: Your account password was reset successfully.', 'info']
    );

    res.status(200).json({ message: 'Password Reset Successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
