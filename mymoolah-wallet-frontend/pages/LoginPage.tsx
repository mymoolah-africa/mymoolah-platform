import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Loader2, Eye, EyeOff, Shield, FileText, HelpCircle, Lock, Globe, Users, Award, CheckCircle, UserPlus, Check, X, AlertTriangle, Info } from 'lucide-react';
import { APP_CONFIG, isDemoMode, getDemoCredentials } from '../config/app-config';

// Input type detection and validation utilities
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

const validatePhoneNumber = (phone: string): { isValid: boolean; message?: string } => {
  const cleaned = phone.replace(/\s/g, '');
  
  // Check if it's a valid SA mobile number
  const saPhonePattern = /^(\+27|27|0)[6-8][0-9]{8}$/;
  
  if (!saPhonePattern.test(cleaned)) {
    if (cleaned.length === 0) {
      return { isValid: false, message: 'Phone number is required' };
    }
    if (cleaned.length < 10) {
      return { isValid: false, message: 'Phone number too short' };
    }
    if (cleaned.length > 13) {
      return { isValid: false, message: 'Phone number too long' };
    }
    if (!/^(\+27|27|0)/.test(cleaned)) {
      return { isValid: false, message: 'Must start with +27, 27, or 0' };
    }
    if (!/[6-8]/.test(cleaned.charAt(cleaned.startsWith('+27') ? 3 : cleaned.startsWith('27') ? 2 : 1))) {
      return { isValid: false, message: 'Invalid SA mobile number format' };
    }
    return { isValid: false, message: 'Invalid South African mobile number' };
  }
  
  return { isValid: true };
};

const validateAccountNumber = (account: string): { isValid: boolean; message?: string } => {
  if (account.length === 0) {
    return { isValid: false, message: 'Account number is required' };
  }
  if (!/^[0-9]+$/.test(account)) {
    return { isValid: false, message: 'Account number must contain only digits' };
  }
  if (account.length < 8) {
    return { isValid: false, message: 'Account number must be at least 8 digits' };
  }
  if (account.length > 12) {
    return { isValid: false, message: 'Account number cannot exceed 12 digits' };
  }
  
  return { isValid: true };
};

const validateUsername = (username: string): { isValid: boolean; message?: string } => {
  if (username.length === 0) {
    return { isValid: false, message: 'Username is required' };
  }
  if (username.length < 4) {
    return { isValid: false, message: 'Username must be at least 4 characters' };
  }
  if (username.length > 32) {
    return { isValid: false, message: 'Username cannot exceed 32 characters' };
  }
  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, periods, and underscores' };
  }
  if (/^[._]/.test(username) || /[._]$/.test(username)) {
    return { isValid: false, message: 'Username cannot start or end with period or underscore' };
  }
  
  return { isValid: true };
};

// Password validation utility
const validatePassword = (password: string) => {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid: minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar
  };
};

export function LoginPage() {
  const { login, user, isLoading: authLoading } = useAuth();
  const [credentials, setCredentials] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [identifierError, setIdentifierError] = useState('');

  // Real-time password validation
  const passwordValidation = validatePassword(credentials.password);
  
  // Real-time identifier validation
  const inputType = detectInputType(credentials.identifier);
  const getIdentifierValidation = () => {
    if (!credentials.identifier.trim()) {
      return { isValid: false, message: '' };
    }
    
    switch (inputType) {
      case 'phone':
        return validatePhoneNumber(credentials.identifier);
      case 'account':
        return validateAccountNumber(credentials.identifier);
      case 'username':
        return validateUsername(credentials.identifier);
      default:
        return { isValid: false, message: 'Please enter a valid phone number, account number, or username' };
    }
  };

  const identifierValidation = getIdentifierValidation();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Auto-fill demo credentials in demo mode - UPDATED FOR COMPLEX PASSWORD
  const handleDemoFill = () => {
    if (isDemoMode()) {
      const demoCredentials = getDemoCredentials();
      setCredentials({ identifier: demoCredentials.phoneNumber, password: demoCredentials.password });
      setIdentifierError('');
    }
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCredentials({ ...credentials, identifier: value });
    
    // Clear error when user starts typing
    if (identifierError && value.trim()) {
      setIdentifierError('');
    }
  };

  const handlePasswordFocus = () => {
    setPasswordFocused(true);
    setShowPasswordValidation(true);
  };

  const handlePasswordBlur = () => {
    setPasswordFocused(false);
    // Keep showing validation if password has content
    if (credentials.password.length === 0) {
      setShowPasswordValidation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate identifier
      if (!identifierValidation.isValid) {
        throw new Error(identifierValidation.message || 'Please enter a valid phone number, account number, or username');
      }

      // Validate password
      if (!passwordValidation.isValid) {
        throw new Error('Please ensure your password meets all requirements');
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock authentication - replace with real Mojaloop authentication
      if (credentials.identifier && credentials.password) {
        await login(credentials);
      } else {
        throw new Error('Please enter both identifier and password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceholderText = () => {
    switch (inputType) {
      case 'phone':
        return '27 XX XXX XXXX';
      case 'account':
        return '12345678';
      case 'username':
        return 'username';
      default:
        return 'Phone Number';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] flex items-center justify-center">
        <div className="max-w-sm mx-auto w-full">
          <div className="text-center text-white">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-normal)' }}>
              Loading MyMoolah...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      {/* Mobile Container */}
      <div className="max-w-sm mx-auto bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] min-h-screen flex flex-col">
        {/* Header Section */}
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '4rem', paddingBottom: '2rem' }}>
          {/* Logo Section */}
          <div className="text-center mb-8">
            {/* MyMoolah Logo */}
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <img
                src="/src/assets/logo3.svg"
                alt="MyMoolah Logo"
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="bg-white/20 backdrop-blur-sm rounded-3xl w-20 h-20 flex items-center justify-center" style={{ display: 'none' }}>
                <div className="text-white" style={{ fontSize: '1.5rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 'var(--font-weight-bold)' }}>M</div>
              </div>
            </div>
            <p className="text-white/90" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-normal)' }}>
              Your Digital Wallet
            </p>
          </div>
        </div>

        {/* Forms Section */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '2rem' }}>
          {/* Sign In Form */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <CardHeader className="text-center pb-6">
              <CardTitle style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)', fontWeight: 'var(--font-weight-bold)', color: '#1f2937' }}>
                Ready to transact?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)' }}>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Multi-Input Authentication Field - Simplified Label */}
                <div className="space-y-2">
                  <Label htmlFor="identifier" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                    Phone Number
                  </Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder={getPlaceholderText()}
                    value={credentials.identifier}
                    onChange={handleIdentifierChange}
                    className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] ${!identifierValidation.isValid && credentials.identifier.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    style={{ 
                      height: 'var(--mobile-touch-target)',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-normal)',
                      borderRadius: 'var(--mobile-border-radius)'
                    }}
                    required
                    aria-describedby="identifier-help identifier-error"
                  />
                  
                  {/* Input Type Indicator and Help Text - Simplified */}
                  <div id="identifier-help" className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    {credentials.identifier.trim() ? (
                      <span className={`inline-flex items-center gap-1 ${identifierValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {identifierValidation.isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {inputType === 'phone' && 'South African mobile number'}
                        {inputType === 'account' && 'Account number (8-12 digits)'}
                        {inputType === 'username' && 'Username (4-32 characters)'}
                        {inputType === 'unknown' && 'Invalid format'}
                      </span>
                    ) : (
                      'Enter your phone number (27XXXXXXXXX) - also your account no.'
                    )}
                  </div>
                  
                  {/* Real-time Validation Error */}
                  {!identifierValidation.isValid && credentials.identifier.trim() && identifierValidation.message && (
                    <div id="identifier-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      <AlertTriangle className="w-3 h-3" />
                      {identifierValidation.message}
                    </div>
                  )}
                </div>

                {/* Enhanced Password Field with COMPACT Format Guidance */}
                <div className="space-y-2">
                  <Label htmlFor="password" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                    Password
                  </Label>
                  
                  {/* COMPACT Password Format Hint - Shows before user types */}
                  {!passwordFocused && credentials.password.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Info className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-blue-700 text-xs mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px' }}>
                            <strong>Format:</strong> 8+ chars, A-Z, a-z, 0-9, !@#$
                          </p>
                          <p className="text-blue-600 text-xs" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '10px' }}>
                            <strong>e.g.</strong> MyWallet2024!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => {
                        setCredentials({ ...credentials, password: e.target.value });
                        setShowPasswordValidation(e.target.value.length > 0);
                      }}
                      onFocus={handlePasswordFocus}
                      onBlur={handlePasswordBlur}
                      className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12 ${
                        credentials.password.length > 0 && !passwordValidation.isValid ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500' : 
                        credentials.password.length > 0 && passwordValidation.isValid ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''
                      }`}
                      style={{ 
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                      required
                      aria-describedby="password-requirements"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 touch-target"
                      style={{ minHeight: 'var(--mobile-touch-target)', minWidth: 'var(--mobile-touch-target)' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Real-time Password Validation - Enhanced with Example */}
                  {showPasswordValidation && (
                    <div id="password-requirements" className="mt-3 p-3 bg-gray-50 rounded-lg border" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)' }}>
                          Password Requirements:
                        </p>
                        {passwordValidation.isValid && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-600" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                              Valid!
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          {passwordValidation.minLength ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-xs ${passwordValidation.minLength ? 'text-green-700' : 'text-red-600'}`} 
                                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            At least 8 characters
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasUppercase ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-xs ${passwordValidation.hasUppercase ? 'text-green-700' : 'text-red-600'}`}
                                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            One uppercase letter (A-Z)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasLowercase ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-xs ${passwordValidation.hasLowercase ? 'text-green-700' : 'text-red-600'}`}
                                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            One lowercase letter (a-z)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasNumber ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-700' : 'text-red-600'}`}
                                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            One number (0-9)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasSpecialChar ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-xs ${passwordValidation.hasSpecialChar ? 'text-green-700' : 'text-red-600'}`}
                                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            One special character (!@#$%^&*)
                          </span>
                        </div>
                      </div>
                      
                      {/* Example Section */}
                      {!passwordValidation.isValid && (
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <p className="text-xs text-gray-600 mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            <strong>Example passwords:</strong>
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs text-blue-600" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                              • MyWallet2024! ✓
                            </p>
                            <p className="text-xs text-blue-600" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                              • SecurePay123@ ✓
                            </p>
                            <p className="text-xs text-blue-600" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                              • FinTech#2024 ✓
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !passwordValidation.isValid || !identifierValidation.isValid}
                  className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white disabled:opacity-60"
                  style={{ 
                    height: 'var(--mobile-touch-target)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    borderRadius: 'var(--mobile-border-radius)'
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Signing In...</span>
                    </>
                  ) : (
                    <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Sign In</span>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <button
                    type="button"
                    className="text-[#2D8CCA] hover:text-[#2680B8] touch-target"
                    style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      minHeight: 'var(--mobile-touch-target)'
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Register Card - 5% Smaller */}
          <div className="mt-4 transform scale-95">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardContent style={{ paddingTop: '1.5rem' }}>
                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#86BE41]/10 to-[#2D8CCA]/10 rounded-xl w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-[#86BE41]" />
                  </div>
                  <h3 style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'clamp(1rem, 2vw, 1.125rem)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: '#1f2937', 
                    marginBottom: '0.5rem' 
                  }}>
                    New to MyMoolah?
                  </h3>
                  <p className="text-gray-600 mb-4" style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-small)', 
                    fontWeight: 'var(--font-weight-normal)' 
                  }}>
                    Create your free digital wallet in under 2 minutes
                  </p>
                  <Link to="/register">
                    <Button 
                      variant="outline" 
                      className="w-full border-2 border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white transition-all duration-300"
                      style={{ 
                        height: '2.75rem',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-medium)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                    >
                      Create Free Account
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-500 mt-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    ✓ No fees ✓ Instant setup ✓ Bank-grade security
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Card with T&C's, Security, and FAQ */}
          <div className="mt-4 p-4 bg-white/20 backdrop-blur-sm" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            {isDemoMode() ? (
              /* Demo Mode - Show demo credentials + icons - UPDATED FOR COMPLEX PASSWORD */
              <div className="space-y-4">
                {/* Demo Credentials Section - UPDATED */}
                <div className="text-center">
                  <p className="text-white/90 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    Demo Credentials:
                  </p>
                  <div className="space-y-1 mb-3">
                    <p className="text-white" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      <strong>Phone:</strong> {getDemoCredentials().phoneNumber}
                    </p>
                    <p className="text-white" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      <strong>Password:</strong> {getDemoCredentials().password}
                    </p>
                    <p className="text-white/70 text-xs mt-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      (Also works: accounts, usernames)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoFill}
                    className="w-full py-2 bg-white/30 hover:bg-white/40 backdrop-blur-sm text-white transition-all mb-4 touch-target"
                    style={{ 
                      borderRadius: 'var(--mobile-border-radius)',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      minHeight: 'var(--mobile-touch-target)'
                    }}
                  >
                    Auto-Fill Demo Credentials
                  </button>
                </div>
                
                {/* Icons Row */}
                <div className="flex items-center justify-between px-2">
                  {/* T&C's Icon */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all touch-target">
                        <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                          T&C's
                        </span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm mx-auto bg-white" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                      <DialogHeader>
                        <DialogTitle className="text-center" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'var(--font-weight-bold)' }}>
                          Terms & Conditions
                        </DialogTitle>
                      </DialogHeader>
                      <div className="text-gray-700 space-y-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                        <p><strong>MyMoolah Digital Wallet Terms:</strong></p>
                        <p>• This is a demo environment for testing purposes</p>
                        <p>• No real financial transactions occur</p>
                        <p>• Data privacy and security maintained</p>
                        <p>• Mojaloop integration in production only</p>
                        <p>• Password requirements ensure enterprise security</p>
                        <p className="pt-2 border-t text-xs text-gray-500">
                          For production use, full T&Cs apply per South African financial regulations.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Security Badge - 10% Larger */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all touch-target transform scale-110">
                        <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                          Security
                        </span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm mx-auto bg-white" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                      <DialogHeader>
                        <DialogTitle className="text-center flex items-center justify-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'var(--font-weight-bold)' }}>
                          <Shield className="w-5 h-5 text-[#86BE41]" />
                          Bank Grade Security
                        </DialogTitle>
                      </DialogHeader>
                      <div className="text-gray-700 space-y-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-[#86BE41]" />
                            <span>256-bit encryption</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#86BE41]" />
                            <span>Complex password requirements</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-[#86BE41]" />
                            <span>Mojaloop security standards</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#86BE41]" />
                            <span>Multi-factor authentication ready</span>
                          </div>
                        </div>
                        <p className="pt-2 border-t text-xs text-gray-500">
                          Your financial data is protected with enterprise-grade security protocols.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* FAQ Icon */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all touch-target">
                        <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                          <HelpCircle className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                          FAQ
                        </span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm mx-auto bg-white" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                      <DialogHeader>
                        <DialogTitle className="text-center" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'var(--font-weight-bold)' }}>
                          Frequently Asked Questions
                        </DialogTitle>
                      </DialogHeader>
                      <div className="text-gray-700 space-y-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                        <div>
                          <p className="font-medium text-[#86BE41] mb-1">Q: What login options do I have?</p>
                          <p>A: You can use your SA phone number, account number, or username with your secure password.</p>
                        </div>
                        <div>
                          <p className="font-medium text-[#86BE41] mb-1">Q: Why complex passwords?</p>
                          <p>A: Enterprise security requires 8+ characters with uppercase, lowercase, number, and special character.</p>
                        </div>
                        <div>
                          <p className="font-medium text-[#86BE41] mb-1">Q: Is my money safe?</p>
                          <p>A: Yes! We use bank-grade encryption and Mojaloop security standards.</p>
                        </div>
                        <div>
                          <p className="font-medium text-[#86BE41] mb-1">Q: Demo vs Production?</p>
                          <p>A: Demo uses test data only. Production integrates with real Mojaloop banking networks.</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ) : (
              /* Production Mode - Show just the icons */
              <div className="flex items-center justify-between px-2">
                {/* Same icon structure for production mode */}
                <button className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all touch-target">
                  <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    T&C's
                  </span>
                </button>

                <button className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all touch-target transform scale-110">
                  <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    Security
                  </span>
                </button>

                <button className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all touch-target">
                  <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    FAQ
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}