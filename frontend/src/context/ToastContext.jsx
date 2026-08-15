import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext({
  showToast: (message, type = 'info') => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type) => {
    const iconClass = "w-5 h-5 flex-shrink-0";
    switch (type) {
      case 'success':
        return <CheckCircle2 className={`${iconClass} text-green-500`} />;
      case 'danger':
        return <AlertTriangle className={`${iconClass} text-red-500`} />;
      case 'warning':
        return <AlertCircle className={`${iconClass} text-amber-500`} />;
      case 'info':
      default:
        return <Info className={`${iconClass} text-sky-500`} />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-500/20 bg-green-50 dark:bg-green-950/20';
      case 'danger':
        return 'border-red-500/20 bg-red-50 dark:bg-red-950/20';
      case 'warning':
        return 'border-amber-500/20 bg-amber-50 dark:bg-amber-950/20';
      case 'info':
      default:
        return 'border-sky-500/20 bg-sky-50 dark:bg-sky-950/20';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast container overlay */}
      <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-md animate-scale-up ${getBorderColor(
              toast.type
            )}`}
          >
            {getIcon(toast.type)}
            <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 break-words">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
