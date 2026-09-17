import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Sun, Moon, Menu, X, BookOpen, DownloadCloud, Sparkles, MessageSquare, Info } from 'lucide-react';

const PublicNavbar = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="fixed top-0 left-0 w-full px-4 sm:px-6 lg:px-[8%] py-3.5 flex justify-between items-center z-50 bg-white/85 dark:bg-slate-950/75 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="bg-brand-primary/10 dark:bg-brand-primary/20 w-9 h-9 rounded-xl flex items-center justify-center text-brand-primary group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="font-display font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
            CloudVault
          </span>
        </Link>

        {/* Desktop Navbar Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-semibold transition-colors ${
              isActive('/') ? 'text-brand-primary font-bold' : 'text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/blog" 
            className={`text-sm font-semibold transition-colors ${
              isActive('/blog') || location.pathname.startsWith('/blog/') ? 'text-brand-primary font-bold' : 'text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Blog
          </Link>
          <Link 
            to="/about" 
            className={`text-sm font-semibold transition-colors ${
              isActive('/about') ? 'text-brand-primary font-bold' : 'text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            About Us
          </Link>
          <Link 
            to="/contact" 
            className={`text-sm font-semibold transition-colors ${
              isActive('/contact') ? 'text-brand-primary font-bold' : 'text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Contact
          </Link>

          {user ? (
            <Link to="/dashboard" className="btn-primary py-2 px-5 text-sm font-bold shadow-md hover:shadow-brand-primary/20">
              Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link to="/login" className="btn-secondary py-2 px-4 text-sm font-semibold">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary py-2 px-4 text-sm font-semibold shadow-md">
                Sign Up
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Header Buttons */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full p-6 flex flex-col gap-6 shadow-2xl z-10 overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="bg-brand-primary/10 w-8 h-8 rounded-lg flex items-center justify-center text-brand-primary">
                  <Shield className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <span className="font-display font-extrabold text-slate-900 dark:text-white">CloudVault</span>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3 font-semibold text-sm text-slate-700 dark:text-slate-300">
              <Link to="/" onClick={() => setIsDrawerOpen(false)} className="py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-primary" /> Home
              </Link>
              <Link to="/blog" onClick={() => setIsDrawerOpen(false)} className="py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-primary" /> Blog Articles
              </Link>
              <Link to="/about" onClick={() => setIsDrawerOpen(false)} className="py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-primary" /> About Us
              </Link>
              <Link to="/contact" onClick={() => setIsDrawerOpen(false)} className="py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-primary" /> Contact Us
              </Link>
            </div>

            <div className="mt-auto pt-4 flex flex-col gap-2.5">
              {user ? (
                <Link to="/dashboard" onClick={() => setIsDrawerOpen(false)} className="w-full btn-primary py-3 text-center text-sm font-bold">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsDrawerOpen(false)} className="w-full btn-secondary py-2.5 text-center text-sm font-semibold">
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setIsDrawerOpen(false)} className="w-full btn-primary py-2.5 text-center text-sm font-bold">
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
