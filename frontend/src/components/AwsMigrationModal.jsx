import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle, ArrowRight, Zap, Database, Server } from 'lucide-react';

const SupabaseLogo = ({ className = "w-9 h-9" }) => (
  <svg className={className} viewBox="0 0 106 106" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M58.37 98.766c-2.31 3.125-7.37 1.498-7.37-2.42V59.846h41.442c4.475 0 7.026 5.105 4.316 8.765L58.37 98.766z" 
      fill="url(#supa-grad-real)"
    />
    <path 
      d="M47.63 7.234c2.31-3.125 7.37-1.498 7.37 2.42v36.5h-41.442c-4.475 0-7.026-5.105-4.316-8.765L47.63 7.234z" 
      fill="#3ECF8E" 
      fillOpacity="0.85"
    />
    <defs>
      <linearGradient id="supa-grad-real" x1="51" y1="59.8" x2="75" y2="98" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3ECF8E" />
        <stop offset="1" stopColor="#10B981" />
      </linearGradient>
    </defs>
  </svg>
);

const AwsLogo = ({ className = "w-11 h-11" }) => (
  <svg className={className} viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g fill="#FF9900">
      {/* Official AWS Typography 'a' */}
      <path d="M26.2 21.3c-1.3-1.1-3.2-1.6-5.5-1.6-4.3 0-7.1 2.4-7.1 6.2 0 3.5 2.2 5.4 6.2 6l3 .5c2.5.4 3.6.1 3.6-2.8v-8.3zm5.2 14.4c-1.3 1.1-2.9 1.7-5 1.7-5.8 0-9.6-3-9.6-7.7 0-4 2.5-6.4 6.6-7l4.1-.6c1-.1 1.4-.5 1.4-1.3 0-1.3-1.3-2.3-3.5-2.3-1.9 0-3.7.8-4.6 2.2l-4.7-2.8c1.8-3.1 5.4-4.7 10.3-4.7 5.9 0 9.7 3 9.7 7.8v10.2c0 2.3.5 3.4 1.7 4.5h-5.8z"/>
      {/* Official AWS Typography 'w' */}
      <path d="M48.4 13.8h5.2l-5.6 22.4h-5.2l-4.3-16.3-4.4 16.3h-5.2l-5.6-22.4h5.2l3.8 16.6 4.3-16.6h5l4.3 16.6 3.9-16.6z"/>
      {/* Official AWS Typography 's' */}
      <path d="M69.1 21.1c-1.3-1.1-3.1-1.6-5.2-1.6-2.6 0-4.3 1.1-4.3 2.8 0 1.6 1.3 2.4 3.7 2.8l3.4.6c4.6.7 7 2.8 7 6.5 0 4.9-4.3 7.6-10.6 7.6-5 0-8.8-1.8-10.4-4.6l4.6-2.8c1.3 2 3.4 3.1 5.9 3.1 2.8 0 4.4-1.2 4.4-2.8 0-1.6-1.1-2.4-3.7-2.9l-3.1-.5c-4.7-.7-7-2.8-7-6.4 0-4.7 4.2-7.4 10-7.4 4.3 0 7.9 1.4 9.6 4l-4.3 1.7z"/>
      {/* Official AWS Smile Arrow */}
      <path d="M78.4 39c-11.6 8.5-28.7 13-43.3 13-20.4 0-38.9-7.6-48.1-19.9-.7-1 0-2 1.1-1.3 13.2 8.9 29.8 14.2 47 14.2 13 0 27.2-3.4 40.1-11.3 1.7-1 3.2 1.2 1.6 2.6z"/>
      <path d="M82.2 35.2c-.8-1.1-5.6-1.3-7.7-1.1-.6 0-.8-.6-.2-1.1 3.6-2.6 9.4-2 10.4-.6 1.1 1.3-.4 7.3-3.8 10.1-.6.5-1.1.2-.8-.5.8-2.4 3-5.8 2.1-6.8z"/>
    </g>
  </svg>
);

const AwsMigrationModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  // animStage: 0 = Supabase Active/Transitioning, 1 = Data Packet Transfer, 2 = AWS Cloud Active Complete
  const [animStage, setAnimStage] = useState(0);

  const startAnimationSequence = () => {
    setAnimStage(0);

    const t1 = setTimeout(() => {
      setAnimStage(1);
    }, 1400);

    const t2 = setTimeout(() => {
      setAnimStage(2);
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  };

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('cloudvault_aws_migration_notice_dismissed');
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        startAnimationSequence();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('cloudvault_aws_migration_notice_dismissed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-xl animate-fade-in transition-all duration-500 ${
        animStage === 0 ? 'animate-background-rumble' : ''
      }`}
    >
      {/* Modal Dialog Container - Popup remains stable & steady without shaking */}
      <div 
        className={`max-w-lg w-full p-6 md:p-8 shadow-2xl border bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 rounded-3xl relative overflow-hidden transition-all duration-500 backdrop-blur-2xl ${
          animStage === 0
            ? 'border-emerald-500/60 dark:border-emerald-500/50 shadow-[0_0_40px_rgba(62,207,142,0.25)]'
            : animStage === 1
            ? 'border-amber-500/60 dark:border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.25)]'
            : 'border-orange-500/50 dark:border-orange-500/40 shadow-[0_0_40px_rgba(255,153,0,0.25)]'
        }`}
        role="dialog"
        aria-labelledby="aws-migration-title"
        aria-describedby="aws-migration-desc"
      >
        {/* Glowing Top Ambient Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500" />
        
        {/* Subtle Background Glow Spheres */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleDismiss}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200 cursor-pointer"
            title="Close Notice"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- MIGRATION ANIMATION HERO PANEL --- */}
        <div className="relative mb-6 pt-5 pb-5 px-4 bg-slate-50/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center">

          {/* Grid lines background effect */}
          <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:14px_14px] opacity-20 dark:opacity-30 pointer-events-none" />

          {/* Dynamic Status Badge */}
          <div className="relative z-10 mb-5">
            {animStage === 0 && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-semibold tracking-wide animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                INITIATING SUPABASE SWITCH...
              </span>
            )}
            {animStage === 1 && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-mono font-semibold tracking-wide animate-pulse">
                <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-bounce" />
                MIGRATING DATA PACKETS → AWS
              </span>
            )}
            {animStage >= 2 && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-700 dark:text-orange-400 text-[11px] font-mono font-semibold tracking-wide shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <span className="w-2 h-2 rounded-full bg-orange-500 dark:bg-orange-400 animate-pulse" />
                DATABASE ACTIVE ON AWS CLOUD ⚡
              </span>
            )}
          </div>

          {/* Visual Nodes Pipeline (Supabase DB ---> AWS Cloud) */}
          <div className="relative z-10 flex items-center justify-between w-full max-w-sm px-3">
            
            {/* Supabase Node */}
            <div className="flex flex-col items-center gap-2">
              <div 
                className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                  animStage === 0
                    ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-400 shadow-[0_0_25px_rgba(62,207,142,0.4)] scale-105'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <SupabaseLogo className="w-9 h-9" />
              </div>
              <span className={`text-xs font-semibold tracking-wide flex items-center gap-1 ${animStage === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                <Database className="w-3 h-3" /> Supabase DB
              </span>
            </div>

            {/* Middle Laser Stream */}
            <div className="flex-1 mx-4 flex flex-col items-center justify-center relative">
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden relative shadow-inner">
                {animStage >= 1 && (
                  <div className="absolute inset-y-0 bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500 rounded-full w-full animate-laser-stream" />
                )}
              </div>
              <div className="mt-1.5 flex items-center text-slate-400">
                <ArrowRight className={`w-5 h-5 transition-all duration-500 ${animStage === 1 ? 'text-amber-500 dark:text-amber-400 scale-125 animate-bounce' : 'text-slate-400 dark:text-slate-600'}`} />
              </div>
            </div>

            {/* AWS Cloud Node */}
            <div className="flex flex-col items-center gap-2">
              <div 
                className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                  animStage >= 2
                    ? 'bg-orange-500/15 dark:bg-orange-500/20 border-orange-400 shadow-[0_0_30px_rgba(255,153,0,0.5)] scale-105'
                    : animStage === 1
                    ? 'bg-amber-500/10 border-amber-500/40 animate-pulse'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50'
                }`}
              >
                <AwsLogo className="w-11 h-11" />
              </div>
              <span className={`text-xs font-semibold tracking-wide flex items-center gap-1 ${animStage >= 2 ? 'text-orange-600 dark:text-orange-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}>
                <Server className="w-3 h-3" /> AWS Cloud
              </span>
            </div>

          </div>
        </div>

        {/* --- MODAL CONTENT BODY --- */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              System Infrastructure Update
            </span>
          </div>

          <h2 id="aws-migration-title" className="text-xl md:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            Database Switching to AWS Cloud
          </h2>

          <p id="aws-migration-desc" className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We are upgrading our database infrastructure from Supabase to <strong>Amazon Web Services (AWS)</strong> to deliver higher reliability, ultra-fast global performance, and enterprise-grade security.
          </p>

          <div className="p-3.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <span>
              <strong>Live Migration Notice:</strong> You might experience temporary minor disruptions, slightly slower response times, or unexpected database errors. Please ignore these brief issues while the transition finishes.
            </span>
          </div>
        </div>

        {/* --- ACTION BUTTON --- */}
        <button
          onClick={handleDismiss}
          className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 transition-all duration-200 flex items-center justify-center gap-2 text-sm active:scale-[0.98] cursor-pointer"
        >
          <CheckCircle className="w-4.5 h-4.5" />
          <span>Understood, Got It</span>
        </button>
      </div>
    </div>
  );
};

export default AwsMigrationModal;

