const express = require('express');
const router = express.Router();
const path = require('path');
const rateLimit = require('express-rate-limit');
const {
  isBlockedExtension,
  generateSecureCode,
  getSupabaseAdmin,
  hashIp,
} = require('../utils/security');

// Expiration options in seconds
const ALLOWED_EXPIRATIONS = {
  '10m': 600,
  '30m': 1800,
  '1h': 3600,
  '6h': 21600,
  '24h': 86400,
};

// Rate Limiters for /api/quick/init (5 creates / 10 min / IP and 30 creates / 24 hr / IP)
const shortInitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded: Maximum 5 quick shares allowed per 10 minutes from this IP.' },
});

const dailyInitLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Daily limit exceeded: Maximum 30 quick shares allowed per 24 hours from this IP.' },
});

/**
 * Verify Cloudflare Turnstile CAPTCHA server-side
 */
async function verifyTurnstile(token, ip) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAAEQ7vjk7zY4vqXlLDBjua2_6gOc';
  if (!secretKey || !token) {
    return true; // Allow if secret key or client token is not provided
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const outcome = await res.json();
    return outcome.success === true;
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return true; // Fallback to true on network error
  }
}

/**
 * Generate a unique 6-character code checking both share_codes and quick_shares
 */
async function generateUniqueCode(supabaseAdmin) {
  let attempts = 0;
  while (attempts < 15) {
    attempts++;
    const code = generateSecureCode();

    const { data: scData } = await supabaseAdmin
      .from('share_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (scData) continue;

    const { data: qsData } = await supabaseAdmin
      .from('quick_shares')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (!qsData) return code;
  }
  throw new Error('Could not generate unique 6-digit access code.');
}

/**
 * Cleanup expired, consumed (>5m), and stale pending (>15m) quick shares
 */
async function cleanupQuickShares() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const nowIso = new Date().toISOString();
    const fiveMinAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const fifteenMinAgoIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Query candidates for cleanup
    const { data: expiredRows, error: fetchErr } = await supabaseAdmin
      .from('quick_shares')
      .select('id, storage_path')
      .or(`expires_at.lt.${nowIso},and(status.eq.consumed,consumed_at.lt.${fiveMinAgoIso}),and(status.eq.pending,created_at.lt.${fifteenMinAgoIso})`);

    if (fetchErr || !expiredRows || expiredRows.length === 0) {
      return { cleanedCount: 0 };
    }

    // Storage paths to remove
    const pathsToRemove = expiredRows
      .map(r => r.storage_path)
      .filter(p => Boolean(p));

    if (pathsToRemove.length > 0) {
      await supabaseAdmin.storage.from('quick').remove(pathsToRemove);
    }

    const idsToDelete = expiredRows.map(r => r.id);
    await supabaseAdmin.from('quick_shares').delete().in('id', idsToDelete);

    return { cleanedCount: idsToDelete.length };
  } catch (err) {
    console.error('Quick shares cleanup error:', err);
    return { cleanedCount: 0, error: err.message };
  }
}

// POST /api/quick/init - Initialize Quick Send (Text or File upload ticket)
router.post('/init', shortInitLimiter, dailyInitLimiter, async (req, res) => {
  // Opportunistic background cleanup of expired/stale shares
  cleanupQuickShares().catch(() => {});
  try {
    const {
      kind,
      filename,
      size = 0,
      mime,
      text_content,
      expiry_option = '30m',
      self_destruct = false,
      captchaToken,
    } = req.body;

    // 1. Verify Cloudflare Turnstile Captcha
    const isCaptchaValid = await verifyTurnstile(captchaToken, req.ip);
    if (!isCaptchaValid) {
      return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
    }

    // 2. Validate Kind
    if (!['file', 'text'].includes(kind)) {
      return res.status(400).json({ error: "Invalid share kind. Must be 'file' or 'text'." });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const ipHash = hashIp(req.ip);
    const durationSeconds = ALLOWED_EXPIRATIONS[expiry_option] || 1800; // default 30m
    const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

    // 3. Handle Text Share
    if (kind === 'text') {
      if (!text_content || typeof text_content !== 'string' || text_content.trim().length === 0) {
        return res.status(400).json({ error: 'Text content is required for text shares.' });
      }

      const textByteSize = Buffer.byteLength(text_content, 'utf8');
      if (textByteSize > 100 * 1024) { // 100 KB limit
        return res.status(400).json({ error: 'Text content exceeds maximum limit of 100 KB.' });
      }

      const cleanTitle = (filename || 'snippet.txt').trim().substring(0, 120);
      const code = await generateUniqueCode(supabaseAdmin);

      const { data: newRow, error: insertErr } = await supabaseAdmin
        .from('quick_shares')
        .insert({
          code,
          kind: 'text',
          filename: cleanTitle,
          size: textByteSize,
          mime: 'text/plain',
          text_content,
          self_destruct: Boolean(self_destruct),
          status: 'active',
          expires_at: expiresAt,
          ip_hash: ipHash,
        })
        .select()
        .single();

      if (insertErr || !newRow) {
        console.error('Insert text quick share error:', insertErr);
        return res.status(500).json({ error: insertErr?.message ? `Database error: ${insertErr.message}` : 'Failed to create text share.' });
      }

      return res.status(201).json({
        success: true,
        id: newRow.id,
        code: newRow.code,
        kind: 'text',
        filename: newRow.filename,
        size: newRow.size,
        expires_at: newRow.expires_at,
        self_destruct: newRow.self_destruct,
      });
    }

    // 4. Handle File Share
    if (kind === 'file') {
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Filename is required for file shares.' });
      }

      const fileSizeNum = parseInt(size, 10) || 0;
      if (fileSizeNum <= 0 || fileSizeNum > 25 * 1024 * 1024) { // 25 MB limit
        return res.status(400).json({ error: 'File size must be between 1 byte and 25 MB.' });
      }

      if (isBlockedExtension(filename)) {
        return res.status(403).json({ error: 'Prohibited file type: Executable (.exe, .bat, etc.) files cannot be shared.' });
      }

      // Check total active storage budget (default 300MB)
      const budgetMb = parseInt(process.env.QUICK_SHARE_BUDGET_MB, 10) || 300;
      const maxBudgetBytes = budgetMb * 1024 * 1024;

      const { data: activeBytesData, error: budgetErr } = await supabaseAdmin
        .from('quick_shares')
        .select('size')
        .in('status', ['active', 'pending'])
        .gt('expires_at', new Date().toISOString());

      if (!budgetErr && activeBytesData) {
        const currentBytes = activeBytesData.reduce((acc, r) => acc + (r.size || 0), 0);
        if (currentBytes + fileSizeNum > maxBudgetBytes) {
          return res.status(507).json({ error: 'Temporary storage budget exceeded. Please try again later or select a smaller file.' });
        }
      }

      const sanitizedFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 120);
      const code = await generateUniqueCode(supabaseAdmin);
      const storagePath = `quick/${code}/${sanitizedFilename}`;

      // Insert pending row
      const { data: pendingRow, error: insertErr } = await supabaseAdmin
        .from('quick_shares')
        .insert({
          code,
          kind: 'file',
          filename: sanitizedFilename,
          size: fileSizeNum,
          mime: mime || 'application/octet-stream',
          storage_path: storagePath,
          self_destruct: Boolean(self_destruct),
          status: 'pending',
          expires_at: expiresAt,
          ip_hash: ipHash,
        })
        .select()
        .single();

      if (insertErr || !pendingRow) {
        console.error('Insert file quick share error:', insertErr);
        return res.status(500).json({ error: insertErr?.message ? `Database error: ${insertErr.message}` : 'Failed to initialize file share.' });
      }

      // Create signed upload URL for browser direct upload
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('quick')
        .createSignedUploadUrl(storagePath);

      if (uploadErr || !uploadData?.signedUrl) {
        console.error('Signed upload URL creation error:', uploadErr);
        await supabaseAdmin.from('quick_shares').delete().eq('id', pendingRow.id);
        return res.status(500).json({ error: 'Failed to generate upload authorization token.' });
      }

      return res.status(201).json({
        success: true,
        id: pendingRow.id,
        code: pendingRow.code,
        kind: 'file',
        filename: pendingRow.filename,
        size: pendingRow.size,
        signed_upload_url: uploadData.signedUrl,
        token: uploadData.token,
        storage_path: storagePath,
        expires_at: pendingRow.expires_at,
        self_destruct: pendingRow.self_destruct,
      });
    }
  } catch (err) {
    console.error('Quick init error:', err);
    return res.status(500).json({ error: 'Internal failure during quick share initialization.' });
  }
});

// POST /api/quick/:id/complete - Verify direct browser upload & activate code
router.post('/:id/complete', async (req, res) => {
  const { id } = req.params;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('quick_shares')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchErr || !row) {
      return res.status(404).json({ error: 'Pending upload session not found or already completed.' });
    }

    // Verify file exists in Supabase storage bucket 'quick'
    const folderPath = path.dirname(row.storage_path);
    const fileName = path.basename(row.storage_path);

    const { data: fileList, error: listErr } = await supabaseAdmin.storage
      .from('quick')
      .list(folderPath);

    const uploadedObject = (fileList || []).find(f => f.name === fileName);

    if (listErr || !uploadedObject) {
      // Clean up orphaned pending row
      await supabaseAdmin.from('quick_shares').delete().eq('id', row.id);
      return res.status(400).json({ error: 'Uploaded file object not found in storage. Upload failed.' });
    }

    const actualSize = uploadedObject.metadata?.size || uploadedObject.size || row.size;
    if (actualSize > 25 * 1024 * 1024) {
      await supabaseAdmin.storage.from('quick').remove([row.storage_path]);
      await supabaseAdmin.from('quick_shares').delete().eq('id', row.id);
      return res.status(400).json({ error: 'Uploaded file exceeds 25 MB limit.' });
    }

    // Activate the quick share
    const { error: updateErr } = await supabaseAdmin
      .from('quick_shares')
      .update({
        status: 'active',
        size: actualSize,
      })
      .eq('id', row.id);

    if (updateErr) {
      return res.status(500).json({ error: 'Failed to activate quick share code.' });
    }

    return res.json({
      success: true,
      code: row.code,
      filename: row.filename,
      size: actualSize,
      expires_at: row.expires_at,
    });
  } catch (err) {
    console.error('Quick complete error:', err);
    return res.status(500).json({ error: 'Internal failure while completing upload verification.' });
  }
});

// POST /api/quick/cleanup - Endpoint for external CRON jobs to trigger cleanup
router.post('/cleanup', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'] || '';
  const customHeader = req.headers['x-cron-secret'] || '';

  if (cronSecret) {
    const isAuthValid = authHeader === `Bearer ${cronSecret}` || customHeader === cronSecret;
    if (!isAuthValid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid cron secret header.' });
    }
  }

  const result = await cleanupQuickShares();
  return res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    cleaned_count: result.cleanedCount,
  });
});

module.exports = {
  router,
  cleanupQuickShares,
};
