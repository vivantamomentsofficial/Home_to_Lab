import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext({
  showToast: (message, type = 'info', duration = null) => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    // Clear timer if exists
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', customDuration = null) => {
    if (!message) return;

    // Determine auto-dismiss timeout based on type
    const duration = customDuration || (
      type === 'info' ? 2200 :
      type === 'success' ? 2800 :
      3800 // danger or warning
    );

    setToasts((prev) => {
      // 1. DEDUPLICATION: If an identical toast already exists, don't duplicate
      const existing = prev.find((t) => t.message === message);
      if (existing) {
        // Reset its timer
        if (timersRef.current.has(existing.id)) {
          clearTimeout(timersRef.current.get(existing.id));
        }
        const timerId = setTimeout(() => removeToast(existing.id), duration);
        timersRef.current.set(existing.id, timerId);
        return prev;
      }

      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const timerId = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timerId);

      // Keep max 2 toasts at a time on screen to avoid clutter
      const trimmed = prev.length >= 2 ? prev.slice(prev.length - 1) : prev;
      return [...trimmed, { id, message, type }];
    });
  }, [removeToast]);

  const getIcon = (type) => {
    const iconClass = "w-4.5 h-4.5 flex-shrink-0 mt-0.5";
    switch (type) {
      case 'success':
        return <CheckCircle2 className={`${iconClass} text-emerald-500`} />;
      case 'danger':
        return <AlertTriangle className={`${iconClass} text-rose-500`} />;
      case 'warning':
        return <AlertCircle className={`${iconClass} text-amber-500`} />;
      case 'info':
      default:
        return <Info className={`${iconClass} text-sky-500`} />;
    }
  };

  const getToastStyle = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/25 bg-white/95 dark:bg-slate-900/95 shadow-emerald-500/5 text-slate-850 dark:text-slate-100';
      case 'danger':
        return 'border-rose-500/25 bg-white/95 dark:bg-slate-900/95 shadow-rose-500/5 text-slate-850 dark:text-slate-100';
      case 'warning':
        return 'border-amber-500/25 bg-white/95 dark:bg-slate-900/95 shadow-amber-500/5 text-slate-850 dark:text-slate-100';
      case 'info':
      default:
        return 'border-sky-500/25 bg-white/95 dark:bg-slate-900/95 shadow-sky-500/5 text-slate-850 dark:text-slate-100';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast container overlay - positioned safely above mobile bottom nav bar (bottom-20) and bottom-6 on desktop */}
      <div 
        className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none transition-all duration-200"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-xl backdrop-blur-xl animate-scale-up cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] ${getToastStyle(
              toast.type
            )}`}
          >
            {getIcon(toast.type)}
            <div className="flex-1 text-xs sm:text-sm font-semibold break-words leading-snug">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded-lg transition-colors shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
