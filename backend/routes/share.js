const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// GET /api/share/:code - Look up sharing code and retrieve file details + download URL
router.get('/:code', async (req, res) => {
  const { code } = req.params;

  if (!code || code.length !== 6) {
    return res.status(400).json({ error: 'Invalid share code format. Must be 6 digits.' });
  }

  try {
    // Create anon client to fetch public share code details
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Fetch share code details where code is active
    const { data: shareCodeData, error: shareCodeError } = await supabase
      .from('share_codes')
      .select('file_id, signed_url, expires_at')
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (shareCodeError) {
      console.error('Error fetching share code:', shareCodeError);
      return res.status(500).json({ error: 'Failed to look up sharing code.' });
    }

    if (!shareCodeData) {
      return res.status(404).json({ error: 'Sharing code not found or has expired.' });
    }

    // 2. Fetch associated file metadata
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('filename, size, file_type')
      .eq('id', shareCodeData.file_id)
      .maybeSingle();

    if (fileError) {
      console.error('Error fetching file details:', fileError);
      return res.status(500).json({ error: 'Failed to fetch associated file info.' });
    }

    if (!fileData) {
      return res.status(404).json({ error: 'File associated with this share code no longer exists.' });
    }

    // 3. Return combined payload
    return res.json({
      filename: fileData.filename,
      size: fileData.size,
      file_type: fileData.file_type,
      signed_url: shareCodeData.signed_url,
      expires_at: shareCodeData.expires_at,
    });
  } catch (err) {
    console.error('Shared code resolution failed:', err);
    return res.status(500).json({ error: 'Internal server failure during code resolution.' });
  }
});

module.exports = router;
