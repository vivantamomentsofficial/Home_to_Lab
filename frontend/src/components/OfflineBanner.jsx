import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(!navigator.onLine);
  const [justCameBack, setJustCameBack] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setVisible(true);
      setJustCameBack(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setJustCameBack(true);
      setTimeout(() => {
        setVisible(false);
        setJustCameBack(false);
      }, 2500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop dimmer only when fully offline */}
      {isOffline && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[9998] pointer-events-none" />
      )}

      {/* Banner card */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-[9999] animate-scale-up">
        <div className="glass-card shadow-2xl overflow-hidden">
          
          {/* Status strip */}
          <div
            className={`h-[3px] w-full ${
              isOffline
                ? 'bg-gradient-to-r from-red-400 via-orange-400 to-red-400'
                : 'bg-gradient-to-r from-brand-primary via-sky-400 to-brand-primary-light'
            }`}
          />

          <div className="px-4 py-3.5 flex items-center gap-3.5">
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isOffline
                  ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                  : 'bg-brand-primary/10 dark:bg-brand-primary/20 border-brand-primary/20 dark:border-brand-primary/30'
              }`}
            >
              {isOffline ? (
                <WifiOff className="w-4.5 h-4.5 text-red-500 dark:text-red-400" />
              ) : (
                <Wifi className="w-4.5 h-4.5 text-brand-primary dark:text-brand-primary-light" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={`font-display font-bold text-[13px] leading-tight ${
                isOffline
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-800 dark:text-slate-100'
              }`}>
                {isOffline ? 'No Internet Connection' : 'Back Online!'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {isOffline
                  ? 'Connect to a network to upload, share & sync.'
                  : 'Your connection is restored. Resuming sync...'}
              </p>
            </div>

            {/* Pulsing indicator */}
            {isOffline && (
              <div className="shrink-0 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse [animation-delay:300ms]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OfflineBanner;
