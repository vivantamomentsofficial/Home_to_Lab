import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { sanitizeInput } from '../utils/sanitize';
import {
  Shield, Sparkles, ArrowRight, DownloadCloud, Download, Plus, Folder, LogOut,
  FileCode, Archive, FileText, Clipboard, ChevronDown, MessageSquare, Send, X, FileCheck, Sun, Moon, Menu,
  AlertTriangle, UploadCloud, ShieldCheck, CheckCircle2, Zap, BookOpen, QrCode, Lock, Key,
  Check, Copy, ShieldAlert, Smartphone
} from 'lucide-react';
import PublicFooter from '../components/PublicFooter';

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
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Mobile Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Share Code Retrieval State
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrievedFile, setRetrievedFile] = useState(null);
  const [showRetrieveModal, setShowRetrieveModal] = useState(false);
  const [shareTimeLeft, setShareTimeLeft] = useState(0);
  const countdownIntervalRef = useRef(null);

  // FAQ Accordion Active Index State
  const [activeFaq, setActiveFaq] = useState(0);

  // Interactive App Mockup Tab State
  const [demoTab, setDemoTab] = useState('files');
  const [copiedDemoText, setCopiedDemoText] = useState(null);

  // Feedback Form State
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackTopic, setFeedbackTopic] = useState('Feature Request');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

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
        const res = await fetch(`${apiUrl}/api/share/${codeToUse}`);
        if (res.ok) {
          fileData = await res.json();
        } else if (res.status === 429) {
          throw new Error('Too many lookup attempts. Please wait a moment.');
        }
      } catch (apiErr) {
        if (apiErr.message?.includes('limit')) throw apiErr;
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
        }
      }

      if (!fileData) {
        throw new Error('Code not found, expired, or already used.');
      }

      setRetrievedFile(fileData);
      setShowRetrieveModal(true);
      
      // Calculate remaining expiration time
      const expiryTime = new Date(fileData.expires_at);
      const remainingSeconds = Math.max(0, Math.floor((expiryTime - new Date()) / 1000));
      setShareTimeLeft(remainingSeconds);

      // Start countdown timer
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

      showToast('Code verified successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Invalid or expired code.', 'danger');
    } finally {
      setLoading(false);
    }
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

    const mailtoUrl = `mailto:aayushparekh26@gmail.com?subject=${encodeURIComponent(`[${cleanTopic}] Feedback from ${cleanName}`)}&body=${encodeURIComponent(`Name: ${cleanName}\nEmail: ${cleanEmail}\nTopic: ${cleanTopic}\n\nMessage:\n${cleanMessage}`)}`;

    try {
      const serviceId = 'service_98oq29o';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_v0fdm9h';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

      const templateParams = {
        from_name: cleanName,
        from_email: cleanEmail,
        topic: cleanTopic,
        message: cleanMessage,
      };

      await emailjs.send(serviceId, templateId, templateParams, publicKey);

      showToast('Thank you! Your feedback has been sent.', 'success');
      setFeedbackName('');
      setFeedbackEmail('');
      setFeedbackTopic('Feature Request');
      setFeedbackMessage('');
    } catch (err) {
      console.warn('EmailJS fallback to mailto:', err);
      window.location.href = mailtoUrl;
      showToast('Opened email client to deliver your message to aayushparekh26@gmail.com!', 'success');
    } finally {
      setFeedbackSending(false);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsDrawerOpen(false);
  };

  const handleDemoCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedDemoText(label);
    showToast(`Copied "${label}" to clipboard!`, 'success');
    setTimeout(() => setCopiedDemoText(null), 2000);
  };

  useEffect(() => {
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
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Dynamic 60fps GPU Floating Background Orbs */}
      <div className="glow-orb glow-orb-primary"></div>
      <div className="glow-orb glow-orb-accent"></div>
      <div className="glow-orb glow-orb-secondary"></div>

      {/* Header Bar */}
      <header className="fixed top-0 left-0 w-full px-4 sm:px-6 lg:px-[8%] py-3.5 flex justify-between items-center z-50 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="bg-brand-primary/10 dark:bg-brand-primary/20 w-9 h-9 rounded-xl flex items-center justify-center text-brand-primary group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="font-display font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
            CloudVault
          </span>
        </Link>

        {/* Desktop Navbar Links */}
        <nav className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => scrollToSection('retrieve-section')} 
            className="text-sm font-semibold text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
          >
            Retrieve Code
          </button>
          <button 
            onClick={() => scrollToSection('features')} 
            className="text-sm font-semibold text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
          >
            Features
          </button>
          <button 
            onClick={() => scrollToSection('how-it-works')} 
            className="text-sm font-semibold text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <Link 
            to="/about" 
            className="text-sm font-semibold text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            About Us
          </Link>
          <Link 
            to="/contact" 
            className="text-sm font-semibold text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            Contact
          </Link>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Toggle Light/Dark Theme"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-600" />}
          </button>
          
          {user ? (
            <Link to="/dashboard" className="btn-primary py-2 px-5 text-sm font-bold shadow-md hover:shadow-brand-primary/20">
              Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link to="/login" className="btn-secondary py-2 px-4 text-sm font-semibold">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary py-2 px-4 text-sm font-semibold shadow-md">
                Sign Up
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Header Buttons */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Toggle Light/Dark Theme"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-600" />}
          </button>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full p-6 flex flex-col gap-6 shadow-2xl z-10 overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="bg-brand-primary/10 w-8 h-8 rounded-lg flex items-center justify-center text-brand-primary">
                  <Shield className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <span className="font-display font-extrabold text-slate-900 dark:text-white">CloudVault</span>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3 font-semibold text-sm text-slate-700 dark:text-slate-300">
              <button onClick={() => scrollToSection('retrieve-section')} className="text-left py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <DownloadCloud className="w-4 h-4 text-brand-primary" /> Retrieve Share Code
              </button>
              <button onClick={() => scrollToSection('features')} className="text-left py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-primary" /> Features
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-left py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-primary" /> How It Works
              </button>
              <Link to="/about" onClick={() => setIsDrawerOpen(false)} className="py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-primary" /> About Us
              </Link>
              <Link to="/contact" onClick={() => setIsDrawerOpen(false)} className="py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-primary" /> Contact Us
              </Link>
            </div>

            <div className="mt-auto pt-4 flex flex-col gap-2.5">
              {user ? (
                <Link to="/dashboard" onClick={() => setIsDrawerOpen(false)} className="w-full btn-primary py-3 text-center text-sm font-bold">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsDrawerOpen(false)} className="w-full btn-secondary py-2.5 text-center text-sm font-semibold">
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setIsDrawerOpen(false)} className="w-full btn-primary py-2.5 text-center text-sm font-bold">
                    Sign Up Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Landing Section */}
      <section className="flex flex-col items-center justify-center pt-28 sm:pt-36 pb-16 px-4 sm:px-6 lg:px-[8%] text-center z-10 max-w-6xl mx-auto w-full">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-brand-primary-light text-xs font-bold tracking-wider uppercase mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Easy Home to Lab Transfer</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold font-display max-w-4xl leading-[1.15] mb-6 bg-gradient-to-r from-slate-900 via-brand-primary to-sky-500 dark:from-white dark:via-brand-primary-light dark:to-cyan-400 bg-clip-text text-transparent">
          Home to Lab, Instantly.
        </h1>

        {/* Hero Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed mb-8">
          Send your assignment files, code snippets, or notes from home and open them in seconds on any college computer. No USB drives, no logging into personal accounts on shared PCs.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-12 w-full max-w-md">
          {user ? (
            <Link to="/dashboard" className="btn-primary py-3 px-6 text-sm font-bold shadow-lg shadow-brand-primary/25 hover:scale-[1.02] transition-transform w-full sm:w-auto">
              Open Vault Dashboard <ArrowRight className="w-4.5 h-4.5" />
            </Link>
          ) : (
            <Link to="/register" className="btn-primary py-3 px-6 text-sm font-bold shadow-lg shadow-brand-primary/25 hover:scale-[1.02] transition-transform w-full sm:w-auto">
              Get Started Free <ArrowRight className="w-4.5 h-4.5" />
            </Link>
          )}
          <button 
            onClick={() => scrollToSection('retrieve-section')} 
            className="btn-secondary py-3 px-6 text-sm font-semibold w-full sm:w-auto cursor-pointer"
          >
            Retrieve Code
          </button>
        </div>

        {/* Share Code Quick Retrieval Card */}
        <div id="retrieve-section" className="glass-card max-w-lg w-full p-6 sm:p-7 shadow-2xl border-brand-primary/30 mb-16 text-left relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Quick File Retrieval</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">No account required to download</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            Enter your <strong>6-digit access code</strong> to download your file on any PC instantly:
          </p>

          <form onSubmit={handleRetrieveCode} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              maxLength={6}
              placeholder="XXXXXX"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              className="w-full sm:w-40 text-center font-bold font-mono tracking-[6px] text-xl uppercase h-12 bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 focus:border-brand-primary dark:focus:border-brand-primary-light focus:ring-2 focus:ring-brand-primary/20 rounded-xl outline-none transition-all"
              required
              aria-label="6-Digit Access Code"
            />
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 btn-primary h-12 flex items-center justify-center gap-2 text-sm font-bold cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Verify & Download
                </>
              )}
            </button>
          </form>
        </div>

        {/* Interactive App Window Mockup */}
        <div className="w-full max-w-4xl rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950 text-left overflow-hidden">
          
          {/* Window Top Bar */}
          <div className="px-4 py-3 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
            </div>
            
            <div className="flex-1 max-w-md bg-white dark:bg-slate-950 rounded-lg py-1 px-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 truncate">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">cloudvault.app/dashboard</span>
            </div>
            
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              Private & Safe
            </div>
          </div>
          
          {/* Mockup App Body */}
          <div className="flex flex-col md:flex-row min-h-[340px]">
            
            {/* Left Sidebar Controls */}
            <div className="w-full md:w-52 bg-slate-50/80 dark:bg-slate-900/60 border-r border-slate-200/80 dark:border-slate-800 p-3 flex md:flex-col gap-1.5 shrink-0 overflow-x-auto">
              <button
                onClick={() => setDemoTab('files')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  demoTab === 'files'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Folder className="w-4 h-4" />
                <span>Files Explorer</span>
              </button>

              <button
                onClick={() => setDemoTab('notes')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  demoTab === 'notes'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>Notes & Clipboard</span>
              </button>

              <button
                onClick={() => setDemoTab('security')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  demoTab === 'security'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Zero-Trace Privacy</span>
              </button>

              <div className="hidden md:flex items-center gap-2 px-3 py-2 text-slate-400 text-xs font-semibold mt-auto opacity-70">
                <LogOut className="w-3.5 h-3.5 text-amber-500" />
                <span>Auto Session Clear</span>
              </div>
            </div>
            
            {/* Right Interactive Content Area */}
            <div className="flex-1 p-4 sm:p-6 flex flex-col gap-4 bg-white dark:bg-slate-950 min-w-0">
              
              {demoTab === 'files' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-brand-primary" /> My Private Vault (Interactive Demo)
                    </span>
                    <span className="px-3 py-1 bg-brand-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm">
                      <Plus className="w-3.5 h-3.5" /> Upload File (Max 100MB)
                    </span>
                  </div>
                  
                  {/* File List Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-900/40 hover:border-brand-primary/50 transition-colors group">
                      <div className="flex justify-between items-center">
                        <FileCode className="w-6 h-6 text-sky-500" />
                        <span className="px-2 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[9px] font-bold rounded">CODE</span>
                      </div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate mt-1">Lab_4_Script.py</span>
                      <span className="text-[10px] text-slate-400">4.8 KB • Code File</span>
                      <button 
                        onClick={() => handleDemoCopy('8F3K9A', 'Code 8F3K9A')}
                        className="mt-2 text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                      >
                        <Key className="w-3 h-3" /> Code: 8F3K9A
                      </button>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-900/40 hover:border-brand-primary/50 transition-colors group">
                      <div className="flex justify-between items-center">
                        <FileText className="w-6 h-6 text-emerald-500" />
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold rounded">DOC</span>
                      </div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate mt-1">Lab_Manual.pdf</span>
                      <span className="text-[10px] text-slate-400">2.4 MB • PDF Document</span>
                      <button 
                        onClick={() => handleDemoCopy('K7M2P9', 'Code K7M2P9')}
                        className="mt-2 text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                      >
                        <Key className="w-3 h-3" /> Code: K7M2P9
                      </button>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-900/40 hover:border-brand-primary/50 transition-colors group">
                      <div className="flex justify-between items-center">
                        <Archive className="w-6 h-6 text-amber-500" />
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-bold rounded">BURN</span>
                      </div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate mt-1">Assignment_Final.zip</span>
                      <span className="text-[10px] text-slate-400">14.2 MB • Self-Destruct</span>
                      <button 
                        onClick={() => handleDemoCopy('X9W4Q1', 'Burn Code X9W4Q1')}
                        className="mt-2 text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" /> Burn Code: X9W4Q1
                      </button>
                    </div>
                  </div>

                  {/* Cloud Clipboard Row */}
                  <div className="border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clipboard className="w-3.5 h-3.5 text-amber-500" /> Quick Clipboard Handoff (Try Copying)
                    </span>
                    <div className="flex justify-between items-center font-mono text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <span className="truncate">git clone https://github.com/parul-university/lab-manual.git</span>
                      <button
                        onClick={() => handleDemoCopy('git clone https://github.com/parul-university/lab-manual.git', 'Git Clone Command')}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ml-2 shrink-0 text-brand-primary cursor-pointer"
                        title="Click to Copy"
                      >
                        {copiedDemoText === 'Git Clone Command' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {demoTab === 'notes' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Clipboard className="w-4 h-4 text-amber-500" /> Quick Notes & Code Snippets
                    </span>
                    <span className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Password Protected
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-500" /> Exam Seat & Terminal Details
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-1">
                          Lab 304 • Machine #18 • Password Protected Note
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full shrink-0">Pinned</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">Database Connection String</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">postgresql://postgres:secret@localhost:5432/college_db</div>
                      </div>
                      <button
                        onClick={() => handleDemoCopy('postgresql://postgres:secret@localhost:5432/college_db', 'Connection String')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shrink-0 cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {demoTab === 'security' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Complete Lab PC Security
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-1.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <LogOut className="w-4 h-4 text-amber-500" /> Auto Session Wipe
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Closing the browser window automatically clears your login session so nobody else on the shared PC can access your account.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-1.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-500" /> Safe File Guard
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Automatic validation blocks dangerous script or executable files (<code>.exe</code>, <code>.bat</code>) from being shared.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Highlights */}
      <section className="py-12 bg-white dark:bg-slate-900/50 border-y border-slate-200/80 dark:border-slate-800 z-10 px-4 sm:px-6 lg:px-[8%]">
        <div className="max-w-5xl mx-auto flex flex-col gap-6 items-center">
          <div className="text-center mb-2">
            <span className="text-xs font-bold text-brand-primary uppercase tracking-widest">Built for Convenience & Security</span>
            <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white mt-1">Smart Features for College Labs</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full">
            
            <div className="glass-card p-5 flex flex-col items-center justify-center text-center group hover:border-brand-primary/40 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-brand-primary">
                <Key className="w-5.5 h-5.5 stroke-[2.5]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-brand-primary">6-Digit</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Access Codes</div>
            </div>

            <div className="glass-card p-5 flex flex-col items-center justify-center text-center group hover:border-brand-primary/40 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-brand-primary">
                <Lock className="w-5.5 h-5.5 stroke-[2.5]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-brand-primary">Encrypted</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Private Notes</div>
            </div>

            <div className="glass-card p-5 flex flex-col items-center justify-center text-center group hover:border-brand-primary/40 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-brand-primary">
                <UploadCloud className="w-5.5 h-5.5 stroke-[2.5]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-brand-primary">100 MB</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Single File Upload</div>
            </div>

            <div className="glass-card p-5 flex flex-col items-center justify-center text-center group hover:border-brand-primary/40 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-brand-primary">
                <ShieldCheck className="w-5.5 h-5.5 stroke-[2.5]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-brand-primary">Zero-Trace</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Session Auto-Clear</div>
            </div>

          </div>
        </div>
      </section>

      {/* Core Features Grid Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-[8%] z-10 text-center max-w-5xl mx-auto flex flex-col gap-12">
        <div>
          <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-bold rounded-full uppercase tracking-wider">
            Features Overview
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 dark:text-white mt-4">
            Everything You Need for Lab Work
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm sm:text-base max-w-xl mx-auto">
            Easily transfer your files without needing a USB pen drive or leaving accounts logged in on public PCs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          
          <div className="glass-card p-6 flex flex-col gap-3 hover:border-brand-primary/40 transition-all group">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Drag & Drop Upload</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Upload images, PDFs, ZIP archives, lab manuals, and code scripts up to 100MB with automatic format categories.
            </p>
          </div>

          <div className="glass-card p-6 flex flex-col gap-3 hover:border-brand-primary/40 transition-all group">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">6-Digit Access Codes</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Generate 6-character access codes valid from 1 minute up to 7 days. Anyone with the code can download directly.
            </p>
          </div>

          <div className="glass-card p-6 flex flex-col gap-3 hover:border-brand-primary/40 transition-all group">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Self-Destruct Links</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Create single-use links that automatically delete permanently from storage right after the first download.
            </p>
          </div>

          <div className="glass-card p-6 flex flex-col gap-3 hover:border-brand-primary/40 transition-all group">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Password Protected Notes</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Lock sensitive text notes and code snippets with your personal passphrase. The server cannot read your secret text.
            </p>
          </div>

          <div className="glass-card p-6 flex flex-col gap-3 hover:border-brand-primary/40 transition-all group">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Instant QR Scanner</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Generate downloadable QR codes for any file or note to scan instantly with your mobile camera.
            </p>
          </div>

          <div className="glass-card p-6 flex flex-col gap-3 hover:border-brand-primary/40 transition-all group">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Safe File Guard</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Automated safety validation blocks dangerous executable file formats (<code>.exe</code>, <code>.bat</code>, <code>.cmd</code>) from being uploaded.
            </p>
          </div>

        </div>
      </section>

      {/* Campus Workflows Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-[8%] bg-slate-50/70 dark:bg-slate-900/30 border-t border-slate-200/80 dark:border-slate-800 z-10 text-center">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <div>
            <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-bold rounded-full uppercase tracking-wider">
              Useful Workflows
            </span>
            <h2 className="text-3xl font-bold font-display text-slate-900 dark:text-white mt-4">
              Made for College Labs & Assignments
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm max-w-lg mx-auto">
              How CloudVault helps you complete assignments and practicals smoothly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
            
            <div className="glass-card p-5 flex flex-col justify-between hover:border-brand-primary/40 transition-all group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <FileCode className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Coding Labs & Scripts</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Send Python, Java, C++, JS, or SQL code files directly from home to lab PCs without emailing yourself.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Syntax Intact
              </div>
            </div>

            <div className="glass-card p-5 flex flex-col justify-between hover:border-brand-primary/40 transition-all group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Clipboard className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Commands & Seat Notes</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Save git commands, database connections, and seat details for fast single-click copying during practical exams.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Fast Copy
              </div>
            </div>

            <div className="glass-card p-5 flex flex-col justify-between hover:border-brand-primary/40 transition-all group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Lab Manuals & PDFs</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Keep lab instruction manuals and reference PDFs ready on any computer screen in seconds.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <FileCheck className="w-3.5 h-3.5 text-emerald-500" /> Up to 100MB
              </div>
            </div>

            <div className="glass-card p-5 flex flex-col justify-between hover:border-brand-primary/40 transition-all group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Mobile QR Handoff</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Scan 6-digit QR code directly with your mobile phone camera to download assignment files on the go.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-400">
                <QrCode className="w-3.5 h-3.5 text-purple-500" /> One-Tap Download
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Step-by-Step Workflow Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-[8%] bg-white dark:bg-slate-900/20 text-center border-t border-slate-200/80 dark:border-slate-800 z-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-12">
          <div>
            <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-bold rounded-full uppercase tracking-wider">
              3-Step Guide
            </span>
            <h2 className="text-3xl font-extrabold font-display text-slate-900 dark:text-white mt-4">
              How CloudVault Works
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">
              Simple 3-step workflow connecting home devices and college lab computers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            
            <div className="glass-card p-6 flex flex-col gap-3 relative border-slate-200/80 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-display font-extrabold text-base shadow-md">
                1
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Upload from Home</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Sign into your CloudVault account from home. Upload assignment files or paste code snippets into your private vault.
              </p>
            </div>

            <div className="glass-card p-6 flex flex-col gap-3 relative border-slate-200/80 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-display font-extrabold text-base shadow-md">
                2
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Get 6-Digit Code</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Click share to generate a <strong>6-digit access code</strong> or QR code. You can also turn on self-destruct or password protection.
              </p>
            </div>

            <div className="glass-card p-6 flex flex-col gap-3 relative border-slate-200/80 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-display font-extrabold text-base shadow-md">
                3
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Open in College Lab</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Open CloudVault on any college lab computer, type the 6-digit code on the home page, and download your work instantly.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-[8%] bg-brand-bg-light dark:bg-brand-bg-dark border-t border-slate-200/80 dark:border-slate-800 z-10 text-center">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <div>
            <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-bold rounded-full uppercase tracking-wider">
              Help & FAQ
            </span>
            <h2 className="text-3xl font-bold font-display text-slate-900 dark:text-white mt-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">
              Got questions about file limits, safety, or access codes? Here are simple answers.
            </p>
          </div>

          <div className="flex flex-col gap-3.5 text-left">
            {[
              {
                q: 'Is it safe to use CloudVault on shared college computers?',
                a: 'Yes! CloudVault is specifically designed for public lab terminals. If you do not select "Remember Me" during login, closing your browser tab automatically wipes your session so no one else can open your account.'
              },
              {
                q: 'Do I need to create an account to download a file with a 6-digit code?',
                a: 'No account needed! Anyone with a valid 6-digit access code or QR code link can enter it directly on the home page and download the file immediately.'
              },
              {
                q: 'What is a "Self-Destruct" share link?',
                a: 'A self-destruct link automatically deletes the file permanently from storage immediately after it is downloaded once.'
              },
              {
                q: 'What is the file size limit?',
                a: 'CloudVault lets you upload single files up to 100MB, covering code scripts, lab manuals, PDFs, images, and ZIP archives.'
              },
              {
                q: 'Are executable files allowed?',
                a: 'No. Executable file formats such as .exe, .bat, and .cmd are blocked to prevent accidental malware spread on campus lab computers.'
              }
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className={`glass-card p-5 cursor-pointer border-slate-200/80 dark:border-slate-800 transition-all ${
                  activeFaq === idx ? 'ring-2 ring-brand-primary/30 shadow-md' : 'hover:border-brand-primary/30'
                }`}
              >
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  <span>{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ml-2 ${activeFaq === idx ? 'rotate-180 text-brand-primary' : ''}`} />
                </div>
                <div
                  className={`transition-all duration-300 overflow-hidden text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed ${
                    activeFaq === idx ? 'max-h-40 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800' : 'max-h-0'
                  }`}
                >
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Standard & Feedback Section */}
      <section id="developer-feedback" className="py-20 px-4 sm:px-6 lg:px-[8%] bg-white dark:bg-slate-900/10 border-t border-slate-200/80 dark:border-slate-800 z-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <div className="text-center">
            <span className="px-3.5 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-bold rounded-full uppercase tracking-wider">
              Feedback & Suggestions
            </span>
            <h2 className="text-3xl font-bold font-display text-slate-900 dark:text-white mt-4">
              Help Us Make CloudVault Better
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">
              Have a feature suggestion or report an issue? Send us a message directly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Privacy Promise Card */}
            <div className="glass-card p-6 flex flex-col gap-5 border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-11 w-11 flex items-center justify-center">
                  <Shield className="w-5.5 h-5.5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Your Privacy First</h3>
                  <p className="text-xs text-slate-500 font-medium">Built for Lab Computer Safety</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                CloudVault is designed to bridge home and lab workstations without leaving personal traces on shared computers.
              </p>
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>Private Notes:</strong> Password protect sensitive text notes.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>Auto Expire:</strong> Temporary share codes delete automatically.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>Session Clear:</strong> Logins reset on window close.</span>
                </div>
              </div>
            </div>

            {/* Direct Feedback Form */}
            <div className="glass-card p-6 border-slate-200/80 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-brand-primary" /> Send Feedback Message
              </h3>
              
              <form onSubmit={handleFeedbackSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label-title">Your Name</label>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      className="input-field py-2.5 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-title">Email Address</label>
                    <input
                      type="email"
                      placeholder="student@example.com"
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      className="input-field py-2.5 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label-title">Topic Category</label>
                  <select
                    value={feedbackTopic}
                    onChange={(e) => setFeedbackTopic(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary"
                    required
                  >
                    <option value="Feature Request">Request a Feature</option>
                    <option value="Bug Report">Report a Bug / Issue</option>
                    <option value="General Feedback">General Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="label-title">Message Details</label>
                  <textarea
                    rows={4}
                    placeholder="Describe suggestions or issues in detail..."
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="input-field py-2.5 text-xs resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={feedbackSending}
                  className="w-full btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-brand-primary/20"
                >
                  <Send className="w-3.5 h-3.5" /> {feedbackSending ? 'Sending...' : 'Submit Message'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />

      {/* Verified File Download Modal */}
      {showRetrieveModal && retrievedFile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 sm:p-7 shadow-2xl relative border-brand-primary/30">
            <button
              onClick={() => setShowRetrieveModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2.5 mb-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
              <FileCheck className="w-5.5 h-5.5 stroke-[2.5]" />
              <h3>File Found!</h3>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Your 6-digit access code is valid. Here are your file details:
            </p>

            {retrievedFile.self_destruct && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div>
                  <span className="font-bold">Self-Destruct Enabled:</span> This file will automatically delete from storage right after this download.
                </div>
              </div>
            )}

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-5 flex flex-col gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/50 font-mono">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-sans font-semibold">File Name</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={retrievedFile.filename}>
                  {retrievedFile.filename}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-sans font-semibold">Size</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatBytes(retrievedFile.size)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-sans font-semibold">Format</span>
                <span className="font-bold text-slate-900 dark:text-white uppercase">
                  {retrievedFile.file_type}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-sans font-semibold">Code Expiry</span>
                <span className="font-bold text-amber-500">
                  {Math.floor(shareTimeLeft / 60)}m {shareTimeLeft % 60}s remaining
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRetrieveModal(false)}
                className="btn-secondary py-2.5 px-4 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleDownloadFile}
                className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" /> Download File Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;
