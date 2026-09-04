import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { Settings, HelpCircle, ShieldAlert, Shield, Lock } from 'lucide-react';
import PWAInstallBanner from './components/PWAInstallBanner';
import OfflineBanner from './components/OfflineBanner';

// Lazy load pages for code splitting

const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Admin = React.lazy(() => import('./pages/Admin'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));

const LoadingFallback = ({ message = "Loading CloudVault Engine..." }) => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden font-sans select-none">
    {/* Dynamic Background Glow Orbs */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none animate-ping opacity-30"></div>

    <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center">
      {/* Animated Brand Logo Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[2px] shadow-2xl shadow-indigo-500/30 animate-bounce-subtle">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center backdrop-blur-md">
            <Shield className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
        </div>
        {/* Outer Rotating Ring */}
        <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-500/30 border-t-cyan-400 animate-spin"></div>
      </div>

      {/* Brand Title */}
      <h1 className="text-2xl font-black font-display tracking-tight text-white mb-1 flex items-center justify-center gap-1.5">
        Cloud<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300">Vault</span>
      </h1>

      {/* Dynamic Status Subtitle */}
      <p className="text-xs text-slate-400 font-medium tracking-wide mb-6">
        {message}
      </p>

      {/* Sleek Gradient Loader Bar */}
      <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden relative shadow-inner border border-slate-700/50">
        <div className="absolute inset-y-0 bg-gradient-to-r from-indigo-500 via-cyan-400 to-teal-400 rounded-full animate-loading-bar"></div>
      </div>

      {/* Encrypted Security Badge */}
      <div className="mt-8 flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-widest bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800/80">
        <Lock className="w-3 h-3 text-cyan-400" />
        <span>AES-256 Encrypted Session</span>
      </div>
    </div>
  </div>
);

// Route Guard to verify general user authentication
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback message="Loading session details..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.email === 'homtolab@gmail.com') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

// Route Guard to verify Super Admin status
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback message="Validating credentials..." />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.email !== 'homtolab@gmail.com') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppContent = () => {
  // Activate inactivity auto-logout hook
  useInactivityLogout();

  const { needsSetup, saveWizardConfig } = useAuth();
  const [setupUrl, setSetupUrl] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [wizardError, setWizardError] = useState('');

  const handleWizardSubmit = (e) => {
    e.preventDefault();
    if (!setupUrl || !setupKey) {
      setWizardError('Both Supabase URL and Anon Key are required!');
      return;
    }
    if (!setupUrl.startsWith('https://') || !setupUrl.includes('.supabase.co')) {
      setWizardError('Invalid Supabase URL format.');
      return;
    }
    saveWizardConfig(setupUrl, setupKey);
  };

  if (needsSetup) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-100/90 dark:bg-slate-950/95 backdrop-blur-xl p-4">
        <div className="glass-card max-w-md w-full p-8 shadow-2xl animate-scale-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand-primary/10 rounded-2xl">
              <Settings className="w-6 h-6 text-brand-primary" />
            </div>
            <h2 className="text-2xl font-bold font-display text-slate-800 dark:text-white">
              CloudVault Setup
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            To run CloudVault locally or on your own domain, connect your personal Supabase project. Enter your API credentials below.
          </p>

          {wizardError && (
            <div className="flex items-center gap-2 p-3.5 mb-5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{wizardError}</span>
            </div>
          )}

          <form onSubmit={handleWizardSubmit} className="space-y-4">
            <div>
              <label className="label-title">SUPABASE URL</label>
              <input
                type="text"
                placeholder="https://your-project-id.supabase.co"
                value={setupUrl}
                onChange={(e) => setSetupUrl(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-title">SUPABASE ANON KEY</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button type="submit" className="w-full btn-primary py-3 mt-2">
              Connect Supabase Project
            </button>
          </form>

          <div className="mt-6 flex gap-2 items-start text-xs text-slate-400">
            <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Need help? Make sure you ran the <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">schema.sql</code> script in Supabase SQL Editor to set up tables and storage bucket policies.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <React.Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
      <PWAInstallBanner />
      <OfflineBanner />
    </>
  );
};


const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
