import React, { createContext, useContext, useEffect } from 'react';

// Light mode only - dark mode has been completely removed per user specification
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Ensure root element never has 'dark' class
    const root = window.document.documentElement;
    root.classList.remove('dark');
    try {
      localStorage.removeItem('CLOUDVAULT_THEME');
      localStorage.setItem('CLOUDVAULT_THEME', 'light');
    } catch (e) {
      // Ignore storage errors if localStorage is restricted
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

