import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldAlert, Bell, ShieldCheck, Users, HardDrive, Clipboard, Activity, RefreshCw, ArrowLeft, Sun, Moon, LogOut,
  Search, Eye, Trash, Check, X, ShieldX, Key, Download, FileText, Plus, UserCheck, Shield, UploadCloud, Menu, Trash2,
  Folder, Sliders, AlertTriangle, Lock, Unlock, BarChart2, PieChart, Clock, Filter, FileCode, CheckSquare, Square,
  ExternalLink, UserPlus, Server, Database, Settings as SettingsIcon, AlertCircle, History
} from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileCategory = (filename) => {
  if (!filename) return 'other';
  const ext = filename.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt'].includes(ext)) return 'document';
  if (['java', 'py', 'html', 'css', 'js', 'json', 'xml', 'cpp', 'c', 'sh', 'sql', 'php', 'ts', 'jsx', 'tsx'].includes(ext)) return 'code';
  if (['txt', 'md', 'csv', 'log'].includes(ext)) return 'text';
  if (['mp3', 'wav', 'mp4', 'mkv', 'webm', 'mov'].includes(ext)) return 'audio';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'archive';
  return 'other';
};

const Admin = () => {
  const { session, supabase, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Active Navigation Tab
  // 'overview' | 'users' | 'global_files' | 'requests' | 'snippets' | 'settings' | 'audit_logs' | 'login_logs' | 'alerts'
  const [activeSection, setActiveSection] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Stats & Analytics State
  const [stats, setStats] = useState({
    usersCount: 0, filesCount: 0, notesCount: 0, loginsCount: 0,
    pendingRequestsCount: 0, totalStorageBytes: 0, suspendedCount: 0, lockedCount: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const [analytics, setAnalytics] = useState({
    totalStorageUsed: 0, avgFileSize: 0,
    categoryCounts: {}, categoryBytes: {},
    topUsers: [], activeUsers24h: 0, activeUsers7d: 0,
    hourlyActivity: Array(24).fill(0), flaggedAccounts: []
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Users Directory State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended' | 'locked' | 'high_usage'
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // User Detail Drill-Down Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [targetUserDetails, setTargetUserDetails] = useState(null);
  const [targetUserTab, setTargetUserTab] = useState('files'); // 'files' | 'notes' | 'shareCodes' | 'logs'
  const [detailLoading, setDetailLoading] = useState(false);

  // Read-only Impersonation Banner State
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  // Global File Search & Moderation State
  const [globalFiles, setGlobalFiles] = useState([]);
  const [globalFilesLoading, setGlobalFilesLoading] = useState(false);
  const [globalFileQuery, setGlobalFileQuery] = useState('');
  const [globalFileCatFilter, setGlobalFileCatFilter] = useState('all');
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Upgrade Requests State
  const [requests, setRequests] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestSubTab, setRequestSubTab] = useState('pending'); // 'pending' | 'history'

  // Snippets Moderation State
  const [snippets, setSnippets] = useState([]);
  const [snippetsLoading, setSnippetsLoading] = useState(false);
  const [snippetSearchQuery, setSnippetSearchQuery] = useState('');
  const [selectedSnippetIds, setSelectedSnippetIds] = useState([]);

  // Audit Logs State
  const [adminAuditLogs, setAdminAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  // Login Session Logs State
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);

  // Platform Configuration State
  const [platformSettings, setPlatformSettings] = useState({
    maintenance_mode: false,
    default_storage_limit: 104857600,
    max_file_size_mb: 50,
    blocked_extensions: ['exe', 'bat', 'sh', 'cmd', 'vbs', 'scr', 'dll'],
    auto_approve_threshold_mb: 500,
    feature_flags: {
      signups_enabled: true,
      uploads_enabled: true,
      clipboard_enabled: true,
      share_codes_enabled: true
    }
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [newExtInput, setNewExtInput] = useState('');

  // Global Alerts / Announcements State
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Target User Modal Action Forms (Rename / Limit / Behalf Upload / Note)
  const [editNameInput, setEditNameInput] = useState('');
  const [editStorageLimit, setEditStorageLimit] = useState('');
  const [behalfNoteTitle, setBehalfNoteTitle] = useState('');
  const [behalfNoteContent, setBehalfNoteContent] = useState('');
  const [behalfFile, setBehalfFile] = useState(null);
  const behalfFileRef = useRef(null);
  const [behalfUploading, setBehalfUploading] = useState(false);

  // Global Confirmation Dialog
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: '', message: '', action: null, isDanger: false });

  // Lightbox Previews
  const [previewImage, setPreviewImage] = useState(null);
  const [previewText, setPreviewText] = useState(null);

  // Request Headers
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  });

  const getApiUrl = () => import.meta.env.VITE_API_URL || '';

  // -------------------------------------------------------------
  // Data Fetching Functions
  // -------------------------------------------------------------
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

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/analytics`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load analytics.');
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load storage analytics.', 'danger');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load user directory.');
      setUsers(data || []);
      setSelectedUserIds([]);
    } catch (err) {
      console.error(err);
      showToast('Failed to load user directories.', 'danger');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchGlobalFiles = async () => {
    setGlobalFilesLoading(true);
    try {
      const params = new URLSearchParams({ query: globalFileQuery, category: globalFileCatFilter });
      const res = await fetch(`${getApiUrl()}/api/admin/global-files?${params}`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search files.');
      setGlobalFiles(data || []);
      setSelectedFileIds([]);
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve file search index.', 'danger');
    } finally {
      setGlobalFilesLoading(false);
    }
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        fetch(`${getApiUrl()}/api/admin/requests`, { headers: getHeaders() }),
        fetch(`${getApiUrl()}/api/admin/request-history`, { headers: getHeaders() })
      ]);
      const pendingData = await pendingRes.json();
      const historyData = await historyRes.json();

      setRequests(pendingData || []);
      setRequestHistory(historyData || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch storage request directory.', 'danger');
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchSnippets = async () => {
    setSnippetsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/snippets`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notes database.');
      setSnippets(data || []);
      setSelectedSnippetIds([]);
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve snippets database.', 'danger');
    } finally {
      setSnippetsLoading(false);
    }
  };

  const fetchPlatformSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/settings`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load settings.');
      setPlatformSettings(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load platform configuration.', 'danger');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchAdminAuditLogs = async () => {
    setAuditLogsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/audit-logs`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load admin audit logs.');
      setAdminAuditLogs(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load audit logs.', 'danger');
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const fetchLoginLogs = async () => {
    setLoginLogsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/logs`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load login logs.');
      setLoginLogs(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load login audits.', 'danger');
    } finally {
      setLoginLogsLoading(false);
    }
  };

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
      showToast('Failed to load announcements.', 'danger');
    } finally {
      setAlertsLoading(false);
    }
  };

  // Section Change Effects
  useEffect(() => {
    if (session) {
      if (activeSection === 'overview') {
        fetchStats();
        fetchAnalytics();
      } else if (activeSection === 'users') {
        fetchUsers();
      } else if (activeSection === 'global_files') {
        fetchGlobalFiles();
      } else if (activeSection === 'requests') {
        fetchRequests();
      } else if (activeSection === 'snippets') {
        fetchSnippets();
      } else if (activeSection === 'settings') {
        fetchPlatformSettings();
      } else if (activeSection === 'audit_logs') {
        fetchAdminAuditLogs();
      } else if (activeSection === 'login_logs') {
        fetchLoginLogs();
      } else if (activeSection === 'alerts') {
        fetchGlobalAlerts();
      }
    }
  }, [activeSection, session]);

  const refreshAll = async () => {
    showToast('Refreshing admin workspace...', 'info');
    await Promise.all([
      fetchStats(),
      fetchAnalytics(),
      fetchUsers(),
      fetchRequests(),
      fetchSnippets(),
      fetchPlatformSettings(),
      fetchAdminAuditLogs(),
      fetchLoginLogs(),
      fetchGlobalAlerts()
    ]);
    showToast('Admin dashboard updated!', 'success');
  };

  // -------------------------------------------------------------
  // USER MANAGEMENT & BULK ACTIONS
  // -------------------------------------------------------------
  const handleSelectAllUsers = (e) => {
    if (e.target.checked) {
      const filtered = getFilteredUsers();
      setSelectedUserIds(filtered.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleSelectUser = (id) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(uId => uId !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action, value) => {
    if (selectedUserIds.length === 0) {
      showToast('Select at least one user.', 'warning');
      return;
    }

    const actionNames = {
      lock_upload: value ? 'Lock Uploads' : 'Unlock Uploads',
      lock_clipboard: value ? 'Lock Clipboard' : 'Unlock Clipboard',
      lock_download: value ? 'Lock Downloads' : 'Unlock Downloads',
      lock_ops: value ? 'Lock Operations' : 'Unlock Operations',
      suspend: value ? 'Suspend Accounts' : 'Unsuspend Accounts',
      set_storage_limit: `Set Storage Limit (${formatBytes(value)})`,
      delete: 'PURGE USER ACCOUNTS'
    };

    setConfirmData({
      title: `Bulk Action: ${actionNames[action]}`,
      message: `Are you sure you want to perform "${actionNames[action]}" on ${selectedUserIds.length} selected user account(s)?`,
      isDanger: action === 'delete' || action === 'suspend',
      action: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/users/bulk-action`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userIds: selectedUserIds, action, value }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Bulk action failed.');

          showToast(data.message || 'Bulk action completed successfully!', 'success');
          setSelectedUserIds([]);
          fetchUsers();
          fetchStats();
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Failed to execute bulk action.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // User CSV Export
  const handleExportUsersCSV = () => {
    try {
      const filtered = getFilteredUsers();
      const headers = ['ID', 'Full Name', 'Email', 'College', 'Storage Limit (MB)', 'Suspended', 'Upload Locked', 'Clipboard Locked', 'Joined Date'];
      const rows = filtered.map(u => [
        u.id,
        u.full_name || 'N/A',
        u.email || 'N/A',
        u.college || 'N/A',
        Math.round((u.storage_limit || 104857600) / (1024 * 1024)),
        u.is_suspended ? 'YES' : 'NO',
        u.upload_locked ? 'YES' : 'NO',
        u.clipboard_locked ? 'YES' : 'NO',
        new Date(u.created_at).toLocaleString()
      ]);

      const formatCsvCell = (val) => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvLines = [headers.join(','), ...rows.map(r => r.map(formatCsvCell).join(','))];
      const blob = new Blob(["\uFEFF" + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloudvault_users_export_${Date.now()}.csv`;
      a.click();

      showToast(`Exported ${filtered.length} users to CSV!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export CSV.', 'danger');
    }
  };

  // Filtered Users computation
  const getFilteredUsers = () => {
    let result = users;
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      result = result.filter(u => 
        (u.full_name && u.full_name.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.college && u.college.toLowerCase().includes(q))
      );
    }

    if (userStatusFilter === 'active') {
      result = result.filter(u => !u.is_suspended && !u.upload_locked && !u.clipboard_locked && !u.download_locked && !u.operations_locked);
    } else if (userStatusFilter === 'suspended') {
      result = result.filter(u => u.is_suspended);
    } else if (userStatusFilter === 'locked') {
      result = result.filter(u => u.upload_locked || u.clipboard_locked || u.download_locked || u.operations_locked);
    }

    return result;
  };

  // -------------------------------------------------------------
  // USER DETAIL DRILL-DOWN & READ-ONLY IMPERSONATION
  // -------------------------------------------------------------
  const handleOpenUserDetail = async (userProfile) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    setEditNameInput(userProfile.full_name || '');
    setEditStorageLimit((userProfile.storage_limit || 104857600).toString());

    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users/${userProfile.id}/details`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load user details.');
      setTargetUserDetails(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch detailed user inventory.', 'danger');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStartImpersonation = async (userId) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/impersonate/${userId}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impersonation failed.');

      setImpersonatedUser(data.targetUser);
      showToast(`Initiated read-only impersonation session for ${data.targetUser.email}`, 'info');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to start impersonation.', 'danger');
    }
  };

  // Manage: Edit display name
  const handleUpdateTargetName = async (e) => {
    e.preventDefault();
    if (!editNameInput.trim() || !targetUserDetails) return;

    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users/${targetUserDetails.profile.id}/rename`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ full_name: editNameInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user name.');

      showToast('Display name updated!', 'success');
      setTargetUserDetails(prev => ({
        ...prev,
        profile: { ...prev.profile, full_name: editNameInput.trim() }
      }));
      fetchUsers();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to rename user profile.', 'danger');
    }
  };

  // Manage: Edit Quota limit directly
  const handleUpdateTargetQuota = async (newLimitBytes) => {
    if (!targetUserDetails) return;

    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users/${targetUserDetails.profile.id}/limit`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ limit: newLimitBytes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update storage limit.');

      showToast(`Storage quota updated to ${formatBytes(newLimitBytes)}!`, 'success');
      setEditStorageLimit(newLimitBytes.toString());
      setTargetUserDetails(prev => ({
        ...prev,
        profile: { ...prev.profile, storage_limit: newLimitBytes }
      }));
      fetchUsers();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update storage limit.', 'danger');
    }
  };

  // Manage: Toggle user locks
  const handleToggleLock = async (lockType, currentValue) => {
    if (!targetUserDetails) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users/${targetUserDetails.profile.id}/lock`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ [lockType]: !currentValue }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle lock.');

      showToast('User constraint privileges updated!', 'success');
      setTargetUserDetails(prev => ({
        ...prev,
        profile: { ...prev.profile, [lockType]: !currentValue }
      }));
      fetchUsers();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update user lock.', 'danger');
    }
  };

  // -------------------------------------------------------------
  // GLOBAL FILE SEARCH & MODERATION
  // -------------------------------------------------------------
  const handleSelectAllFiles = (e) => {
    if (e.target.checked) {
      setSelectedFileIds(globalFiles.map(f => f.id));
    } else {
      setSelectedFileIds([]);
    }
  };

  const handleToggleSelectFile = (id) => {
    setSelectedFileIds(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
  };

  const handleBulkDeleteFiles = async () => {
    if (selectedFileIds.length === 0) return;

    setConfirmData({
      title: 'Bulk Delete Storage Files',
      message: `Are you sure you want to permanently delete ${selectedFileIds.length} selected files from user storage? This cannot be undone.`,
      isDanger: true,
      action: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/files/bulk-delete`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ fileIds: selectedFileIds }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Bulk delete failed.');

          showToast(data.message || 'Files deleted successfully!', 'success');
          setSelectedFileIds([]);
          fetchGlobalFiles();
          fetchStats();
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Failed to delete files.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // -------------------------------------------------------------
  // SNIPPETS BOARD MODERATION & BULK DELETE
  // -------------------------------------------------------------
  const handleSelectAllSnippets = (e) => {
    if (e.target.checked) {
      const filtered = getFilteredSnippets();
      setSelectedSnippetIds(filtered.map(s => s.id));
    } else {
      setSelectedSnippetIds([]);
    }
  };

  const handleToggleSelectSnippet = (id) => {
    setSelectedSnippetIds(prev => prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]);
  };

  const handleBulkDeleteSnippets = async () => {
    if (selectedSnippetIds.length === 0) return;

    setConfirmData({
      title: 'Bulk Delete Text Snippets',
      message: `Are you sure you want to delete ${selectedSnippetIds.length} selected note snippets? This action cannot be undone.`,
      isDanger: true,
      action: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/snippets/bulk-delete`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ snippetIds: selectedSnippetIds }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Bulk delete failed.');

          showToast(data.message || 'Snippets deleted successfully!', 'success');
          setSelectedSnippetIds([]);
          fetchSnippets();
          fetchStats();
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Failed to delete snippets.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
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

  // -------------------------------------------------------------
  // PLATFORM CONFIGURATION & FEATURE FLAGS
  // -------------------------------------------------------------
  const handleSavePlatformSettings = async (updatedSettings) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/settings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(updatedSettings),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings.');

      setPlatformSettings(updatedSettings);
      showToast('Platform settings updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update settings.', 'danger');
    }
  };

  const handleAddBlockedExtension = () => {
    if (!newExtInput.trim()) return;
    const cleanExt = newExtInput.trim().toLowerCase().replace(/^\./, '');
    if (platformSettings.blocked_extensions.includes(cleanExt)) {
      showToast('Extension already in blocked list.', 'warning');
      return;
    }
    const updated = {
      ...platformSettings,
      blocked_extensions: [...platformSettings.blocked_extensions, cleanExt]
    };
    handleSavePlatformSettings(updated);
    setNewExtInput('');
  };

  const handleRemoveBlockedExtension = (extToRemove) => {
    const updated = {
      ...platformSettings,
      blocked_extensions: platformSettings.blocked_extensions.filter(e => e !== extToRemove)
    };
    handleSavePlatformSettings(updated);
  };

  // -------------------------------------------------------------
  // AUDIT LOGS CSV EXPORT
  // -------------------------------------------------------------
  const handleExportAuditLogsCSV = () => {
    try {
      const headers = ['Timestamp', 'Admin Email', 'Action', 'Target Type', 'Target ID', 'Details'];
      const rows = adminAuditLogs.map(l => [
        new Date(l.created_at).toLocaleString(),
        l.admin_email || 'N/A',
        l.action,
        l.target_type || 'N/A',
        l.target_id || 'N/A',
        JSON.stringify(l.details || {})
      ]);

      const formatCsvCell = (val) => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvLines = [headers.join(','), ...rows.map(r => r.map(formatCsvCell).join(','))];
      const blob = new Blob(["\uFEFF" + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin_audit_logs_${Date.now()}.csv`;
      a.click();

      showToast('Admin audit logs exported to CSV!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export audit logs.', 'danger');
    }
  };

  // -------------------------------------------------------------
  // ANNOUNCEMENTS / GLOBAL ALERTS
  // -------------------------------------------------------------
  const handleCreateAlertSubmit = async (e) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) return;

    try {
      const { error } = await supabase.from('global_alerts').insert({
        title: alertTitle.trim(),
        message: alertMessage.trim()
      });
      if (error) throw error;

      showToast('Global announcement posted!', 'success');
      setAlertTitle('');
      setAlertMessage('');
      fetchGlobalAlerts();
    } catch (err) {
      console.error(err);
      showToast('Failed to post announcement.', 'danger');
    }
  };

  const handleDeleteAlert = async (id) => {
    try {
      const { error } = await supabase.from('global_alerts').delete().eq('id', id);
      if (error) throw error;

      showToast('Announcement deleted.', 'success');
      fetchGlobalAlerts();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete announcement.', 'danger');
    }
  };

  // -------------------------------------------------------------
  // REQUEST APPROVALS / REJECTIONS
  // -------------------------------------------------------------
  const handleApproveRequest = async (id) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/requests/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Approval failed.');
      showToast('Upgrade request approved!', 'success');
      fetchRequests();
    } catch (err) {
      console.error(err);
      showToast('Failed to approve request.', 'danger');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/requests/${id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Rejection failed.');
      showToast('Upgrade request rejected.', 'success');
      fetchRequests();
    } catch (err) {
      console.error(err);
      showToast('Failed to reject request.', 'danger');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300 font-sans">
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-950 text-white z-30 shadow-md border-b border-slate-850">
        <div className="flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-red-500" />
          <span className="font-display font-black text-lg text-white">CloudVault Admin</span>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 bg-slate-900 rounded-xl text-slate-300"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Impersonation Read-Only Active Banner */}
      {impersonatedUser && (
        <div className="fixed top-0 left-0 right-0 z-[999999] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold shadow-xl border-b border-amber-400/30">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 animate-pulse" />
            <span>READ-ONLY IMPERSONATION PREVIEW: Viewing dashboard state for <strong>{impersonatedUser.email}</strong></span>
          </div>
          <button
            onClick={() => setImpersonatedUser(null)}
            className="px-3 py-1 bg-black/30 hover:bg-black/50 rounded-lg text-white font-bold flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> End Session
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-slate-950 text-slate-100 flex flex-col p-5 z-40 border-r border-slate-850 transform lg:transform-none lg:opacity-100 transition-all duration-300 ${
          isDrawerOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between lg:justify-start gap-2.5 mb-8">
          <div className="flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-red-500 stroke-[2.5]" />
            <div>
              <span className="font-display font-black text-xl text-white tracking-tight block">
                CloudVault
              </span>
              <span className="text-[10px] text-slate-400 font-mono">SUPER ADMIN V4</span>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="lg:hidden p-1 bg-slate-850 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
          <button
            onClick={() => { setActiveSection('overview'); setIsDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'overview'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart2 className="w-4 h-4" /> System Analytics
            </div>
          </button>
          
          <button
            onClick={() => { setActiveSection('users'); setIsDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'users'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" /> User Management
            </div>
            <span className="px-1.5 py-0.5 bg-slate-800 text-[10px] rounded text-slate-300 font-mono">{stats.usersCount}</span>
          </button>

          <button
            onClick={() => { setActiveSection('global_files'); setIsDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'global_files'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4" /> Content Moderation
            </div>
            <span className="px-1.5 py-0.5 bg-slate-800 text-[10px] rounded text-slate-300 font-mono">{stats.filesCount}</span>
          </button>

          <button
            onClick={() => { setActiveSection('requests'); setIsDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'requests'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UploadCloud className="w-4 h-4" /> Storage Requests
            </div>
            {stats.pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold animate-pulse">
                {stats.pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSection('snippets'); setIsDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'snippets'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clipboard className="w-4 h-4" /> Snippets Database
            </div>
          </button>

          <button
            onClick={() => { setActiveSection('settings'); setIsDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'settings'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <SettingsIcon className="w-4 h-4" /> Platform Config
            </div>
          </button>

          <button
            onClick={() => { setActiveSection('audit_logs'); setIsDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'audit_logs'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4" /> Admin Action Logs
            </div>
          </button>

          <button
            onClick={() => { setActiveSection('login_logs'); setIsDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'login_logs'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4" /> Security Login Audits
            </div>
          </button>

          <button
            onClick={() => { setActiveSection('alerts'); setIsDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'alerts'
                ? 'bg-gradient-to-r from-red-600 to-rose-650 text-white shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4" /> Global Announcements
            </div>
          </button>
        </nav>

        <div className="mt-auto flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-850">
          <div className="flex flex-col">
            <span className="font-bold text-slate-300">homtolab@gmail.com</span>
            <span className="text-[10px] text-slate-500">Super Admin</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-all"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 p-6 lg:p-10 flex flex-col gap-6 overflow-x-hidden min-w-0 z-10">
        
        {/* Header Bar */}
        <header className="flex justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
              Super Admin Control Centre
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive security, storage quota management, and auditing system.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notification Bell Badge */}
            <div className="relative">
              <button
                onClick={() => setActiveSection('requests')}
                className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 relative transition-all"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {stats.pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900">
                    {stats.pendingRequestsCount}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={refreshAll}
              className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 transition-all"
              title="Refresh Workspace"
            >
              <RefreshCw className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* -------------------------------------------------------------
            SECTION 1: SYSTEM OVERVIEW & ANALYTICS DASHBOARD
           ------------------------------------------------------------- */}
        {activeSection === 'overview' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 flex items-center justify-between border-brand-border-light dark:border-brand-border-dark">
                <div>
                  <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white">
                    {stats.usersCount}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Total Accounts</p>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="glass-card p-5 flex items-center justify-between border-brand-border-light dark:border-brand-border-dark">
                <div>
                  <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white">
                    {formatBytes(stats.totalStorageBytes)}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Total Platform Storage</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <HardDrive className="w-6 h-6" />
                </div>
              </div>

              <div className="glass-card p-5 flex items-center justify-between border-brand-border-light dark:border-brand-border-dark">
                <div>
                  <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white">
                    {stats.filesCount}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Stored Files</p>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div className="glass-card p-5 flex items-center justify-between border-brand-border-light dark:border-brand-border-dark">
                <div>
                  <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white">
                    {analytics.activeUsers24h} / {analytics.activeUsers7d}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Active (24h / 7d)</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Analytics Detail Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* File Category Distribution */}
              <div className="glass-card p-6 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-brand-primary" /> File Type Breakdown
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Images', count: analytics.categoryCounts.image || 0, bytes: analytics.categoryBytes.image || 0, color: 'bg-blue-500' },
                    { label: 'Documents', count: analytics.categoryCounts.document || 0, bytes: analytics.categoryBytes.document || 0, color: 'bg-emerald-500' },
                    { label: 'Code Snippets', count: analytics.categoryCounts.code || 0, bytes: analytics.categoryBytes.code || 0, color: 'bg-purple-500' },
                    { label: 'Plain Text', count: analytics.categoryCounts.text || 0, bytes: analytics.categoryBytes.text || 0, color: 'bg-amber-500' },
                    { label: 'Audio / Video', count: analytics.categoryCounts.audio_video || 0, bytes: analytics.categoryBytes.audio_video || 0, color: 'bg-rose-500' },
                    { label: 'Archives', count: analytics.categoryCounts.archive || 0, bytes: analytics.categoryBytes.archive || 0, color: 'bg-indigo-500' },
                  ].map(cat => {
                    const pct = stats.totalStorageBytes > 0 ? Math.round((cat.bytes / stats.totalStorageBytes) * 100) : 0;
                    return (
                      <div key={cat.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300">{cat.label} ({cat.count})</span>
                          <span className="text-slate-400 font-mono">{formatBytes(cat.bytes)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className={`h-full ${cat.color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Peak Activity Hours */}
              <div className="glass-card p-6 flex flex-col gap-4 lg:col-span-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-primary" /> Peak Activity Times (Logins by Hour)
                </h3>
                <div className="flex items-end gap-1.5 h-48 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800 px-2">
                  {analytics.hourlyActivity.map((count, hour) => {
                    const max = Math.max(...analytics.hourlyActivity, 1);
                    const heightPct = Math.round((count / max) * 100);
                    return (
                      <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-brand-primary/20 hover:bg-brand-primary rounded-t transition-all cursor-pointer relative"
                          style={{ height: `${Math.max(8, heightPct)}%` }}
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-all font-mono pointer-events-none z-20">
                            {count} logins
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-400 font-mono">{hour}:00</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Top 10 Storage Users Table */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-primary" /> Top 10 Storage Quota Users
              </h3>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-2.5">User</th>
                      <th className="pb-2.5">College</th>
                      <th className="pb-2.5">Storage Used</th>
                      <th className="pb-2.5">Quota Allocated</th>
                      <th className="pb-2.5 text-right">Quota Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {analytics.topUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 font-semibold text-slate-900 dark:text-white">
                          {u.name} <span className="text-[10px] text-slate-400 font-mono font-normal">({u.email})</span>
                        </td>
                        <td className="py-3 text-slate-500">{u.college || 'N/A'}</td>
                        <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{formatBytes(u.usedBytes)}</td>
                        <td className="py-3 font-mono text-slate-500">{formatBytes(u.limitBytes)}</td>
                        <td className="py-3 text-right font-mono">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${u.usagePercent > 80 ? 'bg-red-500' : 'bg-brand-primary'}`}
                                style={{ width: `${u.usagePercent}%` }}
                              ></div>
                            </div>
                            <span className="font-bold">{u.usagePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 2: USER ACCOUNTS & BULK ACTIONS
           ------------------------------------------------------------- */}
        {activeSection === 'users' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Registered User Directory</h3>
                <p className="text-xs text-slate-400">Select accounts to perform bulk privilege locks, quota adjustments, or purges.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  onClick={handleExportUsersCSV}
                  className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <div className="relative flex-1 md:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="input-field pl-9 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 pt-1">
              {['all', 'active', 'suspended', 'locked'].map(filterKey => (
                <button
                  key={filterKey}
                  onClick={() => setUserStatusFilter(filterKey)}
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all border ${
                    userStatusFilter === filterKey
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>

            {/* Sticky Bulk Action Toolbar */}
            {selectedUserIds.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-scale-up">
                <span className="font-bold text-red-500 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> {selectedUserIds.length} User(s) Selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleBulkAction('lock_upload', true)} className="btn-secondary py-1 px-2.5 text-[11px] font-bold">
                    Lock Uploads
                  </button>
                  <button onClick={() => handleBulkAction('lock_clipboard', true)} className="btn-secondary py-1 px-2.5 text-[11px] font-bold">
                    Lock Clip
                  </button>
                  <button onClick={() => handleBulkAction('suspend', true)} className="btn-secondary py-1 px-2.5 text-[11px] font-bold text-amber-500">
                    Suspend
                  </button>
                  <button onClick={() => handleBulkAction('suspend', false)} className="btn-secondary py-1 px-2.5 text-[11px] font-bold text-emerald-500">
                    Unsuspend
                  </button>
                  <button onClick={() => handleBulkAction('set_storage_limit', 524288000)} className="btn-secondary py-1 px-2.5 text-[11px] font-bold">
                    Set 500MB Limit
                  </button>
                  <button onClick={() => handleBulkAction('delete', null)} className="btn-danger py-1 px-2.5 text-[11px] font-bold">
                    Purge Selected
                  </button>
                </div>
              </div>
            )}

            {/* Users Table */}
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
                <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-2 w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAllUsers}
                          checked={selectedUserIds.length > 0 && selectedUserIds.length === getFilteredUsers().length}
                          className="rounded text-brand-primary focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="pb-3 pr-4">User Name</th>
                      <th className="pb-3 px-4">Email</th>
                      <th className="pb-3 px-4">Status & Locks</th>
                      <th className="pb-3 px-4">Quota</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {getFilteredUsers().map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 pr-2">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => handleToggleSelectUser(u.id)}
                            className="rounded text-brand-primary focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center font-display font-semibold text-red-500 text-[10px] uppercase">
                            {u.full_name ? u.full_name.substring(0, 2) : 'U'}
                          </div>
                          <div>
                            <div>{u.full_name || 'Anonymous User'}</div>
                            {u.college && <div className="text-[10px] text-slate-400 font-normal">{u.college}</div>}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono select-all text-xs">{u.email}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {u.is_suspended && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[9px] font-bold rounded-full uppercase">
                                Suspended
                              </span>
                            )}
                            {u.upload_locked && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] font-bold rounded-full uppercase">
                                Upload Lock
                              </span>
                            )}
                            {u.clipboard_locked && (
                              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 text-[9px] font-bold rounded-full uppercase">
                                Clip Lock
                              </span>
                            )}
                            {!u.is_suspended && !u.upload_locked && !u.clipboard_locked && (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold rounded-full uppercase">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-brand-primary dark:text-brand-primary-light font-bold">
                          {formatBytes(u.storage_limit || 104857600)}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenUserDetail(u)}
                              className="btn-secondary py-1 px-2.5 text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Drill Down
                            </button>
                            <button
                              onClick={() => handleStartImpersonation(u.id)}
                              className="btn-secondary py-1 px-2.5 text-[10px] text-amber-500 hover:bg-amber-500/10 flex items-center gap-1 cursor-pointer"
                              title="Read-only view user dashboard"
                            >
                              Impersonate
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

        {/* -------------------------------------------------------------
            SECTION 3: GLOBAL FILE SEARCH & MODERATION
           ------------------------------------------------------------- */}
        {activeSection === 'global_files' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Global Platform File Search</h3>
                <p className="text-xs text-slate-400">Search all user files platform-wide for copyright or inappropriate content moderation.</p>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search file name..."
                    value={globalFileQuery}
                    onChange={(e) => setGlobalFileQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchGlobalFiles()}
                    className="input-field pl-9 py-1.5 text-xs"
                  />
                </div>
                <button onClick={fetchGlobalFiles} className="btn-primary py-1.5 px-3 text-xs font-bold">
                  Search
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 pt-1">
              {['all', 'image', 'document', 'code', 'text'].map(cat => (
                <button
                  key={cat}
                  onClick={() => { setGlobalFileCatFilter(cat); fetchGlobalFiles(); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all border ${
                    globalFileCatFilter === cat
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Bulk File Delete Bar */}
            {selectedFileIds.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-red-500">{selectedFileIds.length} file(s) selected for bulk purge</span>
                <button onClick={handleBulkDeleteFiles} className="btn-danger py-1 px-3 text-xs font-bold">
                  Delete Selected Files
                </button>
              </div>
            )}

            {/* Files Table */}
            {globalFilesLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : globalFiles.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No files found matching search query.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-2 w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAllFiles}
                          checked={selectedFileIds.length > 0 && selectedFileIds.length === globalFiles.length}
                          className="rounded text-brand-primary focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="pb-3 pr-4">File Name</th>
                      <th className="pb-3 px-4">Owner</th>
                      <th className="pb-3 px-4">Size</th>
                      <th className="pb-3 px-4">Upload Date</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {globalFiles.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 pr-2">
                          <input
                            type="checkbox"
                            checked={selectedFileIds.includes(f.id)}
                            onChange={() => handleToggleSelectFile(f.id)}
                            className="rounded text-brand-primary focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 pr-4 font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={f.filename}>
                          {f.filename}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          <div>{f.userName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{f.userEmail}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">{formatBytes(f.size)}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(f.created_at).toLocaleDateString()}</td>
                        <td className="py-3 pl-4 text-right">
                          <button
                            onClick={() => { setSelectedFileIds([f.id]); handleBulkDeleteFiles(); }}
                            className="btn-danger py-1 px-2.5 text-[10px]"
                          >
                            Purge File
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 4: STORAGE UPGRADE REQUESTS
           ------------------------------------------------------------- */}
        {activeSection === 'requests' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Storage Upgrade Requests</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setRequestSubTab('pending')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    requestSubTab === 'pending'
                      ? 'bg-brand-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Pending ({requests.length})
                </button>
                <button
                  onClick={() => setRequestSubTab('history')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    requestSubTab === 'history'
                      ? 'bg-brand-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  History ({requestHistory.length})
                </button>
              </div>
            </div>

            {requestSubTab === 'pending' ? (
              requestsLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No pending storage upgrade requests.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requests.map(req => (
                    <div key={req.id} className="glass-card p-5 border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{req.email}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">Requested {new Date(req.created_at).toLocaleString()}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold font-mono rounded-lg">
                            {formatBytes(req.requested_limit)}
                          </span>
                        </div>
                        {req.reason && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <strong>Reason:</strong> "{req.reason}"
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                        <button onClick={() => handleApproveRequest(req.id)} className="btn-primary py-1.5 px-4 text-xs font-bold bg-green-600 hover:bg-green-700">
                          Approve Upgrade
                        </button>
                        <button onClick={() => handleRejectRequest(req.id)} className="btn-secondary py-1.5 px-3 text-xs font-bold text-red-500">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Request History Tab */
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 px-4">Requested Size</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 pl-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {requestHistory.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 pr-4 font-mono font-semibold">{h.email}</td>
                        <td className="py-3 px-4 font-mono font-bold text-brand-primary">{formatBytes(h.requested_limit)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            h.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          }`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-right text-slate-400">{new Date(h.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 5: SNIPPETS DATABASE MODERATION
           ------------------------------------------------------------- */}
        {activeSection === 'snippets' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Clipboard Snippets Database</h3>
                <p className="text-xs text-slate-400">Audit and moderate user online clipboard notes.</p>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search snippet title, owner..."
                  value={snippetSearchQuery}
                  onChange={(e) => setSnippetSearchQuery(e.target.value)}
                  className="input-field pl-9 py-1.5 text-xs"
                />
              </div>
            </div>

            {selectedSnippetIds.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-red-500">{selectedSnippetIds.length} snippet(s) selected for bulk purge</span>
                <button onClick={handleBulkDeleteSnippets} className="btn-danger py-1 px-3 text-xs font-bold">
                  Delete Selected Snippets
                </button>
              </div>
            )}

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
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-2 w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAllSnippets}
                          checked={selectedSnippetIds.length > 0 && selectedSnippetIds.length === getFilteredSnippets().length}
                          className="rounded text-brand-primary focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="pb-3 pr-4">Owner</th>
                      <th className="pb-3 px-4">Snippet Title</th>
                      <th className="pb-3 px-4">Content Preview</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {getFilteredSnippets().map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 pr-2">
                          <input
                            type="checkbox"
                            checked={selectedSnippetIds.includes(s.id)}
                            onChange={() => handleToggleSelectSnippet(s.id)}
                            className="rounded text-brand-primary focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 pr-4 font-semibold">
                          <div>{s.userName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{s.userEmail}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{s.title}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-slate-500 truncate block max-w-[250px]">{s.content}</span>
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewText({ title: s.title, content: s.content })}
                              className="btn-secondary py-1 px-2.5 text-[10px]"
                            >
                              View
                            </button>
                            <button
                              onClick={() => { setSelectedSnippetIds([s.id]); handleBulkDeleteSnippets(); }}
                              className="btn-danger py-1 px-2.5 text-[10px]"
                            >
                              Delete
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

        {/* -------------------------------------------------------------
            SECTION 6: PLATFORM CONFIGURATION & FEATURE FLAGS
           ------------------------------------------------------------- */}
        {activeSection === 'settings' && (
          <div className="glass-card p-6 flex flex-col gap-6 animate-fade-in max-w-4xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Global Platform Configuration</h3>
              <p className="text-xs text-slate-400">Configure global storage limits, security parameters, maintenance status, and feature flags.</p>
            </div>

            {/* Maintenance Mode & Signup Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              
              {/* Maintenance Toggle */}
              <div className="flex flex-col justify-between gap-3">
                <div>
                  <label className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider block">Maintenance Mode</label>
                  <p className="text-xs text-slate-400 mt-1">
                    Enabling maintenance mode redirects non-admin users to the maintenance notice page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSavePlatformSettings({ ...platformSettings, maintenance_mode: !platformSettings.maintenance_mode })}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    platformSettings.maintenance_mode
                      ? 'bg-red-500 text-white border-red-500 shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  {platformSettings.maintenance_mode ? 'MAINTENANCE MODE IS ENABLED' : 'Enable Maintenance Mode'}
                </button>
              </div>

              {/* Default Signup Storage Quota */}
              <div className="flex flex-col gap-3">
                <label className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider block">Default New User Quota</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '100 MB', bytes: 104857600 },
                    { label: '200 MB', bytes: 209715200 },
                    { label: '500 MB', bytes: 524288000 },
                  ].map(preset => (
                    <button
                      key={preset.bytes}
                      type="button"
                      onClick={() => handleSavePlatformSettings({ ...platformSettings, default_storage_limit: preset.bytes })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        platformSettings.default_storage_limit === preset.bytes
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Blocked File Extensions Manager */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
              <label className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider block">Blocked File Extensions</label>
              <p className="text-xs text-slate-400">Executable or harmful file types restricted from public sharing.</p>
              
              <div className="flex flex-wrap gap-2 py-2">
                {platformSettings.blocked_extensions.map(ext => (
                  <span key={ext} className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5">
                    .{ext}
                    <button onClick={() => handleRemoveBlockedExtension(ext)} className="hover:text-red-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 max-w-xs mt-1">
                <input
                  type="text"
                  placeholder="e.g. exe, bat, sh"
                  value={newExtInput}
                  onChange={(e) => setNewExtInput(e.target.value)}
                  className="input-field py-1.5 text-xs font-mono"
                />
                <button onClick={handleAddBlockedExtension} className="btn-primary py-1.5 px-3 text-xs font-bold">
                  Add Block
                </button>
              </div>
            </div>

            {/* Feature Flags Toggles */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
              <label className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider block">Platform Feature Flags</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'signups_enabled', label: 'User Registration Signups' },
                  { key: 'uploads_enabled', label: 'File Upload Engine' },
                  { key: 'clipboard_enabled', label: 'Online Clipboard Notes' },
                  { key: 'share_codes_enabled', label: '6-Digit Share Code Generation' },
                ].map(flag => {
                  const isEnabled = platformSettings.feature_flags[flag.key] ?? true;
                  return (
                    <button
                      key={flag.key}
                      type="button"
                      onClick={() => handleSavePlatformSettings({
                        ...platformSettings,
                        feature_flags: {
                          ...platformSettings.feature_flags,
                          [flag.key]: !isEnabled
                        }
                      })}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                        isEnabled
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800'
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}
                    >
                      <span>{flag.label}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${isEnabled ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 7: ADMIN ACTION AUDIT LOGS
           ------------------------------------------------------------- */}
        {activeSection === 'audit_logs' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Admin Action Audit Log Trail</h3>
                <p className="text-xs text-slate-400">Immutable audit log of all administrative actions, locks, purges, and impersonations.</p>
              </div>

              <button onClick={handleExportAuditLogsCSV} className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Export Audit CSV
              </button>
            </div>

            {auditLogsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : adminAuditLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No admin actions logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Timestamp</th>
                      <th className="pb-3 px-4">Admin Email</th>
                      <th className="pb-3 px-4">Action Taken</th>
                      <th className="pb-3 px-4">Target Type</th>
                      <th className="pb-3 pl-4 text-right">Details Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                    {adminAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 pr-4 text-slate-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-3 px-4 font-semibold">{log.admin_email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 bg-red-500/10 text-red-500 font-bold rounded-full text-[10px] font-mono border border-red-500/20 uppercase">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{log.target_type || 'N/A'}</td>
                        <td className="py-3 pl-4 text-right font-mono text-[10px] text-slate-400 truncate max-w-[200px]" title={JSON.stringify(log.details)}>
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 8: SECURITY LOGIN AUDITS
           ------------------------------------------------------------- */}
        {activeSection === 'login_logs' && (
          <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in max-w-4xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Security Audits: User Logins</h3>
                <p className="text-xs text-slate-400">Login history audit trail with IP address tracking.</p>
              </div>

              {loginLogs.length > 0 && (
                <button
                  onClick={() => {
                    setConfirmData({
                      title: 'Clear Login Audits',
                      message: 'Are you sure you want to clear all login session logs?',
                      isDanger: true,
                      action: async () => {
                        await fetch(`${getApiUrl()}/api/admin/logs`, { method: 'DELETE', headers: getHeaders() });
                        showToast('Login logs cleared.', 'success');
                        fetchLoginLogs();
                      }
                    });
                    setShowConfirmModal(true);
                  }}
                  className="btn-danger py-1.5 px-3 text-xs font-bold"
                >
                  Clear Logs
                </button>
              )}
            </div>

            {loginLogsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : loginLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No login logs recorded yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
                {loginLogs.map(l => (
                  <div key={l.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
                      <span className="font-bold text-slate-900 dark:text-white">{l.email}</span>
                      {l.ip_address && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[10px]">IP: {l.ip_address}</span>}
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">{new Date(l.login_time).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 9: GLOBAL ANNOUNCEMENTS
           ------------------------------------------------------------- */}
        {activeSection === 'alerts' && (
          <div className="glass-card p-6 flex flex-col gap-6 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Global Announcements Manager</h3>
              <p className="text-xs text-slate-400">Post system announcements shown to users on their dashboard.</p>
            </div>

            <form onSubmit={handleCreateAlertSubmit} className="space-y-4 max-w-xl bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
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
              <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Post Announcement
              </button>
            </form>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Announcements</h4>
              {alertsLoading ? (
                <div className="flex py-6 justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                </div>
              ) : globalAlerts.length === 0 ? (
                <div className="text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-2xl text-center">
                  No active announcements posted.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {globalAlerts.map(alert => (
                    <div key={alert.id} className="glass-card p-5 flex flex-col justify-between gap-3">
                      <div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Bell className="w-4 h-4 text-brand-primary shrink-0" /> {alert.title}
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed whitespace-pre-wrap">{alert.message}</p>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-850 pt-2 text-[10px] text-slate-400 font-mono">
                        <span>{new Date(alert.created_at).toLocaleString()}</span>
                        <button onClick={() => handleDeleteAlert(alert.id)} className="text-red-500 font-bold hover:underline">
                          Delete
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

      {/* -------------------------------------------------------------
          MODALS & DIALOGS
         ------------------------------------------------------------- */}

      {/* Confirmation Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="glass-card max-w-sm w-full p-6 shadow-2xl animate-scale-up border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              {confirmData.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              {confirmData.message}
            </p>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setShowConfirmModal(false)} className="btn-secondary py-2 px-4 text-xs font-bold">
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  if (confirmData.action) confirmData.action();
                }}
                className={`py-2 px-4 text-xs font-bold rounded-xl text-white ${confirmData.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-brand-primary-hover'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Drill-Down Modal */}
      {showDetailModal && targetUserDetails && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="glass-card max-w-4xl w-full p-6 lg:p-8 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col gap-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-sm uppercase">
                  {targetUserDetails.profile.full_name ? targetUserDetails.profile.full_name.substring(0, 2) : 'U'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {targetUserDetails.profile.full_name || 'Anonymous User'}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono select-all">
                    {targetUserDetails.profile.email} • ID: {targetUserDetails.profile.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Profile Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <form onSubmit={handleUpdateTargetName} className="flex gap-2">
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  className="input-field py-1.5 text-xs"
                  placeholder="Full Name"
                />
                <button type="submit" className="btn-primary py-1.5 px-3 text-xs font-bold shrink-0">
                  Rename
                </button>
              </form>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Quota Presets:</span>
                {[
                  { label: '100MB', bytes: 104857600 },
                  { label: '300MB', bytes: 314572800 },
                  { label: '500MB', bytes: 524288000 },
                  { label: '1GB', bytes: 1073741824 },
                ].map(p => (
                  <button
                    key={p.bytes}
                    onClick={() => handleUpdateTargetQuota(p.bytes)}
                    className="btn-secondary py-1 px-2 text-[10px] font-mono font-bold"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lock Toggles */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleToggleLock('upload_locked', targetUserDetails.profile.upload_locked)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  targetUserDetails.profile.upload_locked ? 'bg-red-500 text-white border-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {targetUserDetails.profile.upload_locked ? 'Uploads Locked' : 'Lock Uploads'}
              </button>

              <button
                onClick={() => handleToggleLock('clipboard_locked', targetUserDetails.profile.clipboard_locked)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  targetUserDetails.profile.clipboard_locked ? 'bg-red-500 text-white border-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {targetUserDetails.profile.clipboard_locked ? 'Clipboard Locked' : 'Lock Clipboard'}
              </button>

              <button
                onClick={() => handleToggleLock('is_suspended', targetUserDetails.profile.is_suspended)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  targetUserDetails.profile.is_suspended ? 'bg-red-600 text-white border-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {targetUserDetails.profile.is_suspended ? 'Account Suspended' : 'Suspend Account'}
              </button>

              <button
                onClick={() => handleStartImpersonation(targetUserDetails.profile.id)}
                className="px-3 py-1 bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Read-Only Impersonate
              </button>
            </div>

            {/* Drill-down Inventory Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setTargetUserTab('files')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  targetUserTab === 'files' ? 'bg-brand-primary text-white' : 'text-slate-500'
                }`}
              >
                Files ({targetUserDetails.files.length})
              </button>
              <button
                onClick={() => setTargetUserTab('notes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  targetUserTab === 'notes' ? 'bg-brand-primary text-white' : 'text-slate-500'
                }`}
              >
                Notes ({targetUserDetails.notes.length})
              </button>
              <button
                onClick={() => setTargetUserTab('shareCodes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  targetUserTab === 'shareCodes' ? 'bg-brand-primary text-white' : 'text-slate-500'
                }`}
              >
                Share Codes ({targetUserDetails.shareCodes.length})
              </button>
              <button
                onClick={() => setTargetUserTab('logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  targetUserTab === 'logs' ? 'bg-brand-primary text-white' : 'text-slate-500'
                }`}
              >
                Login History ({targetUserDetails.loginLogs.length})
              </button>
            </div>

            {/* Inventory Tab Content */}
            {targetUserTab === 'files' && (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {targetUserDetails.files.map(f => (
                  <div key={f.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-bold truncate max-w-xs">{f.filename}</span>
                    <span className="font-mono text-slate-400">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {targetUserTab === 'notes' && (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {targetUserDetails.notes.map(n => (
                  <div key={n.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-bold truncate max-w-xs">{n.title}</span>
                    <span className="font-mono text-slate-400 truncate max-w-[200px]">{n.content}</span>
                  </div>
                ))}
              </div>
            )}

            {targetUserTab === 'shareCodes' && (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {targetUserDetails.shareCodes.map(sc => (
                  <div key={sc.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl flex justify-between items-center text-xs font-mono">
                    <span className="font-bold text-brand-primary">CODE: {sc.code}</span>
                    <span className="text-slate-400">Expires: {new Date(sc.expires_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}

            {targetUserTab === 'logs' && (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {targetUserDetails.loginLogs.map(l => (
                  <div key={l.id} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl flex justify-between text-xs font-mono">
                    <span>{new Date(l.login_time).toLocaleString()}</span>
                    <span className="text-slate-400">IP: {l.ip_address || 'N/A'}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Lightbox Text Preview Modal */}
      {previewText && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="glass-card max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{previewText.title}</h3>
              <button onClick={() => setPreviewText(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              readOnly
              value={previewText.content}
              rows={12}
              className="input-field font-mono text-xs p-3 leading-relaxed bg-slate-900 text-slate-100 border-slate-800"
            ></textarea>
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
