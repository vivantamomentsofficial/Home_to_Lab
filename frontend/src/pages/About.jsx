import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Info, Server, Cpu, Lock, CheckCircle2, Mail, Users, HardDrive } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import SEO from '../components/SEO';

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-200 font-sans relative overflow-x-hidden transition-colors duration-300">
      <SEO 
        title="About Us - CloudVault (Home to Lab)" 
        description="Learn about CloudVault (hometolab.in) - the student personal cloud storage and online clipboard bridge designed for seamless computer lab file sync." 
        keywords="about hometolab, cloudvault about, home to lab platform, student cloud mission" 
        canonical="https://www.hometolab.in/about" 
      />
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 pt-28 sm:pt-36 relative z-10 flex-1 w-full">
        <div className="glass-card p-6 sm:p-12 shadow-2xl space-y-10 animate-scale-up border-slate-200/80 dark:border-slate-800">
          
          {/* Header Title */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider mb-3">
              <Info className="w-3.5 h-3.5" />
              Platform Overview
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-800 dark:text-white tracking-tight">
              About CloudVault (Home to Lab)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Empowering students with seamless, secure, and instant file &amp; note bridge across campus terminals.
            </p>
          </div>

          {/* Mission Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-primary" />
              Our Mission
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>CloudVault</strong> (also known as <em>Home to Lab</em>) was created to solve a universal pain point faced by computer science and college students everywhere: the hassle of moving assignment code, lab manuals, PDFs, and temporary notes between personal home computers and public college lab machines.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Traditional methods like emailing files to yourself, using physical USB drives, or logging into personal cloud accounts on public lab PCs pose major security risks and inconvenience. CloudVault bridges this gap by offering a zero-friction, encrypted personal vault and temporary 6-digit code transfer system.
            </p>
          </section>

          {/* Key Features Grid */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-brand-primary" />
              Core Capabilities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-brand-primary" />
                  Personal Student Vault
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Store up to 100MB of assignment code, zip archives, PDFs, and documentation securely isolated behind database policies.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-500" />
                  Temporary 6-Digit Share Codes
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Generate instant 6-character code links that let you retrieve files on any public terminal without logging into your account.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  Burn-After-Reading Shares
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Single-use file sharing option that automatically invalidates the share code immediately after it is downloaded once.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500" />
                  Auto Session Wiping
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Closing the browser tab on public library or lab terminals immediately clears tokens, preventing unauthorized access.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Support */}
          <section className="p-6 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 space-y-2">
            <h2 className="text-base font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-primary" />
              Get in Touch
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Have feedback, questions, or bug reports? Reach out directly to our administrator:
            </p>
            <div className="text-xs font-bold text-brand-primary">
              <a href="mailto:aayushparekh26@gmail.com" className="hover:underline">aayushparekh26@gmail.com</a>
            </div>
          </section>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default About;
