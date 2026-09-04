const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');

// Rate limiter for login/register actions (15 requests per 15 mins per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts from this IP. Please try again in 15 minutes.' },
});

// POST /api/auth/log-login - Server-side IP capture for authenticated user login
router.post('/log-login', authLimiter, requireAuth, async (req, res) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
    const clientIp = rawIp || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const { error } = await req.userSupabase
      .from('login_logs')
      .insert({
        user_id: req.user.id,
        email: req.user.email || 'guest@cloudvault.local',
        login_time: new Date().toISOString(),
        ip_address: clientIp,
        user_agent: userAgent
      });

    if (error) {
      console.warn('Failed to insert login_log record:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, ip: clientIp });
  } catch (err) {
    console.error('Login log handler error:', err);
    return res.status(500).json({ error: 'Internal server error while capturing login log.' });
  }
});

// POST /api/auth/check-rate-limit - Endpoint to verify IP rate limit before login/register
router.post('/check-rate-limit', authLimiter, (req, res) => {
  res.json({ allowed: true });
});

module.exports = router;
