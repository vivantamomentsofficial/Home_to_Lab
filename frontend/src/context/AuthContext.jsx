import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  supabase: null,
  config: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  deleteOwnAccount: async () => {},
  resetConfig: () => {},
  saveWizardConfig: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [supabase, setSupabase] = useState(null);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  // 1. Fetch Supabase configuration on mount
  useEffect(() => {
    const fetchConfigAndInit = async () => {
      const DEFAULT_SUPABASE_URL = 'https://gxccllaqtdiuvnrialta.supabase.co';
      const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_RX7bF4fL5BYUdwUx3vGl3Q_xSe5A-ny';

      let url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('CLOUDVAULT_SUPABASE_URL');
      let key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('CLOUDVAULT_SUPABASE_ANON_KEY');

      // If not in localStorage or env, try retrieving from the Node.js backend proxy
      if (!url || !key) {
        try {
          // Point to local Express backend during dev or relative route in prod
          const apiUrl = import.meta.env.VITE_API_URL || '';
          const res = await fetch(`${apiUrl}/api/config`);
          if (res.ok) {
            const data = await res.json();
            if (data.supabaseUrl && data.supabaseAnonKey) {
              url = data.supabaseUrl;
              key = data.supabaseAnonKey;
            }
          }
        } catch (err) {
          console.warn('Backend configuration retrieval not available:', err);
        }
      }

      // Default fallback so setup wizard never interrupts normal users/visitors
      if (!url || !key) {
        url = DEFAULT_SUPABASE_URL;
        key = DEFAULT_SUPABASE_ANON_KEY;
      }

      try {
        const isSessionOnly = sessionStorage.getItem('CLOUDVAULT_SESSION_PERSIST') === 'session_only';
        const clientOptions = {
          auth: {
            persistSession: true,
            storage: isSessionOnly ? window.sessionStorage : window.localStorage,
          },
        };
        const client = createClient(url, key, clientOptions);
        setSupabase(client);
        setConfig({ supabaseUrl: url, supabaseAnonKey: key });

        // Retrieve initial session
        const { data: { session: initialSession } } = await client.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user || null);

        // Listen for Auth changes
        const { data: { subscription } } = client.auth.onAuthStateChange(async (event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user || null);

          // Sync login logs if user signs in and is not anonymous
          const isAnonymous = newSession && newSession.user && newSession.user.is_anonymous;
          if (event === 'SIGNED_IN' && !isAnonymous && newSession?.user) {
            try {
              let ipAddress = '127.0.0.1';
              try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                if (ipRes.ok) {
                  const ipData = await ipRes.json();
                  ipAddress = ipData.ip || '127.0.0.1';
                }
              } catch (ipErr) {
                console.warn('Failed to fetch IP address:', ipErr);
              }

              await client.from('login_logs').insert({
                user_id: newSession.user.id,
                email: newSession.user.email || 'guest@cloudvault.local',
                login_time: new Date().toISOString(),
                ip_address: ipAddress
              });
            } catch (err) {
              console.error('Failed to log login action in Supabase:', err);
            }
          }
        });

        return () => {
          subscription?.unsubscribe();
        };
      } catch (err) {
        console.error('Supabase initialization failed:', err);
        setNeedsSetup(true);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigAndInit();
  }, []);

  // Login handler
  const login = async (email, password, captchaToken, rememberMe) => {
    if (!supabase) throw new Error('Supabase client not initialized.');

    if (!rememberMe) {
      sessionStorage.setItem('CLOUDVAULT_SESSION_PERSIST', 'session_only');
    } else {
      sessionStorage.removeItem('CLOUDVAULT_SESSION_PERSIST');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken,
      },
    });

    if (error) throw error;

    // Check if account is suspended before fully setting session
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_suspended')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.warn('Could not check suspension status on login:', profileError);
      } else if (profileData && profileData.is_suspended) {
        await supabase.auth.signOut();
        throw new Error('Your account has been suspended by the administrator. Please contact homtolab@gmail.com.');
      }
    } catch (profileErr) {
      if (profileErr.message?.includes('suspended')) {
        throw profileErr;
      }
    }

    setSession(data.session);
    setUser(data.session?.user || null);
    return data;
  };

  // Register handler
  const register = async (email, password, fullName, college, captchaToken) => {
    if (!supabase) throw new Error('Supabase client not initialized.');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          college: college,
        },
        captchaToken,
      },
    });

    if (error) throw error;
    return data;
  };

  // Sign out handler
  const logout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Sign out error:', error);
    setUser(null);
    setSession(null);
  };

  // Self account deletion RPC handler
  const deleteOwnAccount = async () => {
    if (!supabase) return;
    const { error } = await supabase.rpc('delete_own_account');
    if (error) throw error;
    await logout();
  };

  // Helper to wipe local Supabase configurations
  const resetConfig = () => {
    localStorage.removeItem('CLOUDVAULT_SUPABASE_URL');
    localStorage.removeItem('CLOUDVAULT_SUPABASE_ANON_KEY');
    window.location.reload();
  };

  // Save config from Wizard Setup
  const saveWizardConfig = (url, key) => {
    localStorage.setItem('CLOUDVAULT_SUPABASE_URL', url.trim());
    localStorage.setItem('CLOUDVAULT_SUPABASE_ANON_KEY', key.trim());
    window.location.reload();
  };

  const value = {
    user,
    session,
    loading,
    supabase,
    config,
    needsSetup,
    login,
    register,
    logout,
    deleteOwnAccount,
    resetConfig,
    saveWizardConfig
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
