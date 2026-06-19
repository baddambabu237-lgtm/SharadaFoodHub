const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

// Get all notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await query.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC',
      [req.user.id]
    );
    res.status(200).json({ notifications });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await query.get('SELECT * FROM notifications WHERE id = ?', [id]);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await query.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Update notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock WhatsApp integration sending
router.post('/whatsapp', authenticateToken, async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message content are required' });
    }

    // Print mockup dispatch to terminal
    console.log(`\n========================================================================`);
    console.log(`[WHATSAPP INTEGRATION] OUTBOUND SMS DISPATCH`);
    console.log(`To: +91 ${phone}`);
    console.log(`Message: "${message}"`);
    console.log(`Status: Sent Successfully via Mock Gateway`);
    console.log(`========================================================================\n`);

    res.status(200).json({
      message: 'WhatsApp message sent (Mocked)',
      recipient: phone,
      gateway: 'Mock Twilio/WhatsApp API'
    });

  } catch (err) {
    console.error('WhatsApp dispatch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
