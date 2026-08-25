import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Key, Mail, User, School, ShieldAlert, ArrowLeft, Sun, Moon, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  const [loading, setLoading] = useState(false);

  // Redirect logged in sessions
  useEffect(() => {
    if (user) {
      if (user.email === 'homtolab@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Safe Cloudflare Turnstile widget manager
  useEffect(() => {
    let intervalId;

    const safeRemove = () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Suppress turnstile internal cleanup warnings
        }
        widgetIdRef.current = null;
      }
    };

    const tryRender = () => {
      if (!window.turnstile || !turnstileRef.current) return false;
      try {
        if (turnstileRef.current.querySelector('iframe')) return true;
        safeRemove();
        turnstileRef.current.innerHTML = '';
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: "0x4AAAAAAEQ7vtfVgOop_jfH",
          theme: theme === 'dark' ? 'dark' : 'light',
        });
        return true;
      } catch (err) {
        return false;
      }
    };

    if (!tryRender()) {
      intervalId = setInterval(() => {
        if (tryRender()) {
          clearInterval(intervalId);
        }
      }, 150);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      safeRemove();
    };
  }, [theme]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    const captchaToken = document.getElementsByName('cf-turnstile-response')[0]?.value || 
                         (typeof window.turnstile !== 'undefined' ? window.turnstile.getResponse() : null);
    if (!captchaToken) {
      showToast('Please complete the Captcha check.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const signUpData = await register(email, password, fullName, college, captchaToken);

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
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (resetErr) {
          console.warn('Turnstile reset error:', resetErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300 p-4">
      {/* Background Orbs */}
      <div className="glow-orb glow-orb-primary"></div>
      <div className="glow-orb glow-orb-accent"></div>
      {/* Back to Home Link */}
      <div className="absolute top-5 left-5 z-20 flex gap-2">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
      <div className="glass-card max-w-md w-full p-8 shadow-2xl relative z-10 animate-scale-up">
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-brand-primary stroke-[2.5]" />
            <span className="font-display font-black text-2xl text-slate-800 dark:text-white">
              CloudVault
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
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="label-title">COLLEGE / SCHOOL</label>
            <div className="relative">
              <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="State College University"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="label-title">EMAIL ADDRESS</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                placeholder="student@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="label-title">PASSWORD</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="label-title">CONFIRM PASSWORD</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          {/* Cloudflare Turnstile CAPTCHA Widget */}
          <div 
            ref={turnstileRef}
            className="cf-turnstile flex justify-center mb-4" 
            data-sitekey="0x4AAAAAAEQ7vtfVgOop_jfH"
          ></div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary h-12 flex justify-center items-center mt-6"
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
      </div>
    </div>
  );
};

export default Register;
