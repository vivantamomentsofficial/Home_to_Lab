import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Check, Shield } from 'lucide-react';

const CookieConsentBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cloudvault_cookie_consent');
    if (!consent) {
      // Delay display slightly for smooth page load UX
      const timer = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cloudvault_cookie_consent', 'accepted');
    setShowBanner(false);
  };

  const handleDeclineNonEssential = () => {
    localStorage.setItem('cloudvault_cookie_consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[9999] animate-slide-up">
      <div className="glass-card p-5 shadow-2xl border border-brand-primary/30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl relative space-y-3.5">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
              <Cookie className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold font-display text-slate-800 dark:text-white">
              Cookie &amp; Privacy Choices
            </h3>
          </div>
          <button
            onClick={handleDeclineNonEssential}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          We use essential cookies to maintain secure sessions and <strong>Google AdSense</strong> advertising cookies to analyze traffic and fund server infrastructure. Learn more in our{' '}
          <Link to="/privacy-policy" className="text-brand-primary font-bold hover:underline">
            Privacy Policy
          </Link>.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={handleAcceptAll}
            className="flex-1 btn-primary py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Check className="w-3.5 h-3.5" /> Accept All
          </button>
          <button
            onClick={handleDeclineNonEssential}
            className="flex-1 btn-secondary py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Essential Only
          </button>
        </div>

      </div>
    </div>
  );
};

export default CookieConsentBanner;
