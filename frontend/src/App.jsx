import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { Settings, HelpCircle, ShieldAlert } from 'lucide-react';

// Lazy load pages for code splitting
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Admin = React.lazy(() => import('./pages/Admin'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark">
    <div className="w-12 h-12 rounded-full border-4 border-brand-primary border-t-transparent animate-spin"></div>
    <p className="mt-4 text-sm font-medium text-slate-500">Loading page content...</p>
  </div>
);

// Route Guard to verify general user authentication
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark">
        <div className="w-12 h-12 rounded-full border-4 border-brand-primary border-t-transparent animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-500">Loading session details...</p>
      </div>
    );
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg-light dark:bg-brand-bg-dark">
        <div className="w-12 h-12 rounded-full border-4 border-brand-primary border-t-transparent animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-500">Validating credentials...</p>
      </div>
    );
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
    <React.Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
