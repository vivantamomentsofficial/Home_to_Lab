import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Menu, X, BookOpen, Code2, ArrowRight } from 'lucide-react';

const PublicNavbar = () => {
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Clean Full-Width Header with Exact Original Round Logo & Enlarged Clear Navigation */}
      <header className="public-navbar fixed top-3 sm:top-4 left-3 right-3 sm:left-6 sm:right-6 lg:left-[6%] lg:right-[6%] px-4 sm:px-6 py-3 flex items-center justify-between z-50 bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-900/5 dark:shadow-black/20 rounded-2xl">
        
        {/* Exact Original Brand Logo (Matching Image 3: Round Light-Blue Circle + Shield + Single CloudVault text) */}
        <Link to="/" className="flex items-center gap-3 group cursor-pointer shrink-0">
          <div className="bg-sky-100 dark:bg-sky-500/15 w-10 h-10 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-300 group-hover:scale-105 transition-transform shadow-xs">
            <Shield className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-bold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight font-display">
            CloudVault
          </span>
        </Link>

        {/* Desktop Navigation Links (Enlarged, Clear, Comfortable Font Size) */}
        <nav className="hidden lg:flex items-center gap-2">
          <Link
            to="/"
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive('/')
                ? 'text-brand-primary font-bold bg-brand-primary/10'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Home
          </Link>

          <Link
            to="/compiler"
            className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
              isActive('/compiler')
                ? 'text-blue-600 font-bold bg-blue-50 dark:bg-blue-500/10'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Code2 className="w-4.5 h-4.5 text-blue-500" />
            <span>Online Compiler</span>
            <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 tracking-wide">
              Collab
            </span>
          </Link>

          <Link
            to="/blog"
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive('/blog')
                ? 'text-brand-primary font-bold bg-brand-primary/10'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Blog
          </Link>

          <Link
            to="/about"
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive('/about')
                ? 'text-brand-primary font-bold bg-brand-primary/10'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            About Us
          </Link>

          <Link
            to="/contact"
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive('/contact')
                ? 'text-brand-primary font-bold bg-brand-primary/10'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Contact
          </Link>
        </nav>

        {/* Right Action Buttons (Sign In / Sign Up or Dashboard) - NO Dark Mode Toggle */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="btn-primary py-2.5 px-6 text-[15px] font-bold shadow-md hover:shadow-brand-primary/25 cursor-pointer flex items-center gap-2 rounded-xl"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/login"
                className="hidden sm:block px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary py-2.5 px-6 text-[15px] font-bold rounded-xl shadow-md cursor-pointer"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="lg:hidden p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          <div className="relative w-80 max-w-[88vw] bg-white dark:bg-slate-950 h-full p-5 sm:p-6 flex flex-col gap-6 shadow-2xl z-10 overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="bg-sky-100 w-9 h-9 rounded-full flex items-center justify-center text-sky-600">
                  <Shield className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="font-bold text-xl text-slate-900 dark:text-white font-display">CloudVault</span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 font-semibold text-[15px] text-slate-700 dark:text-slate-200">
              <Link
                to="/"
                onClick={() => setIsDrawerOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
              >
                <Shield className="w-4.5 h-4.5 text-brand-primary" /> Home
              </Link>
              <Link
                to="/compiler"
                onClick={() => setIsDrawerOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-blue-600 font-bold"
              >
                <span className="flex items-center gap-2.5">
                  <Code2 className="w-4.5 h-4.5 text-blue-500" /> Online Compiler
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Collab
                </span>
              </Link>
              <Link
                to="/blog"
                onClick={() => setIsDrawerOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
              >
                <BookOpen className="w-4.5 h-4.5 text-brand-primary" /> Blog Articles
              </Link>
              <Link
                to="/about"
                onClick={() => setIsDrawerOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
              >
                About Us
              </Link>
              <Link
                to="/contact"
                onClick={() => setIsDrawerOpen(false)}
                className="py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
              >
                Contact Us
              </Link>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full btn-primary py-3 rounded-xl text-center text-[15px] font-bold"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-full btn-secondary py-2.5 rounded-xl text-center text-[15px] font-semibold"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-full btn-primary py-2.5 rounded-xl text-center text-[15px] font-bold shadow-md"
                  >
                    Sign Up Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicNavbar;
