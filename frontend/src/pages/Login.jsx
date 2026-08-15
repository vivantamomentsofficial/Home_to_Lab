import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Key, Mail, ShieldAlert, ArrowLeft, Sun, Moon, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const { login, supabase } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Password reset/recovery flows
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // New password input states during recovery
  const [isRecovering, setIsRecovering] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Cloudflare Turnstile state
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);

  // Capture timeout reason
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'timeout') {
      showToast('You have been logged out due to inactivity.', 'warning');
    }
  }, [searchParams, showToast]);

  // Handle password recovery check & Turnstile script injection
  useEffect(() => {
    // 1. Inject Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setTurnstileLoaded(true);
    document.body.appendChild(script);

    // 2. Set up listener to capturePASSWORD_RECOVERY events
    let subscription = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovering(true);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      document.body.removeChild(script);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

  // Main login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Fetch CAPTCHA token
      const captchaToken = window.turnstile?.getResponse();
      if (!captchaToken && turnstileLoaded) {
        showToast('Please complete the Captcha check.', 'warning');
        setLoading(false);
        return;
      }

      await login(email, password, captchaToken, rememberMe);
      showToast('Welcome back to CloudVault!', 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Incorrect email or password.', 'danger');
      // Reset Turnstile widget on failure
      window.turnstile?.reset();
    } finally {
      setLoading(false);
    }
  };

  // Forgot password handler
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      showToast('Please enter your email address.', 'warning');
      return;
    }

    setResetLoading(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo,
      });

      if (error) throw error;
      showToast('Password reset link sent! Check your email inbox.', 'success');
      setIsForgotPassword(false);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to send recovery email.', 'danger');
    } finally {
      setResetLoading(false);
    }
  };

  // Save new password handler
  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    setRecoveryLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Password updated successfully! Sign in using your new password.', 'success');
      setIsRecovering(false);
      navigate('/login');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update password.', 'danger');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300 p-4">
      {/* Background Orbs */}
      <div className="glow-orb glow-orb-primary"></div>
      <div className="glow-orb glow-orb-accent"></div>

      {/* Floating Theme switcher & Back button */}
      <div className="absolute top-5 right-5 z-20 flex gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-brand-border-light dark:border-brand-border-dark text-slate-600 dark:text-slate-300 transition-colors"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
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

        {isRecovering ? (
          // Update Password Card (triggered by PASSWORD_RECOVERY event)
          <div>
            <h2 className="text-xl font-bold font-display text-center text-slate-800 dark:text-white mb-2">
              Reset Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
              Enter a new secure password for your account.
            </p>

            <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
              <div>
                <label className="label-title">NEW PASSWORD</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-title">CONFIRM PASSWORD</label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={recoveryLoading}
                className="w-full btn-primary h-12 flex justify-center items-center mt-6"
              >
                {recoveryLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        ) : isForgotPassword ? (
          // Forgot Password Request Card
          <div>
            <button
              onClick={() => setIsForgotPassword(false)}
              className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline mb-4 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
            <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white mb-2">
              Forgot Password?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Enter your registered email address and we'll send you a password reset recovery link.
            </p>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="label-title">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    placeholder="student@college.edu"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full btn-primary h-12 flex justify-center items-center mt-6"
              >
                {resetLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
        ) : (
          // Normal Login Form
          <div>
            <h2 className="text-xl font-bold font-display text-center text-slate-800 dark:text-white mb-2">
              Sign In to Vault
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
              Enter your account credentials to access your personal workspace.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="flex justify-between items-center mb-1">
                  <label className="label-title mb-0">PASSWORD</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-brand-primary hover:underline font-semibold"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-brand-primary rounded border-slate-300"
                />
                <label
                  htmlFor="remember-me"
                  className="text-xs text-slate-600 dark:text-slate-400 font-semibold cursor-pointer select-none"
                >
                  Remember my session on this device
                </label>
              </div>

              {/* Turnstile Captcha Widget */}
              <div
                className="cf-turnstile flex justify-center my-3"
                data-sitekey="0x4AAAAAAEK3i3q8cw05m9-C"
              ></div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary h-12 flex justify-center items-center mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Need a temporary bridge account?{' '}
              <Link to="/register" className="text-brand-primary hover:underline font-bold">
                Register here
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-850/50 text-center">
              <Link to="/admin/login" className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Administrative Portal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
