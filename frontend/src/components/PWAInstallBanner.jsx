import React, { useState, useEffect } from 'react';
import { Download, X, Share, Smartphone } from 'lucide-react';

// Detect iOS Safari
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

// Detect if already installed as PWA
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState('android');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem('CLOUDVAULT_PWA_DISMISSED_V2')) return;

    if (isIOS()) {
      setPlatform('ios');
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    } else {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setPlatform('android');
        setTimeout(() => setShowBanner(true), 2000);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('CLOUDVAULT_PWA_DISMISSED_V2', 'true');
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-scale-up">
      {/* Glass card matching app design system */}
      <div className="glass-card shadow-2xl overflow-hidden">
        
        {/* Brand accent top strip */}
        <div className="h-[3px] w-full bg-gradient-to-r from-brand-primary via-sky-400 to-brand-primary-light" />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-3">
              {/* Icon bubble */}
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/20 border border-brand-primary/20 dark:border-brand-primary/30 flex items-center justify-center shrink-0">
                <Smartphone className="w-4.5 h-4.5 text-brand-primary dark:text-brand-primary-light" />
              </div>
              <div>
                <h4 className="font-display font-bold text-[13px] text-slate-800 dark:text-slate-100 leading-tight">
                  Install CloudVault
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Add to Home Screen for quick access
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 mt-0.5"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Android: native install button */}
          {platform === 'android' && (
            <button
              onClick={handleInstall}
              className="btn-primary w-full py-2.5 text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              Add to Home Screen
            </button>
          )}

          {/* iOS: manual step guide */}
          {platform === 'ios' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/10 dark:border-brand-primary/20">
                <div className="w-7 h-7 rounded-lg bg-brand-primary/10 dark:bg-brand-primary/20 border border-brand-primary/20 flex items-center justify-center shrink-0">
                  <Share className="w-3.5 h-3.5 text-brand-primary dark:text-brand-primary-light" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  Tap the <span className="font-bold text-slate-800 dark:text-white">Share</span> icon in Safari's bottom toolbar
                </p>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/10 dark:border-brand-primary/20">
                <div className="w-7 h-7 rounded-lg bg-brand-primary/10 dark:bg-brand-primary/20 border border-brand-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-brand-primary dark:text-brand-primary-light font-extrabold text-base leading-none">+</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  Scroll down and tap <span className="font-bold text-slate-800 dark:text-white">"Add to Home Screen"</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
