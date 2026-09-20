const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// List of dangerous executable, script, and macro extensions
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', '.vbs', '.msi',
  '.scr', '.jar', '.com', '.pif', '.hta', '.cpl', '.apk', '.gadget', '.wsf'
];

/**
 * Check if filename ends with a blocked extension
 */
const isBlockedExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return false;
  const lower = filename.toLowerCase().trim();
  return BLOCKED_EXTENSIONS.some(ext => lower.endsWith(ext));
};

/**
 * Generate cryptographically secure 6-character uppercase code (unambiguous characters)
 */
const generateSecureCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 unambiguous chars
  const bytes = crypto.randomBytes(6);
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

/**
 * Create a Supabase admin client using SUPABASE_SERVICE_ROLE_KEY (or fallback to ANON KEY)
 * Does NOT enforce 'eyJ' token prefix check since new sb_secret keys work directly with createClient.
 */
const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase URL or Key is missing from server environment.');
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

/**
 * Anonymize client IP using SHA256 with a salt
 */
const hashIp = (ip) => {
  const salt = process.env.IP_HASH_SALT || process.env.CRON_SECRET || 'hometolab_default_ip_salt_2026';
  const cleanIp = (ip || '127.0.0.1').toString().trim();
  return crypto.createHash('sha256').update(cleanIp + salt).digest('hex');
};

module.exports = {
  BLOCKED_EXTENSIONS,
  isBlockedExtension,
  generateSecureCode,
  getSupabaseAdmin,
  hashIp,
};
