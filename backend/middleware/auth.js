const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sharadha_secret_key_123!';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn(`[AUTH FAILURE] Invalid or expired token: ${err.message}`);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.warn(`[AUTH FAILURE] Non-admin access attempted by user: ${req.user ? req.user.email : 'Unknown'}`);
    return res.status(403).json({ error: 'Admin access required' });
  }
};

module.exports = { authenticateToken, isAdmin };
