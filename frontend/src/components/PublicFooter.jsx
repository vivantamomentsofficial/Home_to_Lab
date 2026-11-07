import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Shield, Code2 } from 'lucide-react';

const PublicFooter = () => {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  useEffect(() => {
    if (!isCreatorOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsCreatorOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreatorOpen]);

  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 relative z-20 mt-auto text-slate-600 dark:text-slate-300">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand & Slogan Column */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="bg-sky-100 dark:bg-sky-500/15 w-10 h-10 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-300">
                <Shield className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-bold text-2xl text-slate-900 dark:text-white tracking-tight font-display">
                CloudVault
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-500 max-w-sm">
              Secure, fast, and effortless temporary file sharing &amp; clipboard sync between home computers and college lab terminals. Free online compiler for C, C++, Java, Python, and SQL.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-mono text-[11px] font-bold border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Operational
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-display">
              Quick Navigation
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/" className="hover:text-brand-primary transition-colors flex items-center gap-1.5">
                  Home (Lab File Transfer)
                </Link>
              </li>
              <li>
                <Link
                  to="/compiler"
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5 font-bold text-blue-600"
                  title="Free In-Browser Online Compiler & IDE"
                >
                  <Code2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Free Online Compiler &amp; IDE</span>
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-brand-primary transition-colors flex items-center gap-1.5">
                  Blog &amp; Practical Guides
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-brand-primary transition-colors flex items-center gap-1.5">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-brand-primary transition-colors flex items-center gap-1.5">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-display">
              Legal &amp; Policies
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/privacy-policy" className="hover:text-brand-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-brand-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/acceptable-use-policy" className="hover:text-brand-primary transition-colors">
                  Acceptable Use Policy
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="hover:text-brand-primary transition-colors">
                  Website Disclaimer
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2025–2026 CloudVault. Home to Lab Bridge. All rights reserved.</p>
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <span>Made by</span>
            <button
              type="button"
              onClick={() => setIsCreatorOpen(true)}
              className="creator-link font-semibold text-slate-700 dark:text-slate-200"
              aria-haspopup="dialog"
              aria-label="Learn more about Aayush Parekh"
            >
              Aayush Parekh
            </button>
            <i className="fa-solid fa-heart text-red-500 text-sm ml-0.5" aria-hidden="true"></i>
          </div>
        </div>

      </div>

      {isCreatorOpen && createPortal(
        <div
          className="creator-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center px-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCreatorOpen(false);
          }}
        >
          <div
            className="creator-glass-modal relative w-full max-w-md text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="creator-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsCreatorOpen(false);
              }}
              className="creator-modal-close absolute right-5 top-5 z-20"
              aria-label="Close creator information"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
            <div className="creator-modal-content relative z-10 px-8 py-10 sm:px-12 sm:py-12">
              <div className="creator-modal-mark" aria-hidden="true">
                <i className="fa-solid fa-code"></i>
              </div>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600 dark:text-rose-300">
                The person behind CloudVault
              </p>
              <h2 id="creator-modal-title" className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                Aayush Parekh
              </h2>
              <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-slate-600 dark:text-slate-300">
                Built with care to make moving from home to the lab feel simple. Need help or want to say hello?
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 text-sm">
                <a className="creator-contact-link" href="mailto:aayushparekh26@gmail.com">
                  <i className="fa-solid fa-envelope" aria-hidden="true"></i>
                  aayushparekh26@gmail.com
                </a>
                <a
                  className="creator-contact-link"
                  href="https://www.instagram.com/aayush.2667/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="fa-brands fa-instagram" aria-hidden="true"></i>
                  @aayush.2667
                </a>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </footer>
  );
};

export default PublicFooter;
