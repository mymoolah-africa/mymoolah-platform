import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface ClientUser {
  id: number;
  email: string;
  name: string;
  role: string;
  clientId: number;
  companyName: string | null;
  clientCode: string | null;
  whiteLabel: string | null;
}

interface ClientAuthContextType {
  user: ClientUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getToken: () => string | null;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

const API_BASE = '/api/v1/client-portal';
const TOKEN_KEY = 'client_portal_token';
const USER_KEY = 'client_portal_user';

interface ClientAuthProviderProps {
  children: ReactNode;
}

export const ClientAuthProvider: React.FC<ClientAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const getToken = useCallback((): string | null => {
    return sessionStorage.getItem(TOKEN_KEY);
  }, []);

  const verifyToken = useCallback(async (): Promise<boolean> => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      clearSession();
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        clearSession();
        return false;
      }

      const data = await res.json();
      if (data.success && data.data) {
        const userData: ClientUser = {
          id: data.data.id,
          email: data.data.email,
          name: data.data.name,
          role: data.data.role,
          clientId: data.data.clientId,
          companyName: data.data.companyName,
          clientCode: data.data.clientCode,
          whiteLabel: data.data.whiteLabel,
        };
        setUser(userData);
        sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
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
      const token = sessionStorage.getItem(TOKEN_KEY);
      const userData = sessionStorage.getItem(USER_KEY);

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

      sessionStorage.setItem(TOKEN_KEY, data.data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
      setUser(data.data.user);

      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearSession();
  };

  return (
    <ClientAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = (): ClientAuthContextType => {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};
