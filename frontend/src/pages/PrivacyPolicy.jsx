import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Eye, FileText, CheckCircle, Mail } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative overflow-x-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header / Nav */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl hover:opacity-90 transition">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1.5px]">
              <div className="w-full h-full bg-slate-900 rounded-[10.5px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <span>Cloud<span className="text-cyan-400">Vault</span></span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-4 py-2 rounded-xl transition border border-slate-700/50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl space-y-8">
          
          {/* Header Title */}
          <div className="border-b border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Lock className="w-3.5 h-3.5" />
              Legal & Compliance
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-slate-400 mt-2">Effective Date: September 4, 2026 | Last Updated: September 4, 2026</p>
          </div>

          <div className="space-y-6 text-sm md:text-base text-slate-300 leading-relaxed">
            <p>
              Welcome to <strong>CloudVault</strong> (also known as <em>Home to Lab</em>). We are committed to protecting your privacy, securing your personal files, and ensuring transparent data management practices. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at <code className="text-cyan-400">https://hometolab.vercel.app</code> or use our cloud storage services.
            </p>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center">1</span>
                Information We Collect
              </h2>
              <p>We collect information to provide secure cloud storage and text snippet transfer services:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
                <li><strong className="text-slate-200">Account Data:</strong> Email address, display name, and college/institution name provided during registration.</li>
                <li><strong className="text-slate-200">User Content:</strong> Files, notes, code snippets, and share codes uploaded to your vault.</li>
                <li><strong className="text-slate-200">Log Data & Device Info:</strong> IP addresses, browser user agent, login timestamps, and access logs recorded for security auditing.</li>
              </ul>
            </section>

            {/* Section 2 - Google AdSense Disclosure */}
            <section className="space-y-3 bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center">2</span>
                Google AdSense & Third-Party Advertising
              </h2>
              <p>
                We use <strong>Google AdSense</strong> to serve non-intrusive advertisements on our site to support server operational costs.
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-400">
                <li>Google, as a third-party vendor, uses cookies to serve ads on CloudVault.</li>
                <li>Google’s use of advertising cookies enables it and its partners to serve ads based on your visit to CloudVault and/or other sites on the Internet.</li>
                <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">Google Ads Settings</a>. Alternatively, you can opt out of third-party vendor cookies by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">www.aboutads.info</a>.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center">3</span>
                How We Use Your Information
              </h2>
              <p>Your data is used strictly for the following purposes:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                <li>Operating, maintaining, and providing cloud file storage and clipboard snippet transfers.</li>
                <li>Authenticating user logins and enforcing account security policies.</li>
                <li>Preventing abuse, unauthorized logins, and malicious activities via automated log auditing.</li>
                <li>Generating temporary 6-digit share codes requested by you.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center">4</span>
                Data Security & Encryption
              </h2>
              <p>
                All data transfers are encrypted in transit via SSL/TLS. Uploaded files are secured with PostgreSQL Row Level Security (RLS) policies in Supabase, ensuring that only authenticated owners can access or modify their content.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center">5</span>
                Contact Us
              </h2>
              <p>
                If you have questions regarding this Privacy Policy or wish to request account deletion, contact our administration team:
              </p>
              <div className="flex items-center gap-2 text-cyan-400 font-medium">
                <Mail className="w-4 h-4" />
                <a href="mailto:homtolab@gmail.com" className="hover:underline">homtolab@gmail.com</a>
              </div>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-slate-800 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2026 CloudVault (Home to Lab). All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-cyan-400 transition">Terms of Service</Link>
              <span>•</span>
              <Link to="/login" className="hover:text-cyan-400 transition">Login</Link>
              <span>•</span>
              <Link to="/register" className="hover:text-cyan-400 transition">Register</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
