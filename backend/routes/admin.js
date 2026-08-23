const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Mount Auth & Admin checks on all routes in this router
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/stats - Retrieve overall admin dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const supabase = req.supabase;

    // Run parallel count requests using the admin context
    const [usersRes, filesRes, notesRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('files').select('id', { count: 'exact', head: true }),
      supabase.from('notes').select('id', { count: 'exact', head: true }),
    ]);

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const loginsRes = await supabase
      .from('login_logs')
      .select('id', { count: 'exact', head: true })
      .gt('login_time', dayAgo);

    return res.json({
      usersCount: usersRes.count || 0,
      filesCount: filesRes.count || 0,
      notesCount: notesRes.count || 0,
      loginsCount: loginsRes.count || 0,
    });
  } catch (err) {
    console.error('Failed to load admin stats:', err);
    return res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

// GET /api/admin/users - Get list of users registered
router.get('/users', async (req, res) => {
  try {
    const supabase = req.supabase;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('Failed to load user profiles:', err);
    return res.status(500).json({ error: 'Failed to fetch user directory.' });
  }
});

// POST /api/admin/users/:id/limit - Update a user's storage limit
router.post('/users/:id/limit', async (req, res) => {
  const { id } = req.params;
  const { limit } = req.body;

  if (limit === undefined || isNaN(limit)) {
    return res.status(400).json({ error: 'Storage limit bytes value is required.' });
  }

  try {
    const supabase = req.supabase;
    const { error } = await supabase
      .from('profiles')
      .update({ storage_limit: parseInt(limit) })
      .eq('id', id);

    if (error) throw error;
    return res.json({ success: true, message: 'User storage limit updated.' });
  } catch (err) {
    console.error('Failed to update storage limit:', err);
    return res.status(500).json({ error: 'Failed to update user quota.' });
  }
});

// POST /api/admin/users/:id/rename - Update user display name inside profiles and auth.users metadata
router.post('/users/:id/rename', async (req, res) => {
  const { id } = req.params;
  const { full_name } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Name cannot be empty.' });
  }

  try {
    const supabase = req.supabase;
    // Invoke the RPC update profile function defined in schema.sql
    const { error } = await supabase.rpc('admin_update_user_profile', {
      target_user_id: id,
      new_full_name: full_name.trim(),
    });

    if (error) throw error;
    return res.json({ success: true, message: 'User profile name updated.' });
  } catch (err) {
    console.error('Failed to rename user profile:', err);
    return res.status(500).json({ error: 'Failed to rename profile.' });
  }
});

// DELETE /api/admin/users/:id - Delete a user account and wipe inventory
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = req.supabase;

    // 1. Fetch user avatar if any to remove from storage
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', id)
      .maybeSingle();

    if (profile && profile.avatar_url) {
      await supabase.storage.from('vault').remove([profile.avatar_url]);
    }

    // 2. Fetch all user storage files
    const { data: files } = await supabase
      .from('files')
      .select('storage_path')
      .eq('user_id', id);

    if (files && files.length > 0) {
      const filePaths = files.map(f => f.storage_path);
      await supabase.storage.from('vault').remove(filePaths);
    }

    // 3. Call secure RPC function to delete user from auth.users (cascades DB tables)
    const { error } = await supabase.rpc('admin_delete_user', {
      target_user_id: id,
    });

    if (error) throw error;

    return res.json({ success: true, message: 'User account and storage files successfully wiped.' });
  } catch (err) {
    console.error('Failed to delete user account:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// GET /api/admin/logs - Fetch login logs audit trail
router.get('/logs', async (req, res) => {
  try {
    const supabase = req.supabase;
    const { data, error } = await supabase
      .from('login_logs')
      .select('*')
      .order('login_time', { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('Failed to load login logs:', err);
    return res.status(500).json({ error: 'Failed to fetch logs.' });
  }
});

// DELETE /api/admin/logs - Clear all login logs audit trail (with backup download requested by UI)
router.delete('/logs', async (req, res) => {
  try {
    const supabase = req.supabase;
    
    // Attempt RPC clear (security definer bypasses RLS if created)
    const { error: rpcError } = await supabase.rpc('admin_clear_login_logs');
    
    if (rpcError) {
      console.warn('RPC clear failed, falling back to direct delete:', rpcError.message);
      // Fallback: direct delete query (requires delete policy to be run or RLS bypass)
      const { error: deleteError } = await supabase
        .from('login_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
        
      if (deleteError) throw deleteError;
    }
    
    return res.json({ success: true, message: 'Login logs cleared successfully.' });
  } catch (err) {
    console.error('Failed to clear login logs:', err);
    return res.status(500).json({ error: 'Failed to clear logs: ' + err.message });
  }
});

// GET /api/admin/requests - Fetch pending storage upgrade requests
router.get('/requests', async (req, res) => {
  try {
    const supabase = req.supabase;
    const { data, error } = await supabase
      .from('storage_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('Failed to load storage requests:', err);
    return res.status(500).json({ error: 'Failed to fetch requests.' });
  }
});

// POST /api/admin/requests/:id/approve - Approve storage upgrade request
router.post('/requests/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = req.supabase;
    const { error } = await supabase
      .from('storage_requests')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) throw error;
    return res.json({ success: true, message: 'Storage upgrade request approved.' });
  } catch (err) {
    console.error('Failed to approve storage request:', err);
    return res.status(500).json({ error: 'Failed to approve request.' });
  }
});

// POST /api/admin/requests/:id/reject - Reject storage upgrade request
router.post('/requests/:id/reject', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = req.supabase;
    const { error } = await supabase
      .from('storage_requests')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;
    return res.json({ success: true, message: 'Storage upgrade request rejected.' });
  } catch (err) {
    console.error('Failed to reject storage request:', err);
    return res.status(500).json({ error: 'Failed to reject request.' });
  }
});

// GET /api/admin/snippets - Retrieve snippets database
router.get('/snippets', async (req, res) => {
  try {
    const supabase = req.supabase;

    // Fetch notes and user profile details to map users
    const [notesRes, profilesRes] = await Promise.all([
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email'),
    ]);

    if (notesRes.error) throw notesRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const profileMap = {};
    if (profilesRes.data) {
      profilesRes.data.forEach(p => {
        profileMap[p.id] = {
          name: p.full_name || 'Anonymous User',
          email: p.email || 'N/A',
        };
      });
    }

    const snippets = (notesRes.data || []).map(note => {
      const userMeta = profileMap[note.user_id] || { name: 'Anonymous User', email: 'N/A' };
      return {
        ...note,
        userName: userMeta.name,
        userEmail: userMeta.email,
      };
    });

    return res.json(snippets);
  } catch (err) {
    console.error('Failed to retrieve snippets:', err);
    return res.status(500).json({ error: 'Failed to fetch snippets.' });
  }
});

// DELETE /api/admin/snippets/:id - Delete a note snippet
router.delete('/snippets/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = req.supabase;
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.json({ success: true, message: 'Snippet deleted.' });
  } catch (err) {
    console.error('Failed to delete snippet:', err);
    return res.status(500).json({ error: 'Failed to delete snippet.' });
  }
});

// POST /api/admin/users/:id/lock - Toggle user feature locks (upload, clipboard, suspension, download, operations)
router.post('/users/:id/lock', async (req, res) => {
  const { id } = req.params;
  const { upload_locked, clipboard_locked, download_locked, is_suspended, operations_locked } = req.body;

  const updates = {};
  if (upload_locked !== undefined) updates.upload_locked = !!upload_locked;
  if (clipboard_locked !== undefined) updates.clipboard_locked = !!clipboard_locked;
  if (download_locked !== undefined) updates.download_locked = !!download_locked;
  if (is_suspended !== undefined) updates.is_suspended = !!is_suspended;
  if (operations_locked !== undefined) updates.operations_locked = !!operations_locked;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No lock parameters specified.' });
  }

  try {
    const supabase = req.supabase;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
    if (error) throw error;

    // Log admin lock action
    await logAudit(supabase, req.user, 'TOGGLE_USER_LOCKS', 'user', id, updates);

    return res.json({ success: true, message: 'User locks updated successfully.', updates });
  } catch (err) {
    console.error('Failed to update user locks:', err);
    return res.status(500).json({ error: 'Failed to update user locks.' });
  }
});

// GET /api/admin/audit-logs - Retrieve admin actions audit trail
router.get('/audit-logs', async (req, res) => {
  try {
    const supabase = req.supabase;
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// Internal audit logger helper
async function logAudit(supabase, adminUser, action, targetType, targetId, details = {}) {
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminUser?.id || null,
      admin_email: adminUser?.email || 'homtolab@gmail.com',
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  } catch (err) {
    console.warn('Audit logging non-fatal error:', err.message);
  }
}

module.exports = router;

