import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isDemoMode, validateDemoCredentials, getDemoCredentials } from '../config/app-config';

// Updated KYC status type with complete flow
type KYCStatus = 'not_started' | 'documents_uploaded' | 'under_review' | 'verified' | 'rejected';

interface User {
  id: string;
  name: string;
  identifier: string; // Updated to support phone/account/username
  identifierType: 'phone' | 'account' | 'username';
  phoneNumber?: string; // Keep for backward compatibility
  walletId: string;
  kycStatus: KYCStatus; // Updated to use complete KYC flow
  kycVerified: boolean; // Computed property for easy access
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register?: (registrationData: RegistrationData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshToken: () => Promise<void>;
  updateKYCStatus: (status: KYCStatus) => Promise<void>;
  refreshUserStatus: () => Promise<void>;
  requiresKYC: (action?: string) => boolean;
}

interface LoginCredentials {
  identifier: string; // Updated to support phone/account/username 
  password: string; // Updated from 'pin' to 'password'
}

interface RegistrationData {
  name: string;
  identifier: string;
  email: string;
  password: string;
  identifierType: 'phone' | 'account' | 'username';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Input type detection utility (same as LoginPage)
const detectInputType = (input: string): 'phone' | 'account' | 'username' | 'unknown' => {
  const cleanInput = input.trim();
  
  // Phone number patterns (SA format)
  const phonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;
  if (phonePattern.test(cleanInput.replace(/\s/g, ''))) {
    return 'phone';
  }
  
  // Account number pattern (8-12 digits only)
  const accountPattern = /^[0-9]{8,12}$/;
  if (accountPattern.test(cleanInput)) {
    return 'account';
  }
  
  // Username pattern (4-32 chars, letters/numbers/periods/underscores)
  const usernamePattern = /^[a-zA-Z0-9._]{4,32}$/;
  if (usernamePattern.test(cleanInput)) {
    return 'username';
  }
  
  return 'unknown';
};

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
      if (token && token.startsWith('demo-token-')) {
        // Demo mode - restore user session with updated user structure
        const demoCredentials = getDemoCredentials();
        
        // Check for stored KYC status in demo mode
        const storedKYCStatus = localStorage.getItem('mymoolah_kyc_status') as KYCStatus;
        const kycStatus = storedKYCStatus || 'not_started';
        
        const mockUser: User = {
          id: 'demo-user-001',
          name: 'Demo User',
          identifier: demoCredentials.phoneNumber,
          identifierType: 'phone',
          phoneNumber: demoCredentials.phoneNumber,
          walletId: 'wallet-demo-001',
          kycStatus,
          kycVerified: kycStatus === 'verified'
        };
        setUser(mockUser);
      } else if (token) {
        // Real authentication - validate token with backend (when backend is ready)
        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser({
            ...userData,
            kycVerified: userData.kycStatus === 'verified'
          });
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
      // Simulate API call delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isDemoMode()) {
        // Demo authentication using new complex password system
        const isValidCredentials = validateDemoCredentials(credentials.identifier, credentials.password);
        
        if (isValidCredentials) {
          // Determine input type for user profile
          const inputType = detectInputType(credentials.identifier);
          
          // Check for stored KYC status in demo mode
          const storedKYCStatus = localStorage.getItem('mymoolah_kyc_status') as KYCStatus;
          const kycStatus = storedKYCStatus || 'not_started';
          
          // Create mock user with proper identifier type
          const mockUser: User = {
            id: 'demo-user-001',
            name: 'Demo User',
            identifier: credentials.identifier,
            identifierType: inputType as 'phone' | 'account' | 'username',
            // Set phoneNumber if identifier is a phone number
            phoneNumber: inputType === 'phone' ? credentials.identifier : undefined,
            walletId: 'wallet-demo-001',
            kycStatus,
            kycVerified: kycStatus === 'verified'
          };
          
          const mockToken = 'demo-token-' + Date.now();
          localStorage.setItem('mymoolah_token', mockToken);
          setUser(mockUser);
        } else {
          throw new Error('Invalid credentials. Please check your phone number/account/username and password.');
        }
      } else {
        // Production authentication with Mojaloop (when backend is ready)
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: credentials.identifier,
            password: credentials.password,
            identifierType: detectInputType(credentials.identifier)
          }),
        });

        if (response.ok) {
          const { user: userData, token } = await response.json();
          localStorage.setItem('mymoolah_token', token);
          setUser({
            ...userData,
            kycVerified: userData.kycStatus === 'verified'
          });
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      throw error; // Re-throw to be handled by LoginPage
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('mymoolah_token');
    localStorage.removeItem('mymoolah_kyc_status');
    setUser(null);
  };

  const refreshToken = async () => {
    try {
      const token = localStorage.getItem('mymoolah_token');
      if (!token) return;

      if (token.startsWith('demo-token-')) {
        // Demo mode - just refresh the timestamp
        const newToken = 'demo-token-' + Date.now();
        localStorage.setItem('mymoolah_token', newToken);
        return;
      }

      // Real authentication - refresh token with backend (when backend is ready)
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

  // New KYC Management Functions
  const updateKYCStatus = async (status: KYCStatus) => {
    try {
      if (isDemoMode()) {
        // Demo mode - update local storage
        localStorage.setItem('mymoolah_kyc_status', status);
        
        // Update user state
        if (user) {
          const updatedUser: User = {
            ...user,
            kycStatus: status,
            kycVerified: status === 'verified'
          };
          setUser(updatedUser);
        }
      } else {
        // Production mode - API call to backend
        const token = localStorage.getItem('mymoolah_token');
        const response = await fetch('/api/kyc/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({
            ...userData,
            kycVerified: userData.kycStatus === 'verified'
          });
        } else {
          throw new Error('Failed to update KYC status');
        }
      }
    } catch (error) {
      console.error('KYC status update failed:', error);
      throw error;
    }
  };

  const refreshUserStatus = async () => {
    try {
      if (isDemoMode()) {
        // Demo mode - simulate status check
        const storedStatus = localStorage.getItem('mymoolah_kyc_status') as KYCStatus;
        
        // Simulate status progression for demo
        if (storedStatus === 'documents_uploaded') {
          // Randomly progress to under_review after some time
          const uploadTime = localStorage.getItem('mymoolah_upload_time');
          const currentTime = Date.now();
          
          if (!uploadTime) {
            localStorage.setItem('mymoolah_upload_time', currentTime.toString());
          } else {
            const timeDiff = currentTime - parseInt(uploadTime);
            // Progress to under_review after 30 seconds for demo
            if (timeDiff > 30000 && Math.random() > 0.3) {
              await updateKYCStatus('under_review');
            }
          }
        } else if (storedStatus === 'under_review') {
          // Randomly progress to verified after some time
          const reviewTime = localStorage.getItem('mymoolah_review_time');
          const currentTime = Date.now();
          
          if (!reviewTime) {
            localStorage.setItem('mymoolah_review_time', currentTime.toString());
          } else {
            const timeDiff = currentTime - parseInt(reviewTime);
            // Progress to verified after 60 seconds for demo
            if (timeDiff > 60000 && Math.random() > 0.5) {
              await updateKYCStatus('verified');
              localStorage.removeItem('mymoolah_upload_time');
              localStorage.removeItem('mymoolah_review_time');
            }
          }
        }
      } else {
        // Production mode - fetch latest status from backend
        const token = localStorage.getItem('mymoolah_token');
        const response = await fetch('/api/user/status', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({
            ...userData,
            kycVerified: userData.kycStatus === 'verified'
          });
        }
      }
    } catch (error) {
      console.error('User status refresh failed:', error);
    }
  };

  // Check if KYC is required for specific actions
  const requiresKYC = (action?: string): boolean => {
    if (!user) return true;
    
    const kycStatus = user.kycStatus;
    
    // Allow browsing and deposits without KYC
    if (action === 'browse' || action === 'deposit') {
      return false;
    }
    
    // Require KYC for transactions
    if (action === 'send' || action === 'transfer' || action === 'withdraw') {
      return kycStatus !== 'verified';
    }
    
    // Default: require KYC if not verified
    return kycStatus !== 'verified';
  };

  // Mock register function for demo mode
  const register = async (registrationData: RegistrationData) => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isDemoMode()) {
        // Demo registration
        const mockUser: User = {
          id: 'demo-user-' + Date.now(),
          name: registrationData.name,
          identifier: registrationData.identifier,
          identifierType: registrationData.identifierType,
          phoneNumber: registrationData.identifierType === 'phone' ? registrationData.identifier : undefined,
          walletId: 'wallet-demo-' + Date.now(),
          kycStatus: 'not_started',
          kycVerified: false
        };
        
        const mockToken = 'demo-token-' + Date.now();
        localStorage.setItem('mymoolah_token', mockToken);
        setUser(mockUser);
      } else {
        // Production registration
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        });

        if (response.ok) {
          const { user: userData, token } = await response.json();
          localStorage.setItem('mymoolah_token', token);
          setUser({ ...userData, kycVerified: userData.kycStatus === 'verified' });
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login,
      register, 
      logout, 
      isLoading, 
      refreshToken,
      updateKYCStatus,
      refreshUserStatus,
      requiresKYC
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

// Export types for use in other components
export type { User, LoginCredentials, RegistrationData, AuthContextType, KYCStatus };