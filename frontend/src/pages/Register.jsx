import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Sun, Moon, Shield, User, GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';

const Register = () => {
  const { register, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Form states
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signupsDisabled, setSignupsDisabled] = useState(false);
  const [maintenanceNotice, setMaintenanceNotice] = useState(false);

  useEffect(() => {
    const fetchPlatformStatus = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/public-settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.maintenance_mode) setMaintenanceNotice(true);
          if (data.signups_enabled === false) setSignupsDisabled(true);
        }
      } catch (err) {
        // Fallback silently if offline or network failure
      }
    };
    fetchPlatformStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (signupsDisabled) {
      showToast('New user registrations are currently disabled by platform administrators.', 'warning');
      return;
    }

    if (!agreedToTerms) {
      showToast('You must accept the Terms of Service and Privacy Policy to create an account.', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    const token = captchaToken || document.getElementsByName('h-captcha-response')[0]?.value || (typeof window.hcaptcha !== 'undefined' ? window.hcaptcha.getResponse() : null);
    if (!token) {
      showToast('Please complete the Captcha check.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const signUpData = await register(email, password, fullName, college, token);

      // Check if session is logged in immediately, otherwise require confirmation
      if (signUpData.session) {
        showToast('Registration successful! Redirecting...', 'success');
        navigate('/dashboard');
      } else {
        showToast('Registration successful! Please check your email inbox to confirm registration.', 'success');
        navigate('/login');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Registration failed.', 'danger');
      captchaRef.current?.resetCaptcha();
      setCaptchaToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-center items-center py-4 px-3 sm:px-6 bg-slate-50 text-slate-800 overflow-x-hidden">
      {/* Dynamic Animated Ambient Background */}
      <AnimatedBackground />

      <div className="w-full max-w-[500px] mx-auto z-10 flex flex-col items-center">
        {/* Top Header Navigation */}
        <div className="w-full flex justify-between items-center mb-2 sm:mb-2.5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-bold border border-slate-200/80 transition-all shadow-2xs backdrop-blur-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-brand-primary" /> Back to Home
          </Link>
        </div>

        {/* Center Card */}
        <div className="w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 bg-white/95 backdrop-blur-md relative z-10 animate-scale-up">
          {/* Header Brand */}
          <div className="flex justify-center mb-1.5">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Shield className="w-4 h-4 text-brand-primary stroke-[2.5]" />
              </div>
              <span className="font-display font-black text-xl text-slate-900 tracking-tight">
                Cloud<span className="text-brand-primary">Vault</span>
              </span>
            </Link>
          </div>

          <h2 className="text-base sm:text-lg font-bold font-display text-center text-slate-800 mb-0.5">
            Create Student Account
          </h2>
          <p className="text-[11px] text-slate-500 text-center mb-3">
            Set up a temporary personal cloud bridge for your college files.
          </p>

          {maintenanceNotice && (
            <div className="mb-2.5 p-2.5 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-700">
              <strong>System Maintenance:</strong> Platform is currently undergoing scheduled maintenance.
            </div>
          )}

          {signupsDisabled && (
            <div className="mb-2.5 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700">
              <strong>Registrations Paused:</strong> New user registrations are currently closed.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* Row 1: Full Name & College / School */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-9 pl-9 pr-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  College / School
                </label>
                <div className="relative">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="State College"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full h-9 pl-9 pr-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Email Address */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 pl-9 pr-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
                  required
                />
              </div>
            </div>

            {/* Row 3: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 absolute right-1.5 top-1.5 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 absolute right-1.5 top-1.5 cursor-pointer"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms of Service & Privacy Policy Agreement Checkbox */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-3.5 h-3.5 accent-brand-primary rounded border-slate-300 cursor-pointer"
                required
              />
              <label htmlFor="terms-checkbox" className="text-[11px] text-slate-600 leading-tight cursor-pointer select-none">
                I agree to CloudVault's{' '}
                <Link to="/terms" target="_blank" className="text-brand-primary hover:underline font-bold">
                  Terms
                </Link>{' '}
                and{' '}
                <Link to="/privacy-policy" target="_blank" className="text-brand-primary hover:underline font-bold">
                  Privacy Policy
                </Link>.
              </label>
            </div>

            {/* hCaptcha Widget */}
            <div className="flex justify-center min-h-[74px] scale-[0.88] sm:scale-95 origin-center my-0.5">
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
              disabled={loading || signupsDisabled}
              className={`w-full h-10 flex justify-center items-center rounded-xl font-bold text-xs transition shadow-sm cursor-pointer ${
                signupsDisabled 
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                  : 'btn-primary'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : signupsDisabled ? (
                'Registrations Paused'
              ) : (
                'Create Student Account'
              )}
            </button>
          </form>

          <div className="mt-2.5 text-center text-[11px] text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-primary hover:underline font-bold">
              Sign in here
            </Link>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-center gap-3 text-[10px] text-slate-400">
            <Link to="/terms" className="hover:text-brand-primary transition">Terms of Service</Link>
            <span>•</span>
            <Link to="/privacy-policy" className="hover:text-brand-primary transition">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
