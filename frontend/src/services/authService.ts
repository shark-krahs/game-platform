/**
 * Authentication service - handles login, register, profile operations
 */

import api from "./api";
import { User } from "../types"; // Твой тип User из src/types/index.ts

interface LoginResponse {
  access_token: string;
}

interface RegisterResponse {
  message: string;
  recovery_codes?: string[];
  recovery_setup_token?: string;
  codes_available_until?: string;
}

class AuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        username,
        password,
      });
      // Сохраняем токен автоматически (как было в AuthContext)
      if (response.access_token) {
        localStorage.setItem("authToken", response.access_token);
      }
      return response;
    } catch (error) {
      throw new Error((error as Error).message || "Login failed");
    }
  }

  async register(
    username: string,
    password: string,
    language: string,
  ): Promise<RegisterResponse> {
    try {
      const response = await api.post<RegisterResponse>("/auth/register", {
        username,
        password,
        language,
      });
      return response;
    } catch (error) {
      throw new Error((error as Error).message || "Registration failed");
    }
  }


  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<User>("/auth/me");
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
      const response = await api.put<User>("/auth/me", updates);
      return response;
    } catch (error) {
      throw new Error((error as Error).message || "Profile update failed");
    }
  }

  logout(): void {
    localStorage.removeItem("authToken");
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem("authToken");
  }

  getToken(): string | null {
    return localStorage.getItem("authToken");
  }

  async confirmRecoverySetup(setupToken: string): Promise<void> {
    await api.post("/auth/recovery/confirm-setup", { setup_token: setupToken });
  }

  async verifyRecoveryCode(
    username: string,
    code: string,
  ): Promise<{ reset_token: string | null }> {
    return api.post("/auth/recovery/verify", { username, code });
  }

  async resetPasswordWithRecovery(
    resetToken: string,
    newPassword: string,
  ): Promise<void> {
    await api.post("/auth/recovery/reset-password", {
      reset_token: resetToken,
      new_password: newPassword,
    });
  }

  async regenerateRecoveryCodes(password: string): Promise<{
    generated_at?: string;
    codes_available_until?: string;
  }> {
    return api.post("/me/security/recovery/regenerate", { password });
  }

  async fetchRecoveryCodes(): Promise<{ codes: string[] }> {
    return api.get("/me/security/recovery/codes");
  }

  async confirmRecoveryViewed(): Promise<{ viewed_at: string }> {
    return api.post("/me/security/recovery/confirm-viewed", {});
  }

  async getRecoveryStatus(): Promise<{
    confirmed: boolean;
    viewed_at: string | null;
    generated_at: string | null;
    last_used_at: string | null;
    active_codes_count: number;
  }> {
    return api.get("/me/security/recovery/status");
  }
}

// Singleton instance
const authService = new AuthService();

export { AuthService };
export default authService;
