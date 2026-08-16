import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Shield, Key, ArrowLeft, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const AdminLogin = () => {
  const { login, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = Password, 2 = OTP
  const [otp, setOtp] = useState('');

  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Cloudflare Turnstile state
  useEffect(() => {
    let timer;
    if (window.turnstile && turnstileRef.current) {
      try {
        if (widgetIdRef.current !== null) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
        if (turnstileRef.current.children.length === 0) {
          widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
            sitekey: "0x4AAAAAAEQ7vtfVgOop_jfH",
            theme: theme === 'dark' ? 'dark' : 'light',
          });
        }
      } catch (err) {
        console.warn('Turnstile render error:', err);
      }
    } else {
      timer = setInterval(() => {
        if (window.turnstile && turnstileRef.current) {
          clearInterval(timer);
          try {
            if (widgetIdRef.current !== null) {
              window.turnstile.remove(widgetIdRef.current);
              widgetIdRef.current = null;
            }
            if (turnstileRef.current.children.length === 0) {
              widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
                sitekey: "0x4AAAAAAEQ7vtfVgOop_jfH",
                theme: theme === 'dark' ? 'dark' : 'light',
              });
            }
          } catch (err) {
            console.warn('Turnstile render error:', err);
          }
        }
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (err) {
          console.warn('Turnstile cleanup error:', err);
        }
      }
    };
  }, [theme, step]);

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


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 1) {
      if (!password.trim()) {
        showToast('Please enter the administrative credentials.', 'warning');
        return;
      }
      setStep(2);
      showToast('Please enter the administrator OTP to proceed.', 'info');
      return;
    }

    if (step === 2) {
      if (otp !== '1127') {
        showToast('Invalid administrative OTP code.', 'danger');
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
        // Direct Admin account authentication
        const email = 'homtolab@gmail.com';
        await login(email, password, captchaToken);
        showToast('Super Admin authenticated successfully!', 'success');
        navigate('/admin');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Incorrect administrative password.', 'danger');
        setStep(1); // Reset to password step if auth fails
        setOtp('');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg-light p-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Background Graphic Orbs */}
      <div className="glow-orb glow-orb-primary opacity-15"></div>
      <div className="glow-orb glow-orb-accent opacity-15"></div>

      {/* Top Header Controls */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to User Login
        </Link>
      </div>

      <div className="glass-card max-w-sm w-full p-8 shadow-2xl relative z-10 animate-scale-up border-red-500/20">
        
        {/* Shield Header Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-9 h-9 text-red-500 stroke-[2.5]" />
            <span className="font-display font-black text-2xl text-slate-800">
              Admin Centre
            </span>
          </div>
        </div>

        <h2 className="text-lg font-bold font-display text-center text-slate-800 mb-1">
          Super Admin Gateway
        </h2>
        <p className="text-xs text-slate-500 text-center mb-6">
          Authorized personnel only. Please verify admin credentials.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {step === 1 ? (
            /* Step 1: Password Input */
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="label-title mb-0">ADMIN PASSWORD</label>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 absolute right-3 top-2.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary bg-red-600 hover:bg-red-700 shadow-red-500/10 py-3 text-xs font-bold flex items-center justify-center gap-1.5 mt-6 cursor-pointer"
              >
                Continue
              </button>
            </div>
          ) : (
            /* Step 2: OTP Input */
            <div className="space-y-4 animate-scale-up">
              <div>
                <label className="label-title">ADMINISTRATIVE OTP</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="input-field text-center font-bold tracking-[10px] text-lg h-12"
                  required
                  autoFocus
                />
              </div>

              {/* Cloudflare Turnstile CAPTCHA Widget */}
              <div 
                ref={turnstileRef}
                className="cf-turnstile flex justify-center mb-4" 
                data-sitekey="0x4AAAAAAEQ7vtfVgOop_jfH"
              ></div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                  }}
                  className="flex-1 btn-secondary py-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 btn-primary bg-red-650 hover:bg-red-700 py-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4.5 h-4.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  ) : (
                    <>
                      <Shield className="w-4.5 h-4.5" /> Log In
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </form>

        <div className="mt-8 text-center text-[10px] text-slate-400 leading-normal">
          This portal logs administrative access. Any unauthorized attempts will trigger account locking triggers.
        </div>

      </div>

    </div>
  );
};

export default AdminLogin;
