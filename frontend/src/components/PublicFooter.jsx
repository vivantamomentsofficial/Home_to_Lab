import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const PublicFooter = () => {
  return (
    <footer className="py-10 px-4 sm:px-6 lg:px-[8%] bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-6 z-10 text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-primary/10 w-7 h-7 rounded-lg flex items-center justify-center text-brand-primary">
            <Shield className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-display font-bold text-slate-900 dark:text-slate-300 text-sm">CloudVault</span>
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold rounded-full ml-1">
            ● Online
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium">
          <Link to="/" className="hover:text-brand-primary transition">Home</Link>
          <span>•</span>
          <Link to="/blog" className="hover:text-brand-primary transition">Blog</Link>
          <span>•</span>
          <Link to="/about" className="hover:text-brand-primary transition">About Us</Link>
          <span>•</span>
          <Link to="/contact" className="hover:text-brand-primary transition">Contact Us</Link>
          <span>•</span>
          <Link to="/privacy-policy" className="hover:text-brand-primary transition">Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-brand-primary transition">Terms of Service</Link>
          <span>•</span>
          <Link to="/acceptable-use-policy" className="hover:text-brand-primary transition">Acceptable Use Policy</Link>
          <span>•</span>
          <Link to="/disclaimer" className="hover:text-brand-primary transition">Disclaimer</Link>
        </div>

        {/* Copyright */}
        <div className="text-center md:text-right text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} CloudVault. Home to Lab Bridge.
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
