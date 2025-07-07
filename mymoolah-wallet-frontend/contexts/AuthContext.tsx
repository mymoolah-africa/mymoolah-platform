import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { validateDemoCredentials, isDemoMode, getDemoCredentials } from '../config/app-config';
import { APP_CONFIG } from '../config/app-config';

// Updated KYC status type with complete flow
type KYCStatus = 'not_started' | 'documents_uploaded' | 'under_review' | 'verified' | 'rejected';

interface User {
  id: string;
  name: string;
  identifier: string; // SA mobile number for login
  identifierType: 'phone' | 'account' | 'username';
  phoneNumber: string; // Always set for login users (SA mobile number)
  walletId: string;
  kycStatus: KYCStatus;
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
  identifier: string; // SA mobile number only for login
  password: string;
}

interface RegistrationData {
  name: string;
  identifier: string;
  email: string;
  password: string;
  identifierType: 'phone' | 'account' | 'username';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// SA Mobile Number validation for login
const validateSAMobileNumber = (phoneNumber: string): boolean => {
  const saPhonePattern = /^(\+27|27|0)[6-8][0-9]{8}$/;
  const cleanNumber = phoneNumber.replace(/\s/g, '');
  return saPhonePattern.test(cleanNumber);
};

// Input type detection utility for registration (multi-input support)
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

// Normalize SA mobile number to consistent format
const normalizeSAMobileNumber = (phoneNumber: string): string => {
  const cleanNumber = phoneNumber.replace(/\s/g, '');
  
  // Convert to 27XXXXXXXXX format
  if (cleanNumber.startsWith('+27')) {
    return cleanNumber.slice(1); // Remove +
  } else if (cleanNumber.startsWith('0')) {
    return '27' + cleanNumber.slice(1); // Replace 0 with 27
  } else if (cleanNumber.startsWith('27')) {
    return cleanNumber; // Already correct format
  }
  
  return cleanNumber;
};

// Helper function to safely parse JSON responses
const safeJsonParse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      return null;
    }
  } else {
    // Response is not JSON (likely HTML error page)
    const text = await response.text();
    console.error('Received non-JSON response:', text);
    return null;
  }
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
        // Demo mode - restore user session
        const demoCredentials = getDemoCredentials();
        
        // Check for stored KYC status in demo mode
        const storedKYCStatus = localStorage.getItem('mymoolah_kyc_status') as KYCStatus;
        const kycStatus = storedKYCStatus || 'not_started';
        
        const mockUser: User = {
          id: 'demo-user-001',
          name: 'Demo User',
          identifier: normalizeSAMobileNumber(demoCredentials.phoneNumber),
          identifierType: 'phone',
          phoneNumber: normalizeSAMobileNumber(demoCredentials.phoneNumber),
          walletId: 'wallet-demo-001',
          kycStatus,
          kycVerified: kycStatus === 'verified'
        };
        setUser(mockUser);
      } else if (token) {
        // Real authentication - validate token with backend
        const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const responseData = await safeJsonParse(response);
          if (responseData && responseData.user) {
            setUser({
              ...responseData.user,
              kycVerified: responseData.user.kycStatus === 'verified'
            });
          } else {
            localStorage.removeItem('mymoolah_token');
          }
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
      // Validate SA mobile number format
      if (!validateSAMobileNumber(credentials.identifier)) {
        throw new Error('Please enter a valid South African mobile number');
      }

      // Simulate API call delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isDemoMode()) {
        // Demo authentication - check against demo credentials
        const normalizedPhoneNumber = normalizeSAMobileNumber(credentials.identifier);
        const isValidCredentials = validateDemoCredentials(normalizedPhoneNumber, credentials.password);
        
        if (isValidCredentials) {
          // Check for stored KYC status in demo mode
          const storedKYCStatus = localStorage.getItem('mymoolah_kyc_status') as KYCStatus;
          const kycStatus = storedKYCStatus || 'not_started';
          
          // Create mock user for demo
          const mockUser: User = {
            id: 'demo-user-001',
            name: 'Demo User',
            identifier: normalizedPhoneNumber,
            identifierType: 'phone',
            phoneNumber: normalizedPhoneNumber,
            walletId: 'wallet-demo-001',
            kycStatus,
            kycVerified: kycStatus === 'verified'
          };
          
          const mockToken = 'demo-token-' + Date.now();
          localStorage.setItem('mymoolah_token', mockToken);
          setUser(mockUser);
        } else {
          throw new Error('Invalid mobile number or password. Please check your credentials.');
        }
      } else {
        // Production authentication with backend
        const normalizedPhoneNumber = normalizeSAMobileNumber(credentials.identifier);
        
        const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: normalizedPhoneNumber,
            password: credentials.password,
          }),
        });

        if (response.ok) {
          const responseData = await safeJsonParse(response);
          if (responseData && responseData.user && responseData.token) {
            localStorage.setItem('mymoolah_token', responseData.token);
            setUser({
              ...responseData.user,
              kycVerified: responseData.user.kycStatus === 'verified'
            });
          } else {
            throw new Error('Invalid response from server. Please try again.');
          }
        } else {
          const errorData = await safeJsonParse(response);
          throw new Error(errorData?.message || `Login failed (${response.status}). Please try again.`);
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

      // Real authentication - refresh token with backend
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const responseData = await safeJsonParse(response);
        if (responseData && responseData.token) {
          localStorage.setItem('mymoolah_token', responseData.token);
        } else {
          logout();
        }
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  // KYC Management Functions
  const updateKYCStatus = async (status: KYCStatus) => {
    try {
      if (isDemoMode()) {
        // Demo mode - store in localStorage
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
        const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/kyc/update-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });

        if (response.ok) {
          const responseData = await safeJsonParse(response);
          if (responseData) {
            setUser({
              ...responseData,
              kycVerified: responseData.kycStatus === 'verified'
            });
          }
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
        const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const responseData = await safeJsonParse(response);
          if (responseData) {
            setUser({
              ...responseData,
              kycVerified: responseData.kycStatus === 'verified'
            });
          }
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

  // FIXED: Registration function with proper backend field mapping
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
          identifier: registrationData.identifierType === 'phone' ? 
            normalizeSAMobileNumber(registrationData.identifier) : 
            registrationData.identifier, // Normalize phone numbers for consistency
          identifierType: registrationData.identifierType,
          phoneNumber: registrationData.identifierType === 'phone' ? 
            normalizeSAMobileNumber(registrationData.identifier) : 
            '', // Empty for non-phone registrations, will be set during profile update
          walletId: 'wallet-demo-' + Date.now(),
          kycStatus: 'not_started',
          kycVerified: false
        };
        
        const mockToken = 'demo-token-' + Date.now();
        localStorage.setItem('mymoolah_token', mockToken);
        setUser(mockUser);
      } else {
        // FIXED: Production registration with correct backend field mapping
        let backendPayload: any;
        
        if (registrationData.identifierType === 'phone') {
          // For phone numbers, send as phoneNumber field (what backend expects)
          const cleanPhoneNumber = registrationData.identifier.replace(/\s/g, '');
          backendPayload = {
            name: registrationData.name,
            email: registrationData.email,
            phoneNumber: cleanPhoneNumber, // FIXED: Use phoneNumber field for backend
            password: registrationData.password
          };
        } else {
          // For account numbers and usernames, send as identifier
          // (Note: Backend may need to be updated to handle these cases)
          backendPayload = {
            name: registrationData.name,
            email: registrationData.email,
            identifier: registrationData.identifier,
            identifierType: registrationData.identifierType,
            password: registrationData.password
          };
        }

        try {
          const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(backendPayload)
          });

          if (response.ok) {
            const responseData = await safeJsonParse(response);
            if (responseData && responseData.user && responseData.token) {
              localStorage.setItem('mymoolah_token', responseData.token);
              setUser({ 
                ...responseData.user, 
                kycVerified: responseData.user.kycStatus === 'verified' 
              });
            } else {
              throw new Error('Invalid response from server. Please try again.');
            }
          } else {
            // Handle different error response types
            const errorData = await safeJsonParse(response);
            
            let errorMessage = 'Registration failed. Please try again.';
            
            if (response.status === 404) {
              errorMessage = 'Registration service is currently unavailable. Please check that your backend is running on http://localhost:3001';
            } else if (response.status === 409) {
              errorMessage = 'An account with this information already exists.';
            } else if (response.status === 400) {
              // Handle validation errors
              if (errorData && errorData.message) {
                if (errorData.message.toLowerCase().includes('phone')) {
                  errorMessage = 'Invalid phone number format. Please use SA mobile number (0XX XXX XXXX).';
                } else if (errorData.message.toLowerCase().includes('email')) {
                  errorMessage = 'Invalid email address format.';
                } else if (errorData.message.toLowerCase().includes('password')) {
                  errorMessage = 'Password does not meet security requirements.';
                } else {
                  errorMessage = errorData.message;
                }
              } else {
                errorMessage = 'Invalid registration data. Please check all fields.';
              }
            } else if (response.status >= 500) {
              errorMessage = 'Server error. Please try again later.';
            } else if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
            
            console.error('❌ Registration failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            });
            
            throw new Error(errorMessage);
          }
        } catch (networkError) {
          if (networkError instanceof TypeError && networkError.message.includes('fetch')) {
            // Network connectivity issue
            throw new Error('Cannot connect to server. Please check that your backend is running on http://localhost:3001');
          } else {
            throw networkError;
          }
        }
      }
    } catch (error) {
      console.error('🔥 Registration error:', error);
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