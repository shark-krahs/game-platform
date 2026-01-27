/**
 * Base API service with common HTTP methods and error handling
 */

import { buildHttpApiBaseUrl } from '../utils/url';
import i18n from '../i18n';

const API_BASE_URL = buildHttpApiBaseUrl();

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number = 0, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  headers?: HeadersInit;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  detail?: string;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const token = localStorage.getItem('authToken');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    console.log('API Request:', options.method || 'GET', url, {
      hasToken: !!token,
    });

    try {
      const response = await fetch(url, config);

      console.log('API Response:', response.status, response.url);

      let responseData: any;
      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        const errorCode =
          typeof responseData.detail === 'object'
            ? responseData.detail?.code
            : responseData.code;
        const localizedMessage = errorCode
          ? i18n.t(errorCode, { defaultValue: '' })
          : '';
        const detailMessage =
          typeof responseData.detail === 'string'
            ? responseData.detail
            : responseData.detail?.message;
        const message =
          localizedMessage ||
          detailMessage ||
          responseData.message ||
          responseData.error ||
          `HTTP ${response.status}`;
        throw new ApiError(message, response.status, responseData);
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // Сетевая ошибка или другая
      throw new ApiError(
        'Network error. Check your connection.',
        0,
        (error as Error)?.message
      );
    }
  }

  async get<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<T>(`${endpoint}${queryString}`);
  }

  async post<T>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Singleton instance
const apiService = new ApiService();

export { ApiService };
export default apiService;
