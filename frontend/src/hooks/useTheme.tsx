import React, {createContext, type ReactNode, useContext, useEffect, useState,} from "react";
import {STORAGE_KEYS} from "../constants";

/**
 * Theme context and hook for app-wide theme management
 */

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: (value?: boolean) => void;
  theme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface AppThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider = ({ children }: AppThemeProviderProps) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      return saved === "true";
    } catch (error) {
      console.warn("Failed to read theme from localStorage:", error);
      return false; // Default to light theme
    }
  });

  const toggleTheme = (value?: boolean) => {
    const newTheme = value !== undefined ? value : !isDark;
    setIsDark(newTheme);

    try {
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme.toString());
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  };

  // Синхронизация темы между вкладками
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.THEME) {
        setIsDark(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const value: ThemeContextValue = {
    isDark,
    toggleTheme,
    theme: isDark ? "dark" : "light",
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within an AppThemeProvider");
  }
  return context;
};
