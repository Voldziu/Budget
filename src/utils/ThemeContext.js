// src/utils/ThemeContext.js
import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'app_theme';

// Define our color schemes
const lightTheme = {
  type: 'light',
  colors: {
    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    backgroundTertiary: '#F1F3F4',

    // Surface colors
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F9FA',

    // Text colors
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',

    // Primary colors
    primary: '#007AFF',
    primaryLight: '#5AC8FA',

    // Status colors
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',

    // Card colors
    card: '#FFFFFF',
    cardSecondary: 'rgba(255, 255, 255, 0.8)',

    // Border colors
    border: '#E5E7EB',
    borderSecondary: '#F3F4F6',

    // Shadow
    shadow: 'rgba(0, 0, 0, 0.1)',

    // Glassmorphism
    glass: 'rgba(255, 255, 255, 0.25)',
    glassBorder: 'rgba(255, 255, 255, 0.18)',

    // Income/Expense
    income: '#34C759',
    expense: '#FF3B30',

    // Tab bar
    tabBar: '#F8F9FA',
    tabBarBorder: '#E5E7EB',
  },
  gradients: {
    primary: ['#667eea', '#764ba2'],
    background: ['#667eea', '#764ba2'],
    card: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)'],
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};

const darkTheme = {
  type: 'dark',
  colors: {
    // Background colors
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',

    // Surface colors
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#8E8E93',

    // Primary colors
    primary: '#0A84FF',
    primaryLight: '#64D2FF',

    // Status colors
    success: '#30D158',
    error: '#FF453A',
    warning: '#FF9F0A',

    // Card colors
    card: '#1C1C1E',
    cardSecondary: 'rgba(28, 28, 30, 0.8)',

    // Border colors
    border: '#38383A',
    borderSecondary: '#48484A',

    // Shadow
    shadow: 'rgba(0, 0, 0, 0.3)',

    // Glassmorphism
    glass: 'rgba(28, 28, 30, 0.8)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',

    // Income/Expense
    income: '#30D158',
    expense: '#FF453A',

    // Tab bar
    tabBar: '#1C1C1E',
    tabBarBorder: '#38383A',
  },
  gradients: {
    primary: ['#1a1a2e', '#16213e'],
    background: ['#0f0f23', '#16213e'],
    card: ['rgba(28, 28, 30, 0.9)', 'rgba(28, 28, 30, 0.6)'],
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({children}) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on startup
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark ? 'dark' : 'light';
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setIsDark(!isDark);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  const value = {
    theme,
    isDark,
    toggleTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper function to create glassmorphism style
export const createGlassmorphism = (theme, opacity = 0.15) => ({
  backgroundColor: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: 'blur(20px)',
  borderWidth: 1,
  borderColor: theme.colors.glassBorder,
});

export default ThemeContext;
