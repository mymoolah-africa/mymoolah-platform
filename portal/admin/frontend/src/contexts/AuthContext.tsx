import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AuthUser {
  id: number;
  entityId: string;
  entityName: string;
  entityType: string;
  email: string;
  role: string;
  hasDualRole?: boolean;
  dualRoles?: string[];
  isVerified?: boolean;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = '/api/v1/admin/auth';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
    setUser(null);
  }, []);

  const verifyToken = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('portal_token');
    if (!token) {
      clearSession();
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        clearSession();
        return false;
      }

      const data = await res.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        localStorage.setItem('portal_user', JSON.stringify(data.data.user));
        return true;
      }

      clearSession();
      return false;
    } catch {
      clearSession();
      return false;
    }
  }, [clearSession]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('portal_token');
      const userData = localStorage.getItem('portal_user');

      if (token && userData) {
        try {
          setUser(JSON.parse(userData));
        } catch {
          clearSession();
        }
        await verifyToken();
      }
      setIsLoading(false);
    };
    init();
  }, [verifyToken, clearSession]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed' };
      }

      localStorage.setItem('portal_token', data.data.token);
      localStorage.setItem('portal_user', JSON.stringify(data.data.user));
      setUser(data.data.user);

      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('portal_token');
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Logout is best-effort
    }
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        verifyToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
