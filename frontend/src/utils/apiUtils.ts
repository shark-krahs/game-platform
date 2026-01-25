/**
 * API-related utility functions
 */

import { HTTP_STATUS, REQUEST_TIMEOUT } from '../constants/api';

/**
 * Check if HTTP status is successful (2xx)
 */
export const isSuccessStatus = (status: number | undefined): boolean => {
  if (status === undefined) return false;
  return status >= 200 && status < 300;
};

/**
 * Check if HTTP status is client error (4xx)
 */
export const isClientErrorStatus = (status: number | undefined): boolean => {
  if (status === undefined) return false;
  return status >= 400 && status < 500;
};

/**
 * Check if HTTP status is server error (5xx)
 */
export const isServerErrorStatus = (status: number | undefined): boolean => {
  if (status === undefined) return false;
  return status >= 500 && status < 600;
};

/**
 * Get user-friendly error message from HTTP status
 */
export const getErrorMessageFromStatus = (
  status: number | undefined,
  defaultMessage: string = 'Unknown error'
): string => {
  const statusMessages: Record<number, string> = {
    [HTTP_STATUS.BAD_REQUEST]: 'Bad request - please check your input',
    [HTTP_STATUS.UNAUTHORIZED]: 'Unauthorized - please log in',
    [HTTP_STATUS.FORBIDDEN]: 'Access forbidden',
    [HTTP_STATUS.NOT_FOUND]: 'Resource not found',
    [HTTP_STATUS.INTERNAL_SERVER_ERROR]:
      'Internal server error - please try again later',
  };

  return statusMessages[status as keyof typeof statusMessages] || defaultMessage;
};

/**
 * Create AbortController with timeout
 */
export const createTimeoutController = (timeout: number = REQUEST_TIMEOUT): AbortController => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Очистка таймаута при abort
  controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));

  return controller;
};

/**
 * Check if error is network error
 */
export const isNetworkError = (error: any): boolean => {
  return (
    !error.response &&
    (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error'))
  );
};

/**
 * Check if error is timeout error
 */
export const isTimeoutError = (error: any): boolean => {
  return (
    error.code === 'ECONNABORTED' ||
    error.message?.includes('timeout') ||
    error.name === 'AbortError'
  );
};

/**
 * Check if error is cancellation error
 */
export const isCancelError = (error: any): boolean => {
  return error.name === 'AbortError' || error.message?.includes('canceled');
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Не ретраим клиентские ошибки (4xx)
      if (isClientErrorStatus(error.status)) {
        throw error;
      }

      // Последняя попытка — бросаем ошибку
      if (attempt === maxRetries) {
        throw error;
      }

      // Экспоненциальная задержка
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Build query string from object
 */
export const buildQueryString = (params: Record<string, any> | null | undefined): string => {
  if (!params || Object.keys(params).length === 0) return '';

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Parse query string to object
 */
export const parseQueryString = (queryString: string | null | undefined): Record<string, string> => {
  if (!queryString) return {};

  const cleanQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const params: Record<string, string> = {};

  new URLSearchParams(cleanQuery).forEach((value, key) => {
    params[key] = value;
  });

  return params;
};

/**
 * Create FormData from object
 */
export const createFormData = (data: Record<string, any> | null | undefined): FormData => {
  const formData = new FormData();

  if (!data) return formData;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((item) => formData.append(key, item as string | Blob));
      } else {
        formData.append(key, value as string | Blob);
      }
    }
  });

  return formData;
};

/**
 * Get content type header value
 */
export const getContentType = (data: any): string | undefined => {
  if (data instanceof FormData) {
    return undefined; // Браузер сам установит с boundary
  }
  if (typeof data === 'object' && data !== null) {
    return 'application/json';
  }
  return 'text/plain';
};

/**
 * Prepare request body
 */
export const prepareRequestBody = (data: any): BodyInit | null => {
  if (data instanceof FormData) {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data);
  }
  return data ?? null;
};