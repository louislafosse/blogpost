import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../../theme/theme.ts';
import { CssBaseline } from '@mui/material';

const ThemeToggleContext = createContext<{
  isDarkMode: boolean;
  toggleTheme: () => void;
} | undefined>(undefined);

export const ThemeToggleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Read synchronously so the very first render already has the correct theme — no flash
    const saved = typeof localStorage !== 'undefined' ? (localStorage.getItem('theme') ?? 'light') : 'light';
    return saved === 'dark';
  });

  // Keep localStorage in sync but no need to read it again on mount
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    setIsDarkMode(newTheme);
  };

  return (
    <ThemeToggleContext.Provider value={{ isDarkMode, toggleTheme }}>
      <MuiThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeToggleContext.Provider>
  );
};

export const useThemeToggle = () => {
  const context = useContext(ThemeToggleContext);
  if (context === undefined) {
    throw new Error('useThemeToggle must be used within a ThemeToggleProvider');
  }
  return context;
};
