import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Mail } from 'lucide-react';

const PrivacyPolicy = () => {
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
              <Lock className="w-3.5 h-3.5" />
              Legal & Privacy
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-800 dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Effective Date: September 4, 2026 | Last Updated: September 4, 2026
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              Welcome to <strong>CloudVault</strong> (also known as <em>Home to Lab</em>). We are committed to protecting your privacy, securing your personal assignment files, and ensuring transparent data management practices. This Privacy Policy explains how we collect, use, and protect your information when using our website at <code className="text-brand-primary font-mono text-xs bg-brand-primary/10 px-1.5 py-0.5 rounded">https://hometolab.vercel.app</code>.
            </p>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">1</span>
                Information We Collect
              </h2>
              <p>We collect essential information required to deliver personal cloud storage and text clipboard transfer services:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-500 dark:text-slate-400 pl-2">
                <li><strong className="text-slate-800 dark:text-slate-200">Account Data:</strong> Registered email address, full display name, and college/school name.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">User Content:</strong> Files, clipboard notes, and temporary 6-digit share codes uploaded to your vault.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Security & Audit Logs:</strong> IP address, user agent, login timestamps, and access logs recorded for account security auditing.</li>
              </ul>
            </section>

            {/* Section 2 - Google AdSense */}
            <section className="space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">2</span>
                Google AdSense & Cookies
              </h2>
              <p>
                We use <strong>Google AdSense</strong> to display non-intrusive advertisements supporting website server costs.
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-500 dark:text-slate-400">
                <li>Google and third-party vendors use cookies to serve ads based on your visits to CloudVault and other websites.</li>
                <li>Google’s use of advertising cookies enables it and its partners to serve personalized ads based on your browsing history.</li>
                <li>You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline font-bold">Google Ads Settings</a> or <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline font-bold">www.aboutads.info</a>.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">3</span>
                Data Security & Encryption
              </h2>
              <p>
                All data transfers are protected via SSL/TLS encryption. Database records and storage objects are secured using PostgreSQL Row Level Security (RLS) policies in Supabase, preventing unauthorized access across accounts.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">4</span>
                Contact Support
              </h2>
              <p>For questions or account data deletion requests, contact our administrator:</p>
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
              <Link to="/terms" className="hover:text-brand-primary transition">Terms of Service</Link>
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

export default PrivacyPolicy;
