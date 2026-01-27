/**
 * Authentication service - handles login, register, profile operations
 */

import api from './api';
import { User } from '../types'; // Твой тип User из src/types/index.ts

interface LoginResponse {
  access_token: string;
}

interface RegisterResponse {
  message: string;
}

interface MessageResponse {
  message: string;
  masked_email?: string;
  seconds_remaining?: number;
}

class AuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        username,
        password,
      });
      // Сохраняем токен автоматически (как было в AuthContext)
      if (response.access_token) {
        localStorage.setItem('authToken', response.access_token);
      }
      return response;
    } catch (error) {
      throw new Error((error as Error).message || 'Login failed');
    }
  }

  async register(username: string, password: string, email: string): Promise<RegisterResponse> {
    try {
      const response = await api.post<RegisterResponse>('/auth/register', {
        username,
        password,
        email,
      });
      return response;
    } catch (error) {
      throw new Error((error as Error).message || 'Registration failed');
    }
  }

  async confirmEmail(token: string): Promise<MessageResponse> {
    return api.post<MessageResponse>('/auth/confirm-email', { token });
  }

  async resendConfirmation(username: string): Promise<MessageResponse> {
    return api.post<MessageResponse>('/auth/resend-confirmation', { username });
  }

  async requestPasswordReset(username: string): Promise<MessageResponse> {
    return api.post<MessageResponse>('/auth/request-password-reset', { username });
  }

  async resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
    return api.post<MessageResponse>('/auth/reset-password', { token, new_password: newPassword });
  }

  async requestEmailChange(newEmail: string): Promise<MessageResponse> {
    return api.post<MessageResponse>('/auth/request-email-change', { new_email: newEmail });
  }

  async confirmEmailChange(token: string): Promise<MessageResponse> {
    return api.post<MessageResponse>('/auth/confirm-email-change', { token });
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<User>('/auth/me');
      return response;
    } catch (error: any) {
      if (error.status === 401) {
        this.logout();
      }
      throw error;
    }
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await api.put<User>('/auth/me', updates);
      return response;
    } catch (error) {
      throw new Error((error as Error).message || 'Profile update failed');
    }
  }

  logout(): void {
    localStorage.removeItem('authToken');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}

// Singleton instance
const authService = new AuthService();

export { AuthService };
export default authService;