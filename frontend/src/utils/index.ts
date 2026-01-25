/**
 * Utility functions - common helper functions used across the application
 */

// Реэкспорт утилит из других файлов
export * from './gameUtils';
export * from './apiUtils';
export * from './validation';

// Общие утилиты

/**
 * Format seconds to MM:SS
 */
export const formatTime = (seconds: number | null | undefined): string => {
  if (!seconds || seconds < 0) return '0:00';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format milliseconds to MM:SS
 */
export const formatTimeMs = (milliseconds: number | null | undefined): string => {
  return formatTime(Math.floor((milliseconds || 0) / 1000));
};

/**
 * Generate random alphanumeric ID
 */
export const generateId = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Check if value is empty
 */
export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Capitalize string
 */
export const capitalize = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Clamp value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Get random item from array
 */
export const randomItem = <T>(array: T[] | null | undefined): T | null => {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)]!;
};

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => import.meta.env.DEV;

/**
 * Check if running in production mode
 */
export const isProduction = (): boolean => import.meta.env.PROD;

/**
 * Safe JSON parse
 */
export const safeJsonParse = <T = any>(
  jsonString: string,
  fallback: T | null = null
): T | null => {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.warn('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Detect mobile device
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Get file extension
 */
export const getFileExtension = (filename: string | null | undefined): string => {
  if (!filename) return '';
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Format file size in bytes
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes === 0 || bytes === null || bytes === undefined) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};