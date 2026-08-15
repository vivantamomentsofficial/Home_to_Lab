const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://gxccllaqtdiuvnrialta.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_RX7bF4fL5BYUdwUx3vGl3Q_xSe5A-ny';

// Middleware to extract and verify JWT token using Supabase Auth getUser API
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required.' });
    }

    // Create a local Supabase client scoped to this user's JWT context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    // Attach user information and initialized client instance to the request
    req.user = user;
    req.supabase = supabase;
    req.token = token;

    // Verify if account is suspended
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && profile.is_suspended) {
      return res.status(403).json({ error: 'Your account has been suspended by the administrator.' });
    }

    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    return res.status(500).json({ error: 'Internal server authentication failure.' });
  }
};

// Middleware to enforce Super Admin checks
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.email !== 'homtolab@gmail.com') {
      return res.status(403).json({ error: 'Access denied: Administrative privileges required.' });
    }
    next();
  } catch (err) {
    console.error('Admin middleware check failure:', err);
    return res.status(500).json({ error: 'Internal admin validation check failure.' });
  }
};

module.exports = {
  requireAuth,
  requireAdmin,
};
