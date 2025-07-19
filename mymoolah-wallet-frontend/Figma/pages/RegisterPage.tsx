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
    // Keep showing validation if password has content
    if (formData.confirmPassword.length === 0) {
      setShowConfirmValidation(false);
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

      // Validate email
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message || 'Please enter a valid email address');
      }

      // Validate password
      if (!passwordValidation.isValid) {
        throw new Error('Please ensure your password meets all requirements');
      }
      
      // Validate password confirmation
      if (!confirmPasswordValidation.isValid) {
        throw new Error('Passwords do not match');
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock registration - replace with real Mojaloop registration
      console.log('Registration data:', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        identifier: formData.identifier,
        identifierType: inputType,
        email: formData.email,
        // Password would be hashed before sending
      });
      
      // Success - redirect to login with success message
      window.location.href = '/login?registered=true';
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      {/* Mobile Container - Optimized for single page height */}
      <div className="max-w-sm mx-auto bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] min-h-screen flex flex-col">
        {/* Compact Header */}
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '2rem', paddingBottom: '1rem' }}>
          {/* Back Button */}
          <div className="mb-4">
            <Link 
              to="/login" 
              className="inline-flex items-center text-white/90 hover:text-white transition-colors touch-target"
              style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)',
                minHeight: 'var(--mobile-touch-target)'
              }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back to Sign In</span>
            </Link>
          </div>

          {/* Logo Only - Text removed since logo2.svg includes MyMoolah name */}
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
              <ImageWithFallback
                src="/assets/logo2.svg"
                alt="MyMoolah Logo"
                className="w-16 h-16 object-contain"
                fallback={
                  <div className="bg-white/20 backdrop-blur-sm rounded-3xl w-16 h-16 flex items-center justify-center">
                    <div className="text-white" style={{ fontSize: '1.25rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 'var(--font-weight-bold)' }}>M</div>
                  </div>
                }
              />
            </div>
          </div>
        </div>

        {/* Compact Registration Form */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '1.5rem' }}>
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <CardHeader className="text-center pb-4">
              <CardTitle style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 'var(--font-weight-bold)', color: '#1f2937' }}>
                Create Account
              </CardTitle>
              <CardDescription style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-normal)', color: '#6b7280' }}>
                Get started with your free digital wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Name Fields - KYC Compliance */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
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
                        fontSize: 'var(--mobile-font-small)',
                        fontWeight: 'var(--font-weight-normal)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
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
                        fontSize: 'var(--mobile-font-small)',
                        fontWeight: 'var(--font-weight-normal)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Multi-Input Authentication Field - Phone Number (same as LoginPage) */}
                <div className="space-y-2">
                  <Label htmlFor="identifier" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
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
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-normal)',
                      borderRadius: 'var(--mobile-border-radius)'
                    }}
                    required
                    aria-describedby="identifier-help identifier-error"
                  />
                  
                  {/* Input Type Indicator and Help Text - Simplified */}
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

                {/* Single Email Field with Comprehensive Validation */}
                <div className="space-y-2">
                  <Label htmlFor="email" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] ${!emailValidation.isValid && formData.email.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    style={{ 
                      height: 'var(--mobile-touch-target)',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-normal)',
                      borderRadius: 'var(--mobile-border-radius)'
                    }}
                    required
                    aria-describedby="email-help email-error"
                  />
                  
                  {/* Email Validation Indicator */}
                  <div id="email-help" className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    {formData.email.trim() ? (
                      <span className={`inline-flex items-center gap-1 ${emailValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {emailValidation.isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {emailValidation.isValid ? 'Valid email address' : 'Invalid email format'}
                      </span>
                    ) : (
                      'We use this for important account notifications'
                    )}
                  </div>
                  
                  {/* Real-time Email Validation Error */}
                  {!emailValidation.isValid && formData.email.trim() && emailValidation.message && (
                    <div id="email-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      <AlertTriangle className="w-3 h-3" />
                      {emailValidation.message}
                    </div>
                  )}
                </div>

                {/* Enhanced Password Field with COMPACT Format Guidance - Create Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                    Create Password
                  </Label>
                  
                  {/* COMPACT Password Format Hint - Shows before user types */}
                  {!passwordFocused && formData.password.length === 0 && (
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
                      placeholder="Create secure password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        setShowPasswordValidation(e.target.value.length > 0);
                      }}
                      onFocus={handlePasswordFocus}
                      onBlur={handlePasswordBlur}
                      className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12 ${
                        formData.password.length > 0 && !passwordValidation.isValid ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500' : 
                        formData.password.length > 0 && passwordValidation.isValid ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''
                      }`}
                      style={{ 
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)',
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
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Real-time Password Validation - Enhanced with Example */}
                  {showPasswordValidation && (
                    <div id="password-requirements" className="mt-2 p-3 bg-gray-50 rounded-lg border" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
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
                      
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center gap-2">
                          {passwordValidation.minLength ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className={`text-xs ${passwordValidation.minLength ? 'text-green-700' : 'text-red-600'}`} 
                                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            At least 8 characters
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasUppercase ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className={`text-xs ${passwordValidation.hasUppercase ? 'text-green-700' : 'text-red-600'}`}
                                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            One uppercase letter (A-Z)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasLowercase ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className={`text-xs ${passwordValidation.hasLowercase ? 'text-green-700' : 'text-red-600'}`}
                                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            One lowercase letter (a-z)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasNumber ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-700' : 'text-red-600'}`}
                                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                            One number (0-9)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasSpecialChar ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
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

                {/* Enhanced Confirm Password Field with COMPACT Hint */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)', color: '#374151' }}>
                    Confirm Password
                  </Label>
                  
                  {/* COMPACT Confirm Password Hint */}
                  {!confirmPasswordFocused && formData.confirmPassword.length === 0 && formData.password.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
                      <p className="text-gray-600 text-xs" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px' }}>
                        Re-enter your password to confirm
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        setShowConfirmValidation(e.target.value.length > 0);
                      }}
                      onFocus={handleConfirmPasswordFocus}
                      onBlur={handleConfirmPasswordBlur}
                      className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12 ${
                        formData.confirmPassword.length > 0 && !confirmPasswordValidation.isValid ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 
                        formData.confirmPassword.length > 0 && confirmPasswordValidation.isValid ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''
                      }`}
                      style={{ 
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)',
                        fontWeight: 'var(--font-weight-normal)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                      required
                      aria-describedby="confirm-password-help"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 touch-target"
                      style={{ minHeight: 'var(--mobile-touch-target)', minWidth: 'var(--mobile-touch-target)' }}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Confirm Password Validation */}
                  {showConfirmValidation && (
                    <div id="confirm-password-help" className="mt-2">
                      {formData.confirmPassword.trim() ? (
                        <span className={`inline-flex items-center gap-1 text-xs ${confirmPasswordValidation.isValid ? 'text-green-600' : 'text-red-600'}`}
                              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                          {confirmPasswordValidation.isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {confirmPasswordValidation.isValid ? 'Passwords match!' : 'Passwords do not match'}
                        </span>
                      ) : null}
                    </div>
                  )}
                  
                  {/* Real-time Confirm Password Validation Error */}
                  {!confirmPasswordValidation.isValid && formData.confirmPassword.trim() && confirmPasswordValidation.message && (
                    <div className="text-xs text-red-600 mt-1 flex items-center gap-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      <AlertTriangle className="w-3 h-3" />
                      {confirmPasswordValidation.message}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !passwordValidation.isValid || !confirmPasswordValidation.isValid || !identifierValidation.isValid || !emailValidation.isValid || !formData.firstName.trim() || !formData.lastName.trim()}
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
                      <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Creating Account...</span>
                    </>
                  ) : (
                    <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Create Account</span>
                  )}
                </Button>

                <div className="text-center pt-3">
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

          {/* Bottom Card with T&C's, Security, and FAQ - RESTORED */}
          <div className="mt-4 p-4 bg-white/20 backdrop-blur-sm" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <div className="flex items-center justify-between px-2">
              {/* T&C's Icon - RESTORED */}
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
                    <p><strong>MyMoolah Registration Terms:</strong></p>
                    <p>• Creating an account requires valid South African phone number or account details</p>
                    <p>• Complex password requirements ensure your account security</p>
                    <p>• Email address is used for account notifications and recovery</p>
                    <p>• Identity verification (KYC) required for full wallet functionality</p>
                    <p>• Bank-grade security and Mojaloop compliance standards apply</p>
                    <p className="pt-2 border-t text-xs text-gray-500">
                      By creating an account, you agree to our full Terms of Service and Privacy Policy.
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
                      Your Security Promise
                    </DialogTitle>
                  </DialogHeader>
                  <div className="text-gray-700 space-y-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#86BE41]" />
                        <span>Complex password requirements protect your account</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#86BE41]" />
                        <span>256-bit encryption for all data</span>
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
                      We never store your password in plain text. All financial data is encrypted and protected with enterprise-grade security.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              {/* FAQ Icon - RESTORED */}
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
                      Registration FAQ
                    </DialogTitle>
                  </DialogHeader>
                  <div className="text-gray-700 space-y-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    <div>
                      <p className="font-medium text-[#86BE41] mb-1">Q: What phone number formats are accepted?</p>
                      <p>A: South African mobile numbers in +27, 27, or 0 format (e.g., +27821234567).</p>
                    </div>
                    <div>
                      <p className="font-medium text-[#86BE41] mb-1">Q: Why do passwords need to be complex?</p>
                      <p>A: Enterprise security requires 8+ characters with uppercase, lowercase, number, and special character.</p>
                    </div>
                    <div>
                      <p className="font-medium text-[#86BE41] mb-1">Q: What happens after registration?</p>
                      <p>A: You can browse and deposit immediately. KYC verification is required for sending money and withdrawals.</p>
                    </div>
                    <div>
                      <p className="font-medium text-[#86BE41] mb-1">Q: Is my data secure?</p>
                      <p>A: Yes! We use bank-grade encryption and follow Mojaloop security standards for all financial data.</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}