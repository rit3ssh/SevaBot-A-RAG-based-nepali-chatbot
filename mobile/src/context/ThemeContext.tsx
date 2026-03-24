import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../services/api';

interface ThemeContextType {
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDarkState] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme === 'dark') {
        setIsDarkState(true);
      }
    } catch (e) {
      console.error('Failed to load theme:', e);
    }
  };

  const setIsDark = async (val: boolean) => {
    setIsDarkState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, val ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
