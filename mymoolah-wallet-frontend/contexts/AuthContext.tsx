import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  phoneNumber: string;
  walletId: string;
  kycStatus: 'pending' | 'documents_uploaded' | 'processing' | 'verified' | 'rejected';
  email?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  refreshToken: () => Promise<void>;
  updateKYCStatus: (status: User['kycStatus']) => void;
}

interface LoginCredentials {
  phoneNumber: string;
  pin: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token on app start
    checkAuthStatus();
    
    // Set up token refresh interval
    const refreshInterval = setInterval(refreshToken, 14 * 60 * 1000); // 14 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('mymoolah_token');
      if (token) {
        // Validate token with backend
        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          localStorage.removeItem('mymoolah_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('mymoolah_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const { user, token } = await response.json();
      localStorage.setItem('mymoolah_token', token);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('mymoolah_token');
    setUser(null);
  };

  const refreshToken = async () => {
    try {
      const token = localStorage.getItem('mymoolah_token');
      if (!token) return;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const { token: newToken } = await response.json();
        localStorage.setItem('mymoolah_token', newToken);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const updateKYCStatus = (status: User['kycStatus']) => {
    if (user) {
      setUser({ ...user, kycStatus: status });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      isAuthenticated: !!user,
      loading: isLoading,
      refreshToken,
      updateKYCStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}