import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authApi, User, ApiError, tokenStorage } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount using stored token
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        // Token expired or invalid — clear it
        tokenStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { user, token } = await authApi.login({ email, password });
      tokenStorage.set(token);
      setUser(user);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed';
      setError(msg);
      throw err;
    }
  };

  const signup = async (name: string, email: string, password: string, otp: string) => {
    setError(null);
    try {
      const { user, token } = await authApi.signup({ name, email, password, otp });
      tokenStorage.set(token);
      setUser(user);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Signup failed';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    tokenStorage.clear();
    setUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, signup, logout, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
