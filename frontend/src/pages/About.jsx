import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Info, Server, Cpu, Lock, CheckCircle2, Mail, Users, HardDrive } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-slate-200 font-sans relative overflow-x-hidden transition-colors duration-300">
      {/* Dynamic Background Glow Orbs */}
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
        <div className="glass-card p-8 md:p-12 shadow-2xl space-y-10 animate-scale-up">
          
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
                  Store up to 100MB of assignment code, zip archives, PDFs, and documentation securely isolated behind Supabase Row Level Security (RLS).
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
                  Single-use file sharing option that automatically purges the file from storage immediately after it is downloaded.
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

          {/* Technology Architecture */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white">
              Technology Stack
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              CloudVault is engineered with modern high-performance technologies for speed, security, and responsiveness:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pl-2">
              <li><strong className="text-slate-700 dark:text-slate-200">Frontend:</strong> React 18, Vite, TailwindCSS, Lucide Icons</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Backend &amp; Database:</strong> Supabase PostgreSQL, Row Level Security (RLS)</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Security:</strong> SSL/TLS 256-bit encryption, Cloudflare Turnstile CAPTCHA</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Hosting &amp; Edge Network:</strong> Vercel Global CDN</li>
            </ul>
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

          {/* Footer Navigation */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2026 CloudVault (Home to Lab). All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/contact" className="hover:text-brand-primary transition">Contact Us</Link>
              <span>•</span>
              <Link to="/privacy-policy" className="hover:text-brand-primary transition">Privacy Policy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-brand-primary transition">Terms of Service</Link>
              <span>•</span>
              <Link to="/disclaimer" className="hover:text-brand-primary transition">Disclaimer</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default About;
