const path = require('path');
// Add backend and frontend node_modules dynamically to module paths
module.paths.push(path.join(__dirname, '../node_modules'));
module.paths.push(path.join(__dirname, '../../frontend/node_modules'));

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const { query } = require('../db/db');

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== Testing Notifications System API ===');

  const testEmail = 'customer@example.com';
  const testPassword = 'customer123';

  // 1. Get test user and token
  console.log('[Step 1] Logging in test user...');
  let token;
  let userId;
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { email: testEmail, password: testPassword });
    token = res.data.token;
    userId = res.data.user.id;
    console.log(`Logged in successfully! Token acquired for user ID: ${userId}`);
  } catch (err) {
    console.error('Failed to log in:', err.response?.data || err.message);
    process.exit(1);
  }

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  // 2. Prep notifications: clean existing and add some test unread notifications
  console.log('\n[Step 2] Preparing test notifications in database...');
  await query.run('DELETE FROM notifications WHERE user_id = ?', [userId]);

  // Insert 3 unread notifications
  const n1 = await query.run('INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, false) RETURNING id', [userId, 'Test message 1', 'info']);
  const n2 = await query.run('INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, false) RETURNING id', [userId, 'Test message 2', 'alert']);
  const n3 = await query.run('INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, false) RETURNING id', [userId, 'Test message 3', 'reminder']);

  const id1 = n1.id;
  const id2 = n2.id;
  const id3 = n3.id;

  console.log(`Inserted 3 unread notifications with IDs: ${id1}, ${id2}, ${id3}`);

  // 3. Fetch notifications via GET
  console.log('\n[Step 3] Fetching notifications via API...');
  try {
    const res = await axios.get(`${API_URL}/notifications`, axiosConfig);
    const list = res.data.notifications;
    console.log(`Successfully fetched ${list.length} notifications.`);
    const unread = list.filter(n => !n.is_read);
    console.log(`Unread count: ${unread.length} (expected 3)`);
    if (unread.length !== 3) throw new Error('Unread count mismatch');
  } catch (err) {
    console.error('Fetch failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 4. Mark notification 1 as read via PUT /:id/read
  console.log(`\n[Step 4] Marking notification ID ${id1} as read...`);
  try {
    const res = await axios.put(`${API_URL}/notifications/${id1}/read`, {}, axiosConfig);
    console.log('Result:', res.data.message);

    // Verify it is marked as read
    const verify = await query.get('SELECT is_read FROM notifications WHERE id = ?', [id1]);
    console.log(`Database is_read state: ${verify.is_read} (expected 1 or true)`);
    if (!verify.is_read) throw new Error('is_read was not updated');
  } catch (err) {
    console.error('Mark read failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 5. Mark all as read via PUT /read-all
  console.log('\n[Step 5] Marking all notifications as read...');
  try {
    const res = await axios.put(`${API_URL}/notifications/read-all`, {}, axiosConfig);
    console.log('Result:', res.data.message);

    // Fetch and check
    const check = await axios.get(`${API_URL}/notifications`, axiosConfig);
    const unread = check.data.notifications.filter(n => !n.is_read);
    console.log(`Unread count after read-all: ${unread.length} (expected 0)`);
    if (unread.length !== 0) throw new Error('Unread count after read-all is not 0');
  } catch (err) {
    console.error('Mark all read failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 6. Delete notification 3 via DELETE /:id
  console.log(`\n[Step 6] Deleting notification ID ${id3}...`);
  try {
    const res = await axios.delete(`${API_URL}/notifications/${id3}`, axiosConfig);
    console.log('Result:', res.data.message);

    // Verify it is deleted from DB
    const verify = await query.get('SELECT * FROM notifications WHERE id = ?', [id3]);
    console.log(`Notification ID ${id3} exists in DB: ${!!verify} (expected false)`);
    if (verify) throw new Error('Notification was not deleted');
  } catch (err) {
    console.error('Delete failed:', err.response?.data || err.message);
    process.exit(1);
  }

  console.log('\n=== All Notifications System API Tests Passed successfully! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
