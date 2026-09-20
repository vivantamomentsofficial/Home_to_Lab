import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Mail, ShieldCheck } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import SEO from '../components/SEO';

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-200 font-sans relative overflow-x-hidden transition-colors duration-300">
      <SEO 
        title="Terms of Service - CloudVault (Home to Lab)" 
        description="Terms of Service for CloudVault (hometolab.in) - detailing conditions of use, user responsibilities, and service availability." 
        keywords="hometolab terms, cloudvault terms of service, terms of use" 
        canonical="https://www.hometolab.in/terms" 
      />
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 pt-28 sm:pt-36 relative z-10 flex-1 w-full">
        <div className="glass-card p-6 sm:p-12 shadow-2xl space-y-8 animate-scale-up border-slate-200/80 dark:border-slate-800">
          
          {/* Title Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider mb-3">
              <FileText className="w-3.5 h-3.5" />
              Legal Terms
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-800 dark:text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Effective Date: September 4, 2026 | Last Updated: September 12, 2026
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            <p>
              By creating an account or retrieving files on <strong>CloudVault</strong> (Home to Lab), you agree to comply with and be bound by the following Terms of Service.
            </p>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">1</span>
                User Account & Responsibilities
              </h2>
              <p>
                Users are responsible for maintaining the confidentiality of their credentials and for all activities conducted under their account. CloudVault provides temporary storage intended for educational assignments and personal code snippets.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">2</span>
                Prohibited Conduct & File Rules
              </h2>
              <p>Users must comply with our <Link to="/acceptable-use-policy" className="text-brand-primary font-bold hover:underline">Acceptable Use Policy</Link>. Uploading executable malware (.exe, .bat), copyrighted content, or illegal materials will result in immediate account termination.</p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">3</span>
                Service Availability & Storage Limits
              </h2>
              <p>
                Default student storage is set to 100MB. Temporary 6-digit access codes expire automatically based on selected duration (1 minute to 7 days). Single-use share codes expire immediately upon download.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">4</span>
                Limitation of Liability
              </h2>
              <p>
                CloudVault is provided "as is" without warranty of any kind. While we maintain 99.9% uptime and high security, users are encouraged to maintain local backups of critical files.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">5</span>
                Contact Support
              </h2>
              <p>For questions or account inquiries, please contact system administration:</p>
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

export default TermsOfService;
