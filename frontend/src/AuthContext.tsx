import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import i18n from './i18n';
import authService from './services/authService';
import { STORAGE_KEYS } from './constants';
import { User } from './types'; // ← Твой тип User

// Тип для значения контекста
interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string) => Promise<void>;
  confirmEmail: (token: string) => Promise<string>;
  resendConfirmation: (username: string) => Promise<{ message: string; seconds_remaining?: number }>;
  requestPasswordReset: (username: string) => Promise<{ message: string; masked_email?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  requestEmailChange: (newEmail: string) => Promise<{ message: string; masked_email?: string }>;
  confirmEmailChange: (token: string) => Promise<string>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem('authToken')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTokenValue = (value: string | null) => {
    if (value === null || value === undefined) {
      localStorage.removeItem('authToken');
    } else {
      localStorage.setItem('authToken', value);
    }
    setTokenState(value);
  };

  const removeToken = () => {
    setTokenValue(null);
  };

  // Загрузка профиля при наличии токена
  useEffect(() => {
    if (token) {
      fetchUserInfo();
    }
  }, [token]);

  const fetchUserInfo = useCallback(async () => {
    if (!token) return;
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      if (userData.language) {
        i18n.changeLanguage(userData.language);
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
      logout();
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(username, password);
      const { access_token } = response;
      setTokenValue(access_token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, password: string, email: string) => {
    setLoading(true);
    setError(null);
    try {
      await authService.register(username, password, email);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmEmail = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.confirmEmail(token);
      return response.message;
    } catch (err: any) {
      setError(err.message || 'Email confirmation failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.resendConfirmation(username);
      return response;
    } catch (err: any) {
      setError(err.message || 'Resend failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      return await authService.requestPasswordReset(username);
    } catch (err: any) {
      setError(err.message || 'Reset request failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.resetPassword(token, newPassword);
      return response.message;
    } catch (err: any) {
      setError(err.message || 'Reset failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const requestEmailChange = async (newEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      return await authService.requestEmailChange(newEmail);
    } catch (err: any) {
      setError(err.message || 'Email change request failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmEmailChange = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.confirmEmailChange(token);
      return response.message;
    } catch (err: any) {
      setError(err.message || 'Email change confirmation failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    removeToken();
    setError(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    error,
    login,
    register,
    confirmEmail,
    resendConfirmation,
    requestPasswordReset,
    resetPassword,
    requestEmailChange,
    confirmEmailChange,
    logout,
    updateProfile,
    refreshUser: fetchUserInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
