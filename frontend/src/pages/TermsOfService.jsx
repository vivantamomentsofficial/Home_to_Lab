import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, FileText, Mail } from 'lucide-react';

const TermsOfService = () => {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider mb-3">
              <FileText className="w-3.5 h-3.5" />
              Terms of Service
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-800 dark:text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Effective Date: September 4, 2026 | Last Updated: September 4, 2026
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              By accessing or creating an account on <strong>CloudVault</strong> (Home to Lab), you agree to comply with and be bound by the following Terms of Service.
            </p>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">1</span>
                Acceptable Use Policy
              </h2>
              <p>CloudVault is designed as a student cloud storage bridge. Users agree NOT to upload or share:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-500 dark:text-slate-400 pl-2">
                <li>Malware, viruses, ransomware, or malicious scripts.</li>
                <li>Copyrighted material without authorization.</li>
                <li>Illegal, fraudulent, or harmful content.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">2</span>
                Storage Quotas & Share Codes
              </h2>
              <p>
                Default account storage quota is set to 100MB per account. Temporary 6-digit share codes expire automatically after 30 minutes for security purposes.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">3</span>
                Contact & Support
              </h2>
              <p>If you have any questions or account issues, please contact support:</p>
              <div className="flex items-center gap-2 text-brand-primary font-bold">
                <Mail className="w-4 h-4" />
                <a href="mailto:aayushparekh26@gmail.com" className="hover:underline">aayushparekh26@gmail.com</a>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2026 CloudVault (Home to Lab). All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy-policy" className="hover:text-brand-primary transition">Privacy Policy</Link>
              <span>•</span>
              <Link to="/login" className="hover:text-brand-primary transition">Login</Link>
              <span>•</span>
              <Link to="/register" className="hover:text-brand-primary transition">Register</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
