import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { Home, Shield, Code2 } from 'lucide-react';

const OneCompilerStudio = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://www.hometolab.in/compiler#app",
        "name": "CloudVault ✕ OneCompiler Free Online Compiler & IDE",
        "url": "https://www.hometolab.in/compiler",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "All",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "description": "Best free in-browser online compiler and IDE supporting 60+ programming languages including C, C++, Java, Python, JavaScript, and SQL.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      }
    ]
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-100 text-slate-800 font-sans overflow-hidden">
      <SEO
        title="Free Online Compiler & IDE - Run C, C++, Java, Python, SQL Online | CloudVault"
        description="Best free online compiler & in-browser IDE for students. Write, compile, and execute code in C, C++, Java, Python, JavaScript, and 60+ languages with STDIN input. Zero software installation required on college lab computers."
        canonical="https://www.hometolab.in/compiler"
        keywords="online compiler, free online compiler, c online compiler, cpp online compiler, java online compiler, python online compiler, sql online compiler, run code online, in browser ide, online code editor, college lab compiler, cloudvault onecompiler, onecompiler embed, code runner online"
        jsonLd={structuredData}
      />

      {/* Top Navbar: Clean, Minimal & Fully Responsive */}
      <header className="h-14 px-3 sm:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-20 shadow-xs">
        {/* Left: Home Button + CloudVault Brand Logo + Collaboration Tag */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Return to CloudVault Home"
          >
            <Home className="w-4 h-4 text-brand-primary" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <div className="h-4 sm:h-5 w-[1px] bg-slate-200 shrink-0"></div>

          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer shrink-0" title="CloudVault Home">
            <div className="bg-sky-100 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sky-600 group-hover:scale-105 transition-transform shadow-xs">
              <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight font-display">
              CloudVault
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* <span className="text-slate-400 font-bold text-xs select-none">✕</span> */}
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs">
              <Code2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-bold text-xs tracking-tight text-slate-900">OneCompiler</span>
              <span className="hidden md:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                Official Collab
              </span>
            </div>
          </div>
        </div>

        {/* Right: Clean Responsive Status Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-500 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden md:inline">60+ Languages Supported</span>
          <span className="md:hidden text-[11px] font-bold text-emerald-600">Online</span>
        </div>
      </header>

      {/* Main Studio: Pure, Full-Screen Dedicated Compiler Interface */}
      <main className="flex-1 w-full p-0 sm:p-2.5 flex flex-col min-h-0 bg-slate-100">
        <div className="w-full flex-1 rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border border-slate-200 shadow-sm bg-white relative">
          <iframe
            id="oc-editor"
            src="https://onecompiler.com/embed/?codeChangeEvent=true&listenToEvents=true"
            frameBorder="0"
            width="100%"
            height="100%"
            className="w-full h-full block border-none"
            title="CloudVault ✕ OneCompiler Free Online Compiler & IDE"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </main>
    </div>
  );
};

export default OneCompilerStudio;
