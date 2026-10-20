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
      <header className="fixed top-0 left-0 w-full px-6 sm:px-10 lg:px-[8%] py-4 flex items-center justify-between z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
        
        {/* Exact Original Brand Logo (Matching Image 3: Round Light-Blue Circle + Shield + Single CloudVault text) */}
        <Link to="/" className="flex items-center gap-3 group cursor-pointer shrink-0">
          <div className="bg-sky-100 w-10 h-10 rounded-full flex items-center justify-center text-sky-600 group-hover:scale-105 transition-transform shadow-xs">
            <Shield className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-bold text-2xl text-slate-900 tracking-tight font-display">
            CloudVault
          </span>
        </Link>

        {/* Desktop Navigation Links (Enlarged, Clear, Comfortable Font Size) */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
          <Link
            to="/"
            className={`text-[16px] lg:text-[17px] font-semibold transition-colors ${
              isActive('/')
                ? 'text-brand-primary font-bold'
                : 'text-slate-600 hover:text-brand-primary'
            }`}
          >
            Home
          </Link>

          <Link
            to="/compiler"
            className={`text-[16px] lg:text-[17px] font-semibold flex items-center gap-2 transition-colors ${
              isActive('/compiler')
                ? 'text-blue-600 font-bold'
                : 'text-slate-600 hover:text-blue-600'
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
            className={`text-[16px] lg:text-[17px] font-semibold transition-colors ${
              isActive('/blog')
                ? 'text-brand-primary font-bold'
                : 'text-slate-600 hover:text-brand-primary'
            }`}
          >
            Blog
          </Link>

          <Link
            to="/about"
            className={`text-[16px] lg:text-[17px] font-semibold transition-colors ${
              isActive('/about')
                ? 'text-brand-primary font-bold'
                : 'text-slate-600 hover:text-brand-primary'
            }`}
          >
            About Us
          </Link>

          <Link
            to="/contact"
            className={`text-[16px] lg:text-[17px] font-semibold transition-colors ${
              isActive('/contact')
                ? 'text-brand-primary font-bold'
                : 'text-slate-600 hover:text-brand-primary'
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
                className="px-4 py-2.5 text-[15px] font-semibold text-slate-700 hover:text-brand-primary transition-colors"
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
            className="md:hidden p-2.5 bg-slate-100 rounded-xl text-slate-700 cursor-pointer"
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
          <div className="relative w-72 max-w-[80vw] bg-white h-full p-6 flex flex-col gap-6 shadow-2xl z-10 overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="bg-sky-100 w-9 h-9 rounded-full flex items-center justify-center text-sky-600">
                  <Shield className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="font-bold text-xl text-slate-900 font-display">CloudVault</span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 font-semibold text-[15px] text-slate-700">
              <Link
                to="/"
                onClick={() => setIsDrawerOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-slate-100 flex items-center gap-2.5"
              >
                <Shield className="w-4.5 h-4.5 text-brand-primary" /> Home
              </Link>
              <Link
                to="/compiler"
                onClick={() => setIsDrawerOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-slate-100 flex items-center justify-between text-blue-600 font-bold"
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
                className="py-2.5 px-3 rounded-xl hover:bg-slate-100 flex items-center gap-2.5"
              >
                <BookOpen className="w-4.5 h-4.5 text-brand-primary" /> Blog Articles
              </Link>
              <Link
                to="/about"
                onClick={() => setIsDrawerOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-slate-100 flex items-center gap-2.5"
              >
                About Us
              </Link>
              <Link
                to="/contact"
                onClick={() => setIsDrawerOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-slate-100 flex items-center gap-2.5"
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

