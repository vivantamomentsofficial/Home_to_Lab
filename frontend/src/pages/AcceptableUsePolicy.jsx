import React, { useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Mail } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const AcceptableUsePolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <PublicNavbar />

      <header className="pt-28 sm:pt-36 pb-10 px-4 sm:px-6 lg:px-[8%] text-center relative overflow-hidden">
        <div className="glow-orb glow-orb-primary"></div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-brand-primary-light text-xs font-bold tracking-wider uppercase mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Platform Guidelines</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-display leading-tight mb-3 bg-gradient-to-r from-slate-900 via-brand-primary to-sky-500 dark:from-white dark:via-brand-primary-light dark:to-cyan-400 bg-clip-text text-transparent">
            Acceptable Use Policy
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Last Updated: September 12, 2026 • Effective Immediately
          </p>
        </div>
      </header>

      <main className="py-10 px-4 sm:px-6 lg:px-[8%] max-w-4xl mx-auto w-full flex-1 z-10">
        <div className="glass-card p-6 sm:p-10 shadow-lg border-slate-200/80 dark:border-slate-800 space-y-8 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
          
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-brand-primary" /> 1. Purpose of Policy
            </h2>
            <p>
              CloudVault provides a fast, temporary cloud transfer bridge for students, educators, and professionals. To protect network integrity, user privacy, and legal compliance, all users must adhere to this Acceptable Use Policy (AUP).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2 text-red-500">
              <XCircle className="w-4.5 h-4.5 text-red-500" /> 2. Prohibited Content & Activities
            </h2>
            <p>You may not upload, share, store, or transmit any of the following through CloudVault:</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl space-y-1">
                <div className="font-bold text-red-600 dark:text-red-400 text-xs">Executable Malware & Scripts</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Executable file formats (.exe, .bat, .cmd, .sh, .vbs, .apk, .scr) are strictly prohibited.
                </div>
              </div>

              <div className="p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl space-y-1">
                <div className="font-bold text-red-600 dark:text-red-400 text-xs">Copyrighted & Pirated Materials</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Commercial software, pirated media, cracked applications, or non-licensed files.
                </div>
              </div>

              <div className="p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl space-y-1">
                <div className="font-bold text-red-600 dark:text-red-400 text-xs">Illegal or Harmful Content</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Material that promotes violence, illegal acts, harassment, hate speech, or exploitation.
                </div>
              </div>

              <div className="p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl space-y-1">
                <div className="font-bold text-red-600 dark:text-red-400 text-xs">Phishing & Credential Theft</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Fake login pages, malicious tracking scripts, or deceptive link redirectors.
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" /> 3. Permitted & Intended Usage
            </h2>
            <ul className="space-y-2 pl-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Academic assignments, lab reports, code scripts (.py, .java, .cpp, .js), and research PDFs.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Personal study notes, temporary code snippets, and compressed project archives (.zip).</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Temporary handoffs using 6-digit access codes or single-use Burn-After-Reading links.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" /> 4. Automated Enforcement & Account Termination
            </h2>
            <p>
              CloudVault uses automated MIME type checks, rate limiters, and system logs. Accounts found attempting to upload prohibited executable files or copyright-infringing data will face immediate account suspension and permanent deletion of uploaded items.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4.5 h-4.5 text-brand-primary" /> 5. Reporting Abuse
            </h2>
            <p>
              To report policy violations or copyright infringement, contact system administrators at{' '}
              <a href="mailto:aayushparekh26@gmail.com" className="text-brand-primary font-bold hover:underline">
                aayushparekh26@gmail.com
              </a>. Reports are reviewed within 24 hours.
            </p>
          </section>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default AcceptableUsePolicy;
