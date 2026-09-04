import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

// Import modular API services
import { 
  fetchFilesAndFolders, 
  calculateUsedStorage, 
  createSignedDownloadUrl, 
  insertFileRecord, 
  uploadFileToStorage,
  softDeleteFileInDb,
  restoreFileInDb,
  deleteFileRecordFromDb,
  deleteFileFromStorage,
  computeFileHash,
  deleteFolderInDb,
  fetchFileVersions,
  saveFileVersionRecord,
  restoreFileVersion,
  uploadFileResumable
} from '../services/fileService';

import { 
  fetchNotesFromDb, 
  deleteNoteRecord,
  softDeleteNoteRecord,
  restoreNoteRecord
} from '../services/noteService';

import { 
  fetchProfileDetailsFromDb, 
  fetchLoginLogsFromDb 
} from '../services/profileService';

import { encryptFileBuffer, decryptFileBuffer, encryptText, decryptText } from '../utils/cryptoHelper';
import { checkBlockedExtension } from '../utils/fileSecurity';
import QRCodeModal from '../components/QRCodeModal';
import StorageDonutChart from '../components/StorageDonutChart';
import GlobalAnnouncementBanner from '../components/GlobalAnnouncementBanner';

import {
  LayoutDashboard, UploadCloud, Clipboard, FolderKanban, Settings as SettingsIcon, User as UserIcon,
  LogOut, Sun, Moon, ShieldAlert, Bell, Folder, File, FileImage, FileText, FileCode, FileArchive, HelpCircle,
  Grid, List, Search, ArrowUpDown, MoreVertical, Eye, Download, Trash, Edit3, Share2, Plus, ArrowLeft,
  X, Check, AlertTriangle, ShieldCheck, Shield, Camera, Menu, Mic, QrCode, RotateCcw, Lock, Unlock, Play,
  History, Copy, Calendar, Filter
} from 'lucide-react';


const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileCategory = (filename = '', mimeType = '') => {
  const ext = filename.split('.').pop().toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  if (imageExts.includes(ext) || mimeType.startsWith('image/')) return 'image';

  const videoExts = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'];
  if (videoExts.includes(ext) || mimeType.startsWith('video/')) return 'video';

  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
  if (audioExts.includes(ext) || mimeType.startsWith('audio/')) return 'audio';
  
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
  if (docExts.includes(ext)) return 'document';
  
  const codeExts = ['java', 'py', 'html', 'css', 'js', 'json', 'xml', 'cpp', 'c', 'sh', 'sql', 'php', 'ts', 'jsx', 'tsx', 'rs', 'go', 'yaml', 'yml'];
  if (codeExts.includes(ext)) return 'code';
  
  const txtExts = ['txt', 'md', 'csv', 'log', 'env'];
  if (txtExts.includes(ext) || mimeType.startsWith('text/')) return 'text';
  
  const zipExts = ['zip', 'rar', 'tar', 'gz', '7z'];
  if (zipExts.includes(ext)) return 'zip';
  
  return 'other';
};

const Dashboard = () => {
  const { user, session, supabase, logout, deleteOwnAccount } = useAuth();
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
  const [operationsLocked, setOperationsLocked] = useState(false);

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
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days'
  const [folderScope, setFolderScope] = useState('current'); // 'current' | 'all'

  // Versioning and Duplicate Modals
  const [versionModalFile, setVersionModalFile] = useState(null);
  const [fileVersionsList, setFileVersionsList] = useState([]);
  const [duplicateModalData, setDuplicateModalData] = useState(null);

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

  // Active downloader files queue
  const [activeDownloads, setActiveDownloads] = useState({});
  const [showDownloadProgressCard, setShowDownloadProgressCard] = useState(false);

  // Create text file states
  const [showCreateTxtModal, setShowCreateTxtModal] = useState(false);
  const [newTxtName, setNewTxtName] = useState('');
  const [newTxtContent, setNewTxtContent] = useState('');
  const [newTxtEncrypt, setNewTxtEncrypt] = useState(false);
  const [newTxtPassphrase, setNewTxtPassphrase] = useState('');

  // Global announcement popup state
  const [activeAlert, setActiveAlert] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

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

  // Session monitor state
  const [loginLogs, setLoginLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Encryption & PWA / Multi-download states
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
  const [uploadPassphrase, setUploadPassphrase] = useState('');
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [decryptTargetFile, setDecryptTargetFile] = useState(null);
  const [decryptActionType, setDecryptActionType] = useState('download'); // 'download' | 'preview'
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Share options configuration state
  const [showShareOptionsModal, setShowShareOptionsModal] = useState(false);
  const [shareOptionsFile, setShareOptionsFile] = useState(null);
  const [selectedShareExpiry, setSelectedShareExpiry] = useState(1800);
  const [shareSelfDestruct, setShareSelfDestruct] = useState(false);

  // Move file modal state & Upload destination folder
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetFiles, setMoveTargetFiles] = useState([]);
  const [selectedDestinationFolderId, setSelectedDestinationFolderId] = useState(null);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState(null);

  // Audio voice memo recorder states
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordTimerRef = useRef(null);
  const audioChunksRef = useRef([]);

  // File Previews Lightbox (Unified multi-format media preview)
  const [previewImage, setPreviewImage] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null); // { type: 'image'|'video'|'audio'|'pdf'|'text', title: string, url?: string, content?: string }

  // QR Code Modal State
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalData, setQrModalData] = useState({ code: '', filename: '', url: '' });

  // Local QR Code Generator State
  const [shareQrDataUrl, setShareQrDataUrl] = useState('');

  useEffect(() => {
    if (showShareModal && shareCodeData?.code) {
      const shareUrl = `${window.location.origin}/?code=${shareCodeData.code}`;
      QRCode.toDataURL(shareUrl, {
        width: 180,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      })
      .then((url) => setShareQrDataUrl(url))
      .catch((err) => console.error('Failed to generate local QR code:', err));
    } else {
      setShareQrDataUrl('');
    }
  }, [showShareModal, shareCodeData]);

  // Encrypted Note States
  const [noteEncrypt, setNoteEncrypt] = useState(false);
  const [notePassphrase, setNotePassphrase] = useState('');
  const [showNoteDecryptModal, setShowNoteDecryptModal] = useState(false);
  const [targetNoteToDecrypt, setTargetNoteToDecrypt] = useState(null);
  const [noteDecryptPassphrase, setNoteDecryptPassphrase] = useState('');
  const [decryptedNotesMap, setDecryptedNotesMap] = useState({}); // { [noteId]: decryptedContent }

  // Quick Paste CTRL+SHIFT+V modal
  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState('');

  // Dropdown menu state per file card
  const [activeMenuId, setActiveMenuId] = useState(null);


  // 1. Fetch User Profile Info & Dashboard data
  const fetchProfileDetails = async () => {
    if (!supabase || !user) return;
    try {
      const data = await fetchProfileDetailsFromDb(supabase, user.id);
      
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
        setOperationsLocked(!!data.operations_locked);

        // Resolve avatar image URL using a signed URL if set
        if (data.avatar_url) {
          const signedUrl = await createSignedDownloadUrl(supabase, data.avatar_url, 3600);
          if (signedUrl) {
            setAvatarUrl(signedUrl);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogoutClick = () => {
    setConfirmModalData({
      title: 'Na Kare Janab Na kare',
      message: 'Are you sure you want to sign out of your CloudVault session? Any unsaved clipboard drafts or active file selections will be closed.',
      confirmText: 'Logout',
      cancelText: 'Back',
      action: async () => {
        try {
          await logout();
          navigate('/');
          setIsDrawerOpen(false);
        } catch (err) {
          console.error(err);
          showToast('Failed to logout.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const fetchStorageStats = async () => {
    if (!supabase || !user) return;
    try {
      const total = await calculateUsedStorage(supabase, user.id);
      setUsedStorage(total);
    } catch (err) {
      console.error(err);
    }
  };

  const getStorageBreakdown = () => {
    let imageSize = 0;
    let codeSize = 0;
    let docSize = 0;
    let textSize = 0;
    let audioSize = 0;
    let otherSize = 0;
    
    files.forEach(f => {
      const size = f.size || 0;
      if (f.file_type === 'image') imageSize += size;
      else if (f.file_type === 'code') codeSize += size;
      else if (f.file_type === 'document') docSize += size;
      else if (f.file_type === 'text') textSize += size;
      else if (f.file_type === 'audio') audioSize += size;
      else otherSize += size;
    });
    
    return [
      { name: 'Images', value: imageSize, color: '#3b82f6' },
      { name: 'Code', value: codeSize, color: '#10b981' },
      { name: 'Documents', value: docSize, color: '#a855f7' },
      { name: 'Text', value: textSize, color: '#f59e0b' },
      { name: 'Audio', value: audioSize, color: '#ec4899' },
      { name: 'Other', value: otherSize, color: '#64748b' }
    ];
  };

  const renderStorageChart = () => {
    const breakdown = getStorageBreakdown();
    const total = breakdown.reduce((acc, curr) => acc + curr.value, 0);
    const radius = 40;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius; // 251.32
    
    let accumulatedCircumference = 0;
    
    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 p-4">
        {/* SVG Circle Chart */}
        <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-slate-100 dark:stroke-slate-800/40"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {total > 0 && breakdown.map((item) => {
              const percentage = item.value / total;
              const strokeLength = percentage * circumference;
              const dashOffset = accumulatedCircumference;
              accumulatedCircumference += strokeLength;
              
              if (item.value === 0) return null;
              
              return (
                <circle
                  key={item.name}
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={-dashOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-base font-black text-slate-800 dark:text-white leading-none">
              {Math.round((usedStorage / storageLimit) * 100)}%
            </span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Used</span>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-xs">
          {breakdown.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-700 dark:text-slate-350 truncate">{item.name}</span>
                <span className="text-[9px] text-slate-400 font-mono">{formatBytes(item.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const fetchVaultFiles = async () => {
    if (!supabase || !user) return;
    setVaultLoading(true);
    try {
      const { folders, files } = await fetchFilesAndFolders(supabase, user.id);
      setFolders(folders || []);
      setFiles(files || []);
      if (files) {
        const total = files.reduce((acc, f) => acc + (parseInt(f.size, 10) || 0), 0);
        setUsedStorage(total);
      }
    } catch (err) {
      console.error('[VAULT FETCH ERROR]', err);
      showToast('Failed to load files: ' + (err.message || String(err)), 'danger');
    } finally {
      setVaultLoading(false);
    }
  };

  const fetchNotes = async () => {
    if (!supabase || !user) return;
    setNotesLoading(true);
    try {
      const data = await fetchNotesFromDb(supabase, user.id);
      setNotes(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve snippets.', 'danger');
    } finally {
      setNotesLoading(false);
    }
  };


  const fetchActiveAlert = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('global_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const latestAlert = data[0];
        setActiveAlert(latestAlert);
        setShowAlertModal(true);
        
        // Auto close after 10 seconds
        setTimeout(() => {
          setShowAlertModal(false);
        }, 10000);
      }
    } catch (err) {
      console.error('Failed to fetch active alerts:', err);
    }
  };

  const fetchUpgradeRequestStatus = async () => {
    if (!supabase || !user) return;
    try {
      const { data } = await supabase
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

  const isInitialMountRef = useRef(true);

  // Initial load: Batch parallel fetch
  useEffect(() => {
    if (user) {
      Promise.allSettled([
        fetchProfileDetails(),
        fetchVaultFiles(),
        fetchNotes(),
        fetchUpgradeRequestStatus(),
        fetchUserLoginLogs(),
        fetchActiveAlert()
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Tab change trigger loading (skips initial mount)
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (user && prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      if (activeTab === 'vault' || activeTab === 'overview') {
        fetchVaultFiles();
      }
      if (activeTab === 'clipboard') {
        fetchNotes();
      }
      if (activeTab === 'settings') {
        fetchUserLoginLogs();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

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
          contentType: file.type || 'image/*',
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
      let finalContent = noteContent;
      let isEncrypted = false;

      if (noteEncrypt) {
        if (!notePassphrase.trim()) {
          showToast('Passphrase is required to encrypt note snippet.', 'warning');
          return;
        }
        finalContent = await encryptText(noteContent, notePassphrase);
        isEncrypted = true;
      }

      if (noteId) {
        // Update Snippet
        const { error } = await supabase
          .from('notes')
          .update({ 
            title: noteTitle.trim(), 
            content: finalContent,
            is_encrypted: isEncrypted
          })
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
            content: finalContent,
            is_encrypted: isEncrypted,
            is_deleted: false
          });

        if (error) throw error;
        showToast(isEncrypted ? 'Encrypted snippet saved securely!' : 'Snippet saved successfully!', 'success');
      }

      setNoteId('');
      setNoteTitle('');
      setNoteContent('');
      setNoteEncrypt(false);
      setNotePassphrase('');
      fetchNotes();
    } catch (err) {
      console.error(err);
      showToast('Failed to save snippet: ' + err.message, 'danger');
    }
  };

  const handleEditNote = (note) => {
    setNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(decryptedNotesMap[note.id] || note.content);
  };

  const handleMoveNoteToTrash = async (id) => {
    if (operationsLocked) {
      showToast('Snippet modifications are locked by the administrator.', 'warning');
      return;
    }
    try {
      await softDeleteNoteRecord(supabase, id);
      showToast('Moved note snippet to Trash.', 'info');
      fetchNotes();
    } catch (err) {
      console.error(err);
      showToast('Failed to move snippet to trash.', 'danger');
    }
  };

  const handleRestoreNote = async (id) => {
    try {
      await restoreNoteRecord(supabase, id);
      showToast('Restored note snippet successfully!', 'success');
      fetchNotes();
    } catch (err) {
      console.error(err);
      showToast('Failed to restore snippet.', 'danger');
    }
  };

  const handlePermanentDeleteNote = (id) => {
    setConfirmModalData({
      title: 'Permanently Delete Snippet',
      message: 'Are you sure you want to permanently purge this text snippet from database? This cannot be undone.',
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      action: async () => {
        try {
          await deleteNoteRecord(supabase, id);
          showToast('Snippet permanently deleted.', 'success');
          fetchNotes();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete snippet.', 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDecryptNoteClick = (note) => {
    setTargetNoteToDecrypt(note);
    setNoteDecryptPassphrase('');
    setShowNoteDecryptModal(true);
  };

  const handleExecuteNoteDecryption = async (e) => {
    e.preventDefault();
    if (!targetNoteToDecrypt || !noteDecryptPassphrase) return;

    try {
      const decrypted = await decryptText(targetNoteToDecrypt.content, noteDecryptPassphrase);
      setDecryptedNotesMap((prev) => ({
        ...prev,
        [targetNoteToDecrypt.id]: decrypted
      }));
      showToast('Note snippet decrypted successfully!', 'success');
      setShowNoteDecryptModal(false);
      setTargetNoteToDecrypt(null);
      setNoteDecryptPassphrase('');
    } catch (err) {
      console.error(err);
      showToast('Decryption failed. Please check your passphrase.', 'danger');
    }
  };


  // Fetch login logs for session monitoring
  const fetchUserLoginLogs = async () => {
    if (!supabase || !user) return;
    setLogsLoading(true);
    try {
      const logs = await fetchLoginLogsFromDb(supabase, user.id, 10);
      setLoginLogs(logs);
    } catch (err) {
      console.warn('Failed to fetch user login logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Sign out all other sessions/devices
  const handleSignOutOthers = async () => {
    if (!supabase) return;
    setConfirmModalData({
      title: 'Sign Out Other Sessions',
      message: 'Are you sure you want to sign out all other devices and active sessions? You will remain signed in only on this browser.',
      confirmText: 'Sign Out Others',
      cancelText: 'Cancel',
      action: async () => {
        try {
          const { error } = await supabase.auth.signOut({ scope: 'others' });
          if (error) throw error;
          showToast('Successfully signed out all other devices!', 'success');
          setTimeout(fetchUserLoginLogs, 1000);
        } catch (err) {
          console.error(err);
          showToast('Failed to sign out other devices: ' + err.message, 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Share text notes directly by converting them to virtual text files
  const handleShareNote = async (note) => {
    if (downloadLocked) {
      showToast('Sharing privileges have been revoked by the administrator.', 'danger');
      return;
    }
    showToast('Preparing note for sharing...', 'info');
    try {
      const sanitizedTitle = note.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'note';
      const filename = `${sanitizedTitle}_snippet.txt`;
      const storagePath = `uploads/${user.id}/${filename}`;

      // Convert note text to file blob
      const blob = new Blob([note.content], { type: 'text/plain' });
      const fileObj = new window.File([blob], filename, { type: 'text/plain' });

      // Upload text file to storage
      await uploadFileToStorage(supabase, storagePath, fileObj, {
        contentType: 'text/plain'
      });

      // Check if file record already exists in database
      let fileRecord;
      const { data: existingFiles, error: checkError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .eq('storage_path', storagePath);

      if (checkError) throw checkError;

      if (existingFiles && existingFiles.length > 0) {
        fileRecord = existingFiles[0];
      } else {
        // Insert record into files table
        fileRecord = await insertFileRecord(supabase, {
          user_id: user.id,
          filename: filename,
          storage_path: storagePath,
          file_type: 'text',
          size: blob.size
        });
      }

      // Generate the sharing code for this file record
      await handleGenerateShareCode(fileRecord);
      
      // Refresh vault if active
      fetchStorageStats();
      if (activeTab === 'vault') fetchVaultFiles();
    } catch (err) {
      console.error(err);
      showToast('Failed to share note: ' + err.message, 'danger');
    }
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
      const fileObj = new window.File([blob], filename, { type: 'text/plain' });

      // Upload text file to storage
      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(storagePath, fileObj, {
          contentType: 'text/plain'
        });

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
    const passphrase = isEncryptionEnabled ? uploadPassphrase : '';

    for (const file of itemsArray) {
      let processedFile = file;

      // Security: Block dangerous executable file extensions (.exe, .bat, .sh, etc.)
      const blockedCheck = checkBlockedExtension(processedFile.name);
      if (blockedCheck.isBlocked) {
        showToast(`Security Alert: Upload blocked for "${processedFile.name}" (Forbidden file extension: ${blockedCheck.extension}).`, 'danger');
        continue;
      }

      // Local Image Compression
      if (file.type?.startsWith('image/')) {
        try {
          processedFile = await compressImageFile(file);
        } catch (err) {
          console.warn('Image compression failed, uploading original:', err);
        }
      }

      // Validate quota limits
      if (processedFile.size > storageLimit) {
        showToast(`Rejected: "${processedFile.name}" exceeds the ${formatBytes(storageLimit)} limit.`, 'danger');
        continue;
      }

      if (currentUsed + processedFile.size > storageLimit) {
        showToast(`Rejected: Uploading "${processedFile.name}" will exceed your allocated limit.`, 'warning');
        continue;
      }

      currentUsed += processedFile.size;

      // Generate random upload ID
      const uploadId = 'up_' + Math.random().toString(36).substring(2, 9);
      setShowUploadProgressCard(true);

      // Initialize upload state queue
      setActiveUploads((prev) => ({
        ...prev,
        [uploadId]: {
          name: processedFile.name,
          size: processedFile.size,
          progress: 0,
          status: 'ready',
          controller: null,
          fileObj: processedFile
        }
      }));

      // Start upload
      startUploadingFile(uploadId, processedFile, passphrase);
    }
  };

  const startUploadingFile = async (uploadId, file, passphrase = '', forceUpload = false) => {
    const controller = new AbortController();

    setActiveUploads((prev) => ({
      ...prev,
      [uploadId]: {
        ...prev[uploadId],
        status: 'uploading',
        controller
      }
    }));

    const isEncrypted = !!passphrase;
    let fileToUpload = file;
    let fileNameToSave = file.name;

    try {
      // Calculate content hash for duplicate detection
      const contentHash = await computeFileHash(file);

      // Task 2.3: Duplicate Detection Check
      if (!forceUpload) {
        const existingDup = files.find(f => !f.is_deleted && f.content_hash === contentHash);
        if (existingDup) {
          setDuplicateModalData({ uploadId, file, passphrase, existingDup });
          setActiveUploads((prev) => {
            const next = { ...prev };
            delete next[uploadId];
            return next;
          });
          return;
        }
      }

      if (isEncrypted) {
        const arrayBuffer = await file.arrayBuffer();
        const encryptedBuffer = await encryptFileBuffer(arrayBuffer, passphrase);
        fileNameToSave = `[encrypted]_${file.name}`;
        fileToUpload = new window.File([encryptedBuffer], fileNameToSave, { type: 'application/octet-stream' });
      }

      // Task 2.2: Versioning - Check if file with same name exists in same folder
      const existingSameName = files.find(f => 
        !f.is_deleted && 
        f.filename === fileNameToSave && 
        (f.folder_id === currentFolderId || (!f.folder_id && !currentFolderId))
      );
      if (existingSameName) {
        await saveFileVersionRecord(supabase, existingSameName);
      }

      const uniquePrefix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const storagePath = `uploads/${user.id}/${uniquePrefix}_${fileNameToSave}`;

      // Task 2.4: Resumable upload for files > 20MB
      const TWENTY_MB = 20 * 1024 * 1024;
      if (fileToUpload.size > TWENTY_MB) {
        await uploadFileResumable(supabase, storagePath, fileToUpload, (percent) => {
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
        });
      } else {
        const { error } = await supabase.storage
          .from('vault')
          .upload(storagePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
            contentType: fileToUpload.type || 'application/octet-stream',
            onUploadProgress: (progressEvent) => {
              const percent = Math.round((progressEvent.loaded / (progressEvent.total || fileToUpload.size || 1)) * 100);
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
      }

      // Determine folder_id for new upload record
      let assignedFolderId = (uploadTargetFolderId !== undefined && uploadTargetFolderId !== null) ? uploadTargetFolderId : currentFolderId;
      if (!assignedFolderId && folders.length > 0) {
        const lowerName = fileNameToSave.toLowerCase();
        const labFolder = folders.find(f => !f.is_deleted && f.name.toLowerCase().includes('lab'));
        const lectureFolder = folders.find(f => !f.is_deleted && f.name.toLowerCase().includes('lecture'));
        const practicalFolder = folders.find(f => !f.is_deleted && f.name.toLowerCase().includes('practical'));
        const defaultFolder = practicalFolder || labFolder || lectureFolder || folders.find(f => !f.is_deleted);

        if (practicalFolder && (
          /ex[\s\-_0-9.]/i.test(lowerName) || /^ex\d/i.test(lowerName) || lowerName.includes('ex') || lowerName.includes('prac') || lowerName.includes('exercise') || lowerName.includes('assignment') || lowerName.includes('task')
        )) {
          assignedFolderId = practicalFolder.id;
        } else if (labFolder && (
          lowerName.includes('lab') || lowerName.includes('sorting') || lowerName.includes('sort') || lowerName.includes('sudo') || lowerName.includes('algo') || lowerName.includes('exp')
        )) {
          assignedFolderId = labFolder.id;
        } else if (lectureFolder && (
          lowerName.includes('lecture') || lowerName.includes('notes') || lowerName.includes('unit') || lowerName.includes('ch') || lowerName.includes('chapter')
        )) {
          assignedFolderId = lectureFolder.id;
        } else if (defaultFolder) {
          assignedFolderId = defaultFolder.id;
        }
      }

      // Register file entry in DB catalog with content_hash & folder_id
      const fileCategory = getFileCategory(fileNameToSave, fileToUpload.type || 'application/octet-stream');
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          filename: fileNameToSave,
          storage_path: storagePath,
          file_type: fileCategory,
          size: fileToUpload.size,
          folder_id: assignedFolderId || null,
          content_hash: contentHash
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
      console.error(err);
      if (err.name === 'AbortError') {
        setActiveUploads((prev) => {
          if (!prev[uploadId]) return prev;
          return {
            ...prev,
            [uploadId]: {
              ...prev[uploadId],
              status: 'cancelled',
              progress: 0
            }
          };
        });
        showToast(`Upload of "${file.name}" aborted.`, 'warning');
      } else {
        setActiveUploads((prev) => {
          if (!prev[uploadId]) return prev;
          return {
            ...prev,
            [uploadId]: {
              ...prev[uploadId],
              status: 'failed',
              progress: 0
            }
          };
        });
        showToast(`Failed to upload "${file.name}": ${err.message}`, 'danger');
      }
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

  const cancelDownload = (downloadId) => {
    const download = activeDownloads[downloadId];
    if (download && download.controller) {
      download.controller.abort();
      setActiveDownloads((prev) => {
        if (!prev[downloadId]) return prev;
        return {
          ...prev,
          [downloadId]: {
            ...prev[downloadId],
            status: 'cancelled'
          }
        };
      });
    }
  };

  const dismissDownloadItem = (downloadId) => {
    setActiveDownloads((prev) => {
      const updated = { ...prev };
      delete updated[downloadId];
      return updated;
    });
  };

  useEffect(() => {
    if (Object.keys(activeDownloads).length === 0) {
      setShowDownloadProgressCard(false);
    }
  }, [activeDownloads]);

  const handleOpenCreateTxtModal = () => {
    if (operationsLocked) {
      showToast('Folder and file modifications are locked by the administrator.', 'warning');
      return;
    }
    setNewTxtName('');
    setNewTxtContent('');
    setNewTxtEncrypt(false);
    setNewTxtPassphrase('');
    setShowCreateTxtModal(true);
  };

  const handleCreateTxtSubmit = async (e) => {
    e.preventDefault();

    if (!newTxtName.trim()) {
      showToast('Please enter a file name.', 'warning');
      return;
    }

    let finalName = newTxtName.trim();
    if (!finalName.toLowerCase().endsWith('.txt')) {
      finalName += '.txt';
    }

    const passphrase = newTxtEncrypt ? newTxtPassphrase : '';

    showToast('Creating text file...', 'info');
    setShowCreateTxtModal(false);

    try {
      const blob = new Blob([newTxtContent], { type: 'text/plain' });
      const fileObj = new window.File([blob], finalName, { type: 'text/plain' });

      const uploadId = 'up_' + Math.random().toString(36).substring(2, 9);
      setShowUploadProgressCard(true);

      setActiveUploads((prev) => ({
        ...prev,
        [uploadId]: {
          name: finalName,
          size: fileObj.size,
          progress: 0,
          status: 'ready',
          controller: null,
          fileObj: fileObj
        }
      }));

      startUploadingFile(uploadId, fileObj, passphrase);
    } catch (err) {
      console.error(err);
      showToast('Failed to create text file: ' + err.message, 'danger');
    }
  };

  // ==========================================
  // VAULT EXPLORER ACTIONS
  // ==========================================
  const handleCreateFolder = async () => {
    if (operationsLocked) {
      showToast('Folder and file modifications are locked by the administrator.', 'warning');
      return;
    }
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

  const moveFileToFolder = async (targetFileOrId, destFolderId) => {
    if (operationsLocked) {
      showToast('Folder and file modifications are locked by the administrator.', 'warning');
      return;
    }
    try {
      let targetFile = typeof targetFileOrId === 'object' ? targetFileOrId : files.find(f => f.id === targetFileOrId);
      const fileId = typeof targetFileOrId === 'string' ? targetFileOrId : targetFileOrId?.id;

      if (!targetFile && fileId) {
        targetFile = files.find(f => f.id === fileId);
      }

      if (!targetFile) {
        throw new Error('Target file record not found.');
      }

      // Check if fileId is a real database UUID or virtual/unindexed ID
      const isVirtualId = !fileId || String(fileId).startsWith('storage_') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(fileId));

      if (isVirtualId) {
        // Upsert/Insert missing DB row with folder_id
        const fileCategory = getFileCategory(targetFile.filename, targetFile.file_type || '');
        const { error: insertErr } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            filename: targetFile.filename,
            storage_path: targetFile.storage_path,
            file_type: fileCategory,
            size: targetFile.size || 0,
            folder_id: destFolderId
          });

        if (insertErr) throw insertErr;
      } else {
        // Real UUID: update database row
        const { data: updatedData, error: updateErr } = await supabase
          .from('files')
          .update({ folder_id: destFolderId })
          .eq('id', fileId)
          .select();

        if (updateErr) throw updateErr;

        // If 0 rows updated (record missing in DB), insert new row with folder_id
        if (!updatedData || updatedData.length === 0) {
          const fileCategory = getFileCategory(targetFile.filename, targetFile.file_type || '');
          await supabase
            .from('files')
            .insert({
              user_id: user.id,
              filename: targetFile.filename,
              storage_path: targetFile.storage_path,
              file_type: fileCategory,
              size: targetFile.size || 0,
              folder_id: destFolderId
            });
        }
      }

      const folderName = destFolderId ? (folders.find(f => f.id === destFolderId)?.name || 'Folder') : 'Vault Root';
      showToast(`File moved to "${folderName}" successfully!`, 'success');
      fetchVaultFiles();
    } catch (err) {
      console.error('Failed to move file:', err);
      showToast('Failed to relocate file: ' + (err.message || String(err)), 'danger');
    }
  };

  const handleConfirmMoveFiles = async (destFolderId) => {
    if (operationsLocked) {
      showToast('Folder and file modifications are locked by the administrator.', 'warning');
      return;
    }
    if (!moveTargetFiles || moveTargetFiles.length === 0) return;

    try {
      showToast(`Relocating ${moveTargetFiles.length} ${moveTargetFiles.length === 1 ? 'file' : 'files'}...`, 'info');

      for (const targetFile of moveTargetFiles) {
        const fileId = targetFile.id;
        const isVirtualId = !fileId || String(fileId).startsWith('storage_') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(fileId));

        if (isVirtualId) {
          const fileCategory = getFileCategory(targetFile.filename, targetFile.file_type || '');
          await supabase
            .from('files')
            .insert({
              user_id: user.id,
              filename: targetFile.filename,
              storage_path: targetFile.storage_path,
              file_type: fileCategory,
              size: targetFile.size || 0,
              folder_id: destFolderId
            });
        } else {
          const { data: updatedData, error: updateErr } = await supabase
            .from('files')
            .update({ folder_id: destFolderId })
            .eq('id', fileId)
            .select();

          if (updateErr || !updatedData || updatedData.length === 0) {
            const fileCategory = getFileCategory(targetFile.filename, targetFile.file_type || '');
            await supabase
              .from('files')
              .insert({
                user_id: user.id,
                filename: targetFile.filename,
                storage_path: targetFile.storage_path,
                file_type: fileCategory,
                size: targetFile.size || 0,
                folder_id: destFolderId
              });
          }
        }
      }

      const folderName = destFolderId ? (folders.find(f => f.id === destFolderId)?.name || 'Folder') : 'Vault Root';
      showToast(`Relocated ${moveTargetFiles.length} ${moveTargetFiles.length === 1 ? 'file' : 'files'} to "${folderName}"!`, 'success');
      
      setShowMoveModal(false);
      setMoveTargetFiles([]);
      setSelectedFileIds([]);
      fetchVaultFiles();
    } catch (err) {
      console.error('Failed to move files:', err);
      showToast('Failed to relocate files: ' + (err.message || String(err)), 'danger');
    }
  };

  const handleAutoOrganizeFiles = async () => {
    if (operationsLocked) {
      showToast('Folder and file modifications are locked by the administrator.', 'warning');
      return;
    }
    
    // Find target folders by name (case-insensitive)
    const labFolder = folders.find(f => !f.is_deleted && f.name.toLowerCase().includes('lab'));
    const lectureFolder = folders.find(f => !f.is_deleted && f.name.toLowerCase().includes('lecture'));
    const practicalFolder = folders.find(f => !f.is_deleted && f.name.toLowerCase().includes('practical'));
    const defaultFolder = practicalFolder || labFolder || lectureFolder || folders.find(f => !f.is_deleted);

    if (!defaultFolder) {
      showToast('No target folders found to auto-organize into.', 'warning');
      return;
    }

    const unassignedFiles = files.filter(f => !f.is_deleted && (!f.folder_id || f.folder_id === 'null'));
    if (unassignedFiles.length === 0) {
      showToast('All files are already organized inside folders!', 'info');
      return;
    }

    showToast(`Auto-organizing ${unassignedFiles.length} files into folders...`, 'info');
    let organizedCount = 0;

    try {
      for (const file of unassignedFiles) {
        const lowerName = file.filename.toLowerCase();
        let targetDestId = null;

        if (practicalFolder && (
          /ex[\s\-_0-9.]/i.test(lowerName) ||
          /^ex\d/i.test(lowerName) ||
          lowerName.includes('ex') ||
          lowerName.includes('prac') ||
          lowerName.includes('exercise') ||
          lowerName.includes('assignment') ||
          lowerName.includes('task')
        )) {
          targetDestId = practicalFolder.id;
        } else if (labFolder && (
          lowerName.includes('lab') ||
          lowerName.includes('sorting') ||
          lowerName.includes('sort') ||
          lowerName.includes('sudo') ||
          lowerName.includes('algo') ||
          lowerName.includes('exp')
        )) {
          targetDestId = labFolder.id;
        } else if (lectureFolder && (
          lowerName.includes('lecture') ||
          lowerName.includes('notes') ||
          lowerName.includes('unit') ||
          lowerName.includes('ch') ||
          lowerName.includes('chapter')
        )) {
          targetDestId = lectureFolder.id;
        } else if (defaultFolder) {
          targetDestId = defaultFolder.id;
        }

        if (targetDestId) {
          const fileId = file.id;
          const isVirtualId = !fileId || String(fileId).startsWith('storage_') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(fileId));

          if (isVirtualId) {
            const fileCategory = getFileCategory(file.filename, file.file_type || '');
            await supabase
              .from('files')
              .insert({
                user_id: user.id,
                filename: file.filename,
                storage_path: file.storage_path,
                file_type: fileCategory,
                size: file.size || 0,
                folder_id: targetDestId
              });
          } else {
            await supabase
              .from('files')
              .update({ folder_id: targetDestId })
              .eq('id', fileId);
          }
          organizedCount++;
        }
      }

      if (organizedCount > 0) {
        showToast(`⚡ Successfully auto-organized ${organizedCount} files into folders!`, 'success');
        fetchVaultFiles();
      } else {
        showToast('No matching files found for auto-organization rules.', 'warning');
      }
    } catch (err) {
      console.error('Failed to auto-organize files:', err);
      showToast('Auto-organization error: ' + (err.message || String(err)), 'danger');
    }
  };

  const handleDeleteFile = (id, path, filename) => {
    if (operationsLocked) {
      showToast('Folder and file modifications are locked by the administrator.', 'warning');
      return;
    }
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
    if (operationsLocked) {
      showToast('Folder and file modifications are locked by the administrator.', 'warning');
      return;
    }
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

  const handleGenerateShareCode = (file) => {
    if (downloadLocked) {
      showToast('Sharing privileges have been revoked by the administrator.', 'danger');
      return;
    }
    setShareOptionsFile(file);
    setSelectedShareExpiry(1800); // 30 minutes in seconds
    setShareSelfDestruct(false);
    setShowShareOptionsModal(true);
  };

  const executeGenerateShareCode = async () => {
    if (!shareOptionsFile) return;
    setShowShareOptionsModal(false);
    showToast('Generating secure access code...', 'info');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      let generatedCode = '';
      let signedUrl = '';

      // Try server-side cryptographically secure share generator endpoint first
      let serverSuccess = false;
      const activeSession = session || (supabase ? (await supabase.auth.getSession())?.data?.session : null);
      if (activeSession?.access_token) {
        try {
          const res = await fetch(`${apiUrl}/api/share/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeSession.access_token}`
            },
            body: JSON.stringify({
              file_id: shareOptionsFile.id,
              expiry_seconds: selectedShareExpiry,
              self_destruct: shareSelfDestruct
            })
          });
          if (res.ok) {
            const data = await res.json();
            generatedCode = data.code;
            signedUrl = data.signed_url;
            serverSuccess = true;
          }
        } catch (apiErr) {
          console.warn('Backend share generation failed, falling back to client crypto:', apiErr);
        }
      }

      // Secure client fallback using window.crypto.getRandomValues if server endpoint is offline
      if (!serverSuccess) {
        // Step 1: Create signed URL from storage bucket valid for selected duration
        const { data: signedData, error: signedError } = await supabase.storage
          .from('vault')
          .createSignedUrl(shareOptionsFile.storage_path, selectedShareExpiry);

        if (signedError) throw signedError;
        signedUrl = signedData.signedUrl;

        // Step 2: Generate unique 6-digit alphanumeric code using Web Crypto API
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let codeExists = true;
        let shareCode = '';
        while (codeExists) {
          const randomBytes = new Uint8Array(6);
          window.crypto.getRandomValues(randomBytes);
          shareCode = Array.from(randomBytes).map(b => chars[b % chars.length]).join('');

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
        const expiry = new Date(Date.now() + selectedShareExpiry * 1000);
        const { error: dbError } = await supabase
          .from('share_codes')
          .insert({
            code: shareCode,
            file_id: shareOptionsFile.id,
            signed_url: signedUrl,
            expires_at: expiry.toISOString(),
            self_destruct: shareSelfDestruct
          });

        if (dbError) throw dbError;
        generatedCode = shareCode;
      }

      // Launch share details modal
      setShareCodeData({ 
        code: generatedCode, 
        filename: shareOptionsFile.filename,
        self_destruct: shareSelfDestruct 
      });
      setShareTimeLeft(selectedShareExpiry);
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

  const handleBatchDelete = () => {
    if (operationsLocked) {
      showToast('File and folder modifications are locked by the administrator.', 'warning');
      return;
    }

    setConfirmModalData({
      title: 'Batch Delete Files',
      message: `Are you sure you want to permanently delete the ${selectedFileIds.length} selected files? This action cannot be undone.`,
      action: async () => {
        try {
          showToast('Deleting selected files...', 'info');
          const selectedFiles = files.filter(f => selectedFileIds.includes(f.id));
          
          // 1. Delete from Supabase Storage
          const paths = selectedFiles.map(f => f.storage_path);
          const { error: storageErr } = await supabase.storage
            .from('vault')
            .remove(paths);
            
          if (storageErr) throw storageErr;
          
          // 2. Delete from Database
          const { error: dbErr } = await supabase
            .from('files')
            .delete()
            .in('id', selectedFileIds);
            
          if (dbErr) throw dbErr;
          
          showToast('Selected files deleted successfully!', 'success');
          setSelectedFileIds([]);
          fetchVaultFiles();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete selected files: ' + err.message, 'danger');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      
      setIsRecording(true);
      setRecordDuration(0);
      setAudioBlob(null);
      setAudioUrl(null);
      mediaRecorder.start();
      
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast('Failed to access microphone: ' + err.message, 'danger');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const handleUploadVoiceMemo = () => {
    if (!audioBlob) return;
    
    const filename = `voice_memo_${Date.now()}.webm`;
    const audioFile = new window.File([audioBlob], filename, { type: 'audio/webm' });
    
    setShowRecordModal(false);
    showToast('Uploading voice memo...', 'info');
    
    const uploadId = 'up_' + Math.random().toString(36).substring(2, 9);
    setShowUploadProgressCard(true);
    setActiveUploads((prev) => ({
      ...prev,
      [uploadId]: {
        name: filename,
        size: audioFile.size,
        progress: 0,
        status: 'ready',
        controller: null,
        fileObj: audioFile
      }
    }));
    
    startUploadingFile(uploadId, audioFile, '');
  };

  const handleCloseRecordModal = () => {
    stopRecording();
    setShowRecordModal(false);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) clearInterval(shareTimerRef.current);
    };
  }, []);

  const compressImageFile = (file) => {
    return new Promise((resolve) => {
      const imgType = file.type;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(imgType)) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1920;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new window.File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.75
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDecryptAndDownload = async (path, filename, passphrase) => {
    const downloadId = 'dn_' + Math.random().toString(36).substring(2, 9);
    const controller = new AbortController();
    
    setShowDownloadProgressCard(true);
    setActiveDownloads((prev) => ({
      ...prev,
      [downloadId]: {
        name: filename,
        progress: 0,
        status: 'downloading',
        controller
      }
    }));

    try {
      showToast('Downloading encrypted file...', 'info');
      const signedUrl = await createSignedDownloadUrl(supabase, path, 300);
      
      const res = await fetch(signedUrl, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch file content.");
      
      const reader = res.body.getReader();
      const contentLength = +res.headers.get('Content-Length');
      
      let receivedLength = 0;
      let chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength) {
          const percent = Math.round((receivedLength / contentLength) * 100);
          setActiveDownloads((prev) => {
            if (!prev[downloadId]) return prev;
            return {
              ...prev,
              [downloadId]: {
                ...prev[downloadId],
                progress: percent
              }
            };
          });
        }
      }

      let chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      const decryptedBuffer = await decryptFileBuffer(chunksAll.buffer, passphrase);
      const cleanFilename = filename.replace('[encrypted]_', '');
      
      const blob = new Blob([decryptedBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cleanFilename;
      a.click();
      
      URL.revokeObjectURL(url);

      setActiveDownloads((prev) => {
        if (!prev[downloadId]) return prev;
        return {
          ...prev,
          [downloadId]: {
            ...prev[downloadId],
            status: 'completed',
            progress: 100
          }
        };
      });

      showToast('File decrypted and downloaded!', 'success');
      setShowDecryptModal(false);
    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError') {
        showToast('Download cancelled.', 'warning');
      } else {
        setActiveDownloads((prev) => {
          if (!prev[downloadId]) return prev;
          return {
            ...prev,
            [downloadId]: {
              ...prev[downloadId],
              status: 'failed'
            }
          };
        });
        showToast('Decryption failed: ' + err.message, 'danger');
      }
    }
  };

  const handleDecryptAndPreview = async (file, passphrase) => {
    const downloadId = 'dn_' + Math.random().toString(36).substring(2, 9);
    const controller = new AbortController();
    
    setShowDownloadProgressCard(true);
    setActiveDownloads((prev) => ({
      ...prev,
      [downloadId]: {
        name: `Preview: ${file.filename.replace('[encrypted]_', '')}`,
        progress: 0,
        status: 'downloading',
        controller
      }
    }));

    try {
      showToast('Retrieving and decrypting file...', 'info');
      const category = getFileCategory(file.filename, 'application/octet-stream');
      const signedUrl = await createSignedDownloadUrl(supabase, file.storage_path, 300);
      
      const res = await fetch(signedUrl, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch file content.");
      
      const reader = res.body.getReader();
      const contentLength = +res.headers.get('Content-Length');
      
      let receivedLength = 0;
      let chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength) {
          const percent = Math.round((receivedLength / contentLength) * 100);
          setActiveDownloads((prev) => {
            if (!prev[downloadId]) return prev;
            return {
              ...prev,
              [downloadId]: {
                ...prev[downloadId],
                progress: percent
              }
            };
          });
        }
      }

      let chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      const decryptedBuffer = await decryptFileBuffer(chunksAll.buffer, passphrase);
      const cleanName = file.filename.replace('[encrypted]_', '');

      if (category === 'image') {
        const blob = new Blob([decryptedBuffer], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        setPreviewImage({ title: cleanName, url: url });
      } 
      else if (category === 'document' && file.filename.toLowerCase().endsWith('.pdf')) {
        const blob = new Blob([decryptedBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } 
      else if (category === 'text' || category === 'code') {
        const textDecoder = new TextDecoder();
        const text = textDecoder.decode(decryptedBuffer);
        setPreviewText({ title: cleanName, content: text });
      } 
      else {
        showToast('Preview is not supported for this file type.', 'warning');
      }
      
      setActiveDownloads((prev) => {
        if (!prev[downloadId]) return prev;
        return {
          ...prev,
          [downloadId]: {
            ...prev[downloadId],
            status: 'completed',
            progress: 100
          }
        };
      });
      setShowDecryptModal(false);
    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError') {
        showToast('Preview download cancelled.', 'warning');
      } else {
        setActiveDownloads((prev) => {
          if (!prev[downloadId]) return prev;
          return {
            ...prev,
            [downloadId]: {
              ...prev[downloadId],
              status: 'failed'
            }
          };
        });
        showToast('Preview decryption failed: ' + err.message, 'danger');
      }
    }
  };

  const handleToggleSelectFile = (fileId) => {
    setSelectedFileIds((prev) => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleBatchDownloadZip = async () => {
    if (downloadLocked) {
      showToast('Download privileges have been revoked.', 'danger');
      return;
    }
    
    const selectedFiles = files.filter(f => selectedFileIds.includes(f.id));
    const hasEncrypted = selectedFiles.some(f => f.filename.startsWith('[encrypted]_'));
    
    if (hasEncrypted) {
      showToast('Encrypted files cannot be batch downloaded inside a ZIP.', 'warning');
      return;
    }

    showToast('Preparing ZIP archive...', 'info');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const file of selectedFiles) {
        const signedUrl = await createSignedDownloadUrl(supabase, file.storage_path, 300);
        const res = await fetch(signedUrl);
        if (!res.ok) throw new Error(`Failed to fetch file: ${file.filename}`);
        const fileData = await res.blob();
        zip.file(file.filename, fileData);
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CloudVault_batch_${Date.now()}.zip`;
      a.click();
      
      URL.revokeObjectURL(url);
      showToast('ZIP archive downloaded successfully!', 'success');
      setSelectedFileIds([]);
    } catch (err) {
      console.error(err);
      showToast('Failed to create ZIP: ' + err.message, 'danger');
    }
  };

  const handleDownloadFileDirect = async (path, filename) => {
    if (downloadLocked) {
      showToast('Download privileges have been revoked by the administrator.', 'danger');
      return;
    }

    if (filename.startsWith('[encrypted]_')) {
      setDecryptTargetFile({ path, filename });
      setDecryptActionType('download');
      setDecryptPassphrase('');
      setShowDecryptModal(true);
      return;
    }

    try {
      showToast('Preparing download...', 'info');
      const { data, error } = await supabase.storage
        .from('vault')
        .createSignedUrl(path, 120);

      if (error) throw error;

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Downloaded "${filename}" successfully!`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      showToast('Download failed: ' + (err.message || String(err)), 'danger');
    }
  };

  const handlePreviewFile = async (file) => {
    if (downloadLocked) {
      showToast('Preview privileges have been revoked by the administrator.', 'danger');
      return;
    }

    if (file.filename.startsWith('[encrypted]_')) {
      setDecryptTargetFile(file);
      setDecryptActionType('preview');
      setDecryptPassphrase('');
      setShowDecryptModal(true);
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
    else if (category === 'video' || category === 'audio') {
      try {
        showToast(`Preparing ${category} player...`, 'info');
        const { data, error } = await supabase.storage
          .from('vault')
          .createSignedUrl(file.storage_path, 600);
        if (error) throw error;
        setPreviewMedia({ type: category, title: file.filename, url: data.signedUrl });
      } catch (e) {
        showToast(`Failed to load ${category} preview.`, 'danger');
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
    if (!files || !Array.isArray(files)) return [];
    let filtered = files.filter(f => !f.is_deleted);

    // 1. Folder scope filter
    if (folderScope === 'current' && !searchQuery.trim()) {
      filtered = filtered.filter(f => {
        const fileFolderId = f.folder_id || null;
        const targetFolderId = currentFolderId || null;
        return fileFolderId === targetFolderId;
      });
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(f => f.filename.toLowerCase().includes(q));
    }

    // 3. Category / Type Filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(f => {
        const cat = getFileCategory(f.filename, f.file_type || '');
        return cat === activeFilter;
      });
    }

    // 4. Date Range Filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      filtered = filtered.filter(f => {
        const fileTime = new Date(f.created_at).getTime();
        if (dateFilter === 'today') return (now - fileTime) <= 24 * 60 * 60 * 1000;
        if (dateFilter === '7days') return (now - fileTime) <= 7 * 24 * 60 * 60 * 1000;
        if (dateFilter === '30days') return (now - fileTime) <= 30 * 24 * 60 * 60 * 1000;
        return true;
      });
    }

    // 5. Sorting
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

  // Folder Delete Handler (Task 2.5)
  const handleDeleteFolder = async (folder) => {
    if (operationsLocked) {
      showToast('File and folder modifications are locked on your account by the administrator.', 'danger');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete folder "${folder.name}" and all files inside it?`)) {
      return;
    }
    try {
      showToast(`Deleting folder "${folder.name}"...`, 'info');
      await deleteFolderInDb(supabase, folder.id);
      showToast(`Folder "${folder.name}" moved to trash.`, 'success');
      fetchVaultFiles();
    } catch (err) {
      console.error('Failed to delete folder:', err);
      showToast('Failed to delete folder: ' + err.message, 'danger');
    }
  };

  // File Version History Handlers (Task 2.2)
  const handleOpenVersionHistory = async (file) => {
    try {
      showToast('Fetching file version history...', 'info');
      const versions = await fetchFileVersions(supabase, file.id);
      setVersionModalFile(file);
      setFileVersionsList(versions);
    } catch (err) {
      console.error('Error fetching file versions:', err);
      showToast('Failed to load version history: ' + err.message, 'danger');
    }
  };

  const handleRestoreVersion = async (file, version) => {
    try {
      showToast(`Restoring version #${version.version_number}...`, 'info');
      await restoreFileVersion(supabase, file.id, version);
      showToast(`Restored "${file.filename}" to version #${version.version_number}!`, 'success');
      setVersionModalFile(null);
      fetchVaultFiles();
    } catch (err) {
      console.error('Failed to restore file version:', err);
      showToast('Failed to restore version: ' + err.message, 'danger');
    }
  };

  const getFilteredNotes = (showDeleted = false) => {
    let filtered = notes.filter(n => !!n.is_deleted === showDeleted);

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
            {user?.email === 'aayushparekh26@gmail.com' && (
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
          {user?.email === 'aayushparekh26@gmail.com' && (
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
          <div className="flex items-center gap-1.5 shrink-0">
            
            <button
              onClick={handleLogoutClick}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
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
        
        {activeAlert && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs text-red-650 dark:text-red-400 animate-fade-in shadow-xs">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-red-500 animate-bounce shrink-0" />
              <div>
                <span className="font-extrabold uppercase text-[9px] bg-red-500/10 px-1.5 py-0.5 rounded mr-2">System Notice</span>
                <span className="font-bold">{activeAlert.title}:</span> {activeAlert.message}
              </div>
            </div>
            <button
              onClick={() => setActiveAlert(null)}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-400 hover:text-red-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
              className="hidden lg:flex w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 items-center justify-center font-display font-semibold text-brand-primary text-sm uppercase cursor-pointer hover:bg-brand-primary/25 transition-all duration-200 shrink-0 overflow-hidden"
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
              
              {renderStorageChart()}
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
              <div className="space-y-4">
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

                {/* Target Destination Folder Selector */}
                <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Folder className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">
                        Upload Destination Folder
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Select which folder new files will be uploaded into
                      </span>
                    </div>
                  </div>
                  <select
                    value={uploadTargetFolderId || ''}
                    onChange={(e) => setUploadTargetFolderId(e.target.value || null)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none w-full md:w-64 focus:border-brand-primary font-medium cursor-pointer"
                  >
                    <option value="">🏠 Vault Root (Uncategorized)</option>
                    {folders.filter(f => !f.is_deleted).map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        📁 {folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Encryption Options */}
                <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enable-encryption"
                      checked={isEncryptionEnabled}
                      onChange={(e) => setIsEncryptionEnabled(e.target.checked)}
                      className="w-4 h-4 text-brand-primary border-slate-300 rounded focus:ring-brand-primary cursor-pointer"
                    />
                    <label htmlFor="enable-encryption" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                      Encrypt Upload (Zero-Knowledge AES-GCM)
                    </label>
                  </div>
                  
                  {isEncryptionEnabled && (
                    <input
                      type="password"
                      placeholder="Passphrase to Encrypt"
                      value={uploadPassphrase}
                      onChange={(e) => setUploadPassphrase(e.target.value)}
                      className="w-full md:w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-brand-primary"
                    />
                  )}
                </div>
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
                  
                  {/* Encryption toggle */}
                  <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={noteEncrypt}
                        onChange={(e) => setNoteEncrypt(e.target.checked)}
                        className="w-4 h-4 rounded accent-brand-primary cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-brand-primary" /> Encrypt Snippet (AES-GCM)
                      </span>
                    </label>
                    {noteEncrypt && (
                      <input
                        type="password"
                        placeholder="Encryption passphrase"
                        value={notePassphrase}
                        onChange={(e) => setNotePassphrase(e.target.value)}
                        className="input-field py-1.5 text-xs"
                      />
                    )}
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
                          setNoteEncrypt(false);
                          setNotePassphrase('');
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
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {getFilteredNotes(false).map((note) => (
                    <div key={note.id} className={`glass-card p-4 hover:shadow-md flex flex-col justify-between border-slate-100 dark:border-slate-800 ${note.is_encrypted ? 'border-l-2 border-l-amber-400' : ''}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {note.is_encrypted && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded">
                              🔒 Encrypted
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate" title={note.title}>
                          {note.title}
                        </h4>
                        {note.is_encrypted && !decryptedNotesMap[note.id] ? (
                          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-xs text-amber-700 dark:text-amber-400">Content is encrypted — click unlock to read.</span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-4 font-mono whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                            {decryptedNotesMap[note.id] || note.content}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] text-slate-400">
                          {new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex gap-1">
                          {note.is_encrypted && !decryptedNotesMap[note.id] && (
                            <button
                              onClick={() => handleDecryptNoteClick(note)}
                              className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg text-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Decrypt note"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleShareNote(note)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-primary transition-colors cursor-pointer"
                            title="Share note with 6-digit code"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCopyNote(decryptedNotesMap[note.id] || note.content)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-primary transition-colors cursor-pointer"
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
                            onClick={() => handleMoveNoteToTrash(note.id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                            title="Move to trash"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trash bin section */}
                {getFilteredNotes(true).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Trash className="w-3.5 h-3.5" /> Trash ({getFilteredNotes(true).length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {getFilteredNotes(true).map((note) => (
                        <div key={note.id} className="glass-card p-3 flex justify-between items-start gap-3 opacity-60 hover:opacity-100 border-dashed border-slate-200 dark:border-slate-700">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{note.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 font-mono">{note.is_encrypted ? '[Encrypted]' : note.content}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleRestoreNote(note.id)}
                              className="p-1 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg text-slate-400 hover:text-green-600 transition-colors"
                              title="Restore"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteNote(note.id)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete permanently"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </>
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
            {operationsLocked && (
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-start gap-3 text-orange-700 dark:text-orange-400 animate-scale-up">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="font-bold text-sm text-orange-850 dark:text-orange-400">Operations Privileges Revoked</h4>
                  <p className="text-xs mt-1 text-orange-600/90 dark:text-orange-400/85">
                    Your administrator has locked file and folder modifications on this account. You cannot rename, move, delete, or create files/folders.
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
                <button onClick={handleOpenCreateTxtModal} className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-4 h-4" /> Create TXT File
                </button>
                <button onClick={() => setShowRecordModal(true)} className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer">
                  <Mic className="w-4 h-4 text-brand-primary" /> Record Memo
                </button>
                {currentFolderId === null && files.some(f => !f.is_deleted && !f.folder_id) && (
                  <button
                    onClick={handleAutoOrganizeFiles}
                    className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer text-amber-600 dark:text-amber-400 font-bold border-amber-300/50 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    title="Automatically sort root files into Lab, Lecture, & practical folders based on file names"
                  >
                    <Folder className="w-4 h-4 text-amber-500" /> Auto-Organize Files
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-9 py-2 text-xs"
                  />
                </div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none"
                  title="Filter by date range"
                >
                  <option value="all">📅 All Time</option>
                  <option value="today">Today (24h)</option>
                  <option value="7days">Past 7 Days</option>
                  <option value="30days">Past 30 Days</option>
                </select>
                <select
                  value={folderScope}
                  onChange={(e) => setFolderScope(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none"
                  title="Filter folder scope"
                >
                  <option value="current">📁 Current Folder</option>
                  <option value="all">🌐 All Folders</option>
                </select>
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
                    {folders.filter(f => !f.is_deleted).map((folder) => {
                      const count = files.filter(file => !file.is_deleted && file.folder_id === folder.id).length;
                      return (
                        <div
                          key={folder.id}
                          onClick={() => {
                            setCurrentFolderId(folder.id);
                            setFolderScope('current');
                          }}
                          className="glass-card p-4 hover:shadow-md cursor-pointer flex items-center justify-between gap-3 border-slate-100 dark:border-slate-800 group"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const fileId = e.dataTransfer.getData('text/plain');
                            if (fileId) moveFileToFolder(fileId, folder.id);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Folder className="w-7 h-7 text-amber-400 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate select-none">
                                {folder.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {count} {count === 1 ? 'file' : 'files'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(folder);
                            }}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete folder"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Files container */}
                {/* Batch Action Bar */}
                {selectedFileIds.length > 0 && (
                  <div className="glass-card p-3 bg-brand-primary/5 border border-brand-primary/20 flex justify-between items-center rounded-xl animate-fade-in mb-3">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {selectedFileIds.length} {selectedFileIds.length === 1 ? 'file' : 'files'} selected
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleBatchDownloadZip}
                        className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download as ZIP
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const targets = files.filter(f => selectedFileIds.includes(f.id));
                          if (targets.length > 0) {
                            setMoveTargetFiles(targets);
                            setSelectedDestinationFolderId(currentFolderId || null);
                            setShowMoveModal(true);
                          }
                        }}
                        className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer text-amber-600 dark:text-amber-400 border-amber-300/50"
                      >
                        <Folder className="w-3.5 h-3.5 text-amber-500" /> Move Selected ({selectedFileIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleBatchDelete}
                        className="btn-danger bg-red-650 hover:bg-red-750 text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer border-0"
                      >
                        <Trash className="w-3.5 h-3.5" /> Delete Selected
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFileIds([])}
                        className="btn-secondary py-1.5 px-3 text-xs font-bold cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                {getFilteredFiles().length === 0 ? (
                  currentFolderId === null && folders.length > 0 ? (
                    <div className="text-center py-6 px-4 text-slate-500 dark:text-slate-400 text-xs font-semibold bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
                      <span>📁 All your files are safely organized inside the folders above. Click any folder to open it!</span>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center gap-2">
                      <p>No files found in this view.</p>
                    </div>
                  )
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
                        {/* Checkbox select */}
                        <div className="absolute top-4 left-4 z-10">
                          <input
                            type="checkbox"
                            checked={selectedFileIds.includes(file.id)}
                            onChange={() => handleToggleSelectFile(file.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3.5 h-3.5 text-brand-primary border-slate-350 rounded cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl ml-6">
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
                                <div className="absolute right-0 top-6 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 z-30">
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
                                      setMoveTargetFiles([file]);
                                      setSelectedDestinationFolderId(file.folder_id || null);
                                      setShowMoveModal(true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Folder className="w-3.5 h-3.5 text-amber-500" /> Move to Folder
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
                            {file.filename.startsWith('[encrypted]_') ? `🔒 ${file.filename.replace('[encrypted]_', '')}` : file.filename}
                          </h4>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-slate-400">
                              {formatBytes(file.size)}
                            </p>
                            {file.folder_id && (
                              <span
                                onClick={() => {
                                  setCurrentFolderId(file.folder_id);
                                  setFolderScope('current');
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded cursor-pointer hover:underline font-semibold"
                                title="Open folder"
                              >
                                📁 {folders.find(f => f.id === file.folder_id)?.name || 'Folder'}
                              </span>
                            )}
                          </div>
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
                          {/* Checkbox select */}
                          <input
                            type="checkbox"
                            checked={selectedFileIds.includes(file.id)}
                            onChange={() => handleToggleSelectFile(file.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3.5 h-3.5 text-brand-primary border-slate-350 rounded cursor-pointer mr-1 shrink-0"
                          />

                          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg shrink-0">
                            {getFileIcon(file.filename)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate" title={file.filename}>
                              {file.filename.startsWith('[encrypted]_') ? `🔒 ${file.filename.replace('[encrypted]_', '')}` : file.filename}
                            </h4>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                              <span>{formatBytes(file.size)} &bull; {new Date(file.created_at).toLocaleDateString()}</span>
                              {file.folder_id && (
                                <span
                                  onClick={() => {
                                    setCurrentFolderId(file.folder_id);
                                    setFolderScope('current');
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded cursor-pointer hover:underline font-semibold"
                                  title="Open folder"
                                >
                                  📁 {folders.find(f => f.id === file.folder_id)?.name || 'Folder'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Desktop inline action buttons */}
                        <div className="hidden md:flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handlePreviewFile(file)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Preview file"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadFileDirect(file.storage_path, file.filename)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setMoveTargetFiles([file]);
                              setSelectedDestinationFolderId(file.folder_id || null);
                              setShowMoveModal(true);
                            }}
                            className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg text-amber-500 transition-colors cursor-pointer"
                            title="Move to folder"
                          >
                            <Folder className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleGenerateShareCode(file)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Generate Share Code"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => triggerRenameFile(file)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 transition-colors cursor-pointer"
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

                        {/* Mobile dropdown actions menu */}
                        <div className="md:hidden relative shrink-0">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {activeMenuId === file.id && (
                            <div className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 z-35">
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
                                  setMoveTargetFiles([file]);
                                  setSelectedDestinationFolderId(file.folder_id || null);
                                  setShowMoveModal(true);
                                }}
                                className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                              >
                                <Folder className="w-3.5 h-3.5 text-amber-500" /> Move to Folder
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

            <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
              <div className="flex justify-between items-center gap-4 mb-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Active Sessions & Logins</h3>
                <button
                  type="button"
                  onClick={handleSignOutOthers}
                  className="btn-primary py-1.5 px-3 text-[10px] font-bold shrink-0 cursor-pointer"
                >
                  Sign Out Other Devices
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Verify your recent login activity to ensure your session was not left active on another device.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                  {logsLoading ? (
                    <div className="flex justify-center items-center py-6">
                      <div className="w-5 h-5 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                    </div>
                  ) : loginLogs.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No login logs available.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-150 dark:divide-slate-800/80">
                      {loginLogs.map((log) => (
                        <div key={log.id} className="flex justify-between items-center py-2.5 px-4 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              IP: {log.ip_address || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {log.email}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.login_time).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                      href={`mailto:aayushparekh26@gmail.com?subject=Profile Change Request for ${encodeURIComponent(user?.email)}&body=Hello Admin,%0A%0AI would like to request a change to my profile details.%0A%0ACurrent Name: ${encodeURIComponent(fullName)}%0ACurrent College: ${encodeURIComponent(college)}%0A%0ANew Name: %0ANew College: %0A%0AThank you!`}
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
                {confirmModalData.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  if (confirmModalData.action) confirmModalData.action();
                }}
                className="btn-danger py-2 px-4 text-xs font-bold"
              >
                {confirmModalData.confirmText || 'Proceed'}
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
      {showShareModal && shareCodeData && (() => {
        const shareUrl = `${window.location.origin}/?code=${shareCodeData.code}`;
        return (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="glass-card max-w-sm w-full p-6 shadow-2xl text-center animate-scale-up">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">Temporary Sharing Code</h3>
              <p className="text-xs text-slate-400 mb-4 truncate" title={shareCodeData.filename}>
                File: {shareCodeData.filename}
              </p>
              
              <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 mb-3 relative overflow-hidden">
                <div className="text-3xl font-black font-display tracking-[8px] text-brand-primary uppercase select-all">
                  {shareCodeData.code}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 mb-4 flex items-center justify-center gap-1.5">
                <span>Code expires in:</span>
                <span className="font-mono font-bold text-slate-600 dark:text-slate-200">
                  {Math.floor(shareTimeLeft / 60)}m {shareTimeLeft % 60}s
                </span>
              </div>

              {/* QR Code Section */}
              <div className="mb-5 flex flex-col items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Scan to Download</span>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-md flex justify-center items-center min-w-[150px] min-h-[150px]">
                  {shareQrDataUrl ? (
                    <img
                      src={shareQrDataUrl}
                      alt="QR Code"
                      className="w-[140px] h-[140px] block rounded-lg bg-white"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 font-semibold animate-pulse">Generating QR...</div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareCodeData.code)
                        .then(() => showToast('Share code copied!', 'success'))
                        .catch(() => showToast('Copy failed.', 'danger'));
                    }}
                    className="flex-1 btn-secondary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    Copy Code
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl)
                        .then(() => showToast('Direct link copied!', 'success'))
                        .catch(() => showToast('Copy failed.', 'danger'));
                    }}
                    className="flex-1 btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    Copy Link
                  </button>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Decrypt Passphrase Modal */}
      {showDecryptModal && decryptTargetFile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-sm w-full p-6 shadow-2xl animate-scale-up">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">Decrypt Encrypted File</h3>
            <p className="text-xs text-slate-450 mb-6 truncate" title={decryptTargetFile.filename}>
              File: {decryptTargetFile.filename.replace('[encrypted]_', '')}
            </p>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (decryptActionType === 'download') {
                  handleDecryptAndDownload(decryptTargetFile.path, decryptTargetFile.filename, decryptPassphrase);
                } else {
                  handleDecryptAndPreview(decryptTargetFile, decryptPassphrase);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="label-title">DECRYPTION PASSPHRASE</label>
                <input
                  type="password"
                  placeholder="Enter passphrase used during upload"
                  value={decryptPassphrase}
                  onChange={(e) => setDecryptPassphrase(e.target.value)}
                  className="input-field"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDecryptModal(false)}
                  className="btn-secondary py-2 px-4 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  Decrypt & Proceed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Active Uploads progress overlay banner */}
      {showUploadProgressCard && (
        <div className="fixed bottom-5 lg:left-72 left-5 z-40 max-w-sm w-full pointer-events-none">
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

      {/* 4b. Active Downloads progress overlay banner */}
      {showDownloadProgressCard && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full pointer-events-none">
          <div className="pointer-events-auto glass-card p-4 shadow-xl border-slate-200 dark:border-slate-800 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Downloads Queue</h3>
            
            <div className="flex flex-col gap-3.5">
              {Object.entries(activeDownloads).map(([id, download]) => (
                <div key={id} className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex-1" title={download.name}>
                      {download.name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 capitalize">
                      {download.status === 'completed' && <span className="text-green-500 font-bold">Done</span>}
                      {download.status === 'failed' && <span className="text-red-500 font-bold">Failed</span>}
                      {download.status === 'cancelled' && <span className="text-slate-400 font-bold">Aborted</span>}
                      {download.status === 'downloading' && `${download.progress}%`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          download.status === 'failed' ? 'bg-red-500' :
                          download.status === 'cancelled' ? 'bg-slate-400' :
                          'bg-brand-primary'
                        }`}
                        style={{ width: `${download.progress}%` }}
                      ></div>
                    </div>

                    <div className="shrink-0 flex gap-1">
                      {download.status === 'downloading' && (
                        <button
                          onClick={() => cancelDownload(id)}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                          title="Abort Download"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(download.status === 'failed' || download.status === 'cancelled') && (
                        <>
                          <button
                            onClick={() => dismissDownloadItem(id)}
                            className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 p-0.5 rounded cursor-pointer"
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

      {/* 8. Create TXT File Modal */}
      {showCreateTxtModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-lg w-full p-6 shadow-2xl animate-scale-up">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">Create New Text File</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Create a custom plain text (.txt) file directly in the current folder.
            </p>
            
            <form onSubmit={handleCreateTxtSubmit} className="space-y-4">
              <div>
                <label className="label-title">FILE NAME</label>
                <input
                  type="text"
                  placeholder="e.g. notes.txt"
                  value={newTxtName}
                  onChange={(e) => setNewTxtName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="label-title">CONTENT</label>
                <textarea
                  placeholder="Type or paste your text data here..."
                  value={newTxtContent}
                  onChange={(e) => setNewTxtContent(e.target.value)}
                  className="input-field h-40 font-mono text-xs resize-none"
                  required
                />
              </div>
              
              {/* Optional Encryption checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="txt-enable-encryption"
                  checked={newTxtEncrypt}
                  onChange={(e) => setNewTxtEncrypt(e.target.checked)}
                  className="w-4 h-4 text-brand-primary border-slate-350 rounded focus:ring-brand-primary cursor-pointer"
                />
                <label htmlFor="txt-enable-encryption" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                  Encrypt Text File (AES-GCM)
                </label>
              </div>
              
              {newTxtEncrypt && (
                <div>
                  <label className="label-title">ENCRYPTION PASSPHRASE</label>
                  <input
                    type="password"
                    placeholder="Passphrase to encrypt"
                    value={newTxtPassphrase}
                    onChange={(e) => setNewTxtPassphrase(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTxtModal(false)}
                  className="btn-secondary py-2 px-4 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  Create & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Global Announcement Alert Popup */}
      {showAlertModal && activeAlert && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="glass-card max-w-md w-full p-6 shadow-2xl border-red-500/20 animate-scale-up relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-550/10 flex items-center justify-center text-red-500 shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                  System Announcement
                </span>
                <h3 className="text-base font-bold text-slate-800 dark:text-white mt-1 leading-snug">
                  {activeAlert.title}
                </h3>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-850 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {activeAlert.message}
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] text-slate-400 font-medium">
                Auto-dismissing in 10s...
              </span>
              <button
                onClick={() => setShowAlertModal(false)}
                className="btn-primary py-2 px-4 text-xs font-bold w-24 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.5. Share Options Configuration Modal */}
      {showShareOptionsModal && shareOptionsFile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-sm w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Share Options</h3>
                <p className="text-[11px] text-slate-400 truncate max-w-[240px] mt-0.5" title={shareOptionsFile.filename}>
                  File: {shareOptionsFile.filename}
                </p>
              </div>
              <button
                onClick={() => setShowShareOptionsModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 mb-6">
              {/* Expiration Select */}
              <div className="flex flex-col gap-1.5">
                <label className="label-title">EXPIRATION DURATION</label>
                <select
                  value={selectedShareExpiry}
                  onChange={(e) => setSelectedShareExpiry(Number(e.target.value))}
                  className="input-field py-2 text-xs"
                >
                  <option value={300}>5 Minutes</option>
                  <option value={900}>15 Minutes</option>
                  <option value={1800}>30 Minutes</option>
                  <option value={3600}>1 Hour</option>
                  <option value={43200}>12 Hours</option>
                  <option value={86400}>24 Hours</option>
                </select>
              </div>

              {/* Self-Destruct Checkbox */}
              <label className="flex items-start gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850/80 rounded-xl cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-850/30 transition-all select-none">
                <input
                  type="checkbox"
                  checked={shareSelfDestruct}
                  onChange={(e) => setShareSelfDestruct(e.target.checked)}
                  className="mt-0.5 rounded accent-brand-primary"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Burn-After-Reading</span>
                  <span className="text-[10px] text-slate-400 leading-normal">
                    Automatically delete the file and access code permanently after the very first download/view.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowShareOptionsModal(false)}
                className="flex-1 btn-secondary py-2.5 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeGenerateShareCode}
                className="flex-1 btn-primary py-2.5 text-xs font-bold cursor-pointer"
              >
                Generate Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Audio Recorder Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-sm w-full p-6 shadow-2xl text-center animate-scale-up flex flex-col gap-5">
            <div className="flex justify-between items-start gap-4">
              <div className="text-left">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Record Voice Memo</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Record audio lectures or guidelines and upload directly.
                </p>
              </div>
              <button
                onClick={handleCloseRecordModal}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recording Animation / Audio Player */}
            <div className="flex flex-col items-center justify-center gap-3 py-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850/80 rounded-2xl">
              {isRecording ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative flex items-center justify-center w-16 h-16">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/25">
                      <div className="w-4 h-4 bg-white rounded-xs"></div>
                    </div>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-800 dark:text-white">
                    {Math.floor(recordDuration / 60)}:{(recordDuration % 65 || recordDuration % 60).toString().padStart(2, '0')}
                  </div>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">Recording...</span>
                </div>
              ) : audioUrl ? (
                <div className="flex flex-col items-center gap-3 w-full px-4">
                  <audio src={audioUrl} controls className="w-full custom-audio-player h-10 rounded-lg" />
                  <span className="text-[10px] font-semibold text-green-500 uppercase tracking-widest">Memo Recorded!</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
                    <Mic className="w-5 h-5 text-brand-primary" />
                  </div>
                  <span className="text-[10px] text-slate-400">Microphone ready to capture</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full btn-danger bg-red-600 hover:bg-red-750 py-2.5 text-xs font-bold cursor-pointer border-0"
                >
                  Stop Recording
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-1 btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {audioUrl ? 'Record Again' : 'Start Recording'}
                  </button>
                  {audioBlob && (
                    <button
                      type="button"
                      onClick={handleUploadVoiceMemo}
                      className="flex-1 btn-success bg-green-600 hover:bg-green-750 text-white py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-0 cursor-pointer"
                    >
                      Upload Memo
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        code={qrModalData.code}
        filename={qrModalData.filename}
        directUrl={qrModalData.url}
      />

      {/* Note Decrypt Passphrase Modal */}
      {showNoteDecryptModal && targetNoteToDecrypt && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-sm w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Decrypt Note</h3>
                <p className="text-[11px] text-slate-400 truncate max-w-[220px]" title={targetNoteToDecrypt.title}>
                  {targetNoteToDecrypt.title}
                </p>
              </div>
            </div>
            <form onSubmit={handleExecuteNoteDecryption} className="space-y-4">
              <div>
                <label className="label-title">DECRYPTION PASSPHRASE</label>
                <input
                  type="password"
                  placeholder="Enter passphrase used during save"
                  value={noteDecryptPassphrase}
                  onChange={(e) => setNoteDecryptPassphrase(e.target.value)}
                  className="input-field"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowNoteDecryptModal(false);
                    setTargetNoteToDecrypt(null);
                    setNoteDecryptPassphrase('');
                  }}
                  className="btn-secondary py-2 px-4 text-xs font-bold"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold">
                  Unlock Snippet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video / Audio Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4">
          <div className="max-w-2xl w-full flex flex-col gap-3.5 relative animate-scale-up">
            <div className="flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold truncate pr-6 capitalize">
                  {previewMedia.type} — {previewMedia.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewMedia(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 p-3 flex justify-center items-center">
              {previewMedia.type === 'video' ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[65vh] rounded-xl w-full"
                />
              ) : (
                <div className="w-full flex flex-col items-center gap-4 py-8 px-6">
                  <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <Play className="w-8 h-8 text-brand-primary" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium truncate max-w-full" title={previewMedia.title}>
                    {previewMedia.title}
                  </p>
                  <audio
                    src={previewMedia.url}
                    controls
                    autoPlay
                    className="w-full max-w-md rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewMedia(null)}
                className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Close Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal (Task 2.2) */}
      {versionModalFile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-md w-full p-6 shadow-2xl animate-scale-up flex flex-col gap-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-primary" /> Version History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs" title={versionModalFile.filename}>
                  {versionModalFile.filename}
                </p>
              </div>
              <button
                onClick={() => setVersionModalFile(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto custom-scrollbar my-2">
              <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-primary">Current Active Version</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatBytes(versionModalFile.size)} • {new Date(versionModalFile.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-brand-primary text-white text-[10px] font-bold rounded-full">ACTIVE</span>
              </div>

              {fileVersionsList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No previous versions recorded for this file yet. Re-uploading a file with the same name will automatically preserve historical versions.
                </div>
              ) : (
                fileVersionsList.map((ver) => (
                  <div key={ver.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Version #{ver.version_number}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatBytes(ver.size)} • {new Date(ver.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(versionModalFile, ver)}
                      className="btn-secondary py-1 px-2.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setVersionModalFile(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate File Warning Modal (Task 2.3) */}
      {duplicateModalData && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-md w-full p-6 shadow-2xl animate-scale-up flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Duplicate File Detected</h3>
                <p className="text-xs text-slate-400">Identical content already stored in vault</p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-slate-700 dark:text-slate-300">
              <p>
                The file <span className="font-bold text-amber-600 dark:text-amber-400">"{duplicateModalData.file.name}"</span> has identical content to an existing file:
              </p>
              <div className="mt-2 font-mono text-[11px] bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg truncate">
                📄 {duplicateModalData.existingDup.filename} ({formatBytes(duplicateModalData.existingDup.size)})
              </div>
            </div>

            <p className="text-xs text-slate-500">Would you like to upload it anyway or skip upload to avoid duplicate storage?</p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateModalData(null)}
                className="btn-secondary py-2 px-3.5 text-xs font-bold"
              >
                Skip Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  const { uploadId, file, passphrase } = duplicateModalData;
                  setDuplicateModalData(null);
                  startUploadingFile(uploadId, file, passphrase, true);
                }}
                className="btn-primary py-2 px-3.5 text-xs font-bold"
              >
                Upload Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move File Destination Selection Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-md w-full p-6 shadow-2xl animate-scale-up flex flex-col gap-4 text-left border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Folder className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Move {moveTargetFiles.length} {moveTargetFiles.length === 1 ? 'File' : 'Files'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Select target folder destination</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setMoveTargetFiles([]);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-350">
              Relocating: <strong className="text-brand-primary">{moveTargetFiles.map(f => f.filename).join(', ')}</strong>
            </p>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar my-1">
              {/* Vault Root Destination Option */}
              <div
                onClick={() => setSelectedDestinationFolderId(null)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedDestinationFolderId === null
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-semibold">🏠 Vault Root (Uncategorized)</span>
                </div>
                {selectedDestinationFolderId === null && <Check className="w-4 h-4 text-brand-primary" />}
              </div>

              {/* User Folders List */}
              {folders.filter(f => !f.is_deleted).map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => setSelectedDestinationFolderId(folder.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedDestinationFolderId === folder.id
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold">📁 {folder.name}</span>
                  </div>
                  {selectedDestinationFolderId === folder.id && <Check className="w-4 h-4 text-amber-500" />}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowMoveModal(false);
                  setMoveTargetFiles([]);
                }}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmMoveFiles(selectedDestinationFolderId)}
                className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
              >
                Relocate File(s) Here
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
