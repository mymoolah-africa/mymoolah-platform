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
import { Loader2, Eye, EyeOff, Shield, FileText, HelpCircle, Lock, Globe, Users, Award, CheckCircle, ArrowLeft, Check, X, AlertTriangle, Info } from 'lucide-react';

// Input type detection and validation utilities (same as LoginPage)
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

// Email validation
const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  if (email.length === 0) {
    return { isValid: false, message: 'Email address is required' };
  }
  
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  
  // Additional domain validation
  const domain = email.split('@')[1];
  if (domain && !domain.includes('.')) {
    return { isValid: false, message: 'Email domain must be valid' };
  }
  
  return { isValid: true };
};

// Password validation utility (same as LoginPage)
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

export function RegisterPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    identifier: '', // Changed from phoneNumber to support multi-input
    email: '',
    password: '', // Changed from pin
    confirmPassword: '' // Changed from confirmPin
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [showConfirmValidation, setShowConfirmValidation] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Real-time validation states
  const inputType = detectInputType(formData.identifier);
  const getIdentifierValidation = () => {
    if (!formData.identifier.trim()) {
      return { isValid: false, message: '' };
    }
    
    switch (inputType) {
      case 'phone':
        return validatePhoneNumber(formData.identifier);
      case 'account':
        return validateAccountNumber(formData.identifier);
      case 'username':
        return validateUsername(formData.identifier);
      default:
        return { isValid: false, message: 'Please enter a valid phone number, account number, or username' };
    }
  };

  const identifierValidation = getIdentifierValidation();
  const emailValidation = validateEmail(formData.email);
  const passwordValidation = validatePassword(formData.password);
  const confirmPasswordValidation = {
    isValid: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0,
    message: formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword ? 'Passwords do not match' : ''
  };

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

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

  const handlePasswordFocus = () => {
    setPasswordFocused(true);
    setShowPasswordValidation(true);
  };

  const handlePasswordBlur = () => {
    setPasswordFocused(false);
    // Keep showing validation if password has content
    if (formData.password.length === 0) {
      setShowPasswordValidation(false);
    }
  };

  const handleConfirmPasswordFocus = () => {
    setConfirmPasswordFocused(true);
    setShowConfirmValidation(true);
  };

  const handleConfirmPasswordBlur = () => {
    setConfirmPasswordFocused(false);
    // Keep showing validation if confirm password has content
    if (formData.confirmPassword.length === 0) {
      setShowConfirmValidation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate all fields
      if (!identifierValidation.isValid) {
        throw new Error(identifierValidation.message || 'Please enter a valid phone number, account number, or username');
      }

      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message || 'Please enter a valid email address');
      }

      if (!passwordValidation.isValid) {
        throw new Error('Please ensure your password meets all requirements');
      }

      if (!confirmPasswordValidation.isValid) {
        throw new Error('Passwords do not match');
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: Replace with actual registration API call
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     firstName: formData.firstName,
      //     lastName: formData.lastName,
      //     identifier: formData.identifier,
      //     email: formData.email,
      //     password: formData.password
      //   })
      // });

      // For now, just simulate success
      console.log('Registration successful:', formData);
      
      // Redirect to login or dashboard
      window.location.href = '/login';
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      {/* Mobile Container */}
      <div className="max-w-sm mx-auto bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] min-h-screen flex flex-col">
        {/* Header Section */}
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '2rem', paddingBottom: '1rem' }}>
          {/* Back Button */}
          <Link to="/login" className="inline-flex items-center text-white/90 hover:text-white mb-4 touch-target">
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)' }}>
              Back to Sign In
            </span>
          </Link>

          {/* Logo Section */}
          <div className="text-center mb-6">
            <div className="w-26 h-26 mx-auto mb-3 flex items-center justify-center">
              <ImageWithFallback
                src="/src/assets/logo2.svg"
                alt="MyMoolah Logo"
                className="w-26 h-26 object-contain"
              />
            </div>
            <h1 style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Create Your Account
            </h1>
            <p className="text-white/90" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
              Join thousands of South Africans using MyMoolah
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '2rem' }}>
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <CardHeader className="text-center pb-4">
              <CardTitle style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)', fontWeight: 'var(--font-weight-bold)', color: '#1f2937' }}>
                Start Your Journey
              </CardTitle>
              <CardDescription style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', color: '#6b7280' }}>
                Create your free digital wallet in under 2 minutes
              </CardDescription>
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

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41]"
                      style={{ 
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41]"
                      style={{ 
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Multi-Input Authentication Field */}
                <div className="space-y-2">
                  <Label htmlFor="identifier" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                    Phone Number
                  </Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder={getPlaceholderText()}
                    value={formData.identifier}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                    className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] ${!identifierValidation.isValid && formData.identifier.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
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
                  
                  {/* Input Type Indicator and Help Text */}
                  <div id="identifier-help" className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    {formData.identifier.trim() ? (
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
                  {!identifierValidation.isValid && formData.identifier.trim() && identifierValidation.message && (
                    <div id="identifier-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      <AlertTriangle className="w-3 h-3" />
                      {identifierValidation.message}
                    </div>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] ${!emailValidation.isValid && formData.email.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    style={{ 
                      height: 'var(--mobile-touch-target)',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-normal)',
                      borderRadius: 'var(--mobile-border-radius)'
                    }}
                    required
                    aria-describedby="email-error"
                  />
                  
                  {/* Email Validation Error */}
                  {!emailValidation.isValid && formData.email.trim() && emailValidation.message && (
                    <div id="email-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      <AlertTriangle className="w-3 h-3" />
                      {emailValidation.message}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        setShowPasswordValidation(e.target.value.length > 0);
                      }}
                      onFocus={handlePasswordFocus}
                      onBlur={handlePasswordBlur}
                      className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12"
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
                  
                  {/* Real-time Password Validation */}
                  {showPasswordValidation && (
                    <div id="password-requirements" className="mt-3 p-3 bg-gray-50 rounded-lg border" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                      <p className="text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)' }}>
                        Password Requirements:
                      </p>
                      <div className="space-y-1">
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
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        setShowConfirmValidation(e.target.value.length > 0);
                      }}
                      onFocus={handleConfirmPasswordFocus}
                      onBlur={handleConfirmPasswordBlur}
                      className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12 ${!confirmPasswordValidation.isValid && formData.confirmPassword.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      style={{ 
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                      required
                      aria-describedby="confirm-password-error"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 touch-target"
                      style={{ minHeight: 'var(--mobile-touch-target)', minWidth: 'var(--mobile-touch-target)' }}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Confirm Password Validation Error */}
                  {!confirmPasswordValidation.isValid && formData.confirmPassword.trim() && confirmPasswordValidation.message && (
                    <div id="confirm-password-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      <AlertTriangle className="w-3 h-3" />
                      {confirmPasswordValidation.message}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !passwordValidation.isValid || !identifierValidation.isValid || !emailValidation.isValid || !confirmPasswordValidation.isValid}
                  className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white"
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
                      <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Creating Account...</span>
                    </>
                  ) : (
                    <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Create Account</span>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <p className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#2D8CCA] hover:text-[#2680B8] font-medium">
                      Sign In
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Information */}
          <div className="mt-6 p-4 bg-white/20 backdrop-blur-sm" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-4 mb-3">
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-white/90" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>Bank-Grade Security</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/90" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>FSCA Regulated</span>
                </div>
              </div>
              <p className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                Your data is protected with enterprise-grade encryption
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 