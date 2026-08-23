import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('openworld_theme') || localStorage.getItem('edupulse_theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }
      localStorage.setItem('openworld_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    // If browser supports View Transitions API, execute transition smoothly
    const doc = document as unknown as { startViewTransition?: (callback: () => void) => void };
    if (typeof document !== 'undefined' && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => {
        setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
      });
    } else {
      setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
    }
  };

  const setTheme = (newTheme: Theme) => {
    const doc = document as unknown as { startViewTransition?: (callback: () => void) => void };
    if (typeof document !== 'undefined' && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => {
        setThemeState(newTheme);
      });
    } else {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
