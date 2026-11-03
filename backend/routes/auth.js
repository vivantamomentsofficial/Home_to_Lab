const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');

// Rate limiter for unauthenticated login/register checks
const authCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts from this IP. Please try again in 15 minutes.' },
});

// Rate limiter for authenticated log-login endpoint (300 requests per 15 mins per IP)
const logLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper to accurately extract the client's real public IP address
function extractRealIp(req) {
  // If the frontend passed an externally-verified public IP
  if (req.body?.public_ip && typeof req.body.public_ip === 'string') {
    const pub = req.body.public_ip.trim();
    if (pub && pub !== '127.0.0.1' && pub !== '::1' && pub !== 'localhost' && pub !== 'Unknown') {
      return pub;
    }
  }

  // Header inspection in priority order (Cloudflare, Nginx, Proxies, AWS, Vercel)
  const candidates = [
    req.headers['cf-connecting-ip'],
    req.headers['x-real-ip'],
    req.headers['x-client-ip'],
    req.headers['x-forwarded-for'],
    req.headers['true-client-ip'],
    req.headers['fastly-client-ip'],
    req.ip,
    req.connection?.remoteAddress,
    req.socket?.remoteAddress
  ];

  for (const c of candidates) {
    if (!c) continue;
    const parts = String(c).split(',').map(s => s.trim());
    for (const part of parts) {
      const clean = part.replace(/^::ffff:/, '');
      if (clean && clean !== '127.0.0.1' && clean !== '::1' && clean !== 'localhost') {
        return clean;
      }
    }
  }

  return req.ip?.replace(/^::ffff:/, '') || '127.0.0.1';
}

// POST /api/auth/log-login - Server-side IP capture for authenticated user login
router.post('/log-login', logLoginLimiter, requireAuth, async (req, res) => {
  try {
    const clientIp = extractRealIp(req);
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
    }

    // Also update profiles table with last login IP and timestamp
    try {
      await req.supabase
        .from('profiles')
        .update({
          last_login_ip: clientIp,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.user.id);
    } catch (pErr) {
      console.warn('Profile last_login_ip update skipped:', pErr.message);
    }

    return res.json({ success: true, ip: clientIp });
  } catch (err) {
    console.error('Login log handler error:', err);
    return res.status(500).json({ error: 'Internal server error while capturing login log.' });
  }
});

// POST /api/auth/check-rate-limit - Endpoint to verify IP rate limit before login/register
router.post('/check-rate-limit', authCheckLimiter, (req, res) => {
  res.json({ allowed: true });
});

// POST /api/auth/set-cookie - Set httpOnly cookie for session token
router.post('/set-cookie', authCheckLimiter, (req, res) => {
  const { access_token, refresh_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'Access token required to set session cookie.' });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res.cookie('sb-access-token', access_token, cookieOptions);
  if (refresh_token) {
    res.cookie('sb-refresh-token', refresh_token, cookieOptions);
  }

  return res.json({ success: true, message: 'Session httpOnly cookie set successfully.' });
});

// POST /api/auth/clear-cookie - Clear httpOnly auth cookies
router.post('/clear-cookie', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/'
  };

  res.clearCookie('sb-access-token', cookieOptions);
  res.clearCookie('sb-refresh-token', cookieOptions);

  return res.json({ success: true, message: 'Session httpOnly cookies cleared.' });
});

module.exports = router;
