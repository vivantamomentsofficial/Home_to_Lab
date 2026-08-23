import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

const GlobalAnnouncementBanner = () => {
  const { supabase } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('DISMISSED_ALERTS') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!supabase) return;

    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('global_alerts')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setAlerts(data);
        }
      } catch (err) {
        console.warn('Failed to fetch global alerts:', err);
      }
    };

    fetchAlerts();

    // Subscribe to realtime alerts if enabled
    const channel = supabase
      .channel('public:global_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleDismiss = (id) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    try {
      sessionStorage.setItem('DISMISSED_ALERTS', JSON.stringify(next));
    } catch {}
  };

  const visibleAlerts = alerts.filter((a) => !dismissedIds.includes(a.id));
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visibleAlerts.map((alert) => {
        const type = alert.type || 'info';
        let bgClass = 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200';
        let Icon = Info;

        if (type === 'warning') {
          bgClass = 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200';
          Icon = AlertTriangle;
        } else if (type === 'danger' || type === 'critical') {
          bgClass = 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200';
          Icon = AlertCircle;
        } else if (type === 'success') {
          bgClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200';
          Icon = CheckCircle2;
        }

        return (
          <div
            key={alert.id}
            className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border backdrop-blur-sm shadow-sm transition-all ${bgClass}`}
          >
            <div className="flex items-start gap-2.5">
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                {alert.title && (
                  <h5 className="font-bold text-xs uppercase tracking-wide mb-0.5">
                    {alert.title}
                  </h5>
                )}
                <p className="text-xs leading-relaxed">{alert.message || alert.content}</p>
              </div>
            </div>

            <button
              onClick={() => handleDismiss(alert.id)}
              className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity shrink-0"
              title="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default GlobalAnnouncementBanner;
