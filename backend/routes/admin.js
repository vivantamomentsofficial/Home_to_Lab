const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Mount Auth & Admin checks on all routes in this router
router.use(requireAuth);
router.use(requireAdmin);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'homtolab@gmail.com';

// Internal audit logger helper
async function logAudit(supabase, adminUser, action, targetType, targetId, details = {}) {
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminUser?.id || null,
      admin_email: adminUser?.email || ADMIN_EMAIL,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  } catch (err) {
    console.warn('Audit logging non-fatal error:', err.message);
  }
}

// GET /api/admin/stats - Retrieve overall admin dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const supabase = req.supabase;

    const [usersRes, filesRes, notesRes, pendingReqRes, profilesRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('files').select('id, size'),
      supabase.from('notes').select('id', { count: 'exact', head: true }),
      supabase.from('storage_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('storage_limit, is_suspended, upload_locked'),
    ]);

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const loginsRes = await supabase
      .from('login_logs')
      .select('id', { count: 'exact', head: true })
      .gt('login_time', dayAgo);

    const files = filesRes.data || [];
    const totalStorageBytes = files.reduce((acc, f) => acc + (parseInt(f.size) || 0), 0);

    const profiles = profilesRes.data || [];
    const suspendedCount = profiles.filter(p => p.is_suspended).length;
    const lockedCount = profiles.filter(p => p.upload_locked || p.clipboard_locked || p.download_locked || p.operations_locked).length;

    return res.json({
      usersCount: usersRes.count || 0,
      filesCount: files.length,
      notesCount: notesRes.count || 0,
      loginsCount: loginsRes.count || 0,
      pendingRequestsCount: pendingReqRes.count || 0,
      totalStorageBytes,
      suspendedCount,
      lockedCount
    });
  } catch (err) {
    console.error('Failed to load admin stats:', err);
    return res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

// GET /api/admin/analytics - Detailed storage & platform analytics dashboard
router.get('/analytics', async (req, res) => {
  try {
    const supabase = req.supabase;

    const [filesRes, profilesRes, loginLogsRes] = await Promise.all([
      supabase.from('files').select('id, filename, file_type, size, created_at, user_id'),
      supabase.from('profiles').select('id, email, full_name, college, storage_limit, failed_login_attempts, locked_until'),
      supabase.from('login_logs').select('id, user_id, email, login_time, ip_address, user_agent').order('login_time', { ascending: false }).limit(500),
    ]);

    if (filesRes.error) throw filesRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const files = filesRes.data || [];
    const profiles = profilesRes.data || [];
    const logs = loginLogsRes.data || [];

    // Total Storage calculations
    const totalStorageUsed = files.reduce((acc, f) => acc + (parseInt(f.size) || 0), 0);
    const avgFileSize = files.length > 0 ? Math.round(totalStorageUsed / files.length) : 0;

    // File type distribution
    const categoryCounts = { image: 0, document: 0, code: 0, text: 0, audio_video: 0, archive: 0, other: 0 };
    const categoryBytes = { image: 0, document: 0, code: 0, text: 0, audio_video: 0, archive: 0, other: 0 };

    files.forEach(f => {
      const ext = (f.filename.split('.').pop() || '').toLowerCase();
      let cat = 'other';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) cat = 'image';
      else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) cat = 'document';
      else if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'json', 'sh', 'sql'].includes(ext)) cat = 'code';
      else if (['md', 'csv', 'log'].includes(ext)) cat = 'text';
      else if (['mp3', 'wav', 'mp4', 'mkv', 'webm', 'mov'].includes(ext)) cat = 'audio_video';
      else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) cat = 'archive';

      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      categoryBytes[cat] = (categoryBytes[cat] || 0) + (parseInt(f.size) || 0);
    });

    // Per-user storage mapping
    const userStorageMap = {};
    files.forEach(f => {
      userStorageMap[f.user_id] = (userStorageMap[f.user_id] || 0) + (parseInt(f.size) || 0);
    });

    const topUsers = profiles.map(p => ({
      id: p.id,
      email: p.email,
      name: p.full_name || 'Anonymous User',
      college: p.college,
      usedBytes: userStorageMap[p.id] || 0,
      limitBytes: parseInt(p.storage_limit) || 104857600,
      usagePercent: Math.min(100, Math.round(((userStorageMap[p.id] || 0) / (parseInt(p.storage_limit) || 104857600)) * 100))
    })).sort((a, b) => b.usedBytes - a.usedBytes).slice(0, 10);

    // Active Sessions (24h and 7d)
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const activeUsers24h = new Set(logs.filter(l => new Date(l.login_time).getTime() > dayAgo).map(l => l.user_id)).size;
    const activeUsers7d = new Set(logs.filter(l => new Date(l.login_time).getTime() > weekAgo).map(l => l.user_id)).size;

    // Peak Activity by Hour (0-23)
    const hourlyActivity = Array(24).fill(0);
    logs.forEach(l => {
      const hour = new Date(l.login_time).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    // Flagged accounts (brute force or failed attempts)
    const flaggedAccounts = profiles.filter(p => (p.failed_login_attempts && p.failed_login_attempts > 0) || p.locked_until).map(p => ({
      id: p.id,
      email: p.email,
      name: p.full_name,
      failedAttempts: p.failed_login_attempts || 0,
      lockedUntil: p.locked_until
    }));

    return res.json({
      totalStorageUsed,
      avgFileSize,
      categoryCounts,
      categoryBytes,
      topUsers,
      activeUsers24h,
      activeUsers7d,
      hourlyActivity,
      flaggedAccounts
    });
  } catch (err) {
    console.error('Failed to calculate analytics:', err);
    return res.status(500).json({ error: 'Failed to retrieve analytics data.' });
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

// GET /api/admin/users/:id/details - Deep drill-down details for a specific user
router.get('/users/:id/details', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = req.supabase;

    const [profileRes, filesRes, notesRes, shareCodesRes, loginLogsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('files').select('*').eq('user_id', id).order('created_at', { ascending: false }),
      supabase.from('notes').select('*').eq('user_id', id).order('created_at', { ascending: false }),
      supabase.from('share_codes').select('*, files!inner(user_id, filename)').filter('files.user_id', 'eq', id),
      supabase.from('login_logs').select('*').eq('user_id', id).order('login_time', { ascending: false }).limit(20)
    ]);

    if (!profileRes.data) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const files = filesRes.data || [];
    const notes = notesRes.data || [];
    const totalUsedBytes = files.reduce((acc, f) => acc + (parseInt(f.size) || 0), 0);

    return res.json({
      profile: profileRes.data,
      files,
      notes,
      shareCodes: shareCodesRes.data || [],
      loginLogs: loginLogsRes.data || [],
      stats: {
        fileCount: files.length,
        noteCount: notes.length,
        totalUsedBytes,
        limitBytes: parseInt(profileRes.data.storage_limit) || 104857600,
        usagePercent: Math.min(100, Math.round((totalUsedBytes / (parseInt(profileRes.data.storage_limit) || 104857600)) * 100))
      }
    });
  } catch (err) {
    console.error('Failed to fetch user details:', err);
    return res.status(500).json({ error: 'Failed to retrieve detailed user profile.' });
  }
});

// POST /api/admin/impersonate/:id - Log impersonation audit action & return user view metadata
router.post('/impersonate/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = req.supabase;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !profile) {
      return res.status(404).json({ error: 'Target user profile not found.' });
    }

    // Log mandatory audit trail for impersonation
    await logAudit(supabase, req.user, 'IMPERSONATE_USER_READ_ONLY', 'user', id, {
      impersonated_email: profile.email,
      impersonated_name: profile.full_name,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `Read-only impersonation session initiated for ${profile.email}`,
      targetUser: profile
    });
  } catch (err) {
    console.error('Failed to impersonate user:', err);
    return res.status(500).json({ error: 'Failed to start impersonation session.' });
  }
});

// POST /api/admin/users/bulk-action - Perform bulk operations on multiple user profiles
router.post('/users/bulk-action', async (req, res) => {
  const { userIds, action, value } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'No user IDs provided for bulk action.' });
  }

  try {
    const supabase = req.supabase;

    if (action === 'delete') {
      // Bulk Purge Users
      for (const userId of userIds) {
        const { data: files } = await supabase.from('files').select('storage_path').eq('user_id', userId);
        if (files && files.length > 0) {
          await supabase.storage.from('vault').remove(files.map(f => f.storage_path));
        }
        await supabase.rpc('admin_delete_user', { target_user_id: userId });
      }
      await logAudit(supabase, req.user, 'BULK_DELETE_USERS', 'user', userIds.join(','), { count: userIds.length });
      return res.json({ success: true, message: `Successfully purged ${userIds.length} user accounts.` });
    }

    const updates = {};
    if (action === 'lock_upload') updates.upload_locked = !!value;
    else if (action === 'lock_clipboard') updates.clipboard_locked = !!value;
    else if (action === 'lock_download') updates.download_locked = !!value;
    else if (action === 'lock_ops') updates.operations_locked = !!value;
    else if (action === 'suspend') updates.is_suspended = !!value;
    else if (action === 'set_storage_limit') updates.storage_limit = parseInt(value);
    else {
      return res.status(400).json({ error: 'Invalid bulk action specified.' });
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .in('id', userIds);

    if (error) throw error;

    await logAudit(supabase, req.user, `BULK_${action.toUpperCase()}`, 'user', userIds.join(','), { updates, count: userIds.length });

    return res.json({ success: true, message: `Bulk action applied to ${userIds.length} users.`, updates });
  } catch (err) {
    console.error('Failed bulk action:', err);
    return res.status(500).json({ error: 'Failed to execute bulk action.' });
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

    await logAudit(supabase, req.user, 'UPDATE_STORAGE_LIMIT', 'user', id, { new_limit: limit });

    return res.json({ success: true, message: 'User storage limit updated.' });
  } catch (err) {
    console.error('Failed to update storage limit:', err);
    return res.status(500).json({ error: 'Failed to update user quota.' });
  }
});

// POST /api/admin/users/:id/rename - Update user display name
router.post('/users/:id/rename', async (req, res) => {
  const { id } = req.params;
  const { full_name } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Name cannot be empty.' });
  }

  try {
    const supabase = req.supabase;
    const { error } = await supabase.rpc('admin_update_user_profile', {
      target_user_id: id,
      new_full_name: full_name.trim(),
    });

    if (error) throw error;

    await logAudit(supabase, req.user, 'RENAME_USER', 'user', id, { new_name: full_name.trim() });

    return res.json({ success: true, message: 'User profile name updated.' });
  } catch (err) {
    console.error('Failed to rename user profile:', err);
    return res.status(500).json({ error: 'Failed to rename profile.' });
  }
});

// DELETE /api/admin/users/:id - Delete a user account
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = req.supabase;

    const { data: profile } = await supabase.from('profiles').select('avatar_url, email').eq('id', id).maybeSingle();
    if (profile && profile.avatar_url) {
      await supabase.storage.from('vault').remove([profile.avatar_url]);
    }

    const { data: files } = await supabase.from('files').select('storage_path').eq('user_id', id);
    if (files && files.length > 0) {
      await supabase.storage.from('vault').remove(files.map(f => f.storage_path));
    }

    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id });
    if (error) throw error;

    await logAudit(supabase, req.user, 'PURGE_USER_ACCOUNT', 'user', id, { target_email: profile?.email });

    return res.json({ success: true, message: 'User account and storage files successfully wiped.' });
  } catch (err) {
    console.error('Failed to delete user account:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// GET /api/admin/global-files - Search files across platform for moderation
router.get('/global-files', async (req, res) => {
  try {
    const supabase = req.supabase;
    const { query, category } = req.query;

    let filesQuery = supabase.from('files').select('*').order('created_at', { ascending: false }).limit(200);

    if (query && query.trim()) {
      filesQuery = filesQuery.ilike('filename', `%${query.trim()}%`);
    }

    const [filesRes, profilesRes] = await Promise.all([
      filesQuery,
      supabase.from('profiles').select('id, full_name, email')
    ]);

    if (filesRes.error) throw filesRes.error;

    const profileMap = {};
    (profilesRes.data || []).forEach(p => {
      profileMap[p.id] = { name: p.full_name || 'Anonymous User', email: p.email || 'N/A' };
    });

    let files = (filesRes.data || []).map(f => ({
      ...f,
      userName: (profileMap[f.user_id] || {}).name || 'Anonymous User',
      userEmail: (profileMap[f.user_id] || {}).email || 'N/A'
    }));

    if (category && category !== 'all') {
      files = files.filter(f => {
        const ext = (f.filename.split('.').pop() || '').toLowerCase();
        if (category === 'image') return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
        if (category === 'document') return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext);
        if (category === 'code') return ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'json', 'sh', 'sql'].includes(ext);
        if (category === 'text') return ['md', 'csv', 'log'].includes(ext);
        return true;
      });
    }

    await logAudit(supabase, req.user, 'GLOBAL_FILE_SEARCH', 'search', query || 'ALL', { resultCount: files.length });

    return res.json(files);
  } catch (err) {
    console.error('Failed to search global files:', err);
    return res.status(500).json({ error: 'Failed to search files.' });
  }
});

// POST /api/admin/files/bulk-delete - Bulk delete files
router.post('/files/bulk-delete', async (req, res) => {
  const { fileIds } = req.body;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'No file IDs provided for deletion.' });
  }

  try {
    const supabase = req.supabase;
    const { data: files, error: selectErr } = await supabase.from('files').select('id, storage_path, filename').in('id', fileIds);

    if (selectErr) throw selectErr;

    if (files && files.length > 0) {
      const storagePaths = files.map(f => f.storage_path);
      await supabase.storage.from('vault').remove(storagePaths);
      await supabase.from('files').delete().in('id', fileIds);
    }

    await logAudit(supabase, req.user, 'BULK_DELETE_FILES', 'file', fileIds.join(','), { count: fileIds.length });

    return res.json({ success: true, message: `Successfully deleted ${fileIds.length} files.` });
  } catch (err) {
    console.error('Failed to bulk delete files:', err);
    return res.status(500).json({ error: 'Failed to bulk delete files.' });
  }
});

// POST /api/admin/snippets/bulk-delete - Bulk delete note snippets
router.post('/snippets/bulk-delete', async (req, res) => {
  const { snippetIds } = req.body;

  if (!Array.isArray(snippetIds) || snippetIds.length === 0) {
    return res.status(400).json({ error: 'No snippet IDs provided for deletion.' });
  }

  try {
    const supabase = req.supabase;
    const { error } = await supabase.from('notes').delete().in('id', snippetIds);
    if (error) throw error;

    await logAudit(supabase, req.user, 'BULK_DELETE_SNIPPETS', 'note', snippetIds.join(','), { count: snippetIds.length });

    return res.json({ success: true, message: `Successfully deleted ${snippetIds.length} text snippets.` });
  } catch (err) {
    console.error('Failed to bulk delete snippets:', err);
    return res.status(500).json({ error: 'Failed to delete snippets.' });
  }
});

// GET /api/admin/settings - Fetch platform settings & feature flags
router.get('/settings', async (req, res) => {
  try {
    const supabase = req.supabase;
    const { data, error } = await supabase.from('platform_settings').select('*');

    if (error) throw error;

    const defaultSettings = {
      maintenance_mode: false,
      default_storage_limit: 104857600, // 100MB
      max_file_size_mb: 50,
      blocked_extensions: ['exe', 'bat', 'sh', 'cmd', 'vbs', 'scr', 'dll'],
      auto_approve_threshold_mb: 500,
      feature_flags: {
        signups_enabled: true,
        uploads_enabled: true,
        clipboard_enabled: true,
        share_codes_enabled: true
      }
    };

    if (data && data.length > 0) {
      data.forEach(item => {
        defaultSettings[item.key] = item.value;
      });
    }

    return res.json(defaultSettings);
  } catch (err) {
    console.error('Failed to load platform settings:', err);
    return res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// POST /api/admin/settings - Update platform configuration
router.post('/settings', async (req, res) => {
  const settings = req.body;

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings payload.' });
  }

  try {
    const supabase = req.supabase;
    const keys = Object.keys(settings);

    for (const key of keys) {
      await supabase.from('platform_settings').upsert({
        key,
        value: settings[key],
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    }

    await logAudit(supabase, req.user, 'UPDATE_PLATFORM_SETTINGS', 'settings', 'global', { updatedKeys: keys });

    return res.json({ success: true, message: 'Platform settings updated successfully.' });
  } catch (err) {
    console.error('Failed to update platform settings:', err);
    return res.status(500).json({ error: 'Failed to save settings.' });
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

// GET /api/admin/request-history - Fetch approved & rejected storage requests history
router.get('/request-history', async (req, res) => {
  try {
    const supabase = req.supabase;
    const { data, error } = await supabase
      .from('storage_requests')
      .select('*')
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('Failed to load request history:', err);
    return res.status(500).json({ error: 'Failed to fetch request history.' });
  }
});

// POST /api/admin/requests/:id/approve - Approve storage upgrade request
router.post('/requests/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = req.supabase;
    const { data: request, error: fetchErr } = await supabase.from('storage_requests').select('*').eq('id', id).maybeSingle();

    if (fetchErr || !request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const { error } = await supabase
      .from('storage_requests')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) throw error;

    await logAudit(supabase, req.user, 'APPROVE_STORAGE_REQUEST', 'storage_request', id, {
      user_id: request.user_id,
      email: request.email,
      requested_limit: request.requested_limit
    });

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
    const { data: request } = await supabase.from('storage_requests').select('*').eq('id', id).maybeSingle();

    const { error } = await supabase
      .from('storage_requests')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;

    await logAudit(supabase, req.user, 'REJECT_STORAGE_REQUEST', 'storage_request', id, {
      user_id: request?.user_id,
      email: request?.email
    });

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

    await logAudit(supabase, req.user, 'DELETE_SNIPPET', 'note', id);

    return res.json({ success: true, message: 'Snippet deleted.' });
  } catch (err) {
    console.error('Failed to delete snippet:', err);
    return res.status(500).json({ error: 'Failed to delete snippet.' });
  }
});

// POST /api/admin/users/:id/lock - Toggle user feature locks
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
      .eq('id', id);

    if (error) throw error;

    await logAudit(supabase, req.user, 'TOGGLE_USER_LOCKS', 'user', id, updates);

    return res.json({ success: true, message: 'User locks updated successfully.', updates });
  } catch (err) {
    console.error('Failed to update user locks:', err);
    return res.status(500).json({ error: 'Failed to update user locks.' });
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
      .limit(100);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('Failed to load login logs:', err);
    return res.status(500).json({ error: 'Failed to fetch logs.' });
  }
});

// DELETE /api/admin/logs - Clear all login logs audit trail
router.delete('/logs', async (req, res) => {
  try {
    const supabase = req.supabase;
    const { error: rpcError } = await supabase.rpc('admin_clear_login_logs');

    if (rpcError) {
      console.warn('RPC clear failed, falling back to direct delete:', rpcError.message);
      const { error: deleteError } = await supabase
        .from('login_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;
    }

    await logAudit(supabase, req.user, 'CLEAR_LOGIN_LOGS', 'logs', 'all');

    return res.json({ success: true, message: 'Login logs cleared successfully.' });
  } catch (err) {
    console.error('Failed to clear login logs:', err);
    return res.status(500).json({ error: 'Failed to clear logs: ' + err.message });
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
      .limit(200);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

module.exports = router;
