import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Auth Context Types
interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  lastLogin?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const token = localStorage.getItem('portal_token');
        const userData = localStorage.getItem('portal_user');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Clear invalid data
        localStorage.removeItem('portal_token');
        localStorage.removeItem('portal_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Demo login for now - replace with actual API call
      if (email === 'admin@mymoolah.africa' && password === 'Admin123!') {
        const userData: AuthUser = {
          id: 'admin-001',
          name: 'Admin User',
          email: 'admin@mymoolah.africa',
          role: 'admin',
          permissions: ['read', 'write', 'admin'],
          lastLogin: new Date().toISOString()
        };

        // Store in localStorage
        localStorage.setItem('portal_token', 'demo-token-123');
        localStorage.setItem('portal_user', JSON.stringify(userData));
        
        setUser(userData);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
    setUser(null);
  };

  // Update user function
  const updateUser = (userData: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('portal_user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
