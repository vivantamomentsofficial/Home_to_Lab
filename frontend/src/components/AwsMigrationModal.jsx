import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';

const SupabaseLogo = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 106 106" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M58.37 98.766c-2.31 3.125-7.37 1.498-7.37-2.42V59.846h41.442c4.475 0 7.026 5.105 4.316 8.765L58.37 98.766z" fill="#3ECF8E"/>
    <path d="M47.63 7.234c2.31-3.125 7.37-1.498 7.37 2.42v36.5h-41.442c-4.475 0-7.026-5.105-4.316-8.765L47.63 7.234z" fill="#3ECF8E" fillOpacity="0.7"/>
  </svg>
);

const AwsLogo = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 50 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.5 12.3c-.6-.5-1.5-.7-2.6-.7-2 0-3.3 1.1-3.3 2.9 0 1.6 1 2.5 2.9 2.8l1.4.2c1.2.2 1.7.6 1.7 1.3 0 .8-.8 1.4-2 1.4-1.3 0-2.3-.6-2.7-1.4l-2.1 1.2c.8 1.5 2.5 2.5 4.8 2.5 2.7 0 4.5-1.4 4.5-3.6 0-1.8-1.1-2.7-3.1-3l-1.3-.2c-1.1-.2-1.5-.5-1.5-1.1 0-.6.6-1.1 1.6-1.1.9 0 1.7.4 2.1 1l2.2-1.3zM25.3 11.8h-2.4l-2.6 10.4h2.4l.6-2.6h3.1l.6 2.6h2.4l-4.1-10.4zm-1.5 6l1-4.4 1 4.4h-2zM38.5 11.8l-1.9 7.6-2-7.6h-2.4l-2 7.6-1.8-7.6h-2.5l2.9 10.4h2.5l2-7.3 2 7.3h2.5l3-10.4h-2.3z" fill="#FF9900"/>
    <path d="M43.7 21.2c-5.4 3.9-13.3 6-20.1 6-9.5 0-18-3.5-22.3-9.3-.3-.4 0-.9.5-.6 6.1 3.5 13.8 5.7 21.8 5.7 6 0 12.6-1.4 18.6-4.3.8-.4 1.5.4 1.5.95v1.55z" fill="#FF9900"/>
    <path d="M45.5 19.4c-.4-.5-2.6-.6-3.6-.5-.3 0-.4-.3-.1-.5 1.7-1.2 4.4-1 4.9-.3.5.6-.2 3.4-1.8 4.7-.3.2-.5.1-.4-.2.4-1.1 1.4-2.7 1-3.2z" fill="#FF9900"/>
  </svg>
);

const AwsMigrationModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  // animStage: 0 = Supabase Shaking, 1 = Data Transfer Beam, 2 = AWS Active Complete
  const [animStage, setAnimStage] = useState(0);

  const startAnimationSequence = () => {
    setAnimStage(0);

    // Stage 0 -> Stage 1 after 1.4s
    const t1 = setTimeout(() => {
      setAnimStage(1);
    }, 1400);

    // Stage 1 -> Stage 2 after 2.6s
    const t2 = setTimeout(() => {
      setAnimStage(2);
    }, 2600);

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
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('cloudvault_aws_migration_notice_dismissed', 'true');
    setIsOpen(false);
  };

  const handleReplay = () => {
    startAnimationSequence();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="glass-card max-w-lg w-full p-6 md:p-8 shadow-2xl border border-amber-500/40 bg-white/95 dark:bg-slate-900/95 rounded-3xl relative overflow-hidden animate-scale-up"
        role="dialog"
        aria-labelledby="aws-migration-title"
        aria-describedby="aws-migration-desc"
      >
        {/* Animated Top Glow Border Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 animate-pulse" />

        {/* Action Controls (Replay + Close) */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
          <button
            onClick={handleReplay}
            className="p-1.5 text-slate-400 hover:text-amber-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Replay Migration Animation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Notice"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- COOL MIGRATION ANIMATION HERO DISPLAY --- */}
        <div className="relative mb-6 pt-2 pb-4 px-4 bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center">

          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] opacity-30" />

          {/* Migration Stage Badge */}
          <div className="relative z-10 mb-4">
            {animStage === 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                INITIATING SUPABASE SWITCH...
              </span>
            )}
            {animStage === 1 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[11px] font-mono font-semibold animate-pulse">
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                MIGRATING DATA PACKETS → AWS
              </span>
            )}
            {animStage >= 2 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[11px] font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                DATABASE ACTIVE ON AWS CLOUD ⚡
              </span>
            )}
          </div>

          {/* Visual Nodes Pipeline (Supabase ---> AWS) */}
          <div className="relative z-10 flex items-center justify-between w-full max-w-xs px-2">
            
            {/* Supabase Node */}
            <div className="flex flex-col items-center gap-1.5">
              <div 
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                  animStage === 0
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_20px_rgba(62,207,142,0.6)] animate-icon-shake scale-110'
                    : 'bg-slate-800/80 border-slate-700 opacity-60'
                }`}
              >
                <SupabaseLogo className="w-8 h-8" />
              </div>
              <span className={`text-[11px] font-bold tracking-wide ${animStage === 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                Supabase DB
              </span>
            </div>

            {/* Middle Animated Laser Pipeline */}
            <div className="flex-1 mx-3 flex flex-col items-center justify-center relative">
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden relative">
                {animStage >= 1 && (
                  <div className="absolute inset-y-0 bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500 rounded-full w-full animate-laser-stream" />
                )}
              </div>
              <div className="mt-1 flex items-center text-slate-500">
                <ArrowRight className={`w-5 h-5 transition-colors duration-500 ${animStage === 1 ? 'text-amber-400 animate-bounce' : 'text-slate-600'}`} />
              </div>
            </div>

            {/* AWS Cloud Node */}
            <div className="flex flex-col items-center gap-1.5">
              <div 
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-700 ${
                  animStage >= 2
                    ? 'bg-orange-500/20 border-orange-400 shadow-[0_0_30px_rgba(255,153,0,0.8)] animate-glow-ring scale-110'
                    : animStage === 1
                    ? 'bg-amber-500/10 border-amber-500/30 scale-105 animate-pulse'
                    : 'bg-slate-800/80 border-slate-700 opacity-40'
                }`}
              >
                <AwsLogo className="w-9 h-9" />
              </div>
              <span className={`text-[11px] font-bold tracking-wide ${animStage >= 2 ? 'text-orange-400 font-extrabold' : 'text-slate-400'}`}>
                AWS Cloud
              </span>
            </div>

          </div>
        </div>

        {/* --- MODAL TEXT BODY --- */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              System Maintenance Announcement
            </span>
          </div>

          <h2 id="aws-migration-title" className="text-xl font-extrabold font-display text-slate-800 dark:text-white tracking-tight">
            Database Switching to AWS Cloud
          </h2>

          <p id="aws-migration-desc" className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We are migrating our database infrastructure from Supabase to <strong>Amazon Web Services (AWS)</strong> to deliver higher reliability, ultra-fast speeds, and enhanced security.
          </p>

          <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <span>
              <strong>Note:</strong> During this live migration, you might encounter minor temporary disruptions, slower load times, or unexpected database errors. Please ignore these small issues while we complete the transition.
            </span>
          </div>
        </div>

        {/* --- ACTION BUTTON --- */}
        <button
          onClick={handleDismiss}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 px-5 rounded-2xl shadow-lg hover:shadow-orange-500/25 transition-all duration-200 flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Understood, Got It</span>
        </button>
      </div>
    </div>
  );
};

export default AwsMigrationModal;
