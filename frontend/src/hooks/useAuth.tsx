import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authApi, User, ApiError } from '../lib/api';

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

  // Check authentication status on mount
  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { user } = await authApi.login({ email, password });
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
      const { user } = await authApi.signup({ name, email, password, otp });
      setUser(user);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Signup failed';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
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
