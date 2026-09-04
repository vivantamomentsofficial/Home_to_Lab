import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, FileText, AlertTriangle, CheckCircle, Mail } from 'lucide-react';

const TermsOfService = () => {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <FileText className="w-3.5 h-3.5" />
              User Agreement
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Terms of Service</h1>
            <p className="text-sm text-slate-400 mt-2">Effective Date: September 4, 2026 | Last Updated: September 4, 2026</p>
          </div>

          <div className="space-y-6 text-sm md:text-base text-slate-300 leading-relaxed">
            <p>
              By creating an account or accessing <strong>CloudVault</strong> (Home to Lab), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
            </p>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center">1</span>
                Acceptable Use Policy
              </h2>
              <p>CloudVault is designed as a student cloud storage bridge and clipboard manager. Users agree NOT to upload or distribute:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
                <li>Malware, viruses, ransomware, or executable scripts designed to exploit lab systems.</li>
                <li>Copyrighted material without authorization.</li>
                <li>Illegal, fraudulent, harassing, or hate speech content.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center">2</span>
                Storage Quotas & Temporary Share Codes
              </h2>
              <p>
                Default account storage quota is set to 100MB per user unless upgraded by a system administrator. Temporary 6-digit share codes expire after 30 minutes for security purposes.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center">3</span>
                Account Suspension & Moderation
              </h2>
              <p>
                CloudVault administrators reserve the right to suspend or terminate accounts that violate our acceptable use policy or attempt brute force attacks against system endpoints.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center">4</span>
                Limitation of Liability
              </h2>
              <p>
                CloudVault is provided "AS IS" without warranties of any kind. Users are responsible for keeping backup copies of critical assignment files.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center">5</span>
                Contact Support
              </h2>
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
              <Link to="/privacy-policy" className="hover:text-cyan-400 transition">Privacy Policy</Link>
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

export default TermsOfService;
