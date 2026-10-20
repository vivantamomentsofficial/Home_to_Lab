import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import PublicFooter from '../components/PublicFooter';
import {
  Home, Shield, Code2, Play, Terminal, ArrowRight, Zap,
  CheckCircle2, Sparkles, HelpCircle, ChevronDown, Share2,
  HardDrive, Lock, Cpu, Globe, Copy
} from 'lucide-react';

const LANGUAGE_OPTIONS = [
  { id: 'all', name: 'All 60+ Languages', path: '' },
  { id: 'c', name: 'C', path: 'c' },
  { id: 'cpp', name: 'C++', path: 'cpp' },
  { id: 'java', name: 'Java', path: 'java' },
  { id: 'python', name: 'Python', path: 'python' },
  { id: 'sql', name: 'SQL / MySQL', path: 'mysql' },
  { id: 'javascript', name: 'JavaScript', path: 'javascript' },
  { id: 'csharp', name: 'C#', path: 'csharp' },
  { id: 'rust', name: 'Rust', path: 'rust' }
];

const FAQS = [
  {
    q: 'What is an online compiler and how does it work?',
    a: 'An online compiler is an in-browser development environment that allows you to write, edit, compile, and execute programming code on remote cloud servers without installing any local compilers, SDKs, or IDE software on your computer. When you click "Run", your code is sent securely to cloud sandbox containers where it compiles and returns terminal outputs and error traces directly in your browser.'
  },
  {
    q: 'Can I supply custom user inputs (STDIN) in this online compiler?',
    a: 'Yes, absolutely! The CloudVault ✕ OneCompiler editor includes an interactive input tab (STDIN) where you can provide single-line or multi-line custom input data before clicking Run. This is essential for college programming practicals that require inputs such as scanf(), cin, Scanner(System.in), or input().'
  },
  {
    q: 'Which programming languages are supported by CloudVault Online Compiler?',
    a: 'CloudVault ✕ OneCompiler supports over 60 programming languages including C (GCC), C++ (C++17/20), Java (OpenJDK), Python 3, JavaScript (Node.js), MySQL, PostgreSQL, SQLite, C#, PHP, Ruby, Go, Rust, Kotlin, Swift, HTML/CSS, and Bash.'
  },
  {
    q: 'How do I run C and C++ programs without installing Turbo C or Dev-C++?',
    a: 'Simply select C or C++ from the language switcher above, type or paste your program into the code editor, and click "Run". The cloud engine runs modern GCC compilers with modern C++ standards, eliminating outdated Turbo C errors and DOSBox setup issues on modern Windows or macOS computers.'
  },
  {
    q: 'Is this online compiler free for college students and lab work?',
    a: 'Yes, it is 100% free with unlimited runs. There are no paywalls, subscriptions, or credit card requirements. You do not even need to create an account to write and run code.'
  },
  {
    q: 'How do I transfer code from the online compiler to my college lab computer?',
    a: 'After verifying that your code compiles and runs successfully, copy the code snippet and head to the CloudVault Home Page. Use Quick Send to generate an instant 6-digit access PIN or QR code. On your college lab PC, enter the 6-digit PIN to download or paste your code directly—no personal email logins or USB drives needed!'
  }
];

const OneCompilerStudio = () => {
  const [selectedLang, setSelectedLang] = useState('all');
  const [activeFaq, setActiveFaq] = useState(null);

  // Compute iframe URL based on selected language
  const iframeSrc = selectedLang === 'all'
    ? 'https://onecompiler.com/embed/?codeChangeEvent=true&listenToEvents=true'
    : `https://onecompiler.com/embed/${selectedLang}?codeChangeEvent=true&listenToEvents=true`;

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
        "description": "Best free in-browser online compiler and IDE supporting 60+ programming languages including C, C++, Java, Python, JavaScript, and SQL. Write, compile, and execute code online with STDIN input support with zero local installation.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": [
          "In-browser code execution for 60+ programming languages",
          "C & C++ online compiler with modern GCC",
          "Python 3 online compiler with standard library",
          "Java online compiler with OpenJDK",
          "SQL database query editor for MySQL and PostgreSQL",
          "Interactive STDIN input console",
          "Zero software installation or admin rights required",
          "Bypasses restricted college lab computer terminals"
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.hometolab.in/compiler#faq",
        "mainEntity": FAQS.map(faq => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
          }
        }))
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.hometolab.in/compiler#breadcrumbs",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://www.hometolab.in/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Free Online Compiler & IDE",
            "item": "https://www.hometolab.in/compiler"
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-brand-primary/30">
      <SEO
        title="Free Online Compiler & IDE - Run C, C++, Java, Python, SQL Online | CloudVault"
        description="Best free online compiler & in-browser IDE for students. Write, compile, and execute code in C, C++, Java, Python, JavaScript, and 60+ languages with STDIN input. Zero software installation required on college lab computers."
        canonical="https://www.hometolab.in/compiler"
        keywords="online compiler, free online compiler, c online compiler, cpp online compiler, java online compiler, python online compiler, sql online compiler, run code online, in browser ide, online code editor, college lab compiler, cloudvault onecompiler, onecompiler embed, code runner online"
        jsonLd={structuredData}
      />

      {/* Top Navbar: Home Button + Exact CloudVault Brand Logo + Collaboration Branding */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/90 flex items-center justify-between gap-3 shrink-0 z-20 shadow-xs sticky top-0">
        {/* Left Section: Home Button + Exact Logo */}
        <div className="flex items-center gap-3">
          {/* Home Button */}
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200 transition-colors shadow-xs cursor-pointer shrink-0"
            title="Return to CloudVault Home"
          >
            <Home className="w-4 h-4 text-brand-primary" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <div className="h-5 w-[1px] bg-slate-200 shrink-0"></div>

          {/* Exact Brand Logo (Matching Image 3: Round Light-Blue Circle + Shield + Single CloudVault text) */}
          <Link to="/" className="flex items-center gap-2 group cursor-pointer shrink-0" title="CloudVault Home">
            <div className="bg-sky-100 w-8 h-8 rounded-full flex items-center justify-center text-sky-600 group-hover:scale-105 transition-transform shadow-xs">
              <Shield className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight font-display">
              CloudVault
            </span>
          </Link>

          {/* Collaboration Cross & OneCompiler Partner Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400 font-bold text-xs select-none">✕</span>
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shadow-xs">
              <Code2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-bold text-xs tracking-tight text-slate-900">OneCompiler</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                Official Collab
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Lab Transfer Callout + Support */}
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 text-xs font-bold transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Send Code to Lab PC</span>
          </Link>
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 pl-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>60+ Languages Ready</span>
          </div>
        </div>
      </header>

      {/* Language Quick Switcher Bar (Responsive Horizontal Scroll) */}
      <div className="bg-slate-100/90 border-b border-slate-200/80 px-4 sm:px-6 py-2.5 overflow-x-auto scrollbar-none flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-slate-500 shrink-0 uppercase tracking-wider pl-1">
          Switch Compiler:
        </span>
        <div className="flex items-center gap-1.5">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedLang === lang.id
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200/80'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Viewport (Full-Height Responsive In-Browser Embed) */}
      <main className="w-full p-2 sm:p-4 flex flex-col">
        <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-white relative">
          <iframe
            id="oc-editor"
            key={selectedLang}
            src={iframeSrc}
            frameBorder="0"
            width="100%"
            height="100%"
            style={{
              width: '100%',
              height: 'calc(100vh - 150px)',
              minHeight: '560px',
              border: 'none',
              display: 'block'
            }}
            title={`CloudVault ✕ OneCompiler Free Online Compiler - ${selectedLang.toUpperCase()}`}
          />
        </div>
      </main>

      {/* ========================================================================= */}
      {/* RICH CRAWLABLE SEO CONTENT & DOCUMENTATION GUIDE                          */}
      {/* This ensures Google ranks CloudVault for "online compiler", "c compiler", */}
      {/* "python online compiler", "java compiler", etc.                           */}
      {/* ========================================================================= */}
      <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        
        {/* Semantic H1 & Overview */}
        <section className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-blue-600" />
            <span>High-Performance In-Browser Execution</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black font-display text-slate-900 tracking-tight leading-tight">
            Free Online Compiler &amp; In-Browser IDE
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Write, compile, and execute code in <strong>60+ programming languages</strong> directly in your web browser. Built in official collaboration with <strong>OneCompiler</strong>, CloudVault provides students, educators, and developers with an instant coding environment featuring real-time terminal output, interactive <strong>STDIN input</strong>, and zero local setup.
          </p>
        </section>

        {/* Popular Online Compilers Grid (Targets Specific Language SEO Queries) */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900">
              Popular Supported Online Compilers
            </h2>
            <p className="text-xs text-slate-500">
              Fast, isolated cloud sandboxes optimized for university lab practicals and competitive programming.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* C & C++ Compiler Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-500/40 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                  C &amp; C++
                </span>
                <span className="text-[11px] text-slate-400 font-mono">GCC 12+</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">C &amp; C++ Online Compiler</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compile C and C++ programs with modern GCC standards (C++14, C++17, C++20). Full support for pointers, data structures, algorithms, STL templates, vectors, and fast I/O.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('cpp');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Launch C++ Compiler</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Python 3 Compiler Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-500/40 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Python 3
                </span>
                <span className="text-[11px] text-slate-400 font-mono">v3.10+</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Python Online Compiler</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Execute Python scripts without configuring virtual environments or PATH variables. Ideal for introductory computer science, math computation, scripting, and DSA practicals.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('python');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Launch Python Compiler</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Java Compiler Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-500/40 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                  Java
                </span>
                <span className="text-[11px] text-slate-400 font-mono">OpenJDK 17</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Java Online Compiler</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Run Java programs with OpenJDK without installing hefty JDKs on restricted computers. Supports object-oriented classes, collections, interfaces, and multithreading.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('java');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Launch Java Compiler</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* SQL & Database Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-500/40 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                  SQL &amp; DBMS
                </span>
                <span className="text-[11px] text-slate-400 font-mono">MySQL / PG</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">SQL Online Compiler &amp; Editor</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Practice DBMS practicals online. Create tables, insert sample records, execute joins, aggregate queries, and subqueries with instant tabular output display.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('sql');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Launch SQL Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* JavaScript & Node.js Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-500/40 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-100">
                  JavaScript
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Node.js ES6+</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">JavaScript Online Runner</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Run JavaScript and Node.js code snippets in real time. Perfect for testing asynchronous functions, algorithms, regex patterns, and API payloads.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('javascript');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Launch JS Runner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 60+ Universal Languages Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-500/40 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
                  Universal IDE
                </span>
                <span className="text-[11px] text-slate-400 font-mono">60+ Stacks</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Rust, Go, C#, PHP &amp; More</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Explore emerging systems programming in Rust and Go, or enterprise applications in C# and PHP. Switch languages effortlessly from the built-in dropdown.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('all');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Launch Universal Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Why College Students Rely on CloudVault Online Compiler */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider">
              Student Lab Superpowers
            </span>
            <h2 className="text-xl sm:text-3xl font-black font-display text-slate-900">
              Why Use CloudVault’s Free Online Compiler for College Labs?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Campus computer labs often restrict software installation and block command prompt permissions. Here is how CloudVault ✕ OneCompiler solves every lab limitation:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h4 className="font-bold text-xs text-slate-900">Zero Software Install</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Bypasses locked administrative permissions. No need to install VS Code, Turbo C, or Java SDKs on restricted lab computers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <Terminal className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-xs text-slate-900">Custom STDIN Input</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Provide custom test cases in the Inputs tab to test boundary conditions for competitive programming and practical exams.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h4 className="font-bold text-xs text-slate-900">Direct Lab PIN Transfer</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Move your tested code between home and lab terminals in 5 seconds using CloudVault’s 6-digit PIN transfer bridge.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <HardDrive className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-xs text-slate-900">Cloud Storage Backup</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Save your completed assignment scripts permanently to your 100MB-2GB free Student Vault to access anytime, anywhere.
              </p>
            </div>
          </div>
        </section>

        {/* Online Compiler FAQ Accordion (Indexed by Google for Rich Snippets) */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900">
              Online Compiler Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500">
              Everything you need to know about in-browser code compilation and execution.
            </p>
          </div>

          <div className="flex flex-col gap-3 max-w-3xl mx-auto text-left">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className={`p-4 sm:p-5 cursor-pointer rounded-2xl bg-white border border-slate-200 transition-all ${
                  activeFaq === idx ? 'ring-2 ring-blue-500/30 shadow-md' : 'hover:border-blue-400/40'
                }`}
              >
                <div className="flex justify-between items-center font-bold text-slate-900 text-xs sm:text-sm">
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ml-2 ${
                      activeFaq === idx ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </div>
                <div
                  className={`transition-all duration-300 overflow-hidden text-xs text-slate-600 leading-relaxed ${
                    activeFaq === idx ? 'max-h-48 mt-2.5 pt-2.5 border-t border-slate-100' : 'max-h-0'
                  }`}
                >
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Callout Banner */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-brand-primary text-white text-center space-y-4 shadow-xl">
          <h2 className="text-xl sm:text-3xl font-black font-display">
            Need to Move Code Between Home &amp; College Lab?
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto leading-relaxed">
            Use CloudVault to send your code snippets or assignment files with a 6-digit PIN &amp; QR code without login—or unlock 100MB (up to 2GB) free student cloud storage.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="px-6 py-3 rounded-xl bg-white text-brand-primary font-bold text-xs shadow-md hover:bg-slate-100 transition-colors"
            >
              Go to CloudVault Transfer
            </Link>
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition-colors border border-white/20"
            >
              Sign Up for Free 100MB Vault
            </Link>
          </div>
        </section>

      </article>

      {/* Global Public Footer */}
      <PublicFooter />
    </div>
  );
};

export default OneCompilerStudio;
