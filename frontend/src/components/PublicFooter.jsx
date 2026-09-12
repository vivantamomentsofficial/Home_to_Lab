import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Heart, Sparkles } from 'lucide-react';

const PublicFooter = () => {
  return (
    <footer className="w-full bg-white/90 dark:bg-slate-950/95 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl relative z-20 mt-auto text-slate-600 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand & Slogan Column */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary">
                <Shield className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
                  Cloud<span className="text-brand-primary">Vault</span>
                </span>
                <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
                  Home to Lab, Instantly.
                </p>
              </div>
            </Link>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-sm">
              Secure, fast, and effortless temporary file sharing &amp; clipboard sync between home computers and college lab terminals.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/20">
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
                  Home
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-brand-primary transition-colors flex items-center gap-1.5">
                  Blog &amp; Guides
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
        <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} CloudVault. Home to Lab Bridge. All rights reserved.</p>
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <span>Built for students with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
          </div>
        </div>

      </div>
    </footer>
  );
};

export default PublicFooter;
