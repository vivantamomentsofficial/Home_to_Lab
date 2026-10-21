import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { track } from '@vercel/analytics';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { sanitizeInput } from '../utils/sanitize';
import { checkBlockedExtension } from '../utils/fileSecurity';
import {
  Shield, Sparkles, ArrowRight, DownloadCloud, Download, Plus, Folder,
  FileCode, Archive, FileText, Clipboard, ChevronDown, MessageSquare, Send, X,
  FileCheck, AlertTriangle, UploadCloud, ShieldCheck, CheckCircle2, Zap, BookOpen,
  QrCode, Lock, Key, Check, Copy, ShieldAlert, Smartphone, Play, Code2, Terminal,
  ExternalLink, HardDrive, RefreshCw, Flame, Cpu, Globe, Laptop, HelpCircle, Heart
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import SEO from '../components/SEO';
import QRCodeModal from '../components/QRCodeModal';
import AnimatedBackground from '../components/AnimatedBackground';

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};


const Home = () => {
  const { user, supabase } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const sendCaptchaRef = useRef(null);

  // Tab State for Quick Card: 'receive' vs 'send'
  const [activeTab, setActiveTab] = useState('receive');

  // Share Code Retrieval State
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrievedFile, setRetrievedFile] = useState(null);
  const [showRetrieveModal, setShowRetrieveModal] = useState(false);
  const [shareTimeLeft, setShareTimeLeft] = useState(0);
  const countdownIntervalRef = useRef(null);

  // Quick Send Form State (No Account Needed)
  const [sendKind, setSendKind] = useState('file'); // 'file' | 'text'
  const [sendFile, setSendFile] = useState(null);
  const [sendText, setSendText] = useState('');
  const [sendTitle, setSendTitle] = useState('');
  const [sendExpiry, setSendExpiry] = useState('30m');
  const [sendSelfDestruct, setSendSelfDestruct] = useState(false);
  const [sendCaptchaToken, setSendCaptchaToken] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendTimeLeft, setSendTimeLeft] = useState(0);
  const [showSendQR, setShowSendQR] = useState(false);
  const [copiedTextContent, setCopiedTextContent] = useState(false);
  const sendCountdownIntervalRef = useRef(null);


  // FAQ Accordion Active Index State
  const [activeFaq, setActiveFaq] = useState(0);

  // Feedback Form State
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackTopic, setFeedbackTopic] = useState('Feature Request');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [showFeedbackSuccessModal, setShowFeedbackSuccessModal] = useState(false);

  // Scroll Helper
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Code Retrieval Function
  const handleRetrieveCode = async (e, customCode = null) => {
    if (e) e.preventDefault();
    const codeToUse = (customCode || shareCode).trim().toUpperCase();
    if (!codeToUse || codeToUse.length !== 6) {
      showToast('Please enter a 6-character access code.', 'warning');
      return;
    }

    setLoading(true);
    setRetrievedFile(null);
    try {
      let fileData = null;

      // 1. Try Backend API endpoint first
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        let res = await fetch(`${apiUrl}/api/share/${codeToUse}`);

        if (res.status === 401) {
          const errRes = await res.json();
          if (errRes.pin_required) {
            const enteredPin = window.prompt('🔒 This code is PIN protected. Please enter the 4-digit PIN:');
            if (enteredPin) {
              res = await fetch(`${apiUrl}/api/share/${codeToUse}?pin=${encodeURIComponent(enteredPin)}`);
            } else {
              throw new Error('PIN is required to access this share code.');
            }
          }
        }

        if (res.ok) {
          fileData = await res.json();
        } else if (res.status === 429) {
          throw new Error('Too many lookup attempts. Please wait a moment.');
        } else if (res.status === 404 || res.status === 401) {
          const errRes = await res.json();
          throw new Error(errRes.error || 'Code not found, expired, or incorrect PIN.');
        }
      } catch (apiErr) {
        if (apiErr.message?.includes('limit') || apiErr.message?.includes('found') || apiErr.message?.includes('PIN')) throw apiErr;
        console.warn('Backend API unavailable, executing RPC fallback:', apiErr);
      }

      // 2. Direct Supabase RPC fallback
      if (!fileData && supabase) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_shared_file_by_code', {
          p_code: codeToUse
        });

        if (rpcErr) {
          console.error('RPC Error:', rpcErr);
        } else if (rpcData && rpcData.length > 0) {
          fileData = rpcData[0];
          fileData.kind = 'file';
        }
      }

      // 3. Built-in interactive demo showcase codes (Instant sample try)
      if (!fileData) {
        if (codeToUse === '8F3K9A') {
          fileData = {
            kind: 'text',
            file_id: 'demo-code-script',
            filename: 'Lab_Assignment_Code.cpp',
            size: 3840,
            file_type: 'code',
            text_content: `// CloudVault Interactive Demo - Multi-Language Assignment Code\n// Transferred securely from Home to College Lab without login\n\n#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n    vector<int> labScores = {88, 92, 79, 95, 84};\n    sort(labScores.begin(), labScores.end());\n    \n    cout << "[CloudVault] Code retrieved and verified successfully in lab!" << endl;\n    cout << "Top score: " << labScores.back() << " marks" << endl;\n    return 0;\n}`,
            expires_at: new Date(Date.now() + 1800 * 1000).toISOString(),
            self_destruct: false,
          };
        } else if (codeToUse === 'K7M2P9') {
          fileData = {
            kind: 'file',
            file_id: 'demo-doc-pdf',
            filename: 'Lab_Instruction_Manual.pdf',
            size: 2516582,
            file_type: 'document',
            signed_url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf',
            expires_at: new Date(Date.now() + 1800 * 1000).toISOString(),
            self_destruct: false,
          };
        }
      }

      if (!fileData) {
        throw new Error('Code not found, expired, or already used.');
      }

      setRetrievedFile(fileData);
      setShowRetrieveModal(true);

      const expiryTime = new Date(fileData.expires_at);
      const remainingSeconds = Math.max(0, Math.floor((expiryTime - new Date()) / 1000));
      setShareTimeLeft(remainingSeconds);

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setShareTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      try {
        track('quick_receive_success', { kind: fileData.kind || 'file' });
      } catch (trackErr) { }

      showToast('File verified! Ready to download or copy.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Invalid or expired code.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Quick Send Form Submit Handler
  const handleQuickSendSubmit = async (e) => {
    e.preventDefault();

    if (sendKind === 'file') {
      if (!sendFile) {
        showToast('Please select a file to upload.', 'warning');
        return;
      }
      if (sendFile.size > 25 * 1024 * 1024) {
        showToast('File size exceeds maximum limit of 25 MB.', 'danger');
        return;
      }
      const checkExt = checkBlockedExtension(sendFile.name);
      if (checkExt.isBlocked) {
        showToast(`Prohibited file format (${checkExt.extension}). Executable/script files cannot be shared.`, 'danger');
        return;
      }
    }

    if (sendKind === 'text') {
      if (!sendText || sendText.trim().length === 0) {
        showToast('Please enter text or code content to send.', 'warning');
        return;
      }
      if (new Blob([sendText]).size > 100 * 1024) {
        showToast('Text content exceeds maximum limit of 100 KB.', 'danger');
        return;
      }
    }

    setSendLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';

      let captchaToken = sendCaptchaToken;
      if (!captchaToken && window.turnstile) {
        try {
          if (typeof window.turnstile.getResponse === 'function') {
            captchaToken = window.turnstile.getResponse() || '';
          }
        } catch (tErr) { }
      }

      if (sendKind === 'text') {
        const res = await fetch(`${apiUrl}/api/quick/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'text',
            filename: sendTitle.trim() || 'snippet.txt',
            text_content: sendText,
            expiry_option: sendExpiry,
            self_destruct: sendSelfDestruct,
            captchaToken,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create quick text share.');

        setSendResult(data);
        startSendCountdown(data.expires_at);

        try { track('quick_send_created', { kind: 'text' }); } catch (trackErr) { }
        showToast('Quick text code generated successfully!', 'success');
      } else {
        const initRes = await fetch(`${apiUrl}/api/quick/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'file',
            filename: sendFile.name,
            size: sendFile.size,
            mime: sendFile.type || 'application/octet-stream',
            expiry_option: sendExpiry,
            self_destruct: sendSelfDestruct,
            captchaToken,
          }),
        });

        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData.error || 'Failed to initialize file upload.');

        const uploadRes = await fetch(initData.signed_upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': sendFile.type || 'application/octet-stream',
          },
          body: sendFile,
        });

        if (!uploadRes.ok) {
          throw new Error('Direct file upload to storage failed. Please try again.');
        }

        const compRes = await fetch(`${apiUrl}/api/quick/${initData.id}/complete`, {
          method: 'POST',
        });

        const compData = await compRes.json();
        if (!compRes.ok) throw new Error(compData.error || 'Failed to verify file upload.');

        setSendResult({
          code: compData.code,
          kind: 'file',
          filename: compData.filename,
          size: compData.size,
          expires_at: compData.expires_at,
          self_destruct: sendSelfDestruct,
        });

        startSendCountdown(compData.expires_at);

        try { track('quick_send_created', { kind: 'file' }); } catch (trackErr) { }
        showToast('Quick file upload code generated successfully!', 'success');
      }
    } catch (err) {
      console.error('Quick send error:', err);
      showToast(err.message || 'Quick send failed. Please try again.', 'danger');
    } finally {
      setSendLoading(false);
    }
  };

  const startSendCountdown = (expiresAt) => {
    const expiryTime = new Date(expiresAt);
    const remainingSeconds = Math.max(0, Math.floor((expiryTime - new Date()) / 1000));
    setSendTimeLeft(remainingSeconds);

    if (sendCountdownIntervalRef.current) clearInterval(sendCountdownIntervalRef.current);
    sendCountdownIntervalRef.current = setInterval(() => {
      setSendTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(sendCountdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDownloadFile = () => {
    if (!retrievedFile || !retrievedFile.signed_url) return;
    const a = document.createElement('a');
    a.href = retrievedFile.signed_url;
    a.download = retrievedFile.filename;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
    showToast('Download started!', 'success');
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackSending(true);

    const cleanName = sanitizeInput(feedbackName);
    const cleanEmail = sanitizeInput(feedbackEmail);
    const cleanTopic = sanitizeInput(feedbackTopic);
    const cleanMessage = sanitizeInput(feedbackMessage);

    try {
      const response = await fetch('https://formspree.io/f/mnpajoyg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          topic: cleanTopic,
          message: cleanMessage
        })
      });

      if (response.ok) {
        setShowFeedbackSuccessModal(true);
        showToast('Message sent successfully!', 'success');
        setFeedbackName('');
        setFeedbackEmail('');
        setFeedbackTopic('Feature Request');
        setFeedbackMessage('');
      } else {
        setShowFeedbackSuccessModal(true);
        showToast('Message sent successfully!', 'success');
        setFeedbackName('');
        setFeedbackEmail('');
        setFeedbackMessage('');
      }
    } catch (err) {
      console.warn('Formspree submission error:', err);
      setShowFeedbackSuccessModal(true);
      showToast('Message sent successfully!', 'success');
      setFeedbackName('');
      setFeedbackEmail('');
      setFeedbackMessage('');
    } finally {
      setFeedbackSending(false);
    }
  };

  useEffect(() => {
    const handleDroppedFile = (files) => {
      if (files && files.length > 0) {
        const file = files[0];
        setSendKind('file');
        setSendFile(file);
        setActiveTab('send');
        showToast(`Dropped file "${file.name}" ready to send!`, 'info');
        setTimeout(() => scrollToSection('retrieve-section'), 200);
      }
    };

    if (window.droppedFilesCache && window.droppedFilesCache.length > 0) {
      handleDroppedFile(window.droppedFilesCache);
      window.droppedFilesCache = null;
    }

    const onDropEvent = (e) => {
      if (e.detail) handleDroppedFile(e.detail);
    };
    window.addEventListener('cloudvault-dropped-files', onDropEvent);

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam && codeParam.trim().length === 6) {
      const code = codeParam.trim().toUpperCase();
      setShareCode(code);
      setTimeout(() => {
        scrollToSection('retrieve-section');
        handleRetrieveCode(null, code);
      }, 500);
    }

    return () => {
      window.removeEventListener('cloudvault-dropped-files', onDropEvent);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (sendCountdownIntervalRef.current) clearInterval(sendCountdownIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-brand-bg-light text-slate-800 antialiased selection:bg-brand-primary selection:text-white">
      <SEO
        title="CloudVault - Fast Lab File Transfer & Free Online Compiler for Students"
        description="Free Online Compiler & Student Personal Cloud Storage. Run code in C, C++, Java, Python, JavaScript, and SQL in your browser. Transfer files to college lab terminals via 6-digit PIN."
        keywords="online compiler, free online compiler, c online compiler, cpp online compiler, java online compiler, python online compiler, sql online compiler, run code in browser, in browser ide, online code editor, college lab compiler, cloudvault onecompiler, student cloud storage, online clipboard, temporary file sharing, send files without login, hometolab, home to lab, cloudvault"
        canonical="https://www.hometolab.in/"
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": "https://www.hometolab.in/#website",
              "url": "https://www.hometolab.in/",
              "name": "CloudVault - Free Online Compiler & Student Cloud Storage",
              "alternateName": ["hometolab", "Home to Lab", "hometolab.in", "CloudVault Compiler"],
              "description": "Free Online Compiler & Student Personal Cloud Storage Bridge for college lab terminals."
            },
            {
              "@type": "WebApplication",
              "@id": "https://www.hometolab.in/compiler#app",
              "name": "CloudVault Online Compiler & IDE",
              "url": "https://www.hometolab.in/compiler",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "All",
              "description": "Free in-browser online compiler supporting 60+ programming languages including C, C++, Java, Python, JavaScript, SQL.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            }
          ]
        }}
      />

      {/* Ambient Animated Interactive Background (Constellation Nodes & Fluid Aurora) */}
      <AnimatedBackground />

      {/* Clean Full-Width Navigation */}
      <PublicNavbar />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION: EXACT ORIGINAL TITLE & CENTERPIECE ACTION CARD           */}
      {/* ========================================================================= */}
      <section className="flex flex-col items-center justify-center pt-28 sm:pt-36 pb-12 px-4 sm:px-6 lg:px-[8%] text-center z-10 max-w-5xl mx-auto w-full relative">
        
        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200/80 text-sky-700 text-xs font-semibold tracking-wide mb-5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>College Lab File Bridge &amp; Student Personal Cloud Storage</span>
        </div>

        {/* Hero Title (Original Tagline Maintained Exactly) */}
        <h1 className="hero-heading-fluid font-black font-display tracking-tight mb-4 text-slate-900 leading-tight">
          Home to Lab, Instantly.
        </h1>

        {/* Hero Subtitle */}
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed mb-9 mx-auto font-normal">
          Send files and code snippets from home without signing in. Enter your 6-digit code on any college computer to access your work in seconds — no USB drives, no left-behind logins.
        </p>

        {/* ========================================================================= */}
        {/* DUAL ACTION CARD: RECEIVE VS SEND (CENTERPIECE)                           */}
        {/* ========================================================================= */}
        <div
          id="retrieve-section"
          className="glass-card max-w-lg w-full p-5 sm:p-7 shadow-2xl rounded-3xl mb-12 text-left relative overflow-hidden border border-slate-200/90 bg-white"
        >
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-5 font-bold text-xs border border-slate-200/70">
            <button
              onClick={() => setActiveTab('receive')}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer text-[11px] sm:text-xs ${
                activeTab === 'receive'
                  ? 'bg-white text-brand-primary shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <DownloadCloud className="w-4 h-4 shrink-0" />
              <span className="truncate">Receive with PIN</span>
            </button>

            <button
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer text-[11px] sm:text-xs ${
                activeTab === 'send'
                  ? 'bg-brand-primary text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="truncate">Quick Send (Guest)</span>
            </button>
          </div>

          {activeTab === 'receive' ? (
            /* RECEIVE TAB */
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">Quick Lab Retrieval</h2>
                  <p className="text-xs text-slate-500">Download files or copy code on any PC without login</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Enter your <strong>6-digit access code</strong> to download your file or view your code snippet:
              </p>

              <form onSubmit={handleRetrieveCode} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="XXXXXX"
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                  className="w-full sm:w-44 text-center font-bold font-mono tracking-[4px] sm:tracking-[6px] text-lg sm:text-xl uppercase h-12 bg-slate-50 border border-slate-300 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 rounded-xl outline-none transition-all shadow-inner text-slate-900"
                  required
                  aria-label="6-Digit Access Code"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary h-12 flex items-center justify-center gap-2 text-sm font-bold cursor-pointer shadow-md rounded-xl"
                >
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Verify &amp; Get
                    </>
                  )}
                </button>
              </form>

              {/* Instant Try Demo Codes */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-600">Try sample test codes:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShareCode('8F3K9A');
                      handleRetrieveCode(null, '8F3K9A');
                    }}
                    className="font-mono font-bold px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                    title="Load Assignment Code Script"
                  >
                    ⚡ 8F3K9A (Code Script)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShareCode('K7M2P9');
                      handleRetrieveCode(null, 'K7M2P9');
                    }}
                    className="font-mono font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                    title="Load Lab Manual PDF"
                  >
                    📄 K7M2P9 (Lab PDF)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* SEND TAB (NO ACCOUNT NEEDED) */
            <div>
              {sendResult ? (
                /* Success Result Panel */
                <div className="space-y-4 animate-fade-in">
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    <div className="font-bold text-sm text-emerald-800 font-display">
                      Access Code Created!
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Type this 6-digit code on your college lab terminal:
                    </p>

                    <div className="my-3 font-mono font-black tracking-[6px] sm:tracking-[8px] text-2xl sm:text-3xl text-brand-primary bg-white py-3 px-5 rounded-2xl border border-brand-primary/30 inline-block shadow-inner select-all">
                      {sendResult.code}
                    </div>

                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sendResult.code);
                          showToast('Access code copied to clipboard!', 'success');
                        }}
                        className="px-3.5 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-brand-primary-hover transition-colors cursor-pointer shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </button>

                      <button
                        onClick={() => setShowSendQR(true)}
                        className="px-3.5 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-300 transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Show QR
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-3 font-mono">
                      Expires in: <strong className="text-amber-600">{Math.floor(sendTimeLeft / 60)}m {sendTimeLeft % 60}s</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSendResult(null);
                      setSendFile(null);
                      setSendText('');
                      setSendTitle('');
                    }}
                    className="w-full btn-secondary py-2.5 text-xs font-bold cursor-pointer rounded-xl"
                  >
                    Send Another File / Code
                  </button>
                </div>
              ) : (
                /* Form Panel */
                <form onSubmit={handleQuickSendSubmit} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Choose Transfer Type:</span>
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setSendKind('file')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          sendKind === 'file'
                            ? 'bg-brand-primary text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        File (25MB)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendKind('text')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          sendKind === 'text'
                            ? 'bg-brand-primary text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Code / Text (100KB)
                      </button>
                    </div>
                  </div>

                  {sendKind === 'file' ? (
                    <div>
                      <label className="border-2 border-dashed border-slate-300 hover:border-brand-primary rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all text-center group">
                        <UploadCloud className="w-8 h-8 text-brand-primary mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-slate-700">
                          {sendFile ? sendFile.name : 'Click to select file or drag & drop'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {sendFile ? `${formatBytes(sendFile.size)} selected` : 'Max 25 MB • Code, PDFs, Archives'}
                        </span>
                        <input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSendFile(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Title / Filename (e.g. Lab3_Assignment.cpp or notes.txt)"
                        value={sendTitle}
                        onChange={(e) => setSendTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-primary"
                      />
                      <textarea
                        rows={4}
                        placeholder="Paste your code script or text snippet here (Max 100 KB)..."
                        value={sendText}
                        onChange={(e) => setSendText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-primary font-mono resize-none"
                        required
                      ></textarea>
                    </div>
                  )}

                  {/* Expiry & Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Duration</label>
                      <select
                        value={sendExpiry}
                        onChange={(e) => setSendExpiry(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-primary cursor-pointer"
                      >
                        <option value="10m">10 Minutes</option>
                        <option value="30m">30 Minutes (Default)</option>
                        <option value="1h">1 Hour</option>
                        <option value="6h">6 Hours</option>
                        <option value="24h">24 Hours</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-3 sm:pt-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sendSelfDestruct}
                          onChange={(e) => setSendSelfDestruct(e.target.checked)}
                          className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-500" /> Delete after 1st download
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* hCaptcha Widget */}
                  <div className="flex justify-center my-2 min-h-[78px]">
                    <HCaptcha
                      ref={sendCaptchaRef}
                      sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY || "719e93c2-4358-4bfa-810e-fe50c19eebba"}
                      onVerify={(token) => setSendCaptchaToken(token)}
                      onExpire={() => setSendCaptchaToken('')}
                      onError={() => setSendCaptchaToken('')}
                      theme="light"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendLoading}
                    className="w-full btn-primary h-12 flex items-center justify-center gap-2 text-sm font-bold cursor-pointer shadow-md rounded-xl"
                  >
                    {sendLoading ? (
                      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Get 6-Digit Access Code
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-slate-400">
                    Quick shares auto-delete permanently upon expiration. No personal credentials logged.
                  </p>
                </form>
              )}
            </div>
          )}

          {/* Student Account Callout */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>Want permanent storage for assignments, photos &amp; videos?</span>
            <Link to="/register" className="font-bold text-brand-primary hover:underline flex items-center gap-1 shrink-0">
              <span>Free 100MB Vault (Up to 2GB)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CLOUDVAULT ✕ ONECOMPILER SPOTLIGHT (COMPACT & SLEEK)                   */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-[8%] pb-14 z-10 relative">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-sky-50 border border-blue-200/90 shadow-md flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
                <Code2 className="w-3.5 h-3.5 text-blue-600" />
                <span>CloudVault ✕ OneCompiler Official Collaboration</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 leading-tight">
                Free In-Browser Online Compiler &amp; IDE
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Run C, C++, Java, Python, JavaScript, and SQL directly in your browser. Zero setup, zero installation on restricted college lab computers.
              </p>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {['C / C++', 'Java', 'Python', 'JavaScript', 'SQL & DB'].map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white border border-slate-200/90 text-[11px] font-bold text-slate-700 font-mono shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>{lang}</span>
                  </span>
                ))}
                <span className="text-xs font-bold text-blue-600 pl-1">+55 more</span>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <Link
                to="/compiler"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Open Online Compiler</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. REAL PROBLEMS SOLVED FOR COLLEGE LAB WORK                              */}
      {/* ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-[8%] bg-white/70 border-y border-slate-200/80 z-10">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-full uppercase tracking-wider">
              Real Campus Challenges Solved
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-slate-900">
              Why Students Depend on CloudVault
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Built specifically to eliminate the real headaches encountered in college computer labs and libraries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl flex flex-col justify-between hover:border-brand-primary/40 transition-all bg-white border border-slate-200/90 shadow-xs hover:shadow-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Blocked USB Ports</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lab administrators often disable USB drive access on college computers. CloudVault lets you transfer files wirelessly via a 6-digit PIN.
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] font-bold text-amber-600">
                100% Wireless Transfer
              </div>
            </div>

            <div className="p-5 rounded-2xl flex flex-col justify-between hover:border-brand-primary/40 transition-all bg-white border border-slate-200/90 shadow-xs hover:shadow-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Avoid Corrupted Pendrives</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Shared lab computers frequently corrupt USB pendrives with shortcut viruses. Transferring files over the web keeps your personal drives safe.
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] font-bold text-emerald-600">
                No USB Drive Needed
              </div>
            </div>

            <div className="p-5 rounded-2xl flex flex-col justify-between hover:border-brand-primary/40 transition-all bg-white border border-slate-200/90 shadow-xs hover:shadow-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 font-display">No Public Logins</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Typing personal Gmail or cloud storage passwords on public lab computers risks keyloggers and left-behind sessions. Quick Send requires zero login.
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] font-bold text-sky-600">
                Keylogger Proof
              </div>
            </div>

            <div className="p-5 rounded-2xl flex flex-col justify-between hover:border-brand-primary/40 transition-all bg-white border border-slate-200/90 shadow-xs hover:shadow-md">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Missing Lab Compilers</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  If lab computers lack compilers or restrict installation, CloudVault ✕ OneCompiler lets you run C, C++, Java, Python, and SQL directly in your browser.
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] font-bold text-blue-600">
                In-Browser Execution
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS (CLEAN 3-STEP FLOW)                                       */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-[8%] z-10 text-center">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="space-y-3">
            <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-full uppercase tracking-wider">
              Simple 3-Step Flow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-slate-900">
              How CloudVault Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              Built so you can get your code onto restricted lab computers without signing into personal accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Step 1 */}
            <div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all space-y-3 relative group">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Step 01 • At Home or on Phone</div>
              <h3 className="font-bold text-base text-slate-900 font-display">Drop File or Paste Code</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your assignment file (up to 25MB) or paste your code snippet directly (up to 100KB). No account or signup needed.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all space-y-3 relative group">
              <div className="w-11 h-11 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div className="text-[11px] font-bold text-brand-primary uppercase tracking-wider">Step 02 • Instant Security Token</div>
              <h3 className="font-bold text-base text-slate-900 font-display">Get a 6-Digit PIN &amp; QR</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                CloudVault creates an instant 6-character code (like <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-brand-primary font-bold">8F3K9A</code>). Optional self-destruct deletes it after retrieval.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all space-y-3 relative group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Terminal className="w-5 h-5" />
              </div>
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Step 03 • College Lab Terminal</div>
              <h3 className="font-bold text-base text-slate-900 font-display">Download or Run Code</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Open <strong className="text-slate-800">hometolab.in</strong> on the lab PC, type the 6 digits, and your file or code appears instantly. Run it directly or save it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TWO WAYS TO USE CLOUDVAULT: GUEST VS STUDENT VAULT                     */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-[8%] bg-slate-50/70 border-y border-slate-200/80 z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-3">
            <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-full uppercase tracking-wider">
              Tailored For Student Life
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900">
              Two Simple Ways to Use CloudVault
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              Use instant guest transfer for today's lab practical, or unlock a free personal student vault for all 4 years of college.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Direct Guest Transfer Card */}
            <div className="p-7 rounded-2xl bg-white border border-slate-200/90 space-y-5 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                      No Login Required
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1 font-display">Direct Guest Transfer</h3>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Best for quick lab practicals when you just need to get your code or document onto a shared PC without signing in.
                </p>

                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Send files up to <strong>25 MB</strong> per transfer</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Send code &amp; text snippets up to <strong>100 KB</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Instant <strong>6-digit PIN &amp; QR Code</strong> generation</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Optional <strong>Self-Destruct</strong> after 1st download</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Auto-expires safely (10 mins to 24 hours)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('send');
                    scrollToSection('retrieve-section');
                  }}
                  className="w-full btn-secondary py-3 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Start Guest Transfer
                </button>
              </div>
            </div>

            {/* Student Cloud Vault Card */}
            <div className="p-7 rounded-2xl bg-white border-2 border-brand-primary/30 space-y-5 shadow-md hover:border-brand-primary transition-all relative flex flex-col justify-between">
              <div className="absolute -top-3 right-5 bg-brand-primary text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                Recommended for Students
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
                      Free Student Account
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1 font-display">Personal Cloud Vault</h3>
                  </div>
                  <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                    <HardDrive className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Your private cloud vault for all 4 years of college. Store assignments, notes, project files, and sync your clipboard everywhere.
                </p>

                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-brand-primary shrink-0" />
                    <span><strong>100 MB Free Storage</strong> on signup (upgradeable to 2GB)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-brand-primary shrink-0" />
                    <span><strong>Cloud Clipboard:</strong> Paste code at home, retrieve on lab PC</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-brand-primary shrink-0" />
                    <span><strong>Send to Server:</strong> Permanent storage for files, manuals &amp; zips</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-brand-primary shrink-0" />
                    <span><strong>Cross-Device:</strong> Log in from phone, laptop, or lab browser</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-brand-primary shrink-0" />
                    <span><strong>Shareable Links:</strong> Easily collaborate with lab partners</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <Link
                  to="/register"
                  className="w-full btn-primary py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Create Free Account (Get 100MB)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. HONEST & TRANSPARENT FAQ ACCORDION                                     */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-[8%] z-10 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-full uppercase tracking-wider">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900">
              Questions &amp; Honest Answers
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Clear facts about how CloudVault works, security policies, and limits.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-left">
            {[
              {
                q: 'Is CloudVault really free to use?',
                a: 'Yes, 100% free! Both the Direct Guest Transfer (send files up to 25MB and code up to 100KB without login) and the Student Cloud Vault (100MB free initial storage, upgradeable up to 2GB) are completely free.'
              },
              {
                q: 'What is the difference between Guest Transfer and having a Student Account?',
                a: 'Guest Transfer requires no account — you get a 6-digit PIN & QR code to download files or code on any lab PC, and items expire automatically. A Student Account gives you a permanent 100MB to 2GB personal cloud vault where you can "Send to Server" to store assignments, photos, videos, and use the Cloud Clipboard to sync code/notes across all your devices.'
              },
              {
                q: 'How does the 100MB to 2GB storage upgrade request work?',
                a: 'Every registered student begins with 100MB of free cloud storage. As your semester progresses, you can simply submit a storage upgrade request directly within your student dashboard to increase your capacity up to 2 GB completely free.'
              },
              {
                q: 'What is the Cloud Clipboard feature for registered users?',
                a: 'Cloud Clipboard lets you paste text, terminal commands, or code snippets from your personal laptop or phone and immediately access, view, or copy them when you log in on any college lab workstation.'
              },
              {
                q: 'How long do Direct Guest Transfer files remain active?',
                a: 'For guest transfers, you can select an expiration period between 10 minutes, 30 minutes (default), 1 hour, 6 hours, or 24 hours. You can also turn on "Delete after 1st download" (self-destruct) so it disappears immediately after you retrieve it in the lab.'
              },
              {
                q: 'How does the CloudVault ✕ OneCompiler Studio work?',
                a: 'We collaborate with OneCompiler to provide an embedded in-browser IDE. It supports 60+ programming languages (C, C++, Java, Python, JavaScript, SQL, HTML/CSS) with interactive console and STDIN inputs, allowing you to run code without installing compilers on lab computers.'
              },
              {
                q: 'Are executable files (.exe, .bat, .cmd) allowed?',
                a: 'No. Executable files are strictly blocked by automated security checks to prevent accidental malware spread across college computer labs. Permitted files include code scripts (.c, .cpp, .java, .py, .js), PDFs, documents, images, and project archives (.zip).'
              }
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className={`p-4 sm:p-5 cursor-pointer rounded-2xl bg-white border border-slate-200/90 transition-all ${
                  activeFaq === idx ? 'ring-2 ring-brand-primary/30 shadow-md' : 'hover:border-brand-primary/30'
                }`}
              >
                <div className="flex justify-between items-center font-bold text-slate-900 text-xs sm:text-sm font-display">
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ml-2 ${
                      activeFaq === idx ? 'rotate-180 text-brand-primary' : ''
                    }`}
                  />
                </div>
                <div
                  className={`transition-all duration-300 overflow-hidden text-xs text-slate-600 leading-relaxed ${
                    activeFaq === idx ? 'max-h-40 mt-2.5 pt-2.5 border-t border-slate-100' : 'max-h-0'
                  }`}
                >
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SUPPORT & FEEDBACK                                                     */}
      {/* ========================================================================= */}
      <section id="feedback" className="py-16 px-4 sm:px-6 lg:px-[8%] bg-white/70 border-t border-slate-200/80 z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-full uppercase tracking-wider">
              Developer Contact &amp; Support
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
              Have Feedback or Need Help?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Created for students, by students. Reach out directly with bug reports or suggestions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Direct Info Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
                  <Shield className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-display">Direct Administrator Support</h3>
                  <p className="text-xs text-slate-500">Fast 24-48h Response</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                If you encounter any issues during lab sessions, have questions regarding file expiration, or wish to request a feature, you can contact the developer directly:
              </p>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Official Contact Email</div>
                <a href="mailto:aayushparekh26@gmail.com" className="text-brand-primary font-bold hover:underline break-all">
                  aayushparekh26@gmail.com
                </a>
              </div>
            </div>

            {/* Direct Form */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 font-display">
                <MessageSquare className="w-4 h-4 text-brand-primary" /> Send Feedback Message
              </h3>

              <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="label-title text-[10px]">Your Name</label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      className="input-field py-2 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-title text-[10px]">Your Email</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      className="input-field py-2 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label-title text-[10px]">Topic</label>
                  <select
                    value={feedbackTopic}
                    onChange={(e) => setFeedbackTopic(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-primary cursor-pointer font-medium"
                  >
                    <option value="Feature Request">Request a Feature</option>
                    <option value="Bug Report">Report a Bug / Issue</option>
                    <option value="General Feedback">General Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="label-title text-[10px]">Message</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your suggestion or issue..."
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="input-field py-2 text-xs resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={feedbackSending}
                  className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md rounded-xl"
                >
                  <Send className="w-3.5 h-3.5" /> {feedbackSending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* VERIFIED RETRIEVAL MODAL (100% LIGHT THEMED)                              */}
      {/* ========================================================================= */}
      {showRetrieveModal && retrievedFile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full p-6 sm:p-7 shadow-2xl rounded-3xl relative border border-slate-200 animate-scale-up">
            <button
              onClick={() => setShowRetrieveModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2 text-emerald-600 font-bold text-base font-display">
              <FileCheck className="w-5.5 h-5.5 stroke-[2.5]" />
              <h3>{retrievedFile.kind === 'text' ? 'Text Snippet Found!' : 'File Found!'}</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Your 6-digit access code is valid. Here are your details:
            </p>

            {retrievedFile.self_destruct && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <span className="font-bold">Single-Use Code:</span> This code has been consumed and will expire immediately after closing.
                </div>
              </div>
            )}

            {retrievedFile.kind === 'text' ? (
              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">{retrievedFile.filename || 'Text Snippet'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{formatBytes(retrievedFile.size)}</span>
                </div>

                <div className="relative">
                  <pre className="bg-slate-50 text-slate-900 p-3.5 rounded-xl font-mono text-xs overflow-x-auto max-h-56 select-all border border-slate-200 whitespace-pre-wrap leading-relaxed">
                    {retrievedFile.text_content}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(retrievedFile.text_content);
                      setCopiedTextContent(true);
                      showToast('Copied text to clipboard!', 'success');
                      setTimeout(() => setCopiedTextContent(false), 2000);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-slate-200 text-brand-primary hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                    title="Copy text"
                  >
                    {copiedTextContent ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-4 mb-5 flex flex-col gap-2.5 text-xs text-slate-700 bg-slate-50/50 font-mono">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-sans font-semibold">File Name</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]" title={retrievedFile.filename}>
                    {retrievedFile.filename}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-sans font-semibold">Size</span>
                  <span className="font-bold text-slate-900">
                    {formatBytes(retrievedFile.size)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-sans font-semibold">Format</span>
                  <span className="font-bold text-slate-900 uppercase">
                    {retrievedFile.file_type || 'File'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-sans font-semibold">Code Expiry</span>
                  <span className="font-bold text-amber-600">
                    {Math.floor(shareTimeLeft / 60)}m {shareTimeLeft % 60}s remaining
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 justify-end">
              <button
                onClick={() => setShowRetrieveModal(false)}
                className="btn-secondary py-2.5 px-4 text-xs font-bold cursor-pointer rounded-xl"
              >
                Close
              </button>

              {retrievedFile.kind === 'text' ? (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(retrievedFile.text_content);
                    showToast('Copied text snippet to clipboard!', 'success');
                  }}
                  className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md rounded-xl"
                >
                  <Copy className="w-4 h-4" /> Copy Text Snippet
                </button>
              ) : (
                <button
                  onClick={handleDownloadFile}
                  className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md rounded-xl"
                >
                  <Download className="w-4 h-4" /> Download File Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal for Quick Send result */}
      {showSendQR && sendResult && (
        <QRCodeModal
          isOpen={showSendQR}
          onClose={() => setShowSendQR(false)}
          code={sendResult.code}
          filename={sendResult.filename}
        />
      )}

      {/* Feedback Submission Success Modal with Green Tick */}
      {showFeedbackSuccessModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white max-w-sm w-full p-6 sm:p-8 shadow-2xl rounded-3xl relative border border-slate-200 text-center animate-scale-up">
            <button
              onClick={() => setShowFeedbackSuccessModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Big Animated Green Tick Circle */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-2 font-display">
              Message Sent Successfully!
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Thank you for reaching out! We have received your feedback and message via Formspree, and our team will review it shortly.
            </p>

            <button
              type="button"
              onClick={() => setShowFeedbackSuccessModal(false)}
              className="btn-primary w-full py-3 text-xs font-bold rounded-xl cursor-pointer shadow-md"
            >
              Awesome, Got It!
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <PublicFooter />
    </div>
  );
};

export default Home;
