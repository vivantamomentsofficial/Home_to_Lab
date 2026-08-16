import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  Shield, Sparkles, ArrowRight, DownloadCloud, Download, Plus, Folder, ClipboardCopy, LogOut,
  FileCode, Archive, FileText, Clipboard, ChevronDown, MessageSquare, Send, X, FileCheck, Sun, Moon, Menu
} from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const Home = () => {
  const { user } = useAuth();
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
  const [activeFaq, setActiveFaq] = useState(null);

  // Feedback Form State
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackTopic, setFeedbackTopic] = useState('Feature Request');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  const handleRetrieveCode = async (e, customCode = null) => {
    if (e) e.preventDefault();
    const codeToUse = customCode || shareCode;
    if (!codeToUse || codeToUse.trim().length !== 6) {
      showToast('Please enter a 6-character sharing code.', 'warning');
      return;
    }

    setLoading(true);
    setRetrievedFile(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/share/${codeToUse.trim()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve file details.');
      }

      setRetrievedFile(data);
      setShowRetrieveModal(true);
      
      // Calculate remaining expiration time
      const expiryTime = new Date(data.expires_at);
      const remainingSeconds = Math.max(0, Math.floor((expiryTime - new Date()) / 1000));
      setShareTimeLeft(remainingSeconds);

      // Start countdown
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

      showToast('Sharing code verified successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Invalid or expired sharing code.', 'danger');
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
    showToast('Download initiated!', 'success');
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackSending(true);

    try {
      const serviceId = 'service_98oq29o';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_v0fdm9h';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

      const templateParams = {
        from_name: feedbackName,
        from_email: feedbackEmail,
        topic: feedbackTopic,
        message: feedbackMessage,
      };

      await emailjs.send(serviceId, templateId, templateParams, publicKey);

      showToast('Thank you! Your feedback has been submitted.', 'success');
      setFeedbackName('');
      setFeedbackEmail('');
      setFeedbackTopic('Feature Request');
      setFeedbackMessage('');
    } catch (err) {
      console.error(err);
      showToast('Failed to send message: ' + (err.text || err.message), 'danger');
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam && codeParam.trim().length === 6) {
      const code = codeParam.trim().toUpperCase();
      setShareCode(code);
      // Wait for components to mount and scroll down
      setTimeout(() => {
        scrollToSection('retrieve-section');
        handleRetrieveCode(null, code);
      }, 600);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300">
      
      {/* Background Orbs */}
      <div className="glow-orb glow-orb-primary opacity-20"></div>
      <div className="glow-orb glow-orb-accent opacity-20"></div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full px-6 lg:px-[8%] py-4 flex justify-between items-center z-50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border-b border-brand-border-light dark:border-brand-border-dark transition-colors">
        <div className="flex items-center gap-2">
          <div className="bg-brand-primary/10 dark:bg-brand-primary/20 w-8.5 h-8.5 rounded-lg flex items-center justify-center text-brand-primary">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="font-display font-bold text-xl text-slate-800 dark:text-white">
            CloudVault
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollToSection('features')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            Features
          </button>
          <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            How It Works
          </button>
          <button onClick={() => scrollToSection('retrieve-section')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            Retrieve File
          </button>
          
          
          {user ? (
            <Link to="/dashboard" className="btn-primary py-2 px-4.5 text-sm">
              Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link to="/login" className="btn-secondary py-2 px-4 text-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary py-2 px-4 text-sm">
                Sign Up
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-64 max-w-xs bg-white dark:bg-slate-900 h-full p-6 flex flex-col gap-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-primary stroke-[2.5]" />
                <span className="font-display font-bold text-slate-800 dark:text-white">CloudVault</span>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <button onClick={() => scrollToSection('features')} className="text-left py-2 border-b border-slate-100 dark:border-slate-800">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-left py-2 border-b border-slate-100 dark:border-slate-800">How It Works</button>
              <button onClick={() => scrollToSection('retrieve-section')} className="text-left py-2 border-b border-slate-100 dark:border-slate-800">Retrieve File</button>
            </div>

            <div className="mt-auto flex flex-col gap-2">
              {user ? (
                <Link to="/dashboard" className="w-full btn-primary py-2.5 text-center text-sm">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="w-full btn-secondary py-2.5 text-center text-sm">Sign In</Link>
                  <Link to="/register" className="w-full btn-primary py-2.5 text-center text-sm">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center pt-32 pb-16 px-6 lg:px-[8%] text-center z-10">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-brand-primary-light text-xs font-semibold tracking-wider uppercase mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          Built for College Students & Lab Users
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display max-w-3xl leading-tight mb-6 bg-gradient-to-r from-slate-900 via-brand-primary to-sky-500 dark:from-white dark:via-brand-primary-light dark:to-cyan-400 bg-clip-text text-transparent">
          Home to Lab, Instantly.
        </h1>

        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed mb-8">
          Home to Lab (CloudVault) allows you to upload files or paste notes from home and access them on any library or college computer instantly without plugging in USBs or risking your logins on unsecure PCs.
        </p>

        <div className="flex gap-4 mb-12">
          <Link to="/register" className="btn-primary px-6 py-3 flex items-center gap-2 text-sm">
            Get Started Free <ArrowRight className="w-4.5 h-4.5" />
          </Link>
          <button onClick={() => scrollToSection('features')} className="btn-secondary px-6 py-3 text-sm font-semibold">
            Explore Features
          </button>
        </div>

        {/* Share Code Quick Retrieval Card */}
        <div id="retrieve-section" className="glass-card max-w-md w-full p-6 shadow-xl border-brand-primary/20 mb-16 text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Retrieve Shared File</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            Enter a 6-character temporary share code to download a file instantly.
          </p>

          <form onSubmit={handleRetrieveCode} className="flex gap-2.5">
            <input
              type="text"
              maxLength={6}
              placeholder="XXXXXX"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              className="w-36 text-center font-bold tracking-[4px] text-lg uppercase h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-primary rounded-xl outline-none"
              required
            />
            <button type="submit" disabled={loading} className="flex-1 btn-primary h-12 flex items-center justify-center gap-1.5 text-xs">
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Retrieve
                </>
              )}
            </button>
          </form>
        </div>

        {/* App Mockup Window */}
        <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl bg-white dark:bg-slate-950 text-left">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 flex items-center gap-4">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
              <span className="w-3 h-3 rounded-full bg-green-400"></span>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-950/80 rounded-lg py-1 px-4 text-[10px] text-slate-400 dark:text-slate-500 font-medium border border-slate-200/50 dark:border-slate-800 flex items-center justify-center gap-1">
              <Shield className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
              <span>hometolab.vercel.app/dashboard</span>
            </div>
          </div>
          
          {/* Body */}
          <div className="flex flex-col md:flex-row h-72">
            {/* Sidebar */}
            <div className="w-full md:w-44 bg-slate-50 dark:bg-slate-900/60 border-r border-slate-200/50 dark:border-slate-800/80 p-3 flex md:flex-col gap-1 shrink-0 overflow-x-auto md:overflow-x-visible">
              <div className="flex items-center gap-2 px-3 py-2 bg-brand-primary/10 rounded-lg text-brand-primary text-xs font-semibold shrink-0">
                <Folder className="w-3.5 h-3.5" />
                <span>Files Vault</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-slate-500 text-xs font-semibold shrink-0">
                <Clipboard className="w-3.5 h-3.5" />
                <span>Quick Notes</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-slate-500 text-xs font-semibold shrink-0">
                <Shield className="w-3.5 h-3.5" />
                <span>Security</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-slate-500 text-xs font-semibold md:mt-auto opacity-50 shrink-0">
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-5 flex flex-col gap-4 min-w-0 bg-white dark:bg-slate-950">
              <div className="flex justify-between items-center gap-2">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-brand-primary" /> My Lab Vault
                </span>
                <span className="px-2.5 py-1 bg-brand-primary text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Upload Assignment
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl flex flex-col gap-1 items-start text-xs">
                  <FileCode className="w-6 h-6 text-sky-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate w-full mt-1">Lab_4_Script.py</span>
                  <span className="text-[10px] text-slate-400">4.2 KB</span>
                </div>
                <div className="border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl flex flex-col gap-1 items-start text-xs">
                  <Archive className="w-6 h-6 text-indigo-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate w-full mt-1">Project_Final.zip</span>
                  <span className="text-[10px] text-slate-400">12.8 MB</span>
                </div>
                <div className="border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl flex flex-col gap-1 items-start text-xs">
                  <FileText className="w-6 h-6 text-emerald-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate w-full mt-1">Lab_Manual.pdf</span>
                  <span className="text-[10px] text-slate-400">2.1 MB</span>
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-850/80 p-3 rounded-xl flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1">
                  <Clipboard className="w-3 h-3 text-amber-500" /> Cloud Clipboard Sync
                </span>
                <div className="flex justify-between items-center text-xs font-mono text-slate-700 dark:text-slate-300 mt-1 select-all bg-white dark:bg-slate-950 py-1.5 px-3 rounded-lg border border-slate-100 dark:border-slate-900/50">
                  <span className="truncate">git clone https://github.com/parul-university/lab-manual.git</span>
                  <ClipboardCopy className="w-3.5 h-3.5 text-slate-400 cursor-pointer shrink-0 ml-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counters Section */}
      <section className="py-12 bg-white dark:bg-slate-900/40 border-y border-brand-border-light dark:border-brand-border-dark z-10 px-6 lg:px-[8%]">
        <div className="max-w-4xl mx-auto flex flex-col gap-6 items-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-black font-display text-brand-primary">25+</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Daily Visitors</div>
            </div>
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-black font-display text-brand-primary">25+</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Registered Students</div>
            </div>
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-black font-display text-brand-primary">25+</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">File Transfers</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-2">
            <span>Share CloudVault and</span>
            <button onClick={() => scrollToSection('developer-feedback')} className="text-brand-primary hover:underline flex items-center gap-1">
              Add Your Friends Now! <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Core Features Grid Section */}
      <section id="features" className="py-20 px-6 lg:px-[8%] z-10 text-center max-w-4xl mx-auto flex flex-col gap-10">
        <div>
          <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-bold rounded-full uppercase tracking-wider">Core Features</span>
          <h2 className="text-3xl font-bold font-display text-slate-800 dark:text-white mt-4">Designed for Quick Access</h2>
          <p className="text-slate-500 mt-2 text-sm max-w-lg mx-auto">No logins left behind, no USB drives lost. Just secure temporary storage for college workloads.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="glass-card p-6 flex gap-4">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-11 w-11 flex items-center justify-center">
              <DownloadCloud className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Drag & Drop Upload</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Upload images, PDFs, Word docs, code files, and zip files up to 100MB instantly.</p>
            </div>
          </div>
          <div className="glass-card p-6 flex gap-4">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-11 w-11 flex items-center justify-center">
              <Clipboard className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Instant Clipboard Sync</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Paste code, links, notes, or credentials to access them on secondary machines.</p>
            </div>
          </div>
          <div className="glass-card p-6 flex gap-4">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-11 w-11 flex items-center justify-center">
              <Shield className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Security Built-In</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Private vault stored behind Supabase Row Level Security. Only you can access your own files.</p>
            </div>
          </div>
          <div className="glass-card p-6 flex gap-4">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl shrink-0 h-11 w-11 flex items-center justify-center">
              <LogOut className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Lab Session Self-Destruct</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Close the lab browser and your session is automatically cleared, leaving no cookies or credentials behind on shared PCs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How Students Use Section */}
      <section id="how-it-works" className="py-20 px-6 lg:px-[8%] bg-white dark:bg-slate-900/20 text-center border-t border-brand-border-light dark:border-brand-border-dark z-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-12">
          <div>
            <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-bold rounded-full uppercase tracking-wider">Easy Workflow</span>
            <h2 className="text-3xl font-bold font-display text-slate-800 dark:text-white mt-4">How Students Use CloudVault</h2>
            <p className="text-slate-500 mt-2 text-sm">A seamless bridge between your personal computer and the campus labs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-display font-extrabold text-base">1</div>
              <h3 className="font-bold text-slate-800 dark:text-white">Create Your Account</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Register using your college or personal email from your laptop or mobile phone to initialize your secure vault storage.</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-display font-extrabold text-base">2</div>
              <h3 className="font-bold text-slate-800 dark:text-white">Upload Assignments & Notes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Drop assignment files, PDFs, or copy your code and notes into your private vault dashboard from home.</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-display font-extrabold text-base">3</div>
              <h3 className="font-bold text-slate-800 dark:text-white">Retrieve Instantly in Lab</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Open CloudVault on any college lab computer, sign in, and download your work instantly. Zero USB drives needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordions Section */}
      <section id="faq" className="py-20 px-6 lg:px-[8%] bg-brand-bg-light dark:bg-brand-bg-dark border-t border-brand-border-light dark:border-brand-border-dark z-10 text-center">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <div>
            <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-bold rounded-full uppercase tracking-wider">Got Questions?</span>
            <h2 className="text-3xl font-bold font-display text-slate-800 dark:text-white mt-4">Frequently Asked Questions</h2>
            <p className="text-slate-500 mt-2 text-sm">Got questions about security, limits, or clipboard sync? We have answers.</p>
          </div>

          <div className="flex flex-col gap-4 text-left">
            {[
              {
                q: 'How secure is CloudVault?',
                a: 'All your files and snippets are protected by Supabase Row-Level Security (RLS) policies. Only your authenticated user account can access, download, or edit your private vault items. Lab computer logins are completely isolated.'
              },
              {
                q: 'Does it save sessions on shared lab PCs?',
                a: 'By default, if you don\'t check "Remember Me" during login, CloudVault terminates your session and wipes active cookies immediately upon tab or browser closure, ensuring nobody else can hijack your account after you leave the computer.'
              },
              {
                q: 'What is the storage file size limit?',
                a: 'CloudVault offers a generous storage size of up to 100MB per file upload on the standard student plan, which is perfect for programming scripts, assignments, ZIP archives, lab reports, and study guides.'
              },
              {
                q: 'Can I share files with my friends?',
                a: 'Yes! From your private dashboard, you can generate temporary share links for specific files. Anyone with the URL can access and download that file before it automatically expires and self-destructs from the database.'
              }
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="glass-card p-5 cursor-pointer border-slate-200/50 dark:border-slate-800/80 hover:shadow-sm"
              >
                <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200 text-sm">
                  <span>{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180' : ''}`} />
                </div>
                <div
                  className={`transition-all duration-300 overflow-hidden text-xs text-slate-500 dark:text-slate-400 leading-relaxed ${
                    activeFaq === idx ? 'max-h-28 mt-3' : 'max-h-0'
                  }`}
                >
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Bio & Feedback Form Section */}
      <section id="developer-feedback" className="py-20 px-6 lg:px-[8%] bg-white dark:bg-slate-900/10 border-t border-brand-border-light dark:border-brand-border-dark z-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <div className="text-center">
            <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light text-xs font-bold rounded-full uppercase tracking-wider">About Project</span>
            <h2 className="text-3xl font-bold font-display text-slate-800 dark:text-white mt-4">Developer & Contact</h2>
            <p className="text-slate-500 mt-2 text-sm">Get in touch to suggest new features, report bugs, or collaborate on CloudVault.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Developer Card */}
            <div className="glass-card p-6 flex flex-col gap-5 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center font-display font-extrabold text-lg uppercase shrink-0">
                  AP
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Aayush Parekh</h3>
                  <p className="text-xs text-slate-400 font-medium">Lead Developer & Creator</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Hi! I'm Aayush, a developer focused on building utilities that make academic life productive. I created CloudVault to bridge the gap between personal laptops and computer lab PCs without relying on unsecure USB drives or browser logins.
              </p>
            </div>

            {/* Feedback Form Card */}
            <div className="glass-card p-6 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-brand-primary" /> Send Feedback / Bug Report
              </h3>
              
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-title">Your Name</label>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      className="input-field py-2 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-title">Email Address</label>
                    <input
                      type="email"
                      placeholder="college@example.com"
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      className="input-field py-2 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label-title">What is this about?</label>
                  <select
                    value={feedbackTopic}
                    onChange={(e) => setFeedbackTopic(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none"
                    required
                  >
                    <option value="Feature Request">Request a Feature</option>
                    <option value="Bug Report">Report a Bug / Issue</option>
                    <option value="General Feedback">General Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="label-title">Details</label>
                  <textarea
                    rows={4}
                    placeholder="Describe features you want, or details of the issue..."
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="input-field py-2 text-xs resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={feedbackSending}
                  className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> {feedbackSending ? 'Sending...' : 'Submit Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 lg:px-[8%] bg-white dark:bg-slate-950 border-t border-brand-border-light dark:border-brand-border-dark flex flex-col sm:flex-row justify-between items-center gap-4 z-10 text-xs text-slate-400 dark:text-slate-600">
        <div className="flex items-center gap-2">
          <Shield className="w-4.5 h-4.5 text-brand-primary stroke-[2.5]" />
          <span className="font-display font-semibold text-slate-800 dark:text-slate-400">CloudVault</span>
        </div>
        <div>
          &copy; 2026 CloudVault. Built for academic productivity. Developed by{' '}
          <a
            href="https://aayushparekhportfolio.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:underline font-bold"
          >
            Aayush Parekh
          </a>
        </div>
      </footer>

      {/* Public File Retrieval Modal */}
      {showRetrieveModal && retrievedFile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="glass-card max-w-sm w-full p-6 shadow-2xl animate-scale-up relative">
            <button
              onClick={() => setShowRetrieveModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
              <FileCheck className="w-5 h-5 text-green-500" />
              File Found!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              The temporary share code is valid. You can now download the file.
            </p>

            <div className="border border-slate-100 dark:border-slate-850/80 rounded-xl p-3.5 mb-5 flex flex-col gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-slate-400">File Name</span>
                <span className="font-bold text-slate-800 dark:text-white truncate max-w-[160px]" title={retrievedFile.filename}>
                  {retrievedFile.filename}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-slate-400">File Size</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {formatBytes(retrievedFile.size)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-slate-400">File Type</span>
                <span className="font-bold text-slate-800 dark:text-white uppercase">
                  {retrievedFile.file_type}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-slate-400">Expires In</span>
                <span className="font-bold text-amber-500">
                  {Math.floor(shareTimeLeft / 60)}m {shareTimeLeft % 60}s
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowRetrieveModal(false)}
                className="btn-secondary py-2 px-4.5 text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={handleDownloadFile}
                className="btn-primary py-2 px-4.5 text-xs font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download File
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;
