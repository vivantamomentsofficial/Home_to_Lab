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

const AwsLogo = ({ className = "w-11 h-8" }) => (
  <svg className={className} viewBox="0 0 304 182" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      className="fill-[#252F3E] dark:fill-slate-100" 
      d="M86.4,66.4c0,3.7,0.4,6.7,1.1,8.9c0.8,2.2,1.8,4.6,3.2,7.2c0.5,0.8,0.7,1.6,0.7,2.3c0,1-0.6,2-1.9,3l-6.3,4.2c-0.9,0.6-1.8,0.9-2.6,0.9c-1,0-2-0.5-3-1.4C76.2,90,75,88.4,74,86.8c-1-1.7-2-3.6-3.1-5.9c-7.8,9.2-17.6,13.8-29.4,13.8c-8.4,0-15.1-2.4-20-7.2c-4.9-4.8-7.4-11.2-7.4-19.2c0-8.5,3-15.4,9.1-20.6c6.1-5.2,14.2-7.8,24.5-7.8c3.4,0,6.9,0.3,10.6,0.8c3.7,0.5,7.5,1.3,11.5,2.2v-7.3c0-7.6-1.6-12.9-4.7-16c-3.2-3.1-8.6-4.6-16.3-4.6c-3.5,0-7.1,0.4-10.8,1.3c-3.7,0.9-7.3,2-10.8,3.4c-1.6,0.7-2.8,1.1-3.5,1.3c-0.7,0.2-1.2,0.3-1.6,0.3c-1.4,0-2.1-1-2.1-3.1v-4.9c0-1.6,0.2-2.8,0.7-3.5c0.5-0.7,1.4-1.4,2.8-2.1c3.5-1.8,7.7-3.3,12.6-4.5c4.9-1.3,10.1-1.9,15.6-1.9c11.9,0,20.6,2.7,26.2,8.1c5.5,5.4,8.3,13.6,8.3,24.6V66.4z M45.8,81.6c3.3,0,6.7-0.6,10.3-1.8c3.6-1.2,6.8-3.4,9.5-6.4c1.6-1.9,2.8-4,3.4-6.4c0.6-2.4,1-5.3,1-8.7v-4.2c-2.9-0.7-6-1.3-9.2-1.7c-3.2-0.4-6.3-0.6-9.4-0.6c-6.7,0-11.6,1.3-14.9,4c-3.3,2.7-4.9,6.5-4.9,11.5c0,4.7,1.2,8.2,3.7,10.6C37.7,80.4,41.2,81.6,45.8,81.6z M126.1,92.4c-1.8,0-3-0.3-3.8-1c-0.8-0.6-1.5-2-2.1-3.9L96.7,10.2c-0.6-2-0.9-3.3-0.9-4c0-1.6,0.8-2.5,2.4-2.5h9.8c1.9,0,3.2,0.3,3.9,1c0.8,0.6,1.4,2,2,3.9l16.8,66.2l15.6-66.2c0.5-2,1.1-3.3,1.9-3.9c0.8-0.6,2.2-1,4-1h8c1.9,0,3.2,0.3,4,1c0.8,0.6,1.5,2,1.9,3.9l15.8,67l17.3-67c0.6-2,1.3-3.3,2-3.9c0.8-0.6,2.1-1,3.9-1h9.3c1.6,0,2.5,0.8,2.5,2.5c0,0.5-0.1,1-0.2,1.6c-0.1,0.6-0.3,1.4-0.7,2.5l-24.1,77.3c-0.6,2-1.3,3.3-2.1,3.9c-0.8,0.6-2.1,1-3.8,1h-8.6c-1.9,0-3.2-0.3-4-1c-0.8-0.7-1.5-2-1.9-4L156,23l-15.4,64.4c-0.5,2-1.1,3.3-1.9,4c-0.8,0.7-2.2,1-4,1H126.1z M254.6,95.1c-5.2,0-10.4-0.6-15.4-1.8c-5-1.2-8.9-2.5-11.5-4c-1.6-0.9-2.7-1.9-3.1-2.8c-0.4-0.9-0.6-1.9-0.6-2.8v-5.1c0-2.1,0.8-3.1,2.3-3.1c0.6,0,1.2,0.1,1.8,0.3c0.6,0.2,1.5,0.6,2.5,1c3.4,1.5,7.1,2.7,11,3.5c4,0.8,7.9,1.2,11.9,1.2c6.3,0,11.2-1.1,14.6-3.3c3.4-2.2,5.2-5.4,5.2-9.5c0-2.8-0.9-5.1-2.7-7c-1.8-1.9-5.2-3.6-10.1-5.2L246,52c-7.3-2.3-12.7-5.7-16-10.2c-3.3-4.4-5-9.3-5-14.5c0-4.2,0.9-7.9,2.7-11.1c1.8-3.2,4.2-6,7.2-8.2c3-2.3,6.4-4,10.4-5.2c4-1.2,8.2-1.7,12.6-1.7c2.2,0,4.5,0.1,6.7,0.4c2.3,0.3,4.4,0.7,6.5,1.1c2,0.5,3.9,1,5.7,1.6c1.8,0.6,3.2,1.2,4.2,1.8c1.4,0.8,2.4,1.6,3,2.5c0.6,0.8,0.9,1.9,0.9,3.3v4.7c0,2.1-0.8,3.2-2.3,3.2c-0.8,0-2.1-0.4-3.8-1.2c-5.7-2.6-12.1-3.9-19.2-3.9c-5.7,0-10.2,0.9-13.3,2.8c-3.1,1.9-4.7,4.8-4.7,8.9c0,2.8,1,5.2,3,7.1c2,1.9,5.7,3.8,11,5.5l14.2,4.5c7.2,2.3,12.4,5.5,15.5,9.6c3.1,4.1,4.6,8.8,4.6,14c0,4.3-0.9,8.2-2.6,11.6c-1.8,3.4-4.2,6.4-7.3,8.8c-3.1,2.5-6.8,4.3-11.1,5.6C264.4,94.4,259.7,95.1,254.6,95.1z"
    />
    <g fill="#FF9900">
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M273.5,143.7c-32.9,24.3-80.7,37.2-121.8,37.2c-57.6,0-109.5-21.3-148.7-56.7c-3.1-2.8-0.3-6.6,3.4-4.4c42.4,24.6,94.7,39.5,148.8,39.5c36.5,0,76.6-7.6,113.5-23.2C274.2,133.6,278.9,139.7,273.5,143.7z"
      />
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M287.2,128.1c-4.2-5.4-27.8-2.6-38.5-1.3c-3.2,0.4-3.7-2.4-0.8-4.5c18.8-13.2,49.7-9.4,53.3-5c3.6,4.5-1,35.4-18.6,50.2c-2.7,2.3-5.3,1.1-4.1-1.9C282.5,155.7,291.4,133.4,287.2,128.1z"
      />
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
                <AwsLogo className="w-11 h-8" />
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

