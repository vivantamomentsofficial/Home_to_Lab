import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export const useInactivityLogout = () => {
  const { user, logout } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    // Only monitor activity when user is authenticated
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      // Fetch idle timeout limit from localStorage (in minutes)
      // Defaults to 'disabled' / 0 if not set
      const limitVal = localStorage.getItem('CLOUDVAULT_INACTIVITY_LIMIT');
      if (!limitVal || limitVal === 'disabled') return;

      const minutes = parseInt(limitVal);
      if (isNaN(minutes) || minutes <= 0) return;

      const msLimit = minutes * 60 * 1000;

      timerRef.current = setTimeout(() => {
        console.warn(`User session idle for ${minutes} minutes. Automating logout.`);
        logout();
        // Redirect to login page and append warning parameter
        window.location.href = '/login?reason=timeout';
      }, msLimit);
    };

    // User activity listeners
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Initialize timer
    resetTimer();

    // Register listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup listeners
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, logout]);
};
