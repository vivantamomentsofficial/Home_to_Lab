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
  renameFolderInDb,
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
import { getFaFileIcon } from '../utils/faIcons';

// Sub-components for modular architecture
import FileGrid from '../components/dashboard/FileGrid';
import SnippetEditor from '../components/dashboard/SnippetEditor';
import ShareModal from '../components/dashboard/ShareModal';
import StorageAnalytics from '../components/dashboard/StorageAnalytics';

import {
  ShieldAlert, Bell, Folder, File, FileText, HelpCircle,
  Grid, List, Search, MoreVertical, Eye, Download, Trash, Edit3, Share2, Plus, ArrowLeft,
  X, Check, AlertTriangle, Shield, Camera, Menu, Mic, RotateCcw, Lock, Unlock, Play,
  History, UploadCloud, Clipboard, FolderKanban, Calendar, ArrowUpDown, Globe, Clock, Sparkles, Copy,
  EyeOff, User, GraduationCap, Mail, Sun, Moon, QrCode, RefreshCw, MicOff, ChevronRight, Home, FolderPlus
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
  const [isListening, setIsListening] = useState(false);

  // Versioning and Duplicate Modals
  const [versionModalFile, setVersionModalFile] = useState(null);
  const [fileVersionsList, setFileVersionsList] = useState([]);
  const [duplicateModalData, setDuplicateModalData] = useState(null);
  const [showDuplicateCleanerModal, setShowDuplicateCleanerModal] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [duplicateDeleteMode, setDuplicateDeleteMode] = useState('trash'); // 'trash' | 'permanent'
  const [fileDeleteModalData, setFileDeleteModalData] = useState(null); // { file, isBatch, fileIds, count }
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notes/Clipboard caching & viewing
  const [notes, setNotes] = useState([]);
  const [noteId, setNoteId] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [noteSort, setNoteSort] = useState('newest');
  const [notesLoading, setNotesLoading] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [viewNoteCopied, setViewNoteCopied] = useState(false);

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

  // Close 3-dot dropdown menu on outside click or Escape key
  useEffect(() => {
    if (!activeMenuId) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.file-menu-container')) {
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveMenuId(null);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId]);


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
          try {
            const signedUrl = await createSignedDownloadUrl(supabase, data.avatar_url, 3600);
            if (signedUrl) {
              setAvatarUrl(signedUrl);
            } else {
              setAvatarUrl(null);
            }
          } catch (avErr) {
            console.warn('Avatar image resolution skipped:', avErr.message);
            setAvatarUrl(null);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogoutClick = () => {
    setConfirmModalData({
      title: 'Sign Out Confirmation',
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

  // Handle files dropped anywhere on the window while on dashboard
  useEffect(() => {
    const handleGlobalDashboardDrop = (e) => {
      if (e.detail && e.detail.length > 0) {
        showToast(`Processing ${e.detail.length} dropped file(s)...`, 'info');
        handleUploadQueue(e.detail);
      }
    };
    window.addEventListener('cloudvault-dashboard-drop', handleGlobalDashboardDrop);
    return () => window.removeEventListener('cloudvault-dashboard-drop', handleGlobalDashboardDrop);
  }, []);

  const handleShowQrForFile = async (file) => {
    if (downloadLocked) {
      showToast('Sharing privileges have been revoked by the administrator.', 'danger');
      return;
    }
    try {
      showToast('Generating QR code link...', 'info');
      const signedUrl = await createSignedDownloadUrl(supabase, file.storage_path, 3600);
      setQrModalData({
        code: file.filename,
        filename: file.filename,
        url: signedUrl || window.location.href
      });
      setShowQRModal(true);
    } catch (err) {
      console.error(err);
      showToast('Failed to create QR code: ' + err.message, 'danger');
    }
  };

  const handleToggleVoiceTyping = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.', 'warning');
      return;
    }

    if (isListening) {
      if (window.activeSpeechRecognizer) {
        window.activeSpeechRecognizer.stop();
      }
      setIsListening(false);
      showToast('Voice typing stopped.', 'info');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening... Speak now to transcribe into snippet.', 'info');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(res => res[0].transcript)
          .join('');
        setNoteContent(prev => prev ? prev + ' ' + transcript : transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          showToast('Voice typing error: ' + event.error, 'warning');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      window.activeSpeechRecognizer = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      showToast('Failed to start voice typing.', 'danger');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        showToast('System clipboard is empty.', 'info');
        return;
      }
      setNoteContent(prev => prev ? prev + '\n' + text : text);
      showToast('Pasted from clipboard!', 'success');
    } catch (err) {
      showToast('Clipboard access was denied. Use Ctrl+V instead.', 'warning');
    }
  };

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
      showToast('Saving profile details...', 'info');
      // Update auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          college: college.trim()
        }
      });
      if (authErr) throw authErr;

      // Also update profiles table in database for instant sync across sessions
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          college: college.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (dbErr) {
        console.warn('Profiles DB sync warning:', dbErr.message);
      }

      showToast('Profile details updated successfully!', 'success');
    } catch (err) {
      console.error('Profile update error:', err);
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
      const signedUrl = await createSignedDownloadUrl(supabase, avatarPath, 3600);
      if (signedUrl) {
        setAvatarUrl(signedUrl);
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

  const handleViewNote = (note) => {
    setViewingNote(note);
    setViewNoteCopied(false);
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

      // Convert note text to file blob (use decrypted note content if available)
      const noteText = decryptedNotesMap[note.id] || note.content;
      const blob = new Blob([noteText], { type: 'text/plain' });
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
      handleGenerateShareCode(fileRecord);
      
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

  // Image compression helper using HTML5 canvas
  const compressImageFile = (file, maxWidth = 1920, quality = 0.8) => {
    return new Promise((resolve) => {
      if (!file.type || !file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
        return resolve(file);
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                return resolve(file);
              }
              const compressedFile = new window.File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
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
    if (!incomingFiles || incomingFiles.length === 0) return;

    if (!user) {
      showToast('You must be logged in to upload files.', 'danger');
      return;
    }

    if (uploadLocked) {
      showToast('File uploading is locked by the administrator.', 'warning');
      return;
    }

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

    if (!user) {
      showToast('User session expired. Please sign in again.', 'danger');
      return;
    }

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
      let finalStoragePath = `uploads/${user.id}/${uniquePrefix}_${fileNameToSave}`;

      // Progress reporting helper
      setActiveUploads((prev) => {
        if (!prev[uploadId]) return prev;
        return {
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            progress: 30
          }
        };
      });

      // Attempt Supabase storage upload with automatic resilient fallback
      try {
        const TWENTY_MB = 20 * 1024 * 1024;
        if (fileToUpload.size > TWENTY_MB) {
          await uploadFileResumable(supabase, finalStoragePath, fileToUpload, (percent) => {
            setActiveUploads((prev) => {
              if (!prev[uploadId]) return prev;
              return {
                ...prev,
                [uploadId]: {
                  ...prev[uploadId],
                  progress: Math.max(30, percent)
                }
              };
            });
          });
        } else {
          const { error } = await supabase.storage
            .from('vault')
            .upload(finalStoragePath, fileToUpload, {
              cacheControl: '3600',
              upsert: true,
              contentType: fileToUpload.type || 'application/octet-stream'
            });

          if (error) throw error;
        }
      } catch (storageErr) {
        console.warn('Storage upload notice, evaluating resilient fallback:', storageErr.message || storageErr);
        
        const isStorageError = 
          storageErr.message?.toLowerCase().includes('schema') ||
          storageErr.message?.toLowerCase().includes('out of sync') ||
          storageErr.code === 'DatabaseSchemaMismatch' ||
          storageErr.status === 503 ||
          storageErr.status === 400 ||
          storageErr.__isStorageError;

        if (isStorageError && fileToUpload.size <= 15 * 1024 * 1024) {
          showToast('Storage API desynced. Saving file via database vault fallback...', 'info');
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(fileToUpload);
          });
          finalStoragePath = dataUrl;
        } else {
          throw storageErr;
        }
      }

      setActiveUploads((prev) => {
        if (!prev[uploadId]) return prev;
        return {
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            progress: 80
          }
        };
      });

      // Determine folder_id for new upload record: keep root uploads at root (null) unless inside a folder
      let assignedFolderId = (uploadTargetFolderId !== undefined && uploadTargetFolderId !== null) ? uploadTargetFolderId : currentFolderId;
      if (assignedFolderId === 'null' || assignedFolderId === 'undefined' || assignedFolderId === '') {
        assignedFolderId = null;
      }

      // Register file entry in DB catalog with content_hash & folder_id
      const fileCategory = getFileCategory(fileNameToSave, fileToUpload.type || 'application/octet-stream');
      
      const filePayload = {
        user_id: user.id,
        filename: fileNameToSave,
        storage_path: finalStoragePath,
        file_type: fileCategory,
        size: fileToUpload.size,
      };

      if (assignedFolderId) filePayload.folder_id = assignedFolderId;
      if (contentHash) filePayload.content_hash = contentHash;

      // If a file with the same name exists, preserve version history
      if (existingSameName && !String(existingSameName.id).startsWith('storage_')) {
        try {
          await saveFileVersionRecord(supabase, existingSameName);
        } catch (vErr) {
          console.warn('Versioning record note:', vErr);
        }
      }

      // Always insert new file record so existing files are never overwritten or deleted
      let { error: dbError } = await supabase
        .from('files')
        .insert(filePayload);

      // Gracefully handle schema mismatch (e.g. if folder_id or content_hash columns don't exist yet in Supabase schema cache)
      if (dbError && (
        dbError.message?.toLowerCase().includes('schema') ||
        dbError.message?.toLowerCase().includes('column') ||
        dbError.message?.toLowerCase().includes('out of sync') ||
        dbError.code === 'PGRST204'
      )) {
        console.warn('Full file payload insert failed due to DB schema mismatch, retrying with core columns:', dbError.message);
        const corePayload = {
          user_id: user.id,
          filename: fileNameToSave,
          storage_path: finalStoragePath,
          file_type: fileCategory,
          size: fileToUpload.size,
        };
        const fallbackRes = await supabase.from('files').insert(corePayload);
        dbError = fallbackRes.error;
      }

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
          name: name.trim(),
          parent_id: currentFolderId || null
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
        // Prevent duplicate DB rows: check if storage_path already exists
        const { data: existingRow } = await supabase
          .from('files')
          .select('id')
          .eq('user_id', user.id)
          .eq('storage_path', targetFile.storage_path)
          .maybeSingle();

        if (existingRow?.id) {
          await supabase
            .from('files')
            .update({ folder_id: destFolderId })
            .eq('id', existingRow.id);
        } else {
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
        }
      } else {
        // Real UUID: update database row
        const { data: updatedData, error: updateErr } = await supabase
          .from('files')
          .update({ folder_id: destFolderId })
          .eq('id', fileId)
          .select();

        if (updateErr) throw updateErr;

        // If 0 rows updated (record missing in DB), check if storage_path exists before inserting
        if (!updatedData || updatedData.length === 0) {
          const { data: existingRow } = await supabase
            .from('files')
            .select('id')
            .eq('user_id', user.id)
            .eq('storage_path', targetFile.storage_path)
            .maybeSingle();

          if (existingRow?.id) {
            await supabase
              .from('files')
              .update({ folder_id: destFolderId })
              .eq('id', existingRow.id);
          } else {
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
          const { data: existingRow } = await supabase
            .from('files')
            .select('id')
            .eq('user_id', user.id)
            .eq('storage_path', targetFile.storage_path)
            .maybeSingle();

          if (existingRow?.id) {
            await supabase
              .from('files')
              .update({ folder_id: destFolderId })
              .eq('id', existingRow.id);
          } else {
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
        } else {
          const { data: updatedData, error: updateErr } = await supabase
            .from('files')
            .update({ folder_id: destFolderId })
            .eq('id', fileId)
            .select();

          if (updateErr || !updatedData || updatedData.length === 0) {
            const { data: existingRow } = await supabase
              .from('files')
              .select('id')
              .eq('user_id', user.id)
              .eq('storage_path', targetFile.storage_path)
              .maybeSingle();

            if (existingRow?.id) {
              await supabase
                .from('files')
                .update({ folder_id: destFolderId })
                .eq('id', existingRow.id);
            } else {
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
            const { data: existingRow } = await supabase
              .from('files')
              .select('id')
              .eq('user_id', user.id)
              .eq('storage_path', file.storage_path)
              .maybeSingle();

            if (existingRow?.id) {
              await supabase
                .from('files')
                .update({ folder_id: targetDestId })
                .eq('id', existingRow.id);
            } else {
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
            }
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
        showToast(`Successfully auto-organized ${organizedCount} files into folders!`, 'success');
        fetchVaultFiles();
      } else {
        showToast('No matching files found for auto-organization rules.', 'warning');
      }
    } catch (err) {
      console.error('Failed to auto-organize files:', err);
      showToast('Auto-organization error: ' + (err.message || String(err)), 'danger');
    }
  };

  const handleDeleteFile = (id, path, filename, isPermanent = false) => {
    if (operationsLocked) {
      showToast('Folder and file modifications are locked by the administrator.', 'warning');
      return;
    }
    const fileObj = files.find(f => f.id === id) || { id, storage_path: path, filename };
    
    // Open explicit delete choice modal so user can choose Move to Trash OR Delete Permanently
    setFileDeleteModalData({
      file: fileObj,
      isBatch: false
    });
  };

  const executeFileDelete = async (file, deleteType) => {
    if (operationsLocked) {
      showToast('File operations are locked by administrator.', 'warning');
      setFileDeleteModalData(null);
      return;
    }

    try {
      if (deleteType === 'permanent') {
        if (file.storage_path) {
          const cleanPath = (file.storage_path || '').trim().replace(/^\/+/, '');
          const withoutVault = cleanPath.replace(/^vault\//, '');
          const { error: bucketError } = await supabase.storage
            .from('vault')
            .remove([cleanPath, withoutVault]);
          if (bucketError) console.warn('Bucket remove warning:', bucketError);
        }
        if (file.id && !String(file.id).startsWith('storage_')) {
          await deleteFileRecordFromDb(supabase, file.id);
        }
        setFiles(prev => prev.filter(f => f.id !== file.id));
        showToast(`Permanently deleted "${file.filename}".`, 'success');
      } else {
        // Move to trash
        if (file.id && !String(file.id).startsWith('storage_')) {
          await softDeleteFileInDb(supabase, file.id);
        }
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, is_deleted: true } : f));
        showToast(`Moved "${file.filename}" to Trash.`, 'info');
      }
      fetchVaultFiles();
      fetchStorageStats();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete file: ' + (err.message || String(err)), 'danger');
    } finally {
      setFileDeleteModalData(null);
    }
  };

  const executeBatchDelete = async (fileIds, deleteType) => {
    if (operationsLocked) {
      showToast('File operations are locked by administrator.', 'warning');
      setFileDeleteModalData(null);
      return;
    }

    try {
      const targets = files.filter(f => fileIds.includes(f.id));
      if (deleteType === 'permanent') {
        const paths = [];
        targets.forEach(f => {
          if (f.storage_path) {
            const cleanPath = (f.storage_path || '').trim().replace(/^\/+/, '');
            const withoutVault = cleanPath.replace(/^vault\//, '');
            paths.push(cleanPath, withoutVault);
          }
        });
        if (paths.length > 0) {
          await supabase.storage.from('vault').remove(paths);
        }
        await Promise.all(
          targets.filter(f => f.id && !String(f.id).startsWith('storage_')).map(f => deleteFileRecordFromDb(supabase, f.id))
        );
        setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
        showToast(`Permanently deleted ${targets.length} file(s).`, 'success');
      } else {
        // Move to trash
        await Promise.all(
          targets.filter(f => f.id && !String(f.id).startsWith('storage_')).map(f => softDeleteFileInDb(supabase, f.id))
        );
        setFiles(prev => prev.map(f => fileIds.includes(f.id) ? { ...f, is_deleted: true } : f));
        showToast(`Moved ${targets.length} file(s) to Trash.`, 'info');
      }
      setSelectedFileIds([]);
      fetchVaultFiles();
      fetchStorageStats();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete selected files: ' + (err.message || String(err)), 'danger');
    } finally {
      setFileDeleteModalData(null);
    }
  };

  const handleRestoreFile = async (id, filename) => {
    try {
      await restoreFileInDb(supabase, id);
      showToast(`Restored "${filename}" successfully!`, 'success');
      fetchVaultFiles();
      fetchStorageStats();
    } catch (err) {
      console.error(err);
      showToast('Failed to restore file: ' + err.message, 'danger');
    }
  };

  // ==========================================
  // DUPLICATE FILES CLEANUP LOGIC (Task: Clean same-same files & keep 1 original)
  // ==========================================
  const getDuplicateGroups = () => {
    const activeFiles = files.filter(f => !f.is_deleted);
    const visited = new Set();
    const groups = [];

    for (let i = 0; i < activeFiles.length; i++) {
      const f1 = activeFiles[i];
      if (visited.has(f1.id)) continue;

      const matched = [f1];
      for (let j = i + 1; j < activeFiles.length; j++) {
        const f2 = activeFiles[j];
        if (visited.has(f2.id)) continue;

        const sameHash = f1.content_hash && f2.content_hash && f1.content_hash === f2.content_hash;
        const sameNameAndSize = (f1.filename || '').trim().toLowerCase() === (f2.filename || '').trim().toLowerCase() && Number(f1.size) === Number(f2.size);
        const sameName = (f1.filename || '').trim().toLowerCase() === (f2.filename || '').trim().toLowerCase();

        if (sameHash || sameNameAndSize || sameName) {
          matched.push(f2);
          visited.add(f2.id);
        }
      }

      if (matched.length > 1) {
        visited.add(f1.id);
        // Sort by created_at ascending: earliest uploaded is the original file
        matched.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const original = matched[0];
        const duplicates = matched.slice(1);
        const reclaimableBytes = duplicates.reduce((acc, d) => acc + (parseInt(d.size, 10) || 0), 0);

        groups.push({
          id: original.id,
          filename: original.filename,
          original,
          duplicates,
          allFiles: matched,
          reclaimableBytes
        });
      }
    }

    return groups;
  };

  const handleCleanDuplicates = async (specificDuplicateIds = null, isPermanent = false) => {
    if (operationsLocked) {
      showToast('File operations are locked by administrator.', 'warning');
      return;
    }

    setCleaningDuplicates(true);
    try {
      let filesToDelete = [];
      if (specificDuplicateIds && specificDuplicateIds.length > 0) {
        filesToDelete = files.filter(f => specificDuplicateIds.includes(f.id));
      } else {
        const groups = getDuplicateGroups();
        filesToDelete = groups.flatMap(g => g.duplicates);
      }

      if (filesToDelete.length === 0) {
        showToast('No duplicate copies to clean.', 'info');
        setCleaningDuplicates(false);
        return;
      }

      let deletedCount = 0;
      let freedBytes = 0;

      for (const file of filesToDelete) {
        try {
          if (isPermanent) {
            if (file.storage_path) {
              await supabase.storage.from('vault').remove([file.storage_path]);
            }
            if (file.id && !String(file.id).startsWith('storage_')) {
              await deleteFileRecordFromDb(supabase, file.id);
            }
          } else {
            if (file.id && !String(file.id).startsWith('storage_')) {
              await softDeleteFileInDb(supabase, file.id);
            }
          }
          deletedCount++;
          freedBytes += (parseInt(file.size, 10) || 0);
        } catch (delErr) {
          console.warn('Error cleaning duplicate file:', file.filename, delErr);
        }
      }

      showToast(`Cleaned ${deletedCount} duplicate file(s)! Kept original intact. Freed ${formatBytes(freedBytes)}.`, 'success');
      await fetchVaultFiles();
      await fetchStorageStats();

      const remainingGroups = getDuplicateGroups();
      if (remainingGroups.length === 0) {
        setShowDuplicateCleanerModal(false);
      }
    } catch (err) {
      console.error('Failed to clean duplicates:', err);
      showToast('Failed to clean duplicates: ' + (err.message || String(err)), 'danger');
    } finally {
      setCleaningDuplicates(false);
    }
  };

  const handleEmptyTrash = () => {
    const trashFiles = files.filter(f => !!f.is_deleted);
    if (trashFiles.length === 0) return;

    setConfirmModalData({
      title: 'Empty Vault Trash',
      message: `Permanently delete all ${trashFiles.length} files in trash? This cannot be undone.`,
      action: async () => {
        try {
          const paths = [];
          trashFiles.forEach(f => {
            if (f.storage_path) {
              const cleanPath = (f.storage_path || '').trim().replace(/^\/+/, '');
              const withoutVault = cleanPath.replace(/^vault\//, '');
              paths.push(cleanPath, withoutVault);
            }
          });
          if (paths.length > 0) {
            await supabase.storage.from('vault').remove(paths);
          }
          for (const f of trashFiles) {
            if (f.id && !String(f.id).startsWith('storage_')) {
              await deleteFileRecordFromDb(supabase, f.id);
            }
          }
          setFiles(prev => prev.filter(f => !f.is_deleted));
          showToast(`Emptied trash (${trashFiles.length} files permanently deleted).`, 'success');
          fetchVaultFiles();
          fetchStorageStats();
        } catch (err) {
          console.error(err);
          showToast('Failed to empty trash: ' + err.message, 'danger');
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
        // Step 1: Create signed URL from storage bucket valid for selected duration with attachment header
        const { data: signedData, error: signedError } = await supabase.storage
          .from('vault')
          .createSignedUrl(shareOptionsFile.storage_path, selectedShareExpiry, { download: shareOptionsFile.filename });

        if (signedError) throw signedError;
        signedUrl = signedData.signedUrl;

        // Step 2: Generate unique 6-digit alphanumeric code using Web Crypto API
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let codeExists = true;
        let shareCode = '';
        let attempts = 0;
        while (codeExists && attempts < 10) {
          attempts++;
          const randomBytes = new Uint8Array(6);
          window.crypto.getRandomValues(randomBytes);
          shareCode = Array.from(randomBytes).map(b => chars[b % chars.length]).join('');

          // Check database collision safely using get_shared_file_by_code RPC
          const { data: rpcData } = await supabase.rpc('get_shared_file_by_code', {
            p_code: shareCode
          });
          
          if (!rpcData || rpcData.length === 0) {
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
    if (selectedFileIds.length === 0) return;

    setFileDeleteModalData({
      file: null,
      isBatch: true,
      fileIds: [...selectedFileIds],
      count: selectedFileIds.length
    });
  };

  const handleBatchRestore = async () => {
    if (selectedFileIds.length === 0) return;
    try {
      showToast('Restoring selected files...', 'info');
      for (const id of selectedFileIds) {
        await restoreFileInDb(supabase, id);
      }
      showToast(`Restored ${selectedFileIds.length} files successfully!`, 'success');
      setSelectedFileIds([]);
      fetchVaultFiles();
      fetchStorageStats();
    } catch (err) {
      console.error(err);
      showToast('Failed to restore selected files: ' + err.message, 'danger');
    }
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
      else if (category === 'video' || category === 'audio') {
        const mime = category === 'video' ? 'video/mp4' : 'audio/mpeg';
        const blob = new Blob([decryptedBuffer], { type: mime });
        const url = URL.createObjectURL(blob);
        setPreviewMedia({ type: category, title: cleanName, url: url });
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
      let targetUrl = path;

      if (!path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('data:')) {
        const { data, error } = await supabase.storage
          .from('vault')
          .createSignedUrl(path, 120);

        if (error) throw error;
        targetUrl = data.signedUrl;
      }

      const link = document.createElement('a');
      link.href = targetUrl;
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

    // Trash filter: exclusively show soft-deleted files
    if (activeFilter === 'trash') {
      let filtered = files.filter(f => !!f.is_deleted);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(f => f.filename.toLowerCase().includes(q));
      }
      return filtered;
    }

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

    // 6. Strict deduplication safety guard: Each file appears strictly ONCE
    const uniqueFiles = [];
    const seenIds = new Set();
    const seenStoragePaths = new Set();

    for (const f of filtered) {
      if (!f) continue;
      const fId = f.id;
      const cleanPath = (f.storage_path || '').trim().replace(/^\/+/, '');

      if (fId && seenIds.has(fId)) continue;
      if (cleanPath && seenStoragePaths.has(cleanPath)) continue;

      if (fId) seenIds.add(fId);
      if (cleanPath) seenStoragePaths.add(cleanPath);
      uniqueFiles.push(f);
    }

    return uniqueFiles;
  };

  // Folder Rename Handler
  const handleRenameFolder = async (folder) => {
    if (operationsLocked) {
      showToast('File and folder modifications are locked on your account by the administrator.', 'warning');
      return;
    }
    const newName = prompt(`Enter new name for folder "${folder.name}":`, folder.name);
    if (!newName || !newName.trim() || newName.trim() === folder.name) return;

    try {
      showToast(`Renaming folder to "${newName.trim()}"...`, 'info');
      await renameFolderInDb(supabase, folder.id, newName.trim());
      showToast(`Folder renamed to "${newName.trim()}"!`, 'success');
      fetchVaultFiles();
    } catch (err) {
      console.error('Failed to rename folder:', err);
      showToast('Failed to rename folder: ' + err.message, 'danger');
    }
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
      // Optimistic update so it disappears immediately from UI
      setFolders(prev => prev.filter(f => f.id !== folder.id));
      if (currentFolderId === folder.id) {
        setCurrentFolderId(null);
        setFolderScope('current');
      }
      await deleteFolderInDb(supabase, folder.id);
      showToast(`Folder "${folder.name}" deleted successfully.`, 'success');
      fetchVaultFiles();
    } catch (err) {
      console.error('Failed to delete folder:', err);
      showToast('Failed to delete folder: ' + err.message, 'danger');
      fetchVaultFiles();
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
    return getFaFileIcon(filename);
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

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-600" />}
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
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <i className="fa-solid fa-gauge-high w-4 text-center"></i> Overview
          </button>
          
          <button
            onClick={() => {
              setActiveTab('upload');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <i className="fa-solid fa-cloud-arrow-up w-4 text-center"></i> Send to Server
          </button>

          <button
            onClick={() => {
              setActiveTab('clipboard');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'clipboard'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <i className="fa-solid fa-clipboard w-4 text-center"></i> Clipboard Paste
          </button>

          <button
            onClick={() => {
              setActiveTab('vault');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'vault'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <i className="fa-solid fa-folder-tree w-4 text-center"></i> Vault Explorer
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <i className="fa-solid fa-sliders w-4 text-center"></i> Settings
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              setIsDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <i className="fa-solid fa-user-gear w-4 text-center"></i> Profile Info
          </button>

          {/* Admin Dedicated View Link */}
          {user?.email === 'aayushparekh26@gmail.com' && (
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <Link
                to="/admin"
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-all shadow-xs"
                onClick={() => setIsDrawerOpen(false)}
              >
                <i className="fa-solid fa-user-shield w-4 text-center"></i> Admin Control Centre
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
              <i className="fa-solid fa-right-from-bracket"></i>
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
        <GlobalAnnouncementBanner />
        
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

            {/* Quick Action Icons (Refresh & Theme Toggle) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  fetchVaultFiles();
                  fetchNotes();
                  fetchStorageStats();
                  showToast('Dashboard refreshed!', 'info');
                }}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-primary transition-all cursor-pointer shadow-2xs border border-slate-200/50 dark:border-slate-700/50"
                title="Refresh Vault & Notes"
                aria-label="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-all cursor-pointer shadow-2xs border border-slate-200/50 dark:border-slate-700/50"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
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
          <div className="space-y-6 animate-fade-in">
            <StorageAnalytics 
              totalStorageUsed={usedStorage}
              maxStorageBytes={storageLimit}
              filesCount={files.filter(f => !f.is_deleted).length}
              notesCount={notes.filter(n => !n.is_deleted).length}
              files={files}
            />

            {/* Quick Action Toolbar */}
            <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Quick Tools:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary py-2 px-3 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Upload File
                </button>
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5 text-amber-500" /> New Folder
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreateTxtModal}
                  className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" /> Create TXT
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecordModal(true)}
                  className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-500" /> Record Memo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('clipboard')}
                  className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-500" /> New Note
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateCleanerModal(true)}
                  className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Deduplicate
                </button>
              </div>
            </div>

            {/* Direct Inline Dropzone for Overview */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleUploadQueue(Array.from(e.dataTransfer.files));
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-brand-primary/30 hover:border-brand-primary/70 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-secondary/5 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-white">
                  Quick Upload to Encrypted Cloud
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  Drag & drop files here or <span className="text-brand-primary font-semibold underline underline-offset-2">browse from your computer</span>. Stored with client-side zero-knowledge encryption.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-500" /> AES-256 GCM
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 text-emerald-500" /> Multi-File Queue
                </span>
              </div>
            </div>

            {/* 3 Quick Navigation Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('upload')}
                className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-brand-primary/40 hover:shadow-md transition-all group"
              >
                <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Send Files</h4>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">Advanced Uploader</p>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('clipboard')}
                className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-amber-500/40 hover:shadow-md transition-all group"
              >
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clipboard Clippings</h4>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                    {notes.filter(n => !n.is_deleted).length} active snippets
                  </p>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('vault')}
                className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-rose-500/40 hover:shadow-md transition-all group"
              >
                <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vault Explorer</h4>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                    {files.filter(f => !f.is_deleted).length} encrypted files
                  </p>
                </div>
              </div>
            </div>

            {/* Split Grid: Recent Files & Recent Snippets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Files Panel */}
              <div className="glass-card p-5 flex flex-col justify-between border-slate-200/70 dark:border-slate-800">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <File className="w-4 h-4 text-brand-primary" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">Recent Files</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full">
                        {files.filter(f => !f.is_deleted).length} Total
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('vault')}
                      className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {files.filter(f => !f.is_deleted).length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                      <FolderKanban className="w-8 h-8 opacity-40 text-slate-400" />
                      <span>No files in your vault yet.</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary py-1.5 px-3 text-xs font-bold mt-1"
                      >
                        Upload First File
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {files.filter(f => !f.is_deleted).slice(0, 5).map((file) => (
                        <div
                          key={file.id}
                          className="py-2.5 flex items-center justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg px-2 transition-colors"
                        >
                          <div
                            onClick={() => handlePreviewFile(file)}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg shrink-0">
                              {getFileIcon(file.filename)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-primary transition-colors">
                                {file.filename.startsWith('[encrypted]_') ? (
                                  <span className="flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span className="truncate">{file.filename.replace('[encrypted]_', '')}</span>
                                  </span>
                                ) : (
                                  file.filename
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {formatBytes(file.size)} &bull; {new Date(file.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePreviewFile(file)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadFileDirect(file.storage_path, file.filename)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShowQrForFile(file)}
                              className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="QR Code Share"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGenerateShareCode(file)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              title="Share Code"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Clippings Panel */}
              <div className="glass-card p-5 flex flex-col justify-between border-slate-200/70 dark:border-slate-800">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Clipboard className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">Recent Clippings</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full">
                        {notes.filter(n => !n.is_deleted).length} Total
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('clipboard')}
                      className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {notes.filter(n => !n.is_deleted).length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                      <Clipboard className="w-8 h-8 opacity-40 text-slate-400" />
                      <span>No saved notes or code clippings yet.</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('clipboard')}
                        className="btn-secondary py-1.5 px-3 text-xs font-bold mt-1"
                      >
                        Create Note
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {notes.filter(n => !n.is_deleted).slice(0, 4).map((note) => (
                        <div
                          key={note.id}
                          className="py-2.5 flex items-start justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg px-2 transition-colors"
                        >
                          <div
                            onClick={() => handleViewNote(note)}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-500 transition-colors">
                                {note.title}
                              </p>
                              {note.is_encrypted && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> Encrypted
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                              {note.is_encrypted && !decryptedNotesMap[note.id] ? 'Locked AES content' : (decryptedNotesMap[note.id] || note.content)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleCopyNote(decryptedNotesMap[note.id] || note.content)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              title="Copy snippet"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewNote(note)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              title="View Note"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                    <option value="">Vault Root (Uncategorized)</option>
                    {folders.filter(f => !f.is_deleted).map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
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
                      Encrypt before upload (AES-256-GCM, passphrase never leaves your browser)
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="label-title mb-0">CONTENT</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleToggleVoiceTyping}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                            isListening
                              ? 'bg-red-500 text-white animate-pulse shadow-sm shadow-red-500/30'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                          title={isListening ? 'Stop voice typing' : 'Start voice typing with microphone'}
                        >
                          {isListening ? (
                            <>
                              <MicOff className="w-3 h-3 text-white" />
                              <span>Listening...</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3 h-3 text-brand-primary" />
                              <span>Voice Type</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handlePasteFromClipboard}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Paste text from system clipboard"
                        >
                          <Clipboard className="w-3 h-3 text-amber-500" />
                          <span>Paste</span>
                        </button>
                      </div>
                    </div>
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
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded inline-flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Encrypted
                            </span>
                          )}
                        </div>
                        <h4
                          onClick={() => handleViewNote(note)}
                          className="font-bold text-sm text-slate-800 dark:text-white truncate cursor-pointer hover:text-brand-primary transition-colors"
                          title="Click to view full snippet"
                        >
                          {note.title}
                        </h4>
                        {note.is_encrypted && !decryptedNotesMap[note.id] ? (
                          <div
                            onClick={() => handleViewNote(note)}
                            className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-center gap-2 cursor-pointer hover:border-amber-300"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-xs text-amber-700 dark:text-amber-400">Content is encrypted — click to view & unlock.</span>
                          </div>
                        ) : (
                          <p
                            onClick={() => handleViewNote(note)}
                            className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-4 font-mono whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                            title="Click to view full snippet"
                          >
                            {decryptedNotesMap[note.id] || note.content}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] text-slate-400">
                          {new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex gap-1">
                          {/* View Note / Clipboard snippet button */}
                          <button
                            onClick={() => handleViewNote(note)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-primary transition-colors cursor-pointer"
                            title="View full snippet"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3.5">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button 
                  onClick={handleCreateFolder} 
                  className="btn-secondary py-2.5 px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer hover:border-brand-primary"
                  title={currentFolderId ? "Create subfolder inside current folder" : "Create new folder at vault root"}
                >
                  <Plus className="w-4 h-4 text-brand-primary" /> {currentFolderId ? 'New Subfolder' : 'New Folder'}
                </button>
                <button onClick={handleOpenCreateTxtModal} className="btn-primary py-2.5 px-3.5 text-xs font-bold flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer shadow-sm">
                  <Plus className="w-4 h-4" /> Create TXT
                </button>
                <button onClick={() => setShowRecordModal(true)} className="btn-secondary py-2.5 px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer">
                  <Mic className="w-4 h-4 text-brand-primary" /> Record Memo
                </button>
                {currentFolderId === null && files.some(f => !f.is_deleted && !f.folder_id) && (
                  <button
                    onClick={handleAutoOrganizeFiles}
                    className="btn-secondary py-2.5 px-3.5 text-xs font-bold flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer text-amber-600 dark:text-amber-400 border-amber-300/50 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    title="Automatically sort root files into Lab, Lecture, & practical folders"
                  >
                    <Folder className="w-4 h-4 text-amber-500" /> Auto-Organize
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 min-w-[140px] sm:min-w-[180px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-9 pr-8 py-2 text-xs w-full"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="relative flex-1 sm:flex-initial">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none appearance-none cursor-pointer focus:border-brand-primary"
                    title="Filter by date range"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today (24h)</option>
                    <option value="7days">Past 7 Days</option>
                    <option value="30days">Past 30 Days</option>
                  </select>
                </div>
                <div className="relative flex-1 sm:flex-initial">
                  <Folder className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={folderScope}
                    onChange={(e) => setFolderScope(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none appearance-none cursor-pointer focus:border-brand-primary"
                    title="Filter folder scope"
                  >
                    <option value="current">Current Folder</option>
                    <option value="all">All Folders</option>
                  </select>
                </div>
                <div className="relative flex-1 sm:flex-initial">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none appearance-none cursor-pointer focus:border-brand-primary"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name">Name A-Z</option>
                    <option value="size">Largest First</option>
                  </select>
                </div>
                <button
                  onClick={handleToggleLayout}
                  className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
                  title="Toggle layout"
                >
                  {layoutMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateCleanerModal(true)}
                  className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1.5 transition-all border ${
                    getDuplicateGroups().reduce((acc, g) => acc + g.duplicates.length, 0) > 0
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                  title={
                    getDuplicateGroups().reduce((acc, g) => acc + g.duplicates.length, 0) > 0
                      ? `${getDuplicateGroups().reduce((acc, g) => acc + g.duplicates.length, 0)} duplicate copies found. Click to clean & keep 1 original.`
                      : 'Scan & Clean Duplicates'
                  }
                >
                  <Copy className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Clean Duplicates</span>
                  {getDuplicateGroups().reduce((acc, g) => acc + g.duplicates.length, 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold animate-pulse">
                      {getDuplicateGroups().reduce((acc, g) => acc + g.duplicates.length, 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Interactive Modern Breadcrumb Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                {currentFolderId && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentF = folders.find(f => f.id === currentFolderId);
                      const parentId = currentF?.parent_id || null;
                      setCurrentFolderId(parentId);
                      setFolderScope('current');
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer mr-1"
                    title="Go back to parent folder"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-semibold text-xs">Back</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setCurrentFolderId(null);
                    setFolderScope('current');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-bold ${
                    currentFolderId === null 
                      ? 'bg-brand-primary/10 text-brand-primary' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fileId = e.dataTransfer.getData('text/plain');
                    if (fileId) moveFileToFolder(fileId, null);
                  }}
                  title="Vault Root (drag a file here to move to root)"
                >
                  <Home className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Vault Root</span>
                </button>

                {currentFolderId && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="flex items-center gap-1.5 font-bold text-slate-850 dark:text-slate-100 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-amber-700 dark:text-amber-300">
                      <Folder className="w-3.5 h-3.5 text-amber-500" />
                      <span>{folders.find(f => f.id === currentFolderId)?.name || 'Folder'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Active location stats */}
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2">
                <span>
                  {getFilteredFiles().length} {getFilteredFiles().length === 1 ? 'file' : 'files'}
                </span>
                <span>&bull;</span>
                <span>
                  {formatBytes(getFilteredFiles().reduce((acc, f) => acc + (parseInt(f.size, 10) || 0), 0))}
                </span>
              </div>
            </div>

            {/* Category Filter Chips with Dynamic Counts */}
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar items-center">
              {['all', 'image', 'document', 'code', 'text', 'zip', 'other', 'trash'].map((filter) => {
                const isTrash = filter === 'trash';
                const trashCount = files.filter(f => !!f.is_deleted).length;
                const catCount = isTrash
                  ? trashCount
                  : filter === 'all'
                    ? files.filter(f => !f.is_deleted).length
                    : files.filter(f => !f.is_deleted && getFileCategory(f.filename, f.file_type || '') === filter).length;

                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeFilter === filter
                        ? (isTrash ? 'bg-red-650 text-white shadow-xs' : 'bg-brand-primary text-white')
                        : (isTrash 
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/40' 
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/50 dark:border-slate-800/80')
                    }`}
                  >
                    {isTrash && <Trash className="w-3 h-3" />}
                    <span>{filter}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeFilter === filter 
                        ? 'bg-white/20 text-white' 
                        : isTrash 
                          ? 'bg-red-500/20 text-red-700 dark:text-red-300' 
                          : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {catCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Trash Status & Quick Empty Banner */}
            {activeFilter === 'trash' && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs text-red-700 dark:text-red-300 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <Trash className="w-4 h-4 text-red-500 shrink-0" />
                  <span>
                    <strong>Vault Trash:</strong> Files here are queued for deletion. You can restore them anytime or purge them permanently.
                  </span>
                </div>
                {files.filter(f => !!f.is_deleted).length > 0 && (
                  <button
                    type="button"
                    onClick={handleEmptyTrash}
                    className="px-3 py-1.5 rounded-xl bg-red-650 hover:bg-red-750 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer border-0"
                  >
                    <Trash className="w-3.5 h-3.5" /> Empty Trash
                  </button>
                )}
              </div>
            )}

            {/* Loading Grid/List */}
            {vaultLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              </div>
            ) : (
              <div>
                {/* 1. Folders container (Show Root folders on root, Subfolders inside folder; hidden during search or in trash) */}
                {!searchQuery && activeFilter !== 'trash' && (
                  (() => {
                    const visibleFolders = folders.filter(f => !f.is_deleted && (
                      currentFolderId === null 
                        ? (!f.parent_id || f.parent_id === 'null') 
                        : f.parent_id === currentFolderId
                    ));

                    if (visibleFolders.length === 0) return null;

                    return (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5 text-amber-500" />
                            <span>{currentFolderId ? 'Subfolders' : 'Folders'} ({visibleFolders.length})</span>
                          </h4>
                          <button
                            type="button"
                            onClick={handleCreateFolder}
                            className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> New {currentFolderId ? 'Subfolder' : 'Folder'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                          {visibleFolders.map((folder) => {
                            const count = files.filter(file => !file.is_deleted && file.folder_id === folder.id).length;
                            const subfolderCount = folders.filter(f => !f.is_deleted && f.parent_id === folder.id).length;
                            return (
                              <div
                                key={folder.id}
                                onClick={() => {
                                  setCurrentFolderId(folder.id);
                                  setFolderScope('current');
                                }}
                                className="glass-card p-3.5 hover:shadow-md cursor-pointer flex items-center justify-between gap-3 border-slate-200/70 dark:border-slate-800 group hover:border-amber-400/50 dark:hover:border-amber-500/50 transition-all rounded-2xl"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.add('ring-2', 'ring-amber-400');
                                }}
                                onDragLeave={(e) => {
                                  e.currentTarget.classList.remove('ring-2', 'ring-amber-400');
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('ring-2', 'ring-amber-400');
                                  const fileId = e.dataTransfer.getData('text/plain');
                                  if (fileId) moveFileToFolder(fileId, folder.id);
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform shrink-0">
                                    <Folder className="w-5 h-5 text-amber-500" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate select-none group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                      {folder.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {count} {count === 1 ? 'file' : 'files'}
                                      {subfolderCount > 0 && ` • ${subfolderCount} sub`}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameFolder(folder);
                                    }}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                    title="Rename folder"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFolder(folder);
                                    }}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                    title="Delete folder"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* 2. Files container header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      Files
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {getFilteredFiles().length}
                    </span>
                  </div>
                  {getFilteredFiles().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = getFilteredFiles().map(f => f.id);
                        if (selectedFileIds.length === allIds.length) {
                          setSelectedFileIds([]);
                        } else {
                          setSelectedFileIds(allIds);
                        }
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-brand-primary cursor-pointer transition-colors"
                    >
                      {selectedFileIds.length === getFilteredFiles().length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                {/* Batch Action Bar */}
                {selectedFileIds.length > 0 && (
                  <div className="glass-card p-3 bg-brand-primary/5 border border-brand-primary/20 flex justify-between items-center rounded-xl animate-fade-in mb-3">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {selectedFileIds.length} {selectedFileIds.length === 1 ? 'file' : 'files'} selected
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {activeFilter === 'trash' ? (
                        <>
                          <button
                            type="button"
                            onClick={handleBatchRestore}
                            className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restore Selected ({selectedFileIds.length})
                          </button>
                          <button
                            type="button"
                            onClick={handleBatchDelete}
                            className="btn-danger bg-red-650 hover:bg-red-750 text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer border-0"
                          >
                            <Trash className="w-3.5 h-3.5" /> Purge Permanently
                          </button>
                        </>
                      ) : (
                        <>
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
                            <Trash className="w-3.5 h-3.5" /> Move to Trash
                          </button>
                        </>
                      )}
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
                  currentFolderId === null && folders.filter(f => !f.is_deleted).length > 0 && files.some(f => !f.is_deleted && f.folder_id) ? (
                    <div className="text-center py-6 px-4 text-slate-500 dark:text-slate-400 text-xs font-semibold bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
                      <Folder className="w-4 h-4 text-brand-primary shrink-0" />
                      <span>All your files are safely organized inside the folders above. Click any folder to open it!</span>
                    </div>
                  ) : (
                    <div className="text-center py-14 text-slate-400 text-sm flex flex-col items-center justify-center gap-3 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80 p-8 my-2">
                      <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        <FolderKanban className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                          {activeFilter === 'trash' ? 'Trash is empty' : 'No files in this view'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          {activeFilter === 'trash'
                            ? 'Files moved to Trash will appear here until permanently deleted or restored.'
                            : 'Upload files or create quick text notes to populate your encrypted vault.'}
                        </p>
                      </div>
                      {activeFilter !== 'trash' && (
                        <div className="flex items-center gap-2.5 mt-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab('upload')}
                            className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" /> Upload File
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenCreateTxtModal}
                            className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Create TXT
                          </button>
                        </div>
                      )}
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
                        className={`glass-card p-4 hover:shadow-md relative flex flex-col justify-between border-slate-100 dark:border-slate-800 transition-all ${activeMenuId === file.id ? 'z-50' : 'z-1'}`}
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
                            <div 
                              onClick={() => handlePreviewFile(file)}
                              className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl ml-6 cursor-pointer hover:scale-105 transition-transform"
                              title="Click to preview file"
                            >
                              {getFileIcon(file.filename)}
                            </div>
                            
                            {/* File actions dropdown menu */}
                            <div className="relative file-menu-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === file.id ? null : file.id);
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                aria-label="More actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {activeMenuId === file.id && (
                                <div className="absolute right-0 top-8 w-44 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                                  {file.is_deleted ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleRestoreFile(file.id, file.filename);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-emerald-500" /> Restore File
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleDeleteFile(file.id, file.storage_path, file.filename, true);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Trash className="w-3.5 h-3.5 text-red-500" /> Delete Permanently
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handlePreviewFile(file);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-500" /> Preview
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleDownloadFileDirect(file.storage_path, file.filename);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5 text-slate-500" /> Download
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          setMoveTargetFiles([file]);
                                          setSelectedDestinationFolderId(file.folder_id || null);
                                          setShowMoveModal(true);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 flex items-center gap-2 transition-colors"
                                      >
                                        <Folder className="w-3.5 h-3.5 text-amber-500" /> Move to Folder
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleGenerateShareCode(file);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                      >
                                        <Share2 className="w-3.5 h-3.5 text-slate-500" /> Share Code
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleShowQrForFile(file);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                      >
                                        <QrCode className="w-3.5 h-3.5 text-indigo-500" /> QR Code Share
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleOpenVersionHistory(file);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                      >
                                        <History className="w-3.5 h-3.5 text-blue-500" /> Version History
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          triggerRenameFile(file);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Rename
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleDeleteFile(file.id, file.storage_path, file.filename);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors"
                                      >
                                        <Trash className="w-3.5 h-3.5 text-red-500" /> Move to Trash
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <h4 
                            onClick={() => handlePreviewFile(file)}
                            className="font-bold text-sm text-slate-800 dark:text-white mt-4 truncate flex items-center gap-1.5 cursor-pointer hover:text-brand-primary transition-colors" 
                            title={file.filename}
                          >
                            {file.filename.startsWith('[encrypted]_') ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>{file.filename.replace('[encrypted]_', '')}</span>
                              </>
                            ) : (
                              file.filename
                            )}
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
                                <Folder className="w-3 h-3 text-amber-500" />
                                {folders.find(f => f.id === file.folder_id)?.name || 'Folder'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-[9px] text-slate-400 mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span>Uploaded: {new Date(file.created_at).toLocaleDateString()}</span>
                          {file.is_deleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreFile(file.id, file.filename);
                              }}
                              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Restore
                            </button>
                          )}
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
                        className={`glass-card p-3 flex items-center justify-between gap-4 hover:shadow-sm border-slate-100 dark:border-slate-800 transition-all ${activeMenuId === file.id ? 'relative z-50' : 'relative z-1'}`}
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

                          <div 
                            onClick={() => handlePreviewFile(file)}
                            className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            title="Click to preview file"
                          >
                            {getFileIcon(file.filename)}
                          </div>
                          <div className="min-w-0">
                            <h4 
                              onClick={() => handlePreviewFile(file)}
                              className="font-bold text-sm text-slate-800 dark:text-white truncate flex items-center gap-1.5 cursor-pointer hover:text-brand-primary transition-colors" 
                              title={file.filename}
                            >
                              {file.filename.startsWith('[encrypted]_') ? (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>{file.filename.replace('[encrypted]_', '')}</span>
                                </>
                              ) : (
                                file.filename
                              )}
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
                                  <Folder className="w-3 h-3 text-amber-500" />
                                  {folders.find(f => f.id === file.folder_id)?.name || 'Folder'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Desktop inline action buttons */}
                        <div className="hidden md:flex items-center gap-1.5 shrink-0">
                          {file.is_deleted ? (
                            <>
                              <button
                                onClick={() => handleRestoreFile(file.id, file.filename)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                                title="Restore file"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Restore
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id, file.storage_path, file.filename, true)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-red-500 transition-colors cursor-pointer"
                                title="Delete permanently"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
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
                                onClick={() => handleShowQrForFile(file)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title="QR Code Share"
                              >
                                <QrCode className="w-4 h-4 text-indigo-500" />
                              </button>
                              <button
                                onClick={() => handleOpenVersionHistory(file)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title="Version History"
                              >
                                <History className="w-4 h-4 text-blue-500" />
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
                            </>
                          )}
                        </div>

                        {/* Mobile dropdown actions menu */}
                        <div className="md:hidden relative shrink-0 file-menu-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === file.id ? null : file.id);
                            }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            aria-label="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {activeMenuId === file.id && (
                            <div className="absolute right-0 top-9 w-44 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                              {file.is_deleted ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleRestoreFile(file.id, file.filename);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-emerald-500" /> Restore File
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDeleteFile(file.id, file.storage_path, file.filename, true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trash className="w-3.5 h-3.5 text-red-500" /> Delete Permanently
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handlePreviewFile(file);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-500" /> Preview
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDownloadFileDirect(file.storage_path, file.filename);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5 text-slate-500" /> Download
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setMoveTargetFiles([file]);
                                      setSelectedDestinationFolderId(file.folder_id || null);
                                      setShowMoveModal(true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 flex items-center gap-2 transition-colors"
                                  >
                                    <Folder className="w-3.5 h-3.5 text-amber-500" /> Move to Folder
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleGenerateShareCode(file);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                  >
                                    <Share2 className="w-3.5 h-3.5 text-slate-500" /> Share Code
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleShowQrForFile(file);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <QrCode className="w-3.5 h-3.5 text-indigo-500" /> QR Code Share
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleOpenVersionHistory(file);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <History className="w-3.5 h-3.5 text-blue-500" /> Version History
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      triggerRenameFile(file);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Rename
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDeleteFile(file.id, file.storage_path, file.filename);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors"
                                  >
                                    <Trash className="w-3.5 h-3.5 text-red-500" /> Move to Trash
                                  </button>
                                </>
                              )}
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
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Appearance & Preferences</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Personalize your workspace aesthetics and default vault layout.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Theme Mode</p>
                      <p className="text-[10px] text-slate-400 capitalize">{theme || 'System'} Theme</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold cursor-pointer"
                  >
                    Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                  </button>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {layoutMode === 'grid' ? <Grid className="w-4 h-4 text-brand-primary" /> : <List className="w-4 h-4 text-brand-primary" />}
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Default Layout</p>
                      <p className="text-[10px] text-slate-400 capitalize">{layoutMode} View</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleLayout}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold cursor-pointer"
                  >
                    Switch to {layoutMode === 'grid' ? 'List' : 'Grid'}
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
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
          <div className="space-y-6 animate-fade-in pb-8">
            {/* 1. Quick Stats Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4.5 border-slate-200/70 dark:border-slate-800 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  <File className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Vault Files</p>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
                    {files.filter(f => !f.is_deleted).length}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">Total active files</p>
                </div>
              </div>

              <div className="glass-card p-4.5 border-slate-200/70 dark:border-slate-800 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Storage Used</p>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
                    {Math.min(100, Math.round((usedStorage / (storageLimit || 1)) * 100))}%
                  </h4>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all" 
                      style={{ width: `${Math.min(100, Math.round((usedStorage / (storageLimit || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card p-4.5 border-slate-200/70 dark:border-slate-800 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Clipboard Notes</p>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">
                    {notes.filter(n => !n.is_deleted).length}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">Saved text clippings</p>
                </div>
              </div>

              <div className="glass-card p-4.5 border-slate-200/70 dark:border-slate-800 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Security Tier</p>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white mt-0.5 flex items-center gap-1.5">
                    Active <Check className="w-4 h-4 text-emerald-500" />
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">AES-256 Enabled</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left: Profile Information */}
              <div className="glass-card p-6 flex flex-col gap-5 border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <User className="w-4.5 h-4.5 text-brand-primary" /> Profile Information
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Manage your personal identification details</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-primary/10 text-brand-primary uppercase tracking-wider">
                    Student Vault
                  </span>
                </div>
                
                {/* Profile Hero Avatar Box */}
                <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl border-2 border-brand-primary/40 bg-gradient-to-tr from-brand-primary/20 to-sky-400/20 flex items-center justify-center font-display font-bold text-brand-primary text-2xl uppercase overflow-hidden shadow-inner">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        (fullName ? fullName.substring(0, 2) : user?.email?.substring(0, 2) || 'U')
                      )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl w-7 h-7 flex items-center justify-center shadow-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                      type="button"
                      title="Upload avatar photo"
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
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                      {fullName || 'Student User'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {user?.email}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Member since: {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-4 pt-1">
                  <div>
                    <label className="label-title flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-brand-primary" /> Full Display Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full display name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-title flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-brand-primary" /> College / Institution
                    </label>
                    <input
                      type="text"
                      placeholder="E.g. XYZ Institute of Technology"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-title flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Registered Email (Linked Account)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={user?.email || ''}
                        disabled
                        className="input-field bg-slate-100/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 cursor-not-allowed pr-8"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Email address cannot be changed directly for security reasons.</span>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
                  >
                    <Check className="w-4 h-4" /> Save Profile Details
                  </button>
                </form>
              </div>

              {/* Right: Security & Storage Quota & Danger Zone */}
              <div className="flex flex-col gap-6">
                {/* Security (Change Password) */}
                <div className="glass-card p-6 flex flex-col gap-4 border-slate-200/70 dark:border-slate-800">
                  <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Lock className="w-4.5 h-4.5 text-brand-primary" /> Security & Password
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Update your account login password</p>
                  </div>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                      <label className="label-title">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="input-field pr-10"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label-title">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="input-field pr-10"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={passwordLoading} 
                      className="w-full btn-primary py-2.5 text-xs font-bold cursor-pointer"
                    >
                      {passwordLoading ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </form>
                </div>

                {/* Storage upgrade request */}
                <div className="glass-card p-6 flex flex-col gap-4 border-slate-200/70 dark:border-slate-800">
                  <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <UploadCloud className="w-4.5 h-4.5 text-brand-primary" /> Storage Quota & Upgrades
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Manage your personal cloud capacity</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Used:</span>
                      <strong className="font-bold text-slate-800 dark:text-white">
                        {formatBytes(usedStorage)} / <span className="text-brand-primary">{formatBytes(storageLimit)}</span>
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          (usedStorage / (storageLimit || 1)) > 0.85 ? 'bg-red-500' : 'bg-brand-primary'
                        }`} 
                        style={{ width: `${Math.min(100, Math.round((usedStorage / (storageLimit || 1)) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      Standard student vaults start with 100 MB. You can request high-capacity allocation for laboratory assignments, datasets, and archives.
                    </p>
                  </div>

                  {requestPending ? (
                    <div className="flex items-center gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-semibold">
                      <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                      <span>You have a pending upgrade request. An administrator will review it shortly.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleUpgradeRequest} className="space-y-4">
                      <div>
                        <label className="label-title">CHOOSE NEW STORAGE TARGET</label>
                        <select
                          value={requestedLimit}
                          onChange={(e) => setRequestedLimit(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none"
                        >
                          <option value="209715200">200 MB (+100 MB)</option>
                          <option value="314572800">300 MB (+200 MB)</option>
                          <option value="524288000">500 MB (+400 MB)</option>
                          <option value="1073741824">1 GB (Pro Student Tier)</option>
                        </select>
                      </div>
                      <button type="submit" className="w-full btn-primary py-2.5 text-xs font-bold cursor-pointer">
                        Request Storage Upgrade
                      </button>
                    </form>
                  )}
                </div>

                {/* Danger Zone */}
                <div className="glass-card p-6 border-red-500/25 bg-red-500/5 flex flex-col gap-3">
                  <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5" /> Danger Zone
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Deleting your account will permanently wipe all vault files, clipboard notes, and profile configurations. This cannot be undone.
                  </p>
                  <button
                    onClick={triggerWipeAccount}
                    className="w-full btn-danger py-2.5 text-xs font-bold mt-1 cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
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

      {/* 1.1 Explicit File Deletion Choice Modal (Move to Trash vs Permanently Delete) */}
      {fileDeleteModalData && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <Trash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {fileDeleteModalData.isBatch 
                      ? `Delete ${fileDeleteModalData.count} Selected Files` 
                      : 'Delete File'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                    {fileDeleteModalData.isBatch 
                      ? `${fileDeleteModalData.count} files chosen` 
                      : (fileDeleteModalData.file?.filename || 'Selected File')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFileDeleteModalData(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 my-4 leading-relaxed">
              Choose how you want to delete {fileDeleteModalData.isBatch ? 'these files' : 'this file'}:
            </p>

            <div className="space-y-3 mb-5">
              {/* Option 1: Move to Trash */}
              <button
                type="button"
                onClick={() => {
                  if (fileDeleteModalData.isBatch) {
                    executeBatchDelete(fileDeleteModalData.fileIds, 'trash');
                  } else {
                    executeFileDelete(fileDeleteModalData.file, 'trash');
                  }
                }}
                className="w-full text-left p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition-all flex items-start gap-3 group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                      Move to Trash
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                      Safe & Recoverable
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Files will be placed in the Trash tab. You can restore them anytime if you need them back.
                  </p>
                </div>
              </button>

              {/* Option 2: Permanently Delete */}
              <button
                type="button"
                onClick={() => {
                  if (fileDeleteModalData.isBatch) {
                    executeBatchDelete(fileDeleteModalData.fileIds, 'permanent');
                  } else {
                    executeFileDelete(fileDeleteModalData.file, 'permanent');
                  }
                }}
                className="w-full text-left p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/20 hover:bg-red-100/70 dark:hover:bg-red-950/40 transition-all flex items-start gap-3 group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                      Permanently Delete
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-200/60 dark:bg-red-900/60 text-red-700 dark:text-red-300">
                      Irreversible
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Completely removes the file from cloud storage and database. Frees up storage quota immediately.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-150 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFileDeleteModalData(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold cursor-pointer"
              >
                Cancel
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
                    Ensure the code works only once for single-use access.
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
              <div className="mt-2 font-mono text-[11px] bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg truncate flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span>{duplicateModalData.existingDup.filename} ({formatBytes(duplicateModalData.existingDup.size)})</span>
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
                  <span className="text-xs font-semibold">Vault Root (Uncategorized)</span>
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
                    <span className="text-xs font-semibold">{folder.name}</span>
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

      {/* Duplicate File Cleaner Modal (Task: Clean same-same files & keep 1 original file) */}
      {showDuplicateCleanerModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-2xl w-full p-6 shadow-2xl animate-scale-up flex flex-col gap-4 text-left border-slate-200 dark:border-slate-800 max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Duplicate Files Cleaner
                    {getDuplicateGroups().length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold border border-amber-500/30">
                        {getDuplicateGroups().reduce((acc, g) => acc + g.duplicates.length, 0)} Redundant Copies
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Safely remove duplicate copies while keeping 1 original file protected in your vault.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateCleanerModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {getDuplicateGroups().length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">Vault is Clean & Unique!</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  No duplicate files found in your vault. All files are unique and properly organized.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDuplicateCleanerModal(false)}
                  className="btn-primary py-2 px-5 text-xs font-bold mt-2 cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Summary Reclaim Bar */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>
                        Found {getDuplicateGroups().length} duplicate set(s) ({getDuplicateGroups().reduce((acc, g) => acc + g.duplicates.length, 0)} redundant copies)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Cleaning will reclaim <strong className="text-brand-primary">{formatBytes(getDuplicateGroups().reduce((acc, g) => acc + g.reclaimableBytes, 0))}</strong> of storage space.
                    </p>
                  </div>

                  {/* Clean all button */}
                  <button
                    type="button"
                    onClick={() => handleCleanDuplicates(null, duplicateDeleteMode === 'permanent')}
                    disabled={cleaningDuplicates}
                    className="btn-primary py-2.5 px-4 text-xs font-bold shrink-0 flex items-center gap-2 shadow-md shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {cleaningDuplicates ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash className="w-3.5 h-3.5" />
                    )}
                    <span>Clean All Duplicates (Keep 1 Original)</span>
                  </button>
                </div>

                {/* Deletion Mode selector */}
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-slate-500 font-semibold">Delete Target:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                      <input
                        type="radio"
                        name="dupMode"
                        checked={duplicateDeleteMode === 'trash'}
                        onChange={() => setDuplicateDeleteMode('trash')}
                        className="accent-brand-primary cursor-pointer"
                      />
                      <span>Move to Trash (Restore anytime)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                      <input
                        type="radio"
                        name="dupMode"
                        checked={duplicateDeleteMode === 'permanent'}
                        onChange={() => setDuplicateDeleteMode('permanent')}
                        className="accent-red-500 cursor-pointer"
                      />
                      <span className="text-red-500 font-semibold">Delete Permanently</span>
                    </label>
                  </div>
                </div>

                {/* Duplicate Groups List */}
                <div className="flex flex-col gap-4 overflow-y-auto max-h-[50vh] custom-scrollbar pr-1">
                  {getDuplicateGroups().map((group, gIdx) => (
                    <div
                      key={group.id || gIdx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col gap-3 shadow-xs"
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-brand-primary shrink-0" />
                          <span className="text-xs font-bold text-slate-800 dark:text-white truncate" title={group.filename}>
                            {group.filename}
                          </span>
                          <span className="text-[10px] text-slate-400">({formatBytes(group.original.size)})</span>
                        </div>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                          {group.duplicates.length} duplicate copy(ies)
                        </span>
                      </div>

                      {/* Original file row */}
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">Original File</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-extrabold uppercase">
                                Kept Safe
                              </span>
                            </div>
                            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 truncate mt-0.5">
                              Uploaded {new Date(group.original.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} • Location: {folders.find(f => f.id === group.original.folder_id)?.name || 'Vault Root'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          Will NOT be touched
                        </span>
                      </div>

                      {/* Redundant copies rows */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Redundant Copies:
                        </span>
                        {group.duplicates.map((dup, dIdx) => (
                          <div
                            key={dup.id || dIdx}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                  Duplicate Copy #{dIdx + 1} ({formatBytes(dup.size)})
                                </span>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                  Uploaded {new Date(dup.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} • Location: {folders.find(f => f.id === dup.folder_id)?.name || 'Vault Root'}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCleanDuplicates([dup.id], duplicateDeleteMode === 'permanent')}
                              disabled={cleaningDuplicates}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/40 shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Delete only this duplicate copy"
                            >
                              <Trash className="w-3 h-3" />
                              <span>Delete Copy</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Original files are permanently protected. Only redundant copies are removed.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDuplicateCleanerModal(false)}
                    className="btn-secondary py-2 px-4 text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View Note / Clipboard Snippet Modal (Task: Clipboard paste me view ka option) */}
      {viewingNote && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-2xl w-full p-6 shadow-2xl animate-scale-up flex flex-col gap-4 text-left border-slate-200 dark:border-slate-800 max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white truncate" title={viewingNote.title}>
                      {viewingNote.title}
                    </h3>
                    {viewingNote.is_encrypted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-full flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3" /> Encrypted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Saved {new Date(viewingNote.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content or Decrypt Form */}
            {viewingNote.is_encrypted && !decryptedNotesMap[viewingNote.id] ? (
              <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex flex-col gap-4 text-center items-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Encrypted Clipboard Note</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Enter your decryption passphrase to unlock and view the full text content.
                  </p>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const pass = e.target.elements.passphrase.value;
                    if (!pass) return;
                    try {
                      const plain = await decryptText(viewingNote.content, pass);
                      setDecryptedNotesMap(prev => ({ ...prev, [viewingNote.id]: plain }));
                      showToast('Snippet decrypted successfully!', 'success');
                    } catch (err) {
                      showToast('Incorrect passphrase. Could not decrypt.', 'danger');
                    }
                  }}
                  className="flex gap-2 w-full max-w-sm"
                >
                  <input
                    name="passphrase"
                    type="password"
                    placeholder="Enter passphrase..."
                    className="input-field flex-1 py-2 text-xs"
                    autoFocus
                    required
                  />
                  <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold cursor-pointer">
                    Unlock
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-3 min-h-0 flex-1">
                {/* Stats chips */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex gap-3">
                    <span>{((decryptedNotesMap[viewingNote.id] || viewingNote.content) || '').length} characters</span>
                    <span>•</span>
                    <span>{(((decryptedNotesMap[viewingNote.id] || viewingNote.content) || '').trim().split(/\s+/).filter(Boolean).length)} words</span>
                    <span>•</span>
                    <span>{(((decryptedNotesMap[viewingNote.id] || viewingNote.content) || '').split('\n').length)} lines</span>
                  </div>
                  <span className="font-mono text-slate-500">UTF-8 Text</span>
                </div>

                {/* Preformatted text box */}
                <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                  <pre className="p-4 overflow-auto max-h-[45vh] font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all custom-scrollbar select-text leading-relaxed">
                    {decryptedNotesMap[viewingNote.id] || viewingNote.content}
                  </pre>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {(!viewingNote.is_encrypted || decryptedNotesMap[viewingNote.id]) && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const text = decryptedNotesMap[viewingNote.id] || viewingNote.content;
                        navigator.clipboard.writeText(text);
                        setViewNoteCopied(true);
                        showToast('Copied to system clipboard!', 'success');
                        setTimeout(() => setViewNoteCopied(false), 2000);
                      }}
                      className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewNoteCopied
                          ? 'bg-emerald-500 text-white'
                          : 'btn-primary'
                      }`}
                    >
                      {viewNoteCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {viewNoteCopied ? 'Copied!' : 'Copy Text'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const text = decryptedNotesMap[viewingNote.id] || viewingNote.content;
                        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${(viewingNote.title || 'clipboard_note').replace(/[^a-z0-9_-]/gi, '_')}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast('Downloaded text file.', 'success');
                      }}
                      className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      title="Download as .txt file"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Download (.txt)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingNote;
                        setViewingNote(null);
                        handleShareNote(target);
                      }}
                      className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      title="Share via 6-digit code"
                    >
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Share</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingNote;
                    setViewingNote(null);
                    handleEditNote(target);
                  }}
                  className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingNote(null)}
                  className="btn-secondary py-2 px-4 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
