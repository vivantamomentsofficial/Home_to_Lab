import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

const AdminLogin = () => {
  const { login, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // hCaptcha state & ref
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef(null);

  // Redirect logged in sessions
  useEffect(() => {
    if (user) {
      if (user.email === 'aayushparekh26@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      showToast('Please enter the administrative credentials.', 'warning');
      return;
    }

    const token = captchaToken || document.getElementsByName('h-captcha-response')[0]?.value || (typeof window.hcaptcha !== 'undefined' ? window.hcaptcha.getResponse() : null);
    if (!token) {
      showToast('Please complete the Captcha check.', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Direct Admin account authentication via Supabase Auth
      const email = 'aayushparekh26@gmail.com';
      await login(email, password, token);
      showToast('Super Admin authenticated successfully!', 'success');
      navigate('/admin');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Incorrect administrative credentials.', 'danger');
      captchaRef.current?.resetCaptcha();
      setCaptchaToken('');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg-light dark:bg-brand-bg-dark text-slate-800 dark:text-white p-4 relative overflow-hidden transition-colors duration-300 font-sans">
      
      {/* Background Graphic Orbs */}
      <div className="glow-orb glow-orb-primary opacity-20"></div>
      <div className="glow-orb glow-orb-accent opacity-20"></div>

      {/* Top Header Controls */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <Link
          to="/login"
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i> Back to User Login
        </Link>
      </div>

      <div className="glass-card max-w-sm w-full p-8 shadow-2xl relative z-10 animate-scale-up border-red-500/25 dark:border-red-500/40 bg-white/90 dark:bg-slate-900/85">
        
        {/* Shield Header Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shadow-inner">
              <i className="fa-solid fa-shield-halved text-2xl text-red-500"></i>
            </div>
            <div>
              <span className="font-display font-black text-2xl text-slate-900 dark:text-white block leading-tight">
                Admin <span className="text-red-500">Centre</span>
              </span>
              <span className="text-[10px] font-bold text-red-500/90 tracking-widest uppercase">
                Zero-Trust Gateway
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-base font-bold font-display text-center text-slate-800 dark:text-slate-100 mb-1">
          Super Admin Credentials
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
          Authorized personnel only. Please verify your administrative access key.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="label-title mb-0">ADMIN PASSWORD</label>
              </div>
              <div className="relative">
                <i className="fa-solid fa-key text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5 text-xs"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10 py-3 text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-2.5 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
            </div>

            {/* hCaptcha Widget */}
            <div className="flex justify-center py-2 min-h-[78px]">
              <HCaptcha
                ref={captchaRef}
                sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY || "719e93c2-4358-4bfa-810e-fe50c19eebba"}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken('')}
                onError={(err) => {
                  console.error('hCaptcha error:', err);
                  setCaptchaToken('');
                }}
                theme={theme === 'dark' ? 'dark' : 'light'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-4.5 h-4.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <>
                  <i className="fa-solid fa-lock text-xs"></i> Authenticate as Super Admin
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/60 text-center text-[10px] text-slate-400 dark:text-slate-500 leading-normal flex items-center justify-center gap-1.5">
          <i className="fa-solid fa-user-shield text-slate-400"></i>
          <span>Administrative access is logged and rate-limited.</span>
        </div>

      </div>

    </div>
  );
};

export default AdminLogin;
