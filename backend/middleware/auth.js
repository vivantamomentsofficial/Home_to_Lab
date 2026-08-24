const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[CRITICAL] Missing SUPABASE_URL or SUPABASE_ANON_KEY in auth middleware.');
}


const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

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

    // Pass token explicitly to getUser(token) to verify against Supabase Auth API
    const { data: userData, error } = await supabase.auth.getUser(token);
    const user = userData?.user;

    if (error || !user) {
      console.warn('[AUTH] Token validation failed:', error?.message || 'No user found');
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    // Create admin service client if service key exists for admin operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
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

    // Attach user information and initialized client instance to the request
    req.user = user;
    req.supabase = adminSupabase;
    req.userSupabase = supabase;
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
