import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const Disclaimer = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-200 font-sans relative overflow-x-hidden transition-colors duration-300">
      <PublicNavbar />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 pt-28 sm:pt-36 relative z-10 flex-1 w-full">
        <div className="glass-card p-6 sm:p-12 shadow-2xl space-y-8 animate-scale-up border-slate-200/80 dark:border-slate-800">
          
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

          <div className="space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            <p>
              The information and services provided on <strong>CloudVault</strong> (available at <code className="text-brand-primary font-mono text-xs bg-brand-primary/10 px-1.5 py-0.5 rounded">https://hometolab.in</code>) are for general educational, personal student file storage, and transient clipboard synchronization purposes only.
            </p>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
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
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
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
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">3</span>
                No Educational or Institutional Affiliation
              </h2>
              <p>
                CloudVault is an independent software tool developed for student productivity. Unless explicitly stated, CloudVault is not officially affiliated with, endorsed by, or sponsored by any specific university, college, or academic institution.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">4</span>
                Contact Support
              </h2>
              <p>If you have any questions regarding this disclaimer, please contact us:</p>
              <div className="text-xs font-bold text-brand-primary">
                <a href="mailto:aayushparekh26@gmail.com" className="hover:underline">aayushparekh26@gmail.com</a>
              </div>
            </section>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Disclaimer;
