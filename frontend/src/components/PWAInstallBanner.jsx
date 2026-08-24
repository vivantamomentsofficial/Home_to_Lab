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
  const [platform, setPlatform] = useState('android'); // 'android' | 'ios'
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (isStandalone()) return;
    if (localStorage.getItem('CLOUDVAULT_PWA_DISMISSED_V2')) return;

    if (isIOS()) {
      // iOS: show manual instructions banner
      setPlatform('ios');
      // Show after 2s delay so user can see the page first
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    } else {
      // Android/Chrome: intercept beforeinstallprompt
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
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-slide-up">
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        
        {/* Top color accent strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white leading-tight">Install CloudVault</h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Add to Home Screen for quick access
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors shrink-0 mt-0.5"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Android Install Button */}
          {platform === 'android' && (
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-900/40 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Add to Home Screen
            </button>
          )}

          {/* iOS Manual Instructions */}
          {platform === 'ios' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <Share className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Tap the <span className="font-bold text-white">Share</span> icon in Safari's bottom toolbar
                </p>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-green-500/20 border border-green-400/30 flex items-center justify-center shrink-0 text-green-400 font-bold text-xs">+</div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Scroll down and tap <span className="font-bold text-white">"Add to Home Screen"</span>
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
