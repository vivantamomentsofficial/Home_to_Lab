import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * OfflineBanner — Global popup that appears whenever the device loses network.
 * Shows a non-dismissable overlay when offline, auto-hides when back online.
 */
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
      // Show "back online" message briefly, then hide
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
      {/* Backdrop dimmer when fully offline */}
      {isOffline && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[9998] pointer-events-none" />
      )}

      {/* Popup Banner */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-[9999] transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div
          className={`rounded-2xl border shadow-2xl overflow-hidden ${
            isOffline
              ? 'bg-gradient-to-br from-red-950 to-slate-900 border-red-700/40'
              : 'bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-600/40'
          }`}
        >
          {/* Top color strip */}
          <div
            className={`h-0.5 w-full ${
              isOffline
                ? 'bg-gradient-to-r from-red-500 via-orange-500 to-red-500'
                : 'bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400'
            }`}
          />

          <div className="px-4 py-3.5 flex items-center gap-3.5">
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isOffline
                  ? 'bg-red-500/20 border border-red-500/30'
                  : 'bg-emerald-500/20 border border-emerald-500/30'
              }`}
            >
              {isOffline ? (
                <WifiOff className="w-5 h-5 text-red-400" />
              ) : (
                <RefreshCw className="w-5 h-5 text-emerald-400" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-bold text-xs leading-tight ${
                  isOffline ? 'text-red-300' : 'text-emerald-300'
                }`}
              >
                {isOffline ? 'No Internet Connection' : 'Back Online!'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {isOffline
                  ? 'Connect to a network to upload, share & sync files.'
                  : 'Your connection has been restored. Resuming sync...'}
              </p>
            </div>

            {/* Animated dot indicator */}
            {isOffline && (
              <div className="shrink-0 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse [animation-delay:200ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse [animation-delay:400ms]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OfflineBanner;
