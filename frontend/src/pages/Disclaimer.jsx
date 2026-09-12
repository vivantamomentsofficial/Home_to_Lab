import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, AlertTriangle, FileText, Lock, ExternalLink } from 'lucide-react';

const Disclaimer = () => {
  return (
    <div className="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-200 font-sans relative overflow-x-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="glow-orb glow-orb-primary"></div>
      <div className="glow-orb glow-orb-accent"></div>

      {/* Header / Nav */}
      <header className="border-b border-brand-border-light dark:border-brand-border-dark bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-brand-primary stroke-[2.5]" />
            <span className="font-display font-black text-xl text-slate-800 dark:text-white">
              Cloud<span className="text-brand-primary">Vault</span>
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <div className="glass-card p-8 md:p-12 shadow-2xl space-y-8 animate-scale-up">
          
          {/* Title Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <AlertTriangle className="w-3.5 h-3.5" />
              Legal &amp; Policy Notice
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-800 dark:text-white tracking-tight">
              Website Disclaimer
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Effective Date: September 4, 2026 | Last Updated: September 12, 2026
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              The information and services provided on <strong>CloudVault</strong> (available at <code className="text-brand-primary font-mono text-xs bg-brand-primary/10 px-1.5 py-0.5 rounded">https://hometolab.vercel.app</code>) are for general educational, personal student file storage, and transient clipboard synchronization purposes only.
            </p>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">1</span>
                Transient Service &amp; Storage Limits
              </h2>
              <p>
                CloudVault is designed as a temporary file and clipboard bridge between home computers and public library/lab terminals. While we strive to maintain 99.9% availability:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-500 dark:text-slate-400 pl-2">
                <li>Temporary 6-digit share codes automatically expire after 30 minutes.</li>
                <li>Files marked as "Burn-After-Reading" are purged permanently upon download.</li>
                <li>Users are advised to keep personal backups of all critical files and project assignments. CloudVault shall not be held liable for accidental file loss or expired share links.</li>
              </ul>
            </section>

            {/* Section 2 - AdSense & Third Party Links */}
            <section className="space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">2</span>
                Advertising &amp; Third-Party Content Disclosure
              </h2>
              <p>
                CloudVault participates in the <strong>Google AdSense</strong> publisher program. Third-party vendors, including Google, use cookies to serve advertisements based on a user's previous visits to our website or other websites.
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-500 dark:text-slate-400">
                <li>Advertisements displayed on CloudVault do not constitute an endorsement or recommendation by CloudVault.</li>
                <li>CloudVault is not responsible for the content, privacy policies, or practices of external websites linked within advertisements.</li>
                <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-brand-primary font-bold hover:underline inline-flex items-center gap-1">Google Ads Settings <ExternalLink className="w-3 h-3" /></a>.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">3</span>
                No Educational or Institutional Affiliation
              </h2>
              <p>
                CloudVault is an independent software tool developed for student productivity. Unless explicitly stated, CloudVault is not officially affiliated with, endorsed by, or sponsored by any specific university, college, or academic institution.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">4</span>
                Contact Support
              </h2>
              <p>If you have any questions regarding this disclaimer, please contact us:</p>
              <div className="text-xs font-bold text-brand-primary">
                <a href="mailto:aayushparekh26@gmail.com" className="hover:underline">aayushparekh26@gmail.com</a>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2026 CloudVault (Home to Lab). All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/about" className="hover:text-brand-primary transition">About Us</Link>
              <span>•</span>
              <Link to="/contact" className="hover:text-brand-primary transition">Contact Us</Link>
              <span>•</span>
              <Link to="/privacy-policy" className="hover:text-brand-primary transition">Privacy Policy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-brand-primary transition">Terms of Service</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Disclaimer;
