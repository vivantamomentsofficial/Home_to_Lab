import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldAlert, Bell, ShieldCheck, Users, HardDrive, Clipboard, Activity, RefreshCw, ArrowLeft, Sun, Moon, LogOut,
  Search, Eye, Trash, Check, X, ShieldX, Key, Download, FileText, Plus, UserCheck, Shield, UploadCloud, Menu, Trash2
} from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileCategory = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  if (imageExts.includes(ext)) return 'image';
  
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
  if (docExts.includes(ext)) return 'document';
  
  const codeExts = ['java', 'py', 'html', 'css', 'js', 'json', 'xml', 'cpp', 'c', 'sh', 'sql', 'php', 'ts', 'jsx', 'tsx'];
  if (codeExts.includes(ext)) return 'code';
  
  const txtExts = ['txt', 'md', 'csv', 'log'];
  if (txtExts.includes(ext)) return 'text';
  
  return 'other';
};

const Admin = () => {
  const { session, supabase, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Page sections: 'overview' | 'users' | 'requests' | 'snippets' | 'logs'
  const [activeSection, setActiveSection] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Stats State
  const [stats, setStats] = useState({ usersCount: 0, filesCount: 0, notesCount: 0, loginsCount: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  // Users listing caching
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Login logs audit state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Upgrade requests state
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Snippets board state
  const [snippets, setSnippets] = useState([]);
  const [snippetsLoading, setSnippetsLoading] = useState(false);
  const [snippetSearchQuery, setSnippetSearchQuery] = useState('');

  // TARGET USER MODAL (ADMIN MANAGE MODE)
  const [showManageModal, setShowManageModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [targetUserFiles, setTargetUserFiles] = useState([]);
  const [targetUserNotes, setTargetUserNotes] = useState([]);
  const [targetInventoryLoading, setTargetInventoryLoading] = useState(false);

  // Action input states inside Manage Modal
  const [editNameInput, setEditNameInput] = useState('');
  const [editStorageLimit, setEditStorageLimit] = useState('');
  const [behalfNoteTitle, setBehalfNoteTitle] = useState('');
  const [behalfNoteContent, setBehalfNoteContent] = useState('');

  // Behalf uploader states
  const [behalfFile, setBehalfFile] = useState(null);
  const behalfFileRef = useRef(null);
  const [behalfUploadProgress, setBehalfUploadProgress] = useState(0);
  const [behalfUploading, setBehalfUploading] = useState(false);

  // Confirmation actions
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: '', message: '', action: null });

  // Lightbox Previews
  const [previewImage, setPreviewImage] = useState(null);
  const [previewText, setPreviewText] = useState(null);

  // Global announcements/alerts states
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Request Headers Generator
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    };
  };

  const getApiUrl = () => import.meta.env.VITE_API_URL || '';

  // 1. Fetch Dashboard overview stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/stats`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch statistics.');
      setStats(data);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to load overall statistics.', 'danger');
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch User Profiles list
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load user directory.');
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load user directories.', 'danger');
    } finally {
      setUsersLoading(false);
    }
  };

  // 3. Fetch audit login log sessions
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/logs`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load audit logs.');
      setLogs(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load audit trail logs.', 'danger');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearLogs = () => {
    setConfirmData({
      title: 'Clear Login Audits',
      message: 'This will compile all current login audit records into an Excel-compatible CSV download, and permanently delete all logs from the database. Are you sure you want to proceed?',
      action: async () => {
        try {
          // 1. Generate CSV content
          const headers = ['Email', 'Login Time', 'IP Address'];
          const rows = logs.map(l => [l.email, l.login_time, l.ip_address || 'N/A']);
          
          const formatCsvCell = (val) => {
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };
          
          const csvLines = [
            headers.join(','),
            ...rows.map(row => row.map(formatCsvCell).join(','))
          ];
          
          const csvContent = "\uFEFF" + csvLines.join('\n'); // Add BOM for Excel UTF-8 support
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `login_audits_clear_backup_${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // 2. Request backend to clear logs
          const res = await fetch(`${getApiUrl()}/api/admin/logs`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to clear logs.');
          
          showToast('Login audits backed up and cleared successfully!', 'success');
          fetchLogs(); // Reload logs state
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Failed to clear login logs.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // 4. Fetch pending storage upgrade requests
  const fetchUpgradeRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/requests`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retrieve storage requests.');
      setRequests(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch storage request directory.', 'danger');
    } finally {
      setRequestsLoading(false);
    }
  };

  // 5. Fetch overall database note snippets
  const fetchSnippets = async () => {
    setSnippetsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/snippets`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notes database.');
      setSnippets(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve snippets database.', 'danger');
    } finally {
      setSnippetsLoading(false);
    }
  };

  // 6. Global Alerts management functions
  const fetchGlobalAlerts = async () => {
    setAlertsLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_alerts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGlobalAlerts(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load announcements: ' + err.message, 'danger');
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleCreateAlertSubmit = async (e) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) {
      showToast('Title and message are required.', 'warning');
      return;
    }
    try {
      const { error } = await supabase
        .from('global_alerts')
        .insert({
          title: alertTitle.trim(),
          message: alertMessage.trim()
        });
      if (error) throw error;
      showToast('Announcement posted successfully!', 'success');
      setAlertTitle('');
      setAlertMessage('');
      fetchGlobalAlerts();
    } catch (err) {
      console.error(err);
      showToast('Failed to post announcement: ' + err.message, 'danger');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('global_alerts')
        .delete()
        .eq('id', alertId);
      if (error) throw error;
      showToast('Announcement deleted.', 'success');
      fetchGlobalAlerts();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete announcement: ' + err.message, 'danger');
    }
  };

  // Trigger page section fetch
  useEffect(() => {
    if (session) {
      if (activeSection === 'overview') fetchStats();
      if (activeSection === 'users') fetchUsers();
      if (activeSection === 'requests') fetchUpgradeRequests();
      if (activeSection === 'snippets') fetchSnippets();
      if (activeSection === 'logs') fetchLogs();
      if (activeSection === 'alerts') fetchGlobalAlerts();
    }
  }, [activeSection, session]);

  const refreshAll = async () => {
    showToast('Refreshing admin workspace...', 'info');
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchUpgradeRequests(),
      fetchSnippets(),
      fetchLogs(),
      fetchGlobalAlerts()
    ]);
    showToast('Dashboard details updated!', 'success');
  };

  // ==========================================
  // REQUEST ACTIONS (APPROVE / REJECT)
  // ==========================================
  const handleApproveRequest = async (id) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/requests/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Approval failed.');
      }
      showToast('Upgrade request approved successfully!', 'success');
      fetchUpgradeRequests();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to approve request.', 'danger');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/requests/${id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Rejection failed.');
      }
      showToast('Upgrade request rejected successfully.', 'success');
      fetchUpgradeRequests();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to reject request.', 'danger');
    }
  };

  // ==========================================
  // TARGET USER DATA LOAD (MANAGE MODAL)
  // ==========================================
  const handleOpenUserManagement = async (userProfile) => {
    setTargetUser(userProfile);
    setEditNameInput(userProfile.full_name || 'Anonymous User');
    setEditStorageLimit(userProfile.storage_limit.toString());
    setBehalfNoteTitle('');
    setBehalfNoteContent('');
    setBehalfFile(null);
    setBehalfUploadProgress(0);
    setBehalfUploading(false);

    setShowManageModal(true);
    setTargetInventoryLoading(true);

    try {
      // Direct supabase calls because admin's JWT authorizes full select access on these tables
      const [filesRes, notesRes] = await Promise.all([
        supabase
          .from('files')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('notes')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('created_at', { ascending: false }),
      ]);

      setTargetUserFiles(filesRes.data || []);
      setTargetUserNotes(notesRes.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve target user storage inventory.', 'danger');
    } finally {
      setTargetInventoryLoading(false);
    }
  };

  const reloadTargetInventory = async () => {
    if (!targetUser) return;
    try {
      const [filesRes, notesRes] = await Promise.all([
        supabase
          .from('files')
          .select('*')
          .eq('user_id', targetUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('notes')
          .select('*')
          .eq('user_id', targetUser.id)
          .order('created_at', { ascending: false }),
      ]);

      setTargetUserFiles(filesRes.data || []);
      setTargetUserNotes(notesRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Manage: Edit display name
  const handleUpdateTargetName = async (e) => {
    e.preventDefault();
    if (!editNameInput.trim()) return;

    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users/${targetUser.id}/rename`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ full_name: editNameInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user name.');

      showToast('Display name changed successfully!', 'success');
      setTargetUser((prev) => ({ ...prev, full_name: editNameInput.trim() }));
      fetchUsers(); // Sync list
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to rename user profile.', 'danger');
    }
  };

  // Manage: Edit Quota limit directly
  const handleUpdateTargetQuota = async (e) => {
    e.preventDefault();
    const limit = parseInt(editStorageLimit);
    if (isNaN(limit)) return;

    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users/${targetUser.id}/limit`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ limit }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update storage limit.');

      showToast('Storage quota changed successfully!', 'success');
      setTargetUser((prev) => ({ ...prev, storage_limit: limit }));
      fetchUsers(); // Sync list
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update storage limit.', 'danger');
    }
  };

  // Manage: Toggle user locks (Upload lock, Clipboard lock, Account suspension)
  const handleToggleLock = async (lockType, currentValue) => {
    if (!targetUser) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users/${targetUser.id}/lock`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ [lockType]: !currentValue }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle locks.');

      showToast(`User account locks updated!`, 'success');
      setTargetUser((prev) => ({ ...prev, [lockType]: !currentValue }));
      fetchUsers(); // Update main directory listings
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to toggle feature lock.', 'danger');
    }
  };

  // Manage: Delete target user file
  const handleDeleteUserFile = (fileId, path, filename) => {
    setConfirmData({
      title: 'Delete User File',
      message: `Are you sure you want to delete "${filename}" from this user's storage? This action is permanent.`,
      action: async () => {
        try {
          // Remove from bucket
          await supabase.storage.from('vault').remove([path]);
          // Purge db metadata
          await supabase.from('files').delete().eq('id', fileId);

          showToast('File deleted successfully.', 'success');
          reloadTargetInventory();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete file.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Manage: Delete target user snippet
  const handleDeleteUserNote = (noteId) => {
    setConfirmData({
      title: 'Delete User Snippet',
      message: 'Are you sure you want to delete this text snippet? This cannot be undone.',
      action: async () => {
        try {
          await supabase.from('notes').delete().eq('id', noteId);
          showToast('Snippet deleted.', 'success');
          reloadTargetInventory();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete snippet.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Manage: Add note snippet on behalf
  const handleAddNoteOnBehalf = async (e) => {
    e.preventDefault();
    if (!behalfNoteTitle.trim() || !behalfNoteContent.trim()) return;

    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          user_id: targetUser.id,
          title: behalfNoteTitle.trim(),
          content: behalfNoteContent
        });

      if (error) throw error;
      showToast('Snippet added successfully on behalf of user!', 'success');
      setBehalfNoteTitle('');
      setBehalfNoteContent('');
      reloadTargetInventory();
    } catch (err) {
      console.error(err);
      showToast('Failed to insert snippet.', 'danger');
    }
  };

  // Manage: Upload file on behalf
  const handleUploadFileOnBehalf = async (e) => {
    e.preventDefault();
    if (!behalfFile) return;

    setBehalfUploading(true);
    setBehalfUploadProgress(0);

    const path = `uploads/${targetUser.id}/${Date.now()}_${behalfFile.name}`;

    try {
      const { data, error: uploadErr } = await supabase.storage
        .from('vault')
        .upload(path, behalfFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: behalfFile.type || 'application/octet-stream',
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / (progress.total || behalfFile.size || 1)) * 100);
            setBehalfUploadProgress(percent);
          }
        });

      if (uploadErr) throw uploadErr;

      // Db insert
      const cat = getFileCategory(behalfFile.name);
      const { error: dbErr } = await supabase
        .from('files')
        .insert({
          user_id: targetUser.id,
          filename: behalfFile.name,
          storage_path: path,
          file_type: cat,
          size: behalfFile.size
        });

      if (dbErr) throw dbErr;

      showToast(`Uploaded "${behalfFile.name}" on behalf of user!`, 'success');
      setBehalfFile(null);
      if (behalfFileRef.current) behalfFileRef.current.value = '';
      reloadTargetInventory();
    } catch (err) {
      console.error(err);
      showToast('Failed to upload file.', 'danger');
    } finally {
      setBehalfUploading(false);
    }
  };

  // Manage: WIPE USER ACCOUNT COMPLETELY
  const handleWipeUserAccount = () => {
    setConfirmData({
      title: 'Danger Zone: Purge User Account',
      message: `WARNING: This will wipe ALL files from storage, delete all clippings, and delete ${targetUser.email}'s registration profile. This cannot be undone.`,
      action: async () => {
        try {
          showToast('Purging inventory and removing account...', 'info');
          const res = await fetch(`${getApiUrl()}/api/admin/users/${targetUser.id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Purge action failed.');

          showToast('Account successfully purged.', 'success');
          setShowManageModal(false);
          fetchUsers(); // Refresh main list
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Failed to wipe user account.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // DIRECT DELETE USER FROM DIRECTORY TABLE
  const handleDeleteUserDirect = (userId, email) => {
    setConfirmData({
      title: 'Purge User Account',
      message: `Are you sure you want to wipe and delete user ${email}? All files and clipboard notes will be destroyed permanently.`,
      action: async () => {
        try {
          showToast(`Purging account ${email}...`, 'info');
          const res = await fetch(`${getApiUrl()}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Purge failed.');

          showToast('Account successfully purged.', 'success');
          fetchUsers();
        } catch (err) {
          console.error(err);
          showToast('Purging failed.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // ==========================================
  // SNIPPETS BOARD (TAB) ACTIONS
  // ==========================================
  const handleCopySnippetText = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Snippet copied!', 'success'))
      .catch(() => showToast('Copy failed.', 'danger'));
  };

  const handleDeleteSnippetDirect = (id) => {
    setConfirmData({
      title: 'Delete User Snippet',
      message: 'Are you sure you want to permanently delete this user snippet? This cannot be undone.',
      action: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/snippets/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Delete failed.');

          showToast('Snippet deleted.', 'success');
          fetchSnippets();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete snippet.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // ==========================================
  // DIRECT USER INVENTORY FILE DOWNLOAD/PREVIEWS
  // ==========================================
  const handleAdminDownloadFile = async (path, filename) => {
    try {
      showToast('Creating download URL...', 'info');
      const { data, error } = await supabase.storage.from('vault').createSignedUrl(path, 60);
      if (error) throw error;
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error(err);
      showToast('Download failed.', 'danger');
    }
  };

  const handleAdminPreviewFile = async (file) => {
    const cat = getFileCategory(file.filename);
    if (cat === 'image') {
      try {
        const { data, error } = await supabase.storage.from('vault').createSignedUrl(file.storage_path, 300);
        if (error) throw error;
        setPreviewImage({ title: file.filename, url: data.signedUrl });
      } catch (e) {
        showToast('Image load failed.', 'danger');
      }
    } 
    else if (cat === 'document' && file.filename.toLowerCase().endsWith('.pdf')) {
      try {
        const { data, error } = await supabase.storage.from('vault').createSignedUrl(file.storage_path, 600);
        if (error) throw error;
        window.open(data.signedUrl, '_blank');
      } catch (e) {
        showToast('PDF load failed.', 'danger');
      }
    } 
    else if (cat === 'text' || cat === 'code') {
      try {
        const { data, error } = await supabase.storage.from('vault').download(file.storage_path);
        if (error) throw error;
        const text = await data.text();
        setPreviewText({ title: file.filename, content: text });
      } catch (e) {
        showToast('Text load failed.', 'danger');
      }
    } 
    else {
      showToast('Preview not supported for this file type.', 'warning');
    }
  };

  // ==========================================
  // FILTERS RESOLUTIONS
  // ==========================================
  const getFilteredUsers = () => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase();
    return users.filter(u => 
      (u.full_name && u.full_name.toLowerCase().includes(q)) || 
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.college && u.college.toLowerCase().includes(q))
    );
  };

  const getFilteredSnippets = () => {
    if (!snippetSearchQuery.trim()) return snippets;
    const q = snippetSearchQuery.toLowerCase();
    return snippets.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.content.toLowerCase().includes(q) ||
      (s.userName && s.userName.toLowerCase().includes(q)) ||
      (s.userEmail && s.userEmail.toLowerCase().includes(q))
    );
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300">
      
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 text-white z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-brand-primary-light" />
          <span className="font-display font-black text-lg text-white">CloudVault Admin</span>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 bg-slate-800 rounded-xl text-slate-300"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar navigation */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col p-5 z-40 border-r border-slate-800 transform lg:transform-none lg:opacity-100 transition-all duration-300 ${
          isDrawerOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between lg:justify-start gap-2.5 mb-8">
          <div className="flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-red-500 stroke-[2.5]" />
            <span className="font-display font-black text-xl text-white">
              CloudVault
            </span>
            <span className="px-2 py-0.5 bg-red-500/10 text-[9px] font-bold text-red-400 rounded tracking-wider uppercase border border-red-500/20">
              Admin
            </span>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="lg:hidden p-1 bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1.5">
          <button
            onClick={() => {
              setActiveSection('overview');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'overview'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-md shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Activity className="w-4 h-4" /> System Overview
          </button>
          
          <button
            onClick={() => {
              setActiveSection('users');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'users'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-md shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Users className="w-4 h-4" /> User Accounts
          </button>

          <button
            onClick={() => {
              setActiveSection('requests');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'requests'
                ? 'bg-gradient-to-r from-red-600 to-rose-655 text-white shadow-md shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <HardDrive className="w-4 h-4" /> Upgrade Requests
          </button>

          <button
            onClick={() => {
              setActiveSection('snippets');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'snippets'
                ? 'bg-gradient-to-r from-red-600 to-rose-655 text-white shadow-md shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Clipboard className="w-4 h-4" /> Snippets DB
          </button>

          <button
            onClick={() => {
              setActiveSection('logs');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'logs'
                ? 'bg-gradient-to-r from-red-600 to-rose-655 text-white shadow-md shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Key className="w-4 h-4" /> Login Audits
          </button>

          <button
            onClick={() => {
              setActiveSection('alerts');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'alerts'
                ? 'bg-gradient-to-r from-red-600 to-rose-655 text-white shadow-md shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Bell className="w-4 h-4" /> System Alerts
          </button>
        </nav>

        <div className="mt-auto flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800">
          <span>Super Admin console</span>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="p-1 text-slate-400 hover:text-red-400"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Overlay backdrop for mobile drawer */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 lg:hidden"
        ></div>
      )}

      {/* Main Panel Content */}
      <main className="flex-1 p-6 lg:p-10 flex flex-col gap-6 overflow-x-hidden min-w-0 z-10">
        
        {/* Top Header */}
        <header className="flex justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-800 dark:text-white">
              Super Admin Control Centre
            </h1>
            <p className="text-xs text-slate-400">
              Audit workspace assets and storage allocations.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={refreshAll}
              className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300"
              title="Refresh Workspace"
            >
              <RefreshCw className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* SECTION 1: OVERVIEW STATISTICS */}
        {activeSection === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            {statsLoading ? (
              <div className="col-span-4 py-16 flex justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : (
              <>
                <div className="glass-card p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black font-display text-slate-800 dark:text-white">
                      {stats.usersCount}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Total Users</p>
                  </div>
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="glass-card p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black font-display text-slate-800 dark:text-white">
                      {stats.filesCount}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Total Files</p>
                  </div>
                  <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                    <HardDrive className="w-6 h-6" />
                  </div>
                </div>

                <div className="glass-card p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black font-display text-slate-800 dark:text-white">
                      {stats.notesCount}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Total Notes</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                    <Clipboard className="w-6 h-6" />
                  </div>
                </div>

                <div className="glass-card p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black font-display text-slate-800 dark:text-white">
                      {stats.loginsCount}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Logins (24h)</p>
                  </div>
                  <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SECTION 2: USER DIRECTORY LIST */}
        {activeSection === 'users' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Registered User Directory</h3>
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name, email, college..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="input-field pl-9 py-2 text-xs"
                />
              </div>
            </div>

            {usersLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : getFilteredUsers().length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No users found matching search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold tracking-wider">
                      <th className="pb-3 pr-4 font-bold uppercase">User Name</th>
                      <th className="pb-3 px-4 font-bold uppercase">Email Address</th>
                      <th className="pb-3 px-4 font-bold uppercase">Status</th>
                      <th className="pb-3 px-4 font-bold uppercase">Joined Date</th>
                      <th className="pb-3 pl-4 font-bold uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {getFilteredUsers().map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center font-display font-semibold text-red-500 text-[10px] uppercase">
                            {userItem.full_name ? userItem.full_name.substring(0, 2) : 'U'}
                          </div>
                          <div>
                            <div>{userItem.full_name || 'Anonymous User'}</div>
                            {userItem.college && <div className="text-[10px] text-slate-400 font-normal">{userItem.college}</div>}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono select-all">{userItem.email}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {userItem.is_suspended && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[9px] font-extrabold rounded-full uppercase tracking-wider border border-red-200/50 dark:border-red-900/30">
                                Suspended
                              </span>
                            )}
                            {userItem.upload_locked && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold rounded-full uppercase tracking-wider border border-amber-200/50 dark:border-amber-900/30">
                                Upload Locked
                              </span>
                            )}
                            {userItem.clipboard_locked && (
                              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 text-[9px] font-extrabold rounded-full uppercase tracking-wider border border-yellow-200/50 dark:border-yellow-900/30">
                                Clip Locked
                              </span>
                            )}
                            {userItem.download_locked && (
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-[9px] font-extrabold rounded-full uppercase tracking-wider border border-purple-200/50 dark:border-purple-900/30">
                                Retrieve Locked
                              </span>
                            )}
                            {userItem.operations_locked && (
                              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-[9px] font-extrabold rounded-full uppercase tracking-wider border border-orange-200/50 dark:border-orange-900/30">
                                Ops Locked
                              </span>
                            )}
                            {!userItem.is_suspended && !userItem.upload_locked && !userItem.clipboard_locked && !userItem.download_locked && !userItem.operations_locked && (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold rounded-full uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-900/30">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(userItem.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenUserManagement(userItem)}
                              className="btn-secondary hover:bg-slate-50 dark:hover:bg-slate-800/80 py-1.5 px-3 text-[10px] flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Data
                            </button>
                            <button
                              onClick={() => handleDeleteUserDirect(userItem.id, userItem.email)}
                              className="btn-danger bg-red-500 hover:bg-red-650 py-1.5 px-3 text-[10px] flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" /> Purge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: STORAGE UPGRADE REQUESTS */}
        {activeSection === 'requests' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Pending Storage Upgrade Requests</h3>

            {requestsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No pending storage upgrade requests.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold tracking-wider">
                      <th className="pb-3 pr-4 font-bold uppercase">Requested Email</th>
                      <th className="pb-3 px-4 font-bold uppercase">Target Size</th>
                      <th className="pb-3 px-4 font-bold uppercase">Date Requested</th>
                      <th className="pb-3 pl-4 font-bold uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {requests.map((reqItem) => (
                      <tr key={reqItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-white font-mono select-all">
                          {reqItem.email}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-brand-primary dark:text-brand-primary-light">
                          {formatBytes(reqItem.requested_limit)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(reqItem.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveRequest(reqItem.id)}
                              className="btn-primary py-1.5 px-3 text-[10px] flex items-center gap-1 bg-green-600 hover:bg-green-700 shadow-none"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(reqItem.id)}
                              className="btn-secondary py-1.5 px-3 text-[10px] flex items-center gap-1 border-red-500/20 text-red-500 hover:bg-red-500/5"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: SNIPPETS BOARD DATABASE */}
        {activeSection === 'snippets' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Clipboard Snippets Database</h3>
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search owner name, email, titles..."
                  value={snippetSearchQuery}
                  onChange={(e) => setSnippetSearchQuery(e.target.value)}
                  className="input-field pl-9 py-2 text-xs"
                />
              </div>
            </div>

            {snippetsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : getFilteredSnippets().length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No note clippings found in snippets database.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold tracking-wider">
                      <th className="pb-3 pr-4 font-bold uppercase">Owner Details</th>
                      <th className="pb-3 px-4 font-bold uppercase">Snippet Title</th>
                      <th className="pb-3 px-4 font-bold uppercase">Content Preview</th>
                      <th className="pb-3 pl-4 font-bold uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {getFilteredSnippets().map((snippet) => (
                      <tr key={snippet.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3.5 pr-4 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-display font-semibold text-[11px] uppercase">
                            {snippet.userName ? snippet.userName.substring(0, 2) : 'CL'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{snippet.userName || 'Guest User'}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{snippet.userEmail}</div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]" title={snippet.title}>
                          {snippet.title}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-lg text-slate-600 dark:text-slate-400 font-mono select-all truncate block max-w-[200px]" title={snippet.content}>
                            {snippet.content}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewText({ title: snippet.title, content: snippet.content })}
                              className="btn-secondary hover:bg-slate-50 dark:hover:bg-slate-800/80 py-1.5 px-2.5 text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button
                              onClick={() => handleCopySnippetText(snippet.content)}
                              className="btn-secondary hover:bg-slate-50 dark:hover:bg-slate-800/80 py-1.5 px-2.5 text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => handleDeleteSnippetDirect(snippet.id)}
                              className="btn-danger bg-red-500 hover:bg-red-650 py-1.5 px-2.5 text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: LOGIN SESSION LOGS AUDITS */}
        {activeSection === 'logs' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in max-w-2xl">
            <div className="flex justify-between items-center gap-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Security Audits: User Logins (Recent 50)</h3>
              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="btn-danger bg-red-600 hover:bg-red-750 text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-red-500/10 border-0 outline-none"
                >
                  <Trash2 className="w-4 h-4" /> Clear Logs
                </button>
              )}
            </div>

            {logsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No logins tracked yet in log registries.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1.5">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="glass-card p-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono select-all truncate">
                        {log.email}
                      </span>
                      {log.ip_address && (
                        <span className="px-2 py-0.5 bg-slate-100 text-[10px] text-slate-500 rounded font-mono font-bold">
                          IP: {log.ip_address}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                      {new Date(log.login_time).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SYSTEM ALERTS */}
        {activeSection === 'alerts' && (
          <div className="glass-card p-6 flex flex-col gap-6 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Global System Announcements</h3>
              <p className="text-xs text-slate-400">
                Post custom popup alerts that will be shown to users for 10 seconds immediately when they load their dashboard.
              </p>
            </div>

            {/* Create Announcement Form */}
            <form onSubmit={handleCreateAlertSubmit} className="space-y-4 max-w-xl bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Create New Alert</h4>
              <div>
                <label className="label-title">ALERT TITLE</label>
                <input
                  type="text"
                  placeholder="e.g. Server Maintenance Notice"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  className="input-field py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="label-title">ALERT MESSAGE</label>
                <textarea
                  rows={3}
                  placeholder="Enter notice details for users..."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  className="input-field py-2 text-xs"
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" /> Post Announcement
              </button>
            </form>

            {/* Current Active Announcements List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Announcements</h4>
              {alertsLoading ? (
                <div className="flex items-center py-6">
                  <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                </div>
              ) : globalAlerts.length === 0 ? (
                <div className="text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-2xl text-center">
                  No active announcements posted.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {globalAlerts.map((alert) => (
                    <div key={alert.id} className="glass-card p-5 border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-brand-primary shrink-0" />
                          <h5 className="font-bold text-sm text-slate-800 dark:text-white truncate">{alert.title}</h5>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{alert.message}</p>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Posted: {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-end border-t border-slate-100 dark:border-slate-850 pt-3">
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="btn-danger py-1.5 px-3 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash className="w-3 h-3" /> Delete Alert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
          MODALS & DIALOGS
      ========================================== */}
      
      {/* 1. Global Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-sm w-full p-6 shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              {confirmData.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              {confirmData.message}
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  if (confirmData.action) confirmData.action();
                }}
                className="btn-danger py-2 px-4 text-xs font-bold"
              >
                Purge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Target User Inventory Management Modal */}
      {showManageModal && targetUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="glass-card max-w-4xl w-full p-6 lg:p-8 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col gap-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                  User Management console
                </h2>
                <p className="text-xs text-slate-400 font-mono truncate select-all mt-1">
                  Target Account: {targetUser.email}
                </p>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Modification Forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-850">
              {/* Display name edit */}
              <form onSubmit={handleUpdateTargetName} className="flex flex-col gap-3">
                <label className="label-title">DISPLAY NAME</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    className="input-field py-2 text-xs"
                    required
                  />
                  <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold w-20">
                    Rename
                  </button>
                </div>
              </form>

              {/* Quota direct edit */}
              <form onSubmit={handleUpdateTargetQuota} className="flex flex-col gap-3">
                <label className="label-title">STORAGE QUOTA LIMIT</label>
                <div className="flex gap-2">
                  <select
                    value={editStorageLimit}
                    onChange={(e) => setEditStorageLimit(e.target.value)}
                    className="input-field py-2 text-xs"
                  >
                    <option value="104857600">100 MB</option>
                    <option value="209715200">200 MB</option>
                    <option value="524288000">500 MB</option>
                    <option value="1073741824">1 GB</option>
                    <option value="2147483648">2 GB</option>
                  </select>
                  <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold w-20">
                    Update
                  </button>
                </div>
              </form>
            </div>

            {/* Admin Feature Locking Controls */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-display">Account Constraint Privileges</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleLock('upload_locked', targetUser.upload_locked)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    targetUser.upload_locked
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" /> {targetUser.upload_locked ? 'Unlock Uploads' : 'Lock Uploads'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLock('clipboard_locked', targetUser.clipboard_locked)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    targetUser.clipboard_locked
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Clipboard className="w-4 h-4" /> {targetUser.clipboard_locked ? 'Unlock Clipboard' : 'Lock Clipboard'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLock('download_locked', targetUser.download_locked)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    targetUser.download_locked
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Download className="w-4 h-4" /> {targetUser.download_locked ? 'Unlock Retrieve' : 'Lock Retrieve'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLock('operations_locked', targetUser.operations_locked)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    targetUser.operations_locked
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Folder className="w-4 h-4" /> {targetUser.operations_locked ? 'Unlock Operations' : 'Lock Operations'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLock('is_suspended', targetUser.is_suspended)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    targetUser.is_suspended
                      ? 'bg-red-650 border-red-650 text-white hover:bg-red-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" /> {targetUser.is_suspended ? 'Activate Account' : 'Suspend Account'}
                </button>
              </div>
            </div>

            {/* Action Tools: Upload On Behalf & Add Note On Behalf */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-850">
              {/* Behalf Note */}
              <form onSubmit={handleAddNoteOnBehalf} className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Create Snippet On Behalf</h4>
                <input
                  type="text"
                  placeholder="Note Title"
                  value={behalfNoteTitle}
                  onChange={(e) => setBehalfNoteTitle(e.target.value)}
                  className="input-field py-2 text-xs"
                  required
                />
                <textarea
                  rows={3}
                  placeholder="Note snippet content..."
                  value={behalfNoteContent}
                  onChange={(e) => setBehalfNoteContent(e.target.value)}
                  className="input-field py-2 text-xs"
                  required
                ></textarea>
                <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold self-end flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Save Note
                </button>
              </form>

              {/* Behalf Upload */}
              <form onSubmit={handleUploadFileOnBehalf} className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Upload File On Behalf</h4>
                <input
                  type="file"
                  ref={behalfFileRef}
                  onChange={(e) => setBehalfFile(e.target.files[0] || null)}
                  className="input-field py-2 text-xs"
                  required
                />
                {behalfUploading && (
                  <div className="w-full flex items-center gap-2.5 text-xs text-brand-primary">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-primary rounded-full" style={{ width: `${behalfUploadProgress}%` }}></div>
                    </div>
                    <span>{behalfUploadProgress}%</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={behalfUploading || !behalfFile}
                  className="btn-primary py-2 px-4 text-xs font-bold self-end flex items-center gap-1"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> {behalfUploading ? 'Uploading...' : 'Upload File'}
                </button>
              </form>
            </div>

            {/* Inventory List (Files & Notes) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Files */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center justify-between">
                  <span>Uploaded Files</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {targetUserFiles.length} Total
                  </span>
                </h3>
                
                {targetInventoryLoading ? (
                  <div className="flex justify-center items-center py-6">
                    <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : targetUserFiles.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">No files uploaded yet.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    {targetUserFiles.map((file) => (
                      <div key={file.id} className="glass-card p-2.5 flex items-center justify-between gap-3 text-xs border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate flex-1" title={file.filename}>
                          {file.filename}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleAdminPreviewFile(file)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Preview file"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAdminDownloadFile(file.storage_path, file.filename)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUserFile(file.id, file.storage_path, file.filename)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"
                            title="Delete file"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center justify-between">
                  <span>Notes snippets</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {targetUserNotes.length} Total
                  </span>
                </h3>
                
                {targetInventoryLoading ? (
                  <div className="flex justify-center items-center py-6">
                    <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : targetUserNotes.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">No note snippets logged yet.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    {targetUserNotes.map((note) => (
                      <div key={note.id} className="glass-card p-2.5 flex items-center justify-between gap-3 text-xs border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate flex-1" title={note.title}>
                          {note.title}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setPreviewText({ title: note.title, content: note.content })}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Preview snippet"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUserNote(note.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"
                            title="Delete snippet"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* WIPE USER CARD */}
            <div className="mt-4 pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 leading-normal max-w-sm">
                <strong>Attention</strong>: Wiping the user wipes all database inventory records, storage allocations, and deletes the authentication profile registration entry.
              </span>
              <button
                onClick={handleWipeUserAccount}
                className="btn-danger py-2 px-4 text-xs font-bold flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" /> Wipe Account
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. Image Lightbox preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="max-w-2xl w-full flex flex-col gap-3.5 relative animate-scale-up">
            <div className="flex justify-between items-center text-white">
              <h3 className="text-sm font-bold truncate pr-6">{previewImage.title}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 p-2 flex justify-center items-center max-h-[75vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Code/Text preview modal */}
      {previewText && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-xl w-full p-6 shadow-2xl animate-scale-up flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white truncate pr-6">
                Preview: {previewText.title}
              </h3>
              <button
                onClick={() => setPreviewText(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar max-h-[50vh] font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
              {previewText.content}
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewText.content)
                    .then(() => showToast('Copied content to clipboard!', 'success'))
                    .catch(() => showToast('Copy failed.', 'danger'));
                }}
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                Copy Content
              </button>
              <button
                onClick={() => setPreviewText(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
