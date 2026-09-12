import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ExternalLink } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-200 font-sans relative overflow-x-hidden transition-colors duration-300">
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 pt-28 sm:pt-36 relative z-10 flex-1 w-full">
        <div className="glass-card p-6 sm:p-12 shadow-2xl space-y-8 animate-scale-up border-slate-200/80 dark:border-slate-800">
          
          {/* Title Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider mb-3">
              <Lock className="w-3.5 h-3.5" />
              Legal &amp; Privacy
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-800 dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Effective Date: September 4, 2026 | Last Updated: September 12, 2026
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            <p>
              Welcome to <strong>CloudVault</strong> (also known as <em>Home to Lab</em>). We are committed to protecting your privacy, securing your personal assignment files, and ensuring transparent data management practices. This Privacy Policy explains how we collect, use, and protect your information when using our website at <code className="text-brand-primary font-mono text-xs bg-brand-primary/10 px-1.5 py-0.5 rounded">https://hometolab.vercel.app</code>.
            </p>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">1</span>
                Information We Collect
              </h2>
              <p>We collect essential information required to deliver personal cloud storage and text clipboard transfer services:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-500 dark:text-slate-400 pl-2">
                <li><strong className="text-slate-800 dark:text-slate-200">Account Data:</strong> Registered email address, full display name, and college/school name.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">User Content:</strong> Files, clipboard notes, and temporary 6-digit share codes uploaded to your vault.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Security &amp; Audit Logs:</strong> IP address, user agent, login timestamps, and access logs recorded for account security auditing.</li>
              </ul>
            </section>

            {/* Section 2 - Google AdSense & Cookies */}
            <section className="space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">2</span>
                Google AdSense, Cookies &amp; Third-Party Advertising
              </h2>
              <p>
                We use <strong>Google AdSense</strong> to display advertisements that support server and maintenance costs. Google and third-party advertising vendors use cookies to serve ads based on your visits to CloudVault and other websites across the internet.
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-500 dark:text-slate-400">
                <li><strong>Google DART Cookie:</strong> Google’s use of advertising cookies enables it and its partners to serve ads to users based on their visit to CloudVault and/or other sites on the Internet.</li>
                <li><strong>Opt-Out Options:</strong> You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-brand-primary font-bold hover:underline inline-flex items-center gap-1">Google Ads Settings <ExternalLink className="w-3 h-3" /></a> or <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-brand-primary font-bold hover:underline inline-flex items-center gap-1">www.aboutads.info <ExternalLink className="w-3 h-3" /></a>.</li>
                <li><strong>Third-Party Vendors:</strong> Third-party ad networks may also use cookies, JavaScript, or Web Beacons to measure advertising effectiveness. CloudVault has no access to or control over these cookies used by third-party advertisers.</li>
              </ul>
            </section>

            {/* Section 3 - GDPR & CCPA Rights */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">3</span>
                GDPR &amp; CCPA Privacy Rights
              </h2>
              <p>Under global data privacy laws (including GDPR and CCPA), users have the following rights:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-500 dark:text-slate-400 pl-2">
                <li><strong>Right to Access:</strong> You can request copies of your personal data stored on CloudVault.</li>
                <li><strong>Right to Erasure (Right to be Forgotten):</strong> You can request that we delete all your account data, stored files, and clipboard notes.</li>
                <li><strong>Right to Rectification:</strong> You can request that we correct any inaccurate account details.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">4</span>
                Data Security &amp; Encryption
              </h2>
              <p>
                All data transfers are protected via SSL/TLS encryption. Database records and storage objects are secured using PostgreSQL Row Level Security (RLS) policies in Supabase, preventing unauthorized access across accounts.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">5</span>
                Contact Support
              </h2>
              <p>For questions or account data deletion requests, contact our administrator:</p>
              <div className="flex items-center gap-2 text-brand-primary font-bold">
                <Mail className="w-4 h-4" />
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

export default PrivacyPolicy;
