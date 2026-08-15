import React, { useState, useEffect } from 'react';
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
    if (!password.trim()) {
      showToast('Please enter the administrative credentials.', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Direct Admin account authentication
      const email = 'homtolab@gmail.com';
      await login(email, password);
      showToast('Super Admin authenticated successfully!', 'success');
      navigate('/admin');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Incorrect administrative password.', 'danger');
    } finally {
      setLoading(false);
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
          

          {/* Password Input */}
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
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 absolute right-3 top-2.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary bg-red-600 hover:bg-red-700 shadow-red-500/10 py-3 text-xs font-bold flex items-center justify-center gap-1.5 mt-6"
          >
            {loading ? (
              <div className="w-4.5 h-4.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            ) : (
              <>
                <Shield className="w-4.5 h-4.5" /> Authenticate Admin
              </>
            )}
          </button>

        </form>

        <div className="mt-8 text-center text-[10px] text-slate-400 leading-normal">
          This portal logs administrative access. Any unauthorized attempts will trigger account locking triggers.
        </div>

      </div>

    </div>
  );
};

export default AdminLogin;
