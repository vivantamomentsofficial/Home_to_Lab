import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Sun, Moon, Shield, User, GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react';

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

  const handleSubmit = async (e) => {
    e.preventDefault();

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
    <div className="relative min-h-screen flex items-center justify-center bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300 p-4">
      {/* Background Orbs */}
      <div className="glow-orb glow-orb-primary"></div>
      <div className="glow-orb glow-orb-accent"></div>
      {/* Top Header Controls */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
      </div>

      <div className="glass-card max-w-md w-full p-8 shadow-2xl relative z-10 animate-scale-up border-brand-border-light dark:border-brand-border-dark bg-white/90 dark:bg-slate-900/85">
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <Shield className="w-6 h-6 text-brand-primary stroke-[2.5]" />
            </div>
            <span className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight">
              Cloud<span className="text-brand-primary">Vault</span>
            </span>
          </Link>
        </div>

        <h2 className="text-xl font-bold font-display text-center text-slate-800 dark:text-white mb-2">
          Create Student Account
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
          Set up a temporary personal cloud bridge for your college files.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-title">FULL NAME</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field pl-10 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="label-title">COLLEGE / SCHOOL</label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="State College University"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="input-field pl-10 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="label-title">EMAIL ADDRESS</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                placeholder="student@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="label-title">PASSWORD</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10 pr-10 text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-2.5 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label-title">CONFIRM PASSWORD</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field pl-10 pr-10 text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-2.5 cursor-pointer"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Terms of Service & Privacy Policy Agreement Checkbox */}
          <div className="flex items-start gap-2.5 py-1">
            <input
              type="checkbox"
              id="terms-checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-primary rounded border-slate-300 dark:border-slate-700 cursor-pointer"
              required
            />
            <label htmlFor="terms-checkbox" className="text-xs text-slate-600 dark:text-slate-400 leading-snug cursor-pointer select-none">
              I agree to CloudVault's{' '}
              <Link to="/terms" target="_blank" className="text-brand-primary hover:underline font-bold">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" target="_blank" className="text-brand-primary hover:underline font-bold">
                Privacy Policy
              </Link>.
            </label>
          </div>

          {/* hCaptcha Widget */}
          <div className="flex justify-center mb-4 min-h-[78px]">
            <HCaptcha
              ref={captchaRef}
              sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY || "719e93c2-1358-4bfa-810e-fe50c19eebba"}
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
            className="w-full btn-primary h-12 flex justify-center items-center mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-primary hover:underline font-bold">
            Sign in here
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-4 text-[11px] text-slate-400">
          <Link to="/terms" className="hover:text-brand-primary transition">Terms of Service</Link>
          <span>•</span>
          <Link to="/privacy-policy" className="hover:text-brand-primary transition">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
