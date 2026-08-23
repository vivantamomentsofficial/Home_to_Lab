const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/auth');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Rate limiting for public share code lookup to mitigate brute-force guessing (30 requests per 1 min per IP)
const shareLookupLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // limit each IP to 30 lookups per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many share code lookup requests from this IP. Please try again in a minute.' },
});

// Helper function to generate cryptographically secure 6-character alphanumeric uppercase code
const generateSecureShareCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 unambiguous chars
  const bytes = crypto.randomBytes(6);
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

// GET /api/share/:code - Securely retrieve shared file metadata via SECURITY DEFINER RPC
router.get('/:code', shareLookupLimiter, async (req, res) => {
  const { code } = req.params;

  if (!code || code.trim().length !== 6) {
    return res.status(400).json({ error: 'Invalid share code format. Must be 6 characters.' });
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Call the SECURITY DEFINER RPC function (avoids exposing entire share_codes/files tables)
    const { data, error } = await supabase.rpc('get_shared_file_by_code', {
      p_code: normalizedCode,
    });

    if (error) {
      console.error('Error in get_shared_file_by_code RPC:', error);
      return res.status(500).json({ error: 'Failed to retrieve shared file.' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Sharing code not found, already consumed, or expired.' });
    }

    const fileRecord = data[0];

    return res.json({
      file_id: fileRecord.file_id,
      filename: fileRecord.filename,
      size: fileRecord.size,
      file_type: fileRecord.file_type,
      signed_url: fileRecord.signed_url,
      expires_at: fileRecord.expires_at,
      self_destruct: fileRecord.self_destruct,
    });
  } catch (err) {
    console.error('Shared code resolution failed:', err);
    return res.status(500).json({ error: 'Internal server failure during code resolution.' });
  }
});

// POST /api/share/generate - Authenticated endpoint for server-side cryptographically secure share code generation
router.post('/generate', requireAuth, async (req, res) => {
  const { file_id, expiry_seconds = 1800, self_destruct = false } = req.body;

  if (!file_id) {
    return res.status(400).json({ error: 'file_id is required.' });
  }

  const duration = Math.min(Math.max(parseInt(expiry_seconds, 10) || 1800, 60), 86400 * 7); // between 1 min and 7 days

  try {
    const supabase = req.supabase; // Context-scoped authenticated client from requireAuth

    // 1. Fetch file to verify ownership and get storage path
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('id, filename, storage_path, user_id')
      .eq('id', file_id)
      .maybeSingle();

    if (fileError || !fileData) {
      return res.status(404).json({ error: 'File not found or access denied.' });
    }

    // Security check: Block dangerous executable file formats from being shared
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', '.vbs', '.msi', '.scr', '.jar', '.com', '.pif', '.hta', '.cpl', '.apk'];
    const lowerFilename = (fileData.filename || '').toLowerCase();
    if (dangerousExtensions.some(ext => lowerFilename.endsWith(ext))) {
      return res.status(403).json({ error: 'Prohibited file type: Executable/script files cannot be shared via public codes.' });
    }

    // 2. Generate signed URL for storage object

    const { data: signedData, error: signedError } = await supabase.storage
      .from('vault')
      .createSignedUrl(fileData.storage_path, duration);

    if (signedError || !signedData?.signedUrl) {
      console.error('Error creating signed URL:', signedError);
      return res.status(500).json({ error: 'Failed to generate signed download URL for file.' });
    }

    // 3. Generate a collision-free cryptographically secure 6-character code
    let shareCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      shareCode = generateSecureShareCode();
      const { data: existing, error: checkError } = await supabase
        .from('share_codes')
        .select('id')
        .eq('code', shareCode)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!checkError && !existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Could not generate unique share code. Please retry.' });
    }

    // 4. Insert into share_codes table
    const expiresAt = new Date(Date.now() + duration * 1000).toISOString();
    const { data: insertedShare, error: insertError } = await supabase
      .from('share_codes')
      .insert({
        code: shareCode,
        file_id: fileData.id,
        signed_url: signedData.signedUrl,
        expires_at: expiresAt,
        self_destruct: Boolean(self_destruct),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting share code:', insertError);
      return res.status(500).json({ error: 'Failed to register share code.' });
    }

    return res.status(201).json({
      code: shareCode,
      filename: fileData.filename,
      signed_url: signedData.signedUrl,
      expires_at: expiresAt,
      self_destruct: Boolean(self_destruct),
      duration_seconds: duration,
    });
  } catch (err) {
    console.error('Generate share code error:', err);
    return res.status(500).json({ error: 'Internal failure while generating share code.' });
  }
});

module.exports = router;

