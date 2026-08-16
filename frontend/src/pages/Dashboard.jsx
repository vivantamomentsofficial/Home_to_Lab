import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, UploadCloud, Clipboard, FolderKanban, Settings as SettingsIcon, User as UserIcon,
  LogOut, Sun, Moon, ShieldAlert, Folder, File, FileImage, FileText, FileCode, FileArchive, HelpCircle,
  Grid, List, Search, ArrowUpDown, MoreVertical, Eye, Download, Trash, Edit3, Share2, Plus, ArrowLeft,
  X, Check, AlertTriangle, ShieldCheck, Shield, Camera, Menu
} from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileCategory = (filename, mimeType) => {
  const ext = filename.split('.').pop().toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  if (imageExts.includes(ext) || mimeType.startsWith('image/')) return 'image';
  
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
  if (docExts.includes(ext)) return 'document';
  
  const codeExts = ['java', 'py', 'html', 'css', 'js', 'json', 'xml', 'cpp', 'c', 'sh', 'sql', 'php', 'ts', 'jsx', 'tsx'];
  if (codeExts.includes(ext)) return 'code';
  
  const txtExts = ['txt', 'md', 'csv', 'log'];
  if (txtExts.includes(ext) || mimeType.startsWith('text/')) return 'text';
  
  const zipExts = ['zip', 'rar', 'tar', 'gz', '7z'];
  if (zipExts.includes(ext)) return 'zip';
  
  return 'other';
};

const Dashboard = () => {
  const { user, supabase, logout, deleteOwnAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  // Active workspace tab: 'overview' | 'upload' | 'clipboard' | 'vault' | 'settings' | 'profile'
  const [activeTab, setActiveTab] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Profile fields state
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [isProfileLocked, setIsProfileLocked] = useState(false);
  const [storageLimit, setStorageLimit] = useState(100 * 1024 * 1024); // 100MB
  const [usedStorage, setUsedStorage] = useState(0);
  const [uploadLocked, setUploadLocked] = useState(false);
  const [clipboardLocked, setClipboardLocked] = useState(false);
  const [downloadLocked, setDownloadLocked] = useState(false);

  // Storage Upgrade Request State
  const [requestedLimit, setRequestedLimit] = useState('314572800'); // Default to 300MB in bytes
  const [requestPending, setRequestPending] = useState(false);

  // Avatar and Security States
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Inactivity logout state
  const [inactivityLimit, setInactivityLimit] = useState(() => {
    return localStorage.getItem('CLOUDVAULT_INACTIVITY_LIMIT') || 'disabled';
  });

  // Vault data caching
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [vaultLoading, setVaultLoading] = useState(false);

  // Vault filters & layouts
  const [layoutMode, setLayoutMode] = useState(() => {
    return localStorage.getItem('CLOUDVAULT_DEFAULT_LAYOUT') || 'grid';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');

  // Notes/Clipboard caching
  const [notes, setNotes] = useState([]);
  const [noteId, setNoteId] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [noteSort, setNoteSort] = useState('newest');
  const [notesLoading, setNotesLoading] = useState(false);

  // Active uploader files queue
  const [activeUploads, setActiveUploads] = useState({});
  const [showUploadProgressCard, setShowUploadProgressCard] = useState(false);

  // Modals / Overlays triggers
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({ title: '', message: '', action: null });
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameFileTarget, setRenameFileTarget] = useState(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCodeData, setShareCodeData] = useState(null);
  const [shareTimeLeft, setShareTimeLeft] = useState(0);
  const shareTimerRef = useRef(null);

  // File Previews Lightbox
  const [previewImage, setPreviewImage] = useState(null);
  const [previewText, setPreviewText] = useState(null);

  // Quick Paste CTRL+SHIFT+V modal
  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState('');

  // Dropdown menu state per file card
  const [activeMenuId, setActiveMenuId] = useState(null);

  // 1. Fetch User Profile Info & Dashboard data
  const fetchProfileDetails = async () => {
    if (!supabase || !user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, college, storage_limit, upload_locked, clipboard_locked, download_locked, is_suspended, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data) {
        if (data.is_suspended) {
          showToast('Your account has been suspended by the administrator.', 'danger');
          await logout();
          navigate('/login?reason=suspended');
          return;
        }
        setFullName(data.full_name || '');
        setCollege(data.college || '');
        if (data.full_name && data.college) {
          setIsProfileLocked(true);
        }
        setStorageLimit(data.storage_limit || 100 * 1024 * 1024);
        setUploadLocked(!!data.upload_locked);
        setClipboardLocked(!!data.clipboard_locked);
        setDownloadLocked(!!data.download_locked);

        // Resolve avatar image URL using a signed URL if set
        if (data.avatar_url) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from('vault')
            .createSignedUrl(data.avatar_url, 3600);
          if (signedData) {
            setAvatarUrl(signedData.signedUrl);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStorageStats = async () => {
    if (!supabase || !user) return;
    try {
      const { data, error } = await supabase
        .from('files')
        .select('size')
        .eq('user_id', user.id);

      if (data) {
        const total = data.reduce((sum, f) => sum + parseInt(f.size || 0), 0);
        setUsedStorage(total);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVaultFiles = async () => {
    if (!supabase || !user) return;
    setVaultLoading(true);
    try {
      // Fetch Folders
      const { data: folderData, error: folderErr } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (folderErr) throw folderErr;
      setFolders(folderData || []);

      // Fetch Files
      const { data: fileData, error: fileErr } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fileErr) throw fileErr;
      setFiles(fileData || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load files from storage database.', 'danger');
    } finally {
      setVaultLoading(false);
    }
  };

  const fetchNotes = async () => {
    if (!supabase || !user) return;
    setNotesLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve snippets.', 'danger');
    } finally {
      setNotesLoading(false);
    }
  };

  const fetchUpgradeRequestStatus = async () => {
    if (!supabase || !user) return;
    try {
      const { data, error } = await supabase
        .from('storage_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .limit(1);

      if (data && data.length > 0) {
        setRequestPending(true);
      } else {
        setRequestPending(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      fetchProfileDetails();
      fetchStorageStats();
      fetchUpgradeRequestStatus();
    }
  }, [user, supabase]);

  // Tab change trigger loading
  useEffect(() => {
    if (activeTab === 'vault') {
      fetchVaultFiles();
    }
    if (activeTab === 'clipboard') {
      fetchNotes();
    }
    if (activeTab === 'overview') {
      fetchStorageStats();
    }
  }, [activeTab]);

  // CTRL + SHIFT + V paste modal event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Verify CTR+SHIFT+V on the dashboard page
      if (e.ctrlKey && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        if (clipboardLocked) {
          showToast('Clipboard note snippet creation is locked by the administrator.', 'warning');
          return;
        }
        setShowQuickPaste(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clipboardLocked]);

  // Update layout preference in storage
  const handleToggleLayout = () => {
    const nextLayout = layoutMode === 'grid' ? 'list' : 'grid';
    setLayoutMode(nextLayout);
    localStorage.setItem('CLOUDVAULT_DEFAULT_LAYOUT', nextLayout);
  };

  // Profile Save
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Display name is required.', 'warning');
      return;
    }

    try {
      // Update auth metadata (trigger will sync this to profiles table automatically)
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          college: college.trim()
        }
      });
      if (authErr) throw authErr;

      showToast('Profile details updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update user profile.', 'danger');
    }
  };

  // Avatar Upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Avatar image must be smaller than 2MB.', 'warning');
      return;
    }

    showToast('Uploading avatar...', 'info');
    try {
      const ext = file.name.split('.').pop();
      const avatarPath = `uploads/${user.id}/avatar_${Date.now()}.${ext}`;

      // Upload file to Supabase storage 'vault'
      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(avatarPath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update user auth metadata (trigger will sync this to profiles table automatically)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarPath },
      });

      if (updateError) throw updateError;

      // Create signed URL for local UI state
      const { data: signedData } = await supabase.storage
        .from('vault')
        .createSignedUrl(avatarPath, 3600);

      if (signedData) {
        setAvatarUrl(signedData.signedUrl);
      }

      showToast('Profile picture updated successfully!', 'success');
    } catch (err) {
      console.error('Avatar upload error:', err);
      showToast('Failed to upload avatar.', 'danger');
    }
  };

  // Password Update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Password updated successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update password.', 'danger');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Submit Upgrade Request
  const handleUpgradeRequest = async (e) => {
    e.preventDefault();
    const limitBytes = parseInt(requestedLimit);
    if (isNaN(limitBytes) || limitBytes <= storageLimit) {
      showToast('Requested storage limit must exceed your current storage.', 'warning');
      return;
    }

    try {
      const { error } = await supabase
        .from('storage_requests')
        .insert({
          user_id: user.id,
          email: user.email,
          requested_limit: limitBytes,
          status: 'pending'
        });

      if (error) throw error;
      showToast('Storage upgrade request submitted successfully!', 'success');
      setRequestPending(true);
    } catch (err) {
      console.error(err);
      showToast('Failed to submit request: ' + err.message, 'danger');
    }
  };

  // Wipe Inventory & Delete Account
  const triggerWipeAccount = () => {
    setConfirmModalData({
      title: 'Wipe Vault & Delete Account',
      message: 'Are you sure you want to delete your account? All files will be deleted from our storage bucket and notes will be wiped. This action is permanent and cannot be undone.',
      action: async () => {
        try {
          showToast('Cleaning storage files and purging database records...', 'info');
          
          // 1. Fetch files to delete from GCS bucket
          const { data: filesPurge } = await supabase
            .from('files')
            .select('storage_path')
            .eq('user_id', user.id);

          if (filesPurge && filesPurge.length > 0) {
            const filePaths = filesPurge.map((f) => f.storage_path);
            await supabase.storage.from('vault').remove(filePaths);
          }

          // 2. Trigger RPC account delete function
          const { error } = await supabase.rpc('delete_own_account');
          if (error) throw error;

          showToast('Account deleted successfully.', 'success');
          logout();
          navigate('/');
        } catch (err) {
          console.error(err);
          showToast('Purging failed: ' + err.message, 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Inactivity timeout setting change
  const handleInactivityChange = (e) => {
    const val = e.target.value;
    setInactivityLimit(val);
    localStorage.setItem('CLOUDVAULT_INACTIVITY_LIMIT', val);
    showToast(`Inactivity timeout configured to: ${val === 'disabled' ? 'Disabled' : `${val} Minutes`}`, 'success');
  };

  // ==========================================
  // NOTE SNIPPETS HANDLING (CLIPBOARD TAB)
  // ==========================================
  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      showToast('Snippet title and content are required.', 'warning');
      return;
    }

    try {
      if (noteId) {
        // Update Snippet
        const { error } = await supabase
          .from('notes')
          .update({ title: noteTitle.trim(), content: noteContent })
          .eq('id', noteId);
        
        if (error) throw error;
        showToast('Snippet updated successfully!', 'success');
      } else {
        // Create Snippet
        const { error } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            title: noteTitle.trim(),
            content: noteContent
          });

        if (error) throw error;
        showToast('Snippet saved successfully!', 'success');
      }

      setNoteId('');
      setNoteTitle('');
      setNoteContent('');
      fetchNotes();
    } catch (err) {
      console.error(err);
      showToast('Failed to save snippet.', 'danger');
    }
  };

  const handleEditNote = (note) => {
    setNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const handleDeleteNote = (id) => {
    setConfirmModalData({
      title: 'Delete Clipboard Snippet',
      message: 'Are you sure you want to permanently delete this text snippet? This cannot be undone.',
      action: async () => {
        try {
          const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

          if (error) throw error;
          showToast('Snippet deleted.', 'success');
          fetchNotes();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete snippet.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleCopyNote = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied to system clipboard!', 'success'))
      .catch(() => showToast('Copy failed.', 'danger'));
  };

  // ==========================================
  // QUICK PASTE MODAL (CTRL+SHIFT+V)
  // ==========================================
  const handleQuickPasteSave = async () => {
    if (!quickPasteText.trim()) {
      showToast('Clipboard notes content cannot be empty.', 'warning');
      return;
    }

    try {
      const timestamp = Date.now();
      const filename = `clipboard_${timestamp}.txt`;
      const storagePath = `uploads/${user.id}/${filename}`;

      // Convert text to file blob
      const blob = new Blob([quickPasteText], { type: 'text/plain' });
      const fileObj = new File([blob], filename, { type: 'text/plain' });

      // Upload text file to storage
      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(storagePath, fileObj);

      if (uploadError) throw uploadError;

      // Create database file catalog
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          filename: filename,
          storage_path: storagePath,
          file_type: 'text',
          size: blob.size
        });

      if (dbError) throw dbError;

      // Register text snippet in notes table
      const { error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: `Clipboard Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          content: quickPasteText
        });

      if (noteError) throw noteError;

      showToast('Quick Paste saved to Vault files and Snippets board!', 'success');
      setQuickPasteText('');
      setShowQuickPaste(false);
      
      // Refresh active displays
      fetchStorageStats();
      if (activeTab === 'vault') fetchVaultFiles();
      if (activeTab === 'clipboard') fetchNotes();
    } catch (err) {
      console.error(err);
      showToast('Failed to save Quick Paste: ' + err.message, 'danger');
    }
  };

  // ==========================================
  // FILE UPLOAD CONTROLLER (SEND TO SERVER)
  // ==========================================
  const handleDropFiles = (e) => {
    e.preventDefault();
    handleUploadQueue(e.dataTransfer.files);
  };

  const handleBrowseFiles = (e) => {
    handleUploadQueue(e.target.files);
  };

  const handleUploadQueue = async (incomingFiles) => {
    if (incomingFiles.length === 0) return;

    let currentUsed = usedStorage;
    const itemsArray = Array.from(incomingFiles);

    for (const file of itemsArray) {
      // Validate quota limits
      if (file.size > storageLimit) {
        showToast(`Rejected: "${file.name}" exceeds the ${formatBytes(storageLimit)} limit.`, 'danger');
        continue;
      }

      if (currentUsed + file.size > storageLimit) {
        showToast(`Rejected: Uploading "${file.name}" will exceed your allocated limit.`, 'warning');
        continue;
      }

      currentUsed += file.size;

      // Generate random upload ID
      const uploadId = 'up_' + Math.random().toString(36).substring(2, 9);
      setShowUploadProgressCard(true);

      // Initialize upload state queue
      setActiveUploads((prev) => ({
        ...prev,
        [uploadId]: {
          name: file.name,
          size: file.size,
          progress: 0,
          status: 'ready',
          controller: null,
          fileObj: file
        }
      }));

      // Start upload
      startUploadingFile(uploadId, file);
    }
  };

  const startUploadingFile = async (uploadId, file) => {
    const controller = new AbortController();

    setActiveUploads((prev) => ({
      ...prev,
      [uploadId]: {
        ...prev[uploadId],
        status: 'uploading',
        controller
      }
    }));

    const uniquePrefix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const storagePath = `uploads/${user.id}/${uniquePrefix}_${file.name}`;

    try {
      const { data, error } = await supabase.storage
        .from('vault')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setActiveUploads((prev) => {
              if (!prev[uploadId]) return prev;
              return {
                ...prev,
                [uploadId]: {
                  ...prev[uploadId],
                  progress: percent
                }
              };
            });
          }
        });

      if (error) throw error;

      // Register file entry in DB catalog
      const fileCategory = getFileCategory(file.name, file.type || 'application/octet-stream');
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          filename: file.name,
          storage_path: storagePath,
          file_type: fileCategory,
          size: file.size,
          folder_id: currentFolderId // Assigns to current folder folder nesting
        });

      if (dbError) throw dbError;

      // Mark success
      setActiveUploads((prev) => {
        if (!prev[uploadId]) return prev;
        return {
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            status: 'completed',
            progress: 100
          }
        };
      });

      showToast(`Uploaded "${file.name}" successfully!`, 'success');
      fetchStorageStats();
      if (activeTab === 'vault') fetchVaultFiles();

      // Clear card from queue after 3 seconds
      setTimeout(() => {
        setActiveUploads((prev) => {
          const updated = { ...prev };
          delete updated[uploadId];
          return updated;
        });
      }, 3000);
    } catch (err) {
      if (err.name === 'AbortError') {
        showToast(`Upload of "${file.name}" aborted.`, 'warning');
        return;
      }
      console.error(err);

      setActiveUploads((prev) => {
        if (!prev[uploadId]) return prev;
        return {
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            status: 'failed'
          }
        };
      });
      showToast(`Upload failed for "${file.name}".`, 'danger');
    }
  };

  const cancelUpload = (uploadId) => {
    const upload = activeUploads[uploadId];
    if (upload && upload.controller) {
      upload.controller.abort();
      setActiveUploads((prev) => {
        if (!prev[uploadId]) return prev;
        return {
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            status: 'cancelled'
          }
        };
      });
    }
  };

  const retryUpload = (uploadId) => {
    const upload = activeUploads[uploadId];
    if (upload && upload.fileObj) {
      startUploadingFile(uploadId, upload.fileObj);
    }
  };

  const dismissUploadItem = (uploadId) => {
    setActiveUploads((prev) => {
      const updated = { ...prev };
      delete updated[uploadId];
      return updated;
    });
  };

  // Hide container overlay when active list is empty
  useEffect(() => {
    if (Object.keys(activeUploads).length === 0) {
      setShowUploadProgressCard(false);
    }
  }, [activeUploads]);

  // ==========================================
  // VAULT EXPLORER ACTIONS
  // ==========================================
  const handleCreateFolder = async () => {
    const name = prompt('Enter a name for the new folder:');
    if (!name || !name.trim()) return;

    try {
      const { error } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name: name.trim()
        });

      if (error) throw error;
      showToast(`Folder "${name}" created!`, 'success');
      fetchVaultFiles();
    } catch (err) {
      console.error(err);
      showToast('Failed to create folder.', 'danger');
    }
  };

  const moveFileToFolder = async (fileId, destFolderId) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ folder_id: destFolderId })
        .eq('id', fileId);

      if (error) throw error;
      showToast('File relocated successfully.', 'success');
      fetchVaultFiles();
    } catch (err) {
      console.error(err);
      showToast('Failed to relocate file.', 'danger');
    }
  };

  const handleDeleteFile = (id, path, filename) => {
    setConfirmModalData({
      title: 'Delete Vault File',
      message: `Are you sure you want to permanently delete "${filename}"? All storage allocations will clear and this cannot be undone.`,
      action: async () => {
        try {
          // Remove from bucket
          const { error: bucketError } = await supabase.storage
            .from('vault')
            .remove([path]);
          
          if (bucketError) throw bucketError;

          // Delete metadata row
          const { error } = await supabase
            .from('files')
            .delete()
            .eq('id', id);

          if (error) throw error;
          showToast('File deleted successfully.', 'success');
          fetchVaultFiles();
          fetchStorageStats();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete file: ' + err.message, 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const triggerRenameFile = (file) => {
    setRenameFileTarget(file);
    setRenameInputValue(file.filename);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameInputValue.trim() || !renameFileTarget) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ filename: renameInputValue.trim() })
        .eq('id', renameFileTarget.id);

      if (error) throw error;
      showToast('File renamed.', 'success');
      setShowRenameModal(false);
      fetchVaultFiles();
    } catch (err) {
      console.error(err);
      showToast('Failed to rename file.', 'danger');
    }
  };

  const handleGenerateShareCode = async (file) => {
    if (downloadLocked) {
      showToast('Sharing privileges have been revoked by the administrator.', 'danger');
      return;
    }
    showToast('Generating 6-digit access code...', 'info');
    try {
      // Step 1: Create signed URL from storage bucket valid for 30 minutes
      const { data, error: signedError } = await supabase.storage
        .from('vault')
        .createSignedUrl(file.storage_path, 1800); // 30 mins

      if (signedError) throw signedError;

      // Step 2: Generate unique 6-digit alphanumeric code
      let codeExists = true;
      let shareCode = '';
      while (codeExists) {
        shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        // Check database collision
        const { data: collisionData } = await supabase
          .from('share_codes')
          .select('id')
          .eq('code', shareCode)
          .gt('expires_at', new Date().toISOString());
        
        if (!collisionData || collisionData.length === 0) {
          codeExists = false;
        }
      }

      // Step 3: Insert record into share_codes table
      const expiry = new Date(Date.now() + 30 * 60 * 1000);
      const { error: dbError } = await supabase
        .from('share_codes')
        .insert({
          code: shareCode,
          file_id: file.id,
          signed_url: data.signedUrl,
          expires_at: expiry.toISOString()
        });

      if (dbError) throw dbError;

      // Launch share details modal
      setShareCodeData({ code: shareCode, filename: file.filename });
      setShareTimeLeft(1800); // 30 minutes in seconds
      setShowShareModal(true);

      // Set countdown interval
      if (shareTimerRef.current) clearInterval(shareTimerRef.current);
      shareTimerRef.current = setInterval(() => {
        setShareTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(shareTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error(err);
      showToast('Failed to generate sharing code: ' + err.message, 'danger');
    }
  };

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) clearInterval(shareTimerRef.current);
    };
  }, []);

  const handleDownloadFileDirect = async (path, filename) => {
    if (downloadLocked) {
      showToast('Download privileges have been revoked by the administrator.', 'danger');
      return;
    }
    try {
      showToast('Creating download URL...', 'info');
      const { data, error } = await supabase.storage
        .from('vault')
        .createSignedUrl(path, 60);

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

  const handlePreviewFile = async (file) => {
    if (downloadLocked) {
      showToast('Preview privileges have been revoked by the administrator.', 'danger');
      return;
    }
    const category = getFileCategory(file.filename, 'application/octet-stream');
    
    if (category === 'image') {
      try {
        showToast('Retrieving image...', 'info');
        const { data, error } = await supabase.storage
          .from('vault')
          .createSignedUrl(file.storage_path, 300);
        if (error) throw error;
        setPreviewImage({ title: file.filename, url: data.signedUrl });
      } catch (e) {
        showToast('Failed to load image preview.', 'danger');
      }
    } 
    else if (category === 'document' && file.filename.toLowerCase().endsWith('.pdf')) {
      try {
        showToast('Opening PDF document...', 'info');
        const { data, error } = await supabase.storage
          .from('vault')
          .createSignedUrl(file.storage_path, 600);
        if (error) throw error;
        window.open(data.signedUrl, '_blank');
      } catch (e) {
        showToast('Failed to preview PDF.', 'danger');
      }
    } 
    else if (category === 'text' || category === 'code') {
      try {
        showToast('Downloading text contents...', 'info');
        const { data, error } = await supabase.storage
          .from('vault')
          .download(file.storage_path);
        if (error) throw error;
        
        const text = await data.text();
        setPreviewText({ title: file.filename, content: text });
      } catch (e) {
        showToast('Failed to retrieve text content.', 'danger');
      }
    } 
    else {
      showToast('Preview is not supported for this file type.', 'warning');
    }
  };

  // ==========================================
  // DATA RENDERING RESOLUTIONS
  // ==========================================
  const getFilteredFiles = () => {
    // 1. Filter folder structures
    let filtered = files.filter(f => f.folder_id === currentFolderId);

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = files.filter(f => f.filename.toLowerCase().includes(q));
    }

    // 3. Tag Filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(f => {
        const cat = getFileCategory(f.filename, '');
        return cat === activeFilter;
      });
    }

    // 4. Sorting dropdowns
    if (sortOption === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortOption === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortOption === 'name') {
      filtered.sort((a, b) => a.filename.localeCompare(b.filename));
    } else if (sortOption === 'size') {
      filtered.sort((a, b) => parseInt(b.size) - parseInt(a.size));
    }

    return filtered;
  };

  const getFilteredNotes = () => {
    let filtered = [...notes];

    if (noteSearch.trim()) {
      const q = noteSearch.toLowerCase();
      filtered = filtered.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }

    if (noteSort === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (noteSort === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return filtered;
  };

  const getFileIcon = (filename) => {
    const cat = getFileCategory(filename, '');
    const iconClass = "w-5 h-5 flex-shrink-0";
    switch (cat) {
      case 'image':
        return <FileImage className={`${iconClass} text-green-500`} />;
      case 'document':
        return <FileText className={`${iconClass} text-rose-500`} />;
      case 'code':
        return <FileCode className={`${iconClass} text-amber-500`} />;
      case 'text':
        return <FileText className={`${iconClass} text-sky-500`} />;
      case 'zip':
        return <FileArchive className={`${iconClass} text-violet-500`} />;
      default:
        return <File className={`${iconClass} text-slate-500`} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300">
      
      {/* Mobile Top bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-brand-border-light dark:border-brand-border-dark z-30 shadow-xs sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 bg-slate-50 dark:bg-slate-850 rounded-xl text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Shield className="w-5.5 h-5.5 text-brand-primary stroke-[2.5]" />
            <span className="font-display font-black text-lg text-slate-850 dark:text-white">
              CloudVault
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className="p-2 bg-slate-50 dark:bg-slate-850 rounded-xl text-slate-500 hover:text-brand-primary dark:text-slate-400 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          
          <div 
            onClick={() => {
              setActiveTab('profile');
              setIsDrawerOpen(false);
            }}
            className="w-8.5 h-8.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center font-display font-semibold text-brand-primary text-xs uppercase cursor-pointer overflow-hidden"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (fullName ? fullName.substring(0, 2) : user?.email?.substring(0, 2) || 'U')
            )}
          </div>
        </div>
      </div>

      {/* Sidebar navigation */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-brand-border-light dark:border-brand-border-dark flex flex-col p-5 z-50 shrink-0 transform lg:transform-none lg:opacity-100 transition-all duration-300 ${
          isDrawerOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 lg:opacity-100'
        }`}
      >
        <div className="flex items-center justify-between lg:justify-start gap-2.5 mb-8">
          <div className="flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-brand-primary stroke-[2.5]" />
            <span className="font-display font-black text-xl text-slate-800 dark:text-white">
              CloudVault
            </span>
            {user?.email === 'homtolab@gmail.com' && (
              <span className="px-1.5 py-0.5 bg-brand-primary/10 text-[9px] font-bold text-brand-primary rounded tracking-wider uppercase">
                Admin
              </span>
            )}
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="lg:hidden p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1.5">
          <button
            onClick={() => {
              setActiveTab('overview');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Overview
          </button>
          
          <button
            onClick={() => {
              setActiveTab('upload');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" /> Send to Server
          </button>

          <button
            onClick={() => {
              setActiveTab('clipboard');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'clipboard'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Clipboard className="w-4 h-4" /> Clipboard Paste
          </button>

          <button
            onClick={() => {
              setActiveTab('vault');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'vault'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FolderKanban className="w-4 h-4" /> Vault Explorer
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-4 h-4" /> Settings
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-4 h-4" /> Profile Info
          </button>

          {/* Admin Dedicated View Link */}
          {user?.email === 'homtolab@gmail.com' && (
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <Link
                to="/admin"
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/10 rounded-xl text-sm font-semibold transition-all"
                onClick={() => setIsDrawerOpen(false)}
              >
                <ShieldCheck className="w-4 h-4" /> Admin Panel
              </Link>
            </div>
          )}
        </nav>

        {/* User Card */}
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center font-display font-semibold text-brand-primary text-xs uppercase flex-shrink-0">
              {fullName ? fullName.substring(0, 2) : user?.email?.substring(0, 2) || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {fullName || 'CloudVault User'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/');
              setIsDrawerOpen(false);
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
        ></div>
      )}

      {/* Main dashboard content body */}
      <main className="flex-1 p-6 lg:p-10 flex flex-col gap-6 overflow-x-hidden min-w-0 z-10">
        
        {/* Top bar header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-800 dark:text-white">
              {activeTab === 'profile' ? 'User Profile' : 
               activeTab === 'overview' ? 'Dashboard Overview' : 
               activeTab === 'upload' ? 'Send to Server' : 
               activeTab === 'vault' ? 'Receive (My Vault)' : 
               activeTab === 'clipboard' ? 'Quick Text Clipboard' : 
               activeTab === 'settings' ? 'Settings' : 
               activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Welcome to CloudVault! {getGreeting()}, {fullName.split(' ')[0] || user?.email?.split('@')[0]}!
            </p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto self-stretch sm:self-auto justify-between sm:justify-end">
            {/* Storage Progress Bar */}
            <div className="flex flex-col gap-1 min-w-[150px] sm:min-w-[200px]">
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span>Storage Used</span>
                <span>{((usedStorage / storageLimit) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (usedStorage / storageLimit) * 100)}%` }}
                ></div>
              </div>
              <span className="text-[9px] text-slate-400 text-right">
                {formatBytes(usedStorage)} of {formatBytes(storageLimit)}
              </span>
            </div>

            {/* User Nav Avatar */}
            <div 
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center font-display font-semibold text-brand-primary text-sm uppercase cursor-pointer hover:bg-brand-primary/25 transition-all duration-200 shrink-0 overflow-hidden"
              title="View Profile"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (fullName ? fullName.substring(0, 2) : user?.email?.substring(0, 2) || 'U')
              )}
            </div>
          </div>
        </header>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Storage Progress Card */}
            <div className="glass-card p-6 md:col-span-3 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white">Cloud Storage Allocation</h3>
                <span className="text-sm font-semibold text-slate-500">
                  {formatBytes(usedStorage)} / {formatBytes(storageLimit)}
                </span>
              </div>
              
              {/* Progress bar track */}
              <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((usedStorage / storageLimit) * 100, 100)}%` }}
                ></div>
              </div>

              <div className="text-xs text-slate-400">
                You are currently using {Math.round((usedStorage / storageLimit) * 100)}% of your student quota. Want more storage? Upgrade it in your Profile panel.
              </div>
            </div>

            {/* Quick Stats shortcut */}
            <div
              onClick={() => setActiveTab('upload')}
              className="glass-card p-6 flex items-center gap-4 cursor-pointer hover:border-brand-primary/30 hover:shadow-md"
            >
              <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Send Files</h4>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Drag files to upload</p>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('clipboard')}
              className="glass-card p-6 flex items-center gap-4 cursor-pointer hover:border-brand-primary/30 hover:shadow-md"
            >
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                <Clipboard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clipboard Clippings</h4>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Sync code outlines</p>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('vault')}
              className="glass-card p-6 flex items-center gap-4 cursor-pointer hover:border-brand-primary/30 hover:shadow-md"
            >
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vault Explorer</h4>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Explore shared file codes</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SEND TO SERVER (UPLOADER) */}
        {activeTab === 'upload' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {uploadLocked ? (
              <div className="glass-card p-10 border-red-200 bg-red-50 text-red-700 flex flex-col items-center justify-center text-center gap-4">
                <div className="p-4 bg-red-100 rounded-full text-red-500">
                  <ShieldAlert className="w-10 h-10 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-800">Upload Privileges Revoked</h3>
                  <p className="text-xs text-red-600 mt-2 max-w-sm">
                    Your administrator has locked file uploads on this account. Please contact college lab support if you believe this is in error.
                  </p>
                </div>
              </div>
            ) : (
              /* Drag & Drop uploader card */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropFiles}
                className="glass-card border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-brand-primary/50 transition-all p-10 flex flex-col items-center justify-center text-center cursor-pointer"
              >
                <input
                  type="file"
                  id="dashboard-file-input"
                  multiple
                  className="hidden"
                  onChange={handleBrowseFiles}
                />
                <label htmlFor="dashboard-file-input" className="cursor-pointer flex flex-col items-center gap-4">
                  <div className="p-4 bg-brand-primary/10 rounded-full text-brand-primary animate-pulse">
                    <UploadCloud className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Drag & Drop Files Here</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      or click to browse files from your computer. (Max size: {formatBytes(storageLimit)})
                    </p>
                  </div>
                </label>
              </div>
            )}
            
            {/* Note prompt shortcut */}
            <div className="glass-card p-5 bg-sky-500/5 flex gap-3 text-xs text-brand-primary leading-relaxed items-start">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Protip</strong>: You can press <kbd className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">Ctrl + Shift + V</kbd> anywhere on this dashboard to open the Quick Paste clipboard panel to write text notes directly to files!
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLIPBOARD / QUICK NOTES */}
        {activeTab === 'clipboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
            {/* Left Column: Form Editor */}
            {clipboardLocked ? (
              <div className="glass-card p-6 border-red-200 bg-red-50 text-red-700 flex flex-col items-center justify-center text-center gap-4 lg:col-span-1 animate-fade-in">
                <div className="p-3 bg-red-100 rounded-full text-red-500">
                  <ShieldAlert className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-800">Clipboard Sync Locked</h3>
                  <p className="text-[11px] text-red-600 mt-1.5 leading-relaxed">
                    Your administrator has locked clipboard snippet creations. You can view existing clippings but cannot save new ones.
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 flex flex-col gap-4 lg:col-span-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4.5 h-4.5 text-brand-primary" />
                  {noteId ? 'Edit Quick Note' : 'Add Quick Note'}
                </h3>
                
                <form onSubmit={handleNoteSubmit} className="space-y-4">
                  <div>
                    <label className="label-title">TITLE</label>
                    <input
                      type="text"
                      placeholder="E.g. Java Code outline"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-title">CONTENT</label>
                    <textarea
                      rows={8}
                      placeholder="Paste or write clipboard snippets..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="input-field font-mono text-xs"
                      required
                    ></textarea>
                  </div>
                  
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
                      Save Snippet
                    </button>
                    {noteId && (
                      <button
                        type="button"
                        onClick={() => {
                          setNoteId('');
                          setNoteTitle('');
                          setNoteContent('');
                        }}
                        className="btn-secondary py-2.5 px-4 text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Right Column: List Snippets */}
            <div className="glass-card p-6 lg:col-span-2 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Notes Clippings</h3>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-48">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search snippets..."
                      value={noteSearch}
                      onChange={(e) => setNoteSearch(e.target.value)}
                      className="input-field pl-9 py-2 text-xs"
                    />
                  </div>
                  <select
                    value={noteSort}
                    onChange={(e) => setNoteSort(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>

              {notesLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                </div>
              ) : getFilteredNotes().length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No note clippings found. Add one on the left to start!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {getFilteredNotes().map((note) => (
                    <div key={note.id} className="glass-card p-4 hover:shadow-md flex flex-col justify-between border-slate-100 dark:border-slate-800">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate" title={note.title}>
                          {note.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-4 font-mono whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                          {note.content}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] text-slate-400">
                          {new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCopyNote(note.content)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-primary transition-colors"
                            title="Copy snippet"
                          >
                            <Clipboard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditNote(note)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-primary transition-colors"
                            title="Edit snippet"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete snippet"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: VAULT EXPLORER */}
        {activeTab === 'vault' && (
          <div className="glass-card p-6 flex flex-col gap-6 animate-fade-in">
            {downloadLocked && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3 text-red-700 dark:text-red-400 animate-scale-up">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Download Privileges Revoked</h4>
                  <p className="text-xs mt-1 text-red-600/90 dark:text-red-400/80">
                    Your administrator has locked file downloads on this account. You cannot download, preview, or share files.
                  </p>
                </div>
              </div>
            )}
            {/* Explorer Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex gap-2">
                <button onClick={handleCreateFolder} className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> New Folder
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search vault..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-9 py-2 text-xs"
                  />
                </div>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name A-Z</option>
                  <option value="size">Largest First</option>
                </select>
                <button
                  onClick={handleToggleLayout}
                  className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300"
                  title="Toggle layout"
                >
                  {layoutMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Folder breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button
                onClick={() => setCurrentFolderId(null)}
                className={`hover:text-brand-primary font-bold ${currentFolderId === null ? 'text-brand-primary' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fileId = e.dataTransfer.getData('text/plain');
                  if (fileId) moveFileToFolder(fileId, null);
                }}
              >
                Vault Root
              </button>
              {currentFolderId && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {folders.find(f => f.id === currentFolderId)?.name || 'Folder'}
                  </span>
                </>
              )}
            </div>

            {/* Filters tags bar */}
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar">
              {['all', 'image', 'document', 'code', 'text', 'zip', 'other'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shrink-0 transition-all ${
                    activeFilter === filter
                      ? 'bg-brand-primary text-white'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/50 dark:border-slate-800/80'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Loading Grid/List */}
            {vaultLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : (
              <div>
                {/* 1. Folders container (Only show on Root) */}
                {currentFolderId === null && folders.length > 0 && !searchQuery && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="glass-card p-4 hover:shadow-md cursor-pointer flex items-center gap-3 border-slate-100 dark:border-slate-800"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fileId = e.dataTransfer.getData('text/plain');
                          if (fileId) moveFileToFolder(fileId, folder.id);
                        }}
                      >
                        <Folder className="w-7 h-7 text-amber-400 shrink-0" />
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate select-none">
                          {folder.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Files container */}
                {getFilteredFiles().length === 0 ? (
                  <div className="text-center py-20 text-slate-400 text-sm">
                    No files found in this directory. Upload files to get started!
                  </div>
                ) : layoutMode === 'grid' ? (
                  // Grid View layout
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {getFilteredFiles().map((file) => (
                      <div
                        key={file.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', file.id)}
                        className="glass-card p-4 hover:shadow-md relative flex flex-col justify-between border-slate-100 dark:border-slate-800"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                              {getFileIcon(file.filename)}
                            </div>
                            
                            {/* File actions dropdown menu */}
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {activeMenuId === file.id && (
                                <div className="absolute right-0 top-6 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 z-30">
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handlePreviewFile(file);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Preview
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDownloadFileDirect(file.storage_path, file.filename);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Download className="w-3.5 h-3.5" /> Download
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleGenerateShareCode(file);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Share2 className="w-3.5 h-3.5" /> Share Code
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      triggerRenameFile(file);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" /> Rename
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDeleteFile(file.id, file.storage_path, file.filename);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                                  >
                                    <Trash className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-4 truncate" title={file.filename}>
                            {file.filename}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatBytes(file.size)}
                          </p>
                        </div>
                        
                        <div className="text-[9px] text-slate-400 mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          Uploaded: {new Date(file.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // List View layout
                  <div className="flex flex-col gap-2">
                    {getFilteredFiles().map((file) => (
                      <div
                        key={file.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', file.id)}
                        className="glass-card p-3 flex items-center justify-between gap-4 hover:shadow-sm border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg shrink-0">
                            {getFileIcon(file.filename)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate" title={file.filename}>
                              {file.filename}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {formatBytes(file.size)} &bull; {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handlePreviewFile(file)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="Preview file"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadFileDirect(file.storage_path, file.filename)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleGenerateShareCode(file)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="Generate Share Code"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => triggerRenameFile(file)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="Rename file"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id, file.storage_path, file.filename)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete file"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="glass-card p-6 flex flex-col gap-6 animate-fade-in max-w-xl">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Inactivity Timeout Auto-Logout</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                To protect your credential safety on shared public laboratory stations, configure how long the console can remain idle before logging you out automatically.
              </p>
              
              <div className="relative">
                <select
                  value={inactivityLimit}
                  onChange={handleInactivityChange}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="disabled">Disabled (Do not logout automatically)</option>
                  <option value="5">5 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PROFILE INFO */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in">
            {/* Left: Profile Information */}
            <div className="glass-card p-6 flex flex-col gap-5">
              <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800/50 pb-3">
                Profile Information
              </h3>
              
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-brand-primary bg-brand-primary/10 flex items-center justify-center font-display font-semibold text-brand-primary text-2xl uppercase overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      (fullName ? fullName.substring(0, 2) : user?.email?.substring(0, 2) || 'U')
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary absolute bottom-0 right-0 p-1.5 rounded-full w-7 h-7 flex items-center justify-center shadow-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    type="button"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleAvatarUpload} 
                    className="hidden" 
                    accept="image/*" 
                  />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                    {fullName || 'Student Name'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {user?.email}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Joined: {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                  </p>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4 pt-2">
                <div>
                  <label className="label-title">Display Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    required
                    disabled={isProfileLocked}
                  />
                </div>
                <div>
                  <label className="label-title">College / Institution</label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="input-field"
                    disabled={isProfileLocked}
                  />
                </div>
                {isProfileLocked ? (
                  <div className="text-center pt-2">
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 mb-3 leading-relaxed">
                      Display name and college can only be changed by requesting the administrator.
                    </p>
                    <a
                      href={`mailto:homtolab@gmail.com?subject=Profile Change Request for ${encodeURIComponent(user?.email)}&body=Hello Admin,%0A%0AI would like to request a change to my profile details.%0A%0ACurrent Name: ${encodeURIComponent(fullName)}%0ACurrent College: ${encodeURIComponent(college)}%0A%0ANew Name: %0ANew College: %0A%0AThank you!`}
                      className="w-full btn-secondary py-2 text-xs flex items-center justify-center gap-1 border border-brand-primary/10 text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-primary-hover"
                    >
                      Request Profile Change
                    </a>
                  </div>
                ) : (
                  <button type="submit" className="w-full btn-primary py-2.5 text-sm">
                    Save Name
                  </button>
                )}
              </form>
            </div>

            {/* Right: Security & Storage Quota & Danger Zone */}
            <div className="flex flex-col gap-6">
              {/* Security (Change Password) */}
              <div className="glass-card p-6 flex flex-col gap-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800/50 pb-3">
                  Security
                </h3>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="label-title">New Password</label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-field"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="label-title">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field"
                      required
                      minLength={6}
                    />
                  </div>
                  <button type="submit" disabled={passwordLoading} className="w-full btn-primary py-2.5 text-xs">
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

              {/* Storage upgrade request */}
              <div className="glass-card p-6 flex flex-col gap-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800/50 pb-3">
                  Storage Quota & Upgrades
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Current Storage Limit:</span>
                    <strong className="font-bold text-brand-primary">{formatBytes(storageLimit)}</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    By default, all student vaults are allocated 100 MB of storage space. If you need more room for assignments, project files, or source code, you can request an upgrade to 300 MB.
                  </p>
                </div>

                {requestPending ? (
                  <div className="flex items-center gap-2 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-semibold">
                    <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>You have a pending upgrade request. Please wait for approval.</span>
                  </div>
                ) : (
                  <form onSubmit={handleUpgradeRequest} className="space-y-4">
                    <div>
                      <label className="label-title">CHOOSE ALLOCATION LIMIT</label>
                      <select
                        value={requestedLimit}
                        onChange={(e) => setRequestedLimit(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none"
                      >
                        <option value="209715200">200 MB</option>
                        <option value="314572800">300 MB</option>
                        <option value="524288000">500 MB</option>
                        <option value="1073741824">1 GB</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full btn-primary py-2.5 text-xs">
                      Request 300 MB Upgrade
                    </button>
                  </form>
                )}
              </div>

              {/* Danger Zone */}
              <div className="glass-card p-6 border-red-500/20 bg-red-500/5 flex flex-col gap-4">
                <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-4.5 h-4.5" /> Danger Zone
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Deleting your profile wipes all snippets logs and destroys files saved inside your personal storage directory permanently.
                </p>
                <button
                  onClick={triggerWipeAccount}
                  className="w-full btn-danger py-2.5 text-xs"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
          MODALS & OVERLAYS VIEWPORTS
      ========================================== */}
      
      {/* 1. Global Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-sm w-full p-6 shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {confirmModalData.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              {confirmModalData.message}
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
                  if (confirmModalData.action) confirmModalData.action();
                }}
                className="btn-danger py-2 px-4 text-xs font-bold"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. File Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <form onSubmit={handleRenameSubmit} className="glass-card max-w-sm w-full p-6 shadow-2xl animate-scale-up">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Rename Vault File</h3>
            <input
              type="text"
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              className="input-field mb-4"
              required
            />
            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Sharing Code Result modal */}
      {showShareModal && shareCodeData && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-sm w-full p-6 shadow-2xl text-center animate-scale-up">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">Temporary Sharing Code</h3>
            <p className="text-xs text-slate-400 mb-6 truncate" title={shareCodeData.filename}>
              File: {shareCodeData.filename}
            </p>
            
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-5 px-6 mb-4 relative overflow-hidden">
              <div className="text-3xl font-black font-display tracking-[8px] text-brand-primary uppercase select-all">
                {shareCodeData.code}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 mb-6 flex items-center justify-center gap-1.5">
              <span>Code expires in:</span>
              <span className="font-mono font-bold text-slate-600 dark:text-slate-200">
                {Math.floor(shareTimeLeft / 60)}m {shareTimeLeft % 60}s
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareCodeData.code)
                    .then(() => showToast('Share code copied!', 'success'))
                    .catch(() => showToast('Copy failed.', 'danger'));
                }}
                className="flex-1 btn-primary py-2.5 text-xs font-bold"
              >
                Copy Code
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="btn-secondary py-2.5 px-4 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Uploads progress overlay banner */}
      {showUploadProgressCard && (
        <div className="fixed bottom-5 left-5 z-40 max-w-sm w-full pointer-events-none">
          <div className="pointer-events-auto glass-card p-4 shadow-xl border-slate-200 dark:border-slate-800 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Uploads Queue</h3>
            
            <div className="flex flex-col gap-3.5">
              {Object.entries(activeUploads).map(([id, upload]) => (
                <div key={id} className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex-1" title={upload.name}>
                      {upload.name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 capitalize">
                      {upload.status === 'completed' && <span className="text-green-500 font-bold">Done</span>}
                      {upload.status === 'failed' && <span className="text-red-500 font-bold">Failed</span>}
                      {upload.status === 'cancelled' && <span className="text-slate-400 font-bold">Aborted</span>}
                      {upload.status === 'uploading' && `${upload.progress}%`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          upload.status === 'failed' ? 'bg-red-500' :
                          upload.status === 'cancelled' ? 'bg-slate-400' :
                          'bg-brand-primary'
                        }`}
                        style={{ width: `${upload.progress}%` }}
                      ></div>
                    </div>

                    <div className="shrink-0 flex gap-1">
                      {upload.status === 'uploading' && (
                        <button
                          onClick={() => cancelUpload(id)}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded"
                          title="Abort Upload"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(upload.status === 'failed' || upload.status === 'cancelled') && (
                        <>
                          <button
                            onClick={() => retryUpload(id)}
                            className="text-brand-primary hover:text-brand-primary-hover p-0.5 rounded"
                            title="Retry Upload"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 rotate-90" />
                          </button>
                          <button
                            onClick={() => dismissUploadItem(id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded"
                            title="Dismiss"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Image Lightbox preview modal */}
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

      {/* 6. Code/Text preview modal */}
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

      {/* 7. Quick Paste Modal (Ctrl+Shift+V) */}
      {showQuickPaste && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-md w-full p-6 shadow-2xl animate-scale-up flex flex-col">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">Quick Clipboard Paste</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter any text block. It will be written into a text file in your Vault and cataloged as a note snippet automatically.
            </p>

            <textarea
              rows={8}
              placeholder="Paste clipboard content here..."
              value={quickPasteText}
              onChange={(e) => setQuickPasteText(e.target.value)}
              className="input-field font-mono text-xs mb-6"
            ></textarea>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => {
                  setShowQuickPaste(false);
                  setQuickPasteText('');
                }}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickPasteSave}
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                Save to Server
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
