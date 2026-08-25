import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Key, Mail, ShieldAlert, ArrowLeft, Sun, Moon, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const { login, supabase, user } = useAuth();
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
  const [showMailtoFallback, setShowMailtoFallback] = useState(false);
  const [suspensionError, setSuspensionError] = useState(null);

  // New password input states during recovery
  const [isRecovering, setIsRecovering] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

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
  }, [theme, isForgotPassword, isRecovering]);

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

  // Capture timeout/suspension reason
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'timeout') {
      showToast('You have been logged out due to inactivity.', 'warning');
    } else if (reason === 'suspended') {
      setSuspensionError('Your account has been suspended by the administrator.');
    }
  }, [searchParams, showToast]);

  // Handle password recovery check
  useEffect(() => {
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
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

  // Failed attempts and lockout state
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(() => {
    const lockedUntil = localStorage.getItem('CLOUDVAULT_LOGIN_LOCKED_UNTIL');
    if (lockedUntil) {
      const remaining = Math.max(0, Math.floor((parseInt(lockedUntil, 10) - Date.now()) / 1000));
      return remaining;
    }
    return 0;
  });

  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimeLeft((prev) => {
        if (prev <= 1) {
          localStorage.removeItem('CLOUDVAULT_LOGIN_LOCKED_UNTIL');
          localStorage.removeItem('CLOUDVAULT_FAILED_LOGIN_ATTEMPTS');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  // Main login submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (lockoutTimeLeft > 0) {
      showToast(`Account login is temporarily locked for security. Please try again in ${lockoutTimeLeft}s.`, 'warning');
      return;
    }

    if (!email || !password) {
      showToast('Please enter both email and password.', 'warning');
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
      await login(email, password, captchaToken, rememberMe);
      // Reset failed attempts on success
      localStorage.removeItem('CLOUDVAULT_FAILED_LOGIN_ATTEMPTS');
      localStorage.removeItem('CLOUDVAULT_LOGIN_LOCKED_UNTIL');

      showToast('Welcome back to CloudVault!', 'success');
      if (email.trim().toLowerCase() === 'homtolab@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      if (err.message?.includes('suspended')) {
        setSuspensionError(err.message);
      } else {
        // Track consecutive failed login attempts
        const currentFailed = parseInt(localStorage.getItem('CLOUDVAULT_FAILED_LOGIN_ATTEMPTS') || '0', 10) + 1;
        localStorage.setItem('CLOUDVAULT_FAILED_LOGIN_ATTEMPTS', currentFailed.toString());

        if (currentFailed >= 5) {
          const lockDurationMs = 5 * 60 * 1000; // 5 minutes
          const lockExpiry = Date.now() + lockDurationMs;
          localStorage.setItem('CLOUDVAULT_LOGIN_LOCKED_UNTIL', lockExpiry.toString());
          setLockoutTimeLeft(300);
          showToast('Security Alert: Too many failed login attempts. Access is locked for 5 minutes.', 'danger');
        } else {
          showToast(`${err.message || 'Incorrect email or password.'} (${5 - currentFailed} attempts remaining)`, 'danger');
        }
      }
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


  // Forgot password handler
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      showToast('Please enter your email address.', 'warning');
      return;
    }

    const captchaToken = document.getElementsByName('cf-turnstile-response')[0]?.value || 
                         (typeof window.turnstile !== 'undefined' ? window.turnstile.getResponse() : null);
    if (!captchaToken) {
      showToast('Please complete the Captcha check.', 'warning');
      return;
    }

    setResetLoading(true);
    setShowMailtoFallback(false);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo,
        captchaToken,
      });

      if (error) throw error;
      showToast('Password reset link sent! Check your email inbox.', 'success');
      setIsForgotPassword(false);
    } catch (err) {
      console.error(err);
      const isSmtpError = err.status === 500 || err.message?.includes('recovery email') || err.message?.includes('SMTP');
      if (isSmtpError) {
        setShowMailtoFallback(true);
        showToast('SMTP Server failure. You can use the Admin fallback link below to request manual recovery.', 'danger');
      } else {
        showToast(err.message || 'Failed to send recovery email.', 'danger');
      }
    } finally {
      setResetLoading(false);
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (resetErr) {
          console.warn('Turnstile reset error:', resetErr);
        }
      }
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

        {suspensionError ? (
          // Account Suspended Warning Card
          <div className="text-center animate-scale-up">
            <div className="flex justify-center mb-4">
              <div className="p-3.5 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full">
                <ShieldAlert className="w-10 h-10 stroke-[2.5]" />
              </div>
            </div>
            <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white mb-3">
              Account Suspended
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {suspensionError} You no longer have access to CloudVault. 
              If you believe this is a mistake or wish to request reactivation, please contact support.
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href={`mailto:homtolab@gmail.com?subject=Reactivation Request for Suspended Account (${encodeURIComponent(email || 'User')})&body=Hello Admin,%0A%0AMy CloudVault account (${encodeURIComponent(email || 'User')}) has been suspended by the administrator.%0A%0AI would like to request reactivation.%0A%0AThank you!`}
                className="w-full btn-danger h-12 flex justify-center items-center font-bold text-sm"
              >
                Contact Support via Email
              </a>
              <button
                onClick={() => {
                  setSuspensionError(null);
                  setEmail('');
                  setPassword('');
                }}
                className="w-full btn-secondary h-12 text-sm cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : isRecovering ? (
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

              {/* Cloudflare Turnstile CAPTCHA Widget */}
              <div 
                ref={turnstileRef}
                className="cf-turnstile flex justify-center mb-4" 
                data-sitekey="0x4AAAAAAEQ7vtfVgOop_jfH"
              ></div>

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

            {showMailtoFallback && (
              <div className="mt-4 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <ShieldAlert className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-750 dark:text-red-400 leading-relaxed">
                    <strong className="block mb-0.5">Email Delivery Error</strong>
                    The Supabase mail server is currently misconfigured or has run out of its email quotas (500 SMTP Error). Please request a manual account recovery from the administrator.
                  </div>
                </div>
                <a
                  href={`mailto:homtolab@gmail.com?subject=CloudVault Password Recovery Support for ${encodeURIComponent(resetEmail)}&body=Hello Admin,%0A%0AI tried resetting my CloudVault password using the forgot password form, but I received a 500 SMTP error indicating that Supabase is unable to send emails.%0A%0AMy registered email: ${encodeURIComponent(resetEmail)}%0A%0APlease help reset my password.%0A%0AThanks!`}
                  className="w-full text-center py-2 bg-red-500 hover:bg-red-650 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
                >
                  Request Manual Recovery via Mail
                </a>
              </div>
            )}
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

              {/* Cloudflare Turnstile CAPTCHA Widget */}
              <div 
                ref={turnstileRef}
                className="cf-turnstile flex justify-center mb-4" 
                data-sitekey="0x4AAAAAAEQ7vtfVgOop_jfH"
              ></div>

              <button
                type="submit"
                disabled={loading || lockoutTimeLeft > 0}
                className={`w-full btn-primary h-12 flex justify-center items-center mt-6 ${
                  lockoutTimeLeft > 0 ? 'opacity-60 cursor-not-allowed bg-slate-600 hover:bg-slate-600' : ''
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                ) : lockoutTimeLeft > 0 ? (
                  `Locked (${lockoutTimeLeft}s)`
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
