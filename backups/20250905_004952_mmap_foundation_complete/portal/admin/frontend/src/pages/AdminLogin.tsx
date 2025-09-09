import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield, FileText, HelpCircle, AlertTriangle, CheckCircle, Building2, Users, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  };
  error?: string;
}

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: 'admin@mymoolah.com',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Password validation
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

  const passwordValidation = validatePassword(credentials.password);
  const showPasswordValidation = passwordFocused && credentials.password.length > 0 && !passwordValidation.isValid;

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = validateEmail(credentials.email) && passwordValidation.isValid;

  // Handle input changes
  const handleInputChange = (field: keyof LoginCredentials, value: string | boolean) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  // Handle login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setError('Please enter valid credentials');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if we're in demo mode (no backend available)
      const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_BASE_URL;
      
      if (isDemoMode) {
        // Demo mode - simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Demo credentials check
        if (credentials.email === 'admin@mymoolah.com' && credentials.password.length >= 8) {
          const demoUser = {
            id: 'admin-001',
            email: credentials.email,
            name: 'Admin User',
            role: 'admin',
            permissions: ['dashboard', 'users', 'settlements', 'reports']
          };
          
          // Store demo session
          localStorage.setItem('mymoolah_admin_token', 'demo_admin_token_' + Date.now());
          localStorage.setItem('mymoolah_admin_user', JSON.stringify(demoUser));
          
          if (credentials.rememberMe) {
            localStorage.setItem('mymoolah_admin_remember', 'true');
          }
          
          navigate('/admin/dashboard');
          return;
        } else {
          throw new Error('Invalid credentials. Please check your email and password.');
        }
      } else {
        // Production mode - real API call
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            rememberMe: credentials.rememberMe
          }),
        });

        const data: LoginResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        if (data.success && data.token && data.user) {
          // Store authentication data
          localStorage.setItem('mymoolah_admin_token', data.token);
          localStorage.setItem('mymoolah_admin_user', JSON.stringify(data.user));
          
          if (credentials.rememberMe) {
            localStorage.setItem('mymoolah_admin_remember', 'true');
          }
          
          navigate('/admin/dashboard');
        } else {
          throw new Error('Invalid response from server');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered credentials
  useEffect(() => {
    const remembered = localStorage.getItem('mymoolah_admin_remember');
    if (remembered === 'true') {
      setCredentials(prev => ({ ...prev, rememberMe: true }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00BFA5] to-[#1976D2] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '2rem',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '0.5rem'
          }}>
            MyMoolah
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '1.125rem',
            fontWeight: '500',
            color: '#ffffff',
            opacity: '0.9',
            marginBottom: '2rem'
          }}>
            Admin Portal
          </p>
          
          {/* Welcome Message */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <h2 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              Welcome Back
            </h2>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '1rem',
              color: '#ffffff',
              opacity: '0.8'
            }}>
              Sign in to access the MyMoolah Treasury Platform
            </p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#dc2626'
                    }}>
                      {error}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={credentials.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{
                      paddingLeft: '2.5rem',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '400',
                      borderRadius: '12px',
                      minHeight: '48px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb'
                    }}
                    placeholder="Enter your admin email"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Password
                </Label>
                
                {/* Compact Password Format Hint */}
                {!passwordFocused && credentials.password.length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '12px',
                          color: '#1e40af',
                          marginBottom: '4px'
                        }}>
                          <strong>Format:</strong> 8+ chars, A-Z, a-z, 0-9, !@#$
                        </p>
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '11px',
                          color: '#3b82f6'
                        }}>
                          <strong>e.g.</strong> AdminPortal2024!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    style={{
                      paddingLeft: '2.5rem',
                      paddingRight: '3rem',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '400',
                      borderRadius: '12px',
                      minHeight: '48px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb'
                    }}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    style={{ minWidth: '24px', minHeight: '24px' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Real-time Password Validation */}
                {showPasswordValidation && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        Password Requirements:
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      {[
                        { key: 'minLength', label: 'At least 8 characters', valid: passwordValidation.minLength },
                        { key: 'hasUppercase', label: 'One uppercase letter (A-Z)', valid: passwordValidation.hasUppercase },
                        { key: 'hasLowercase', label: 'One lowercase letter (a-z)', valid: passwordValidation.hasLowercase },
                        { key: 'hasNumber', label: 'One number (0-9)', valid: passwordValidation.hasNumber },
                        { key: 'hasSpecialChar', label: 'One special character (!@#$)', valid: passwordValidation.hasSpecialChar }
                      ].map((requirement) => (
                        <div key={requirement.key} className="flex items-center gap-2">
                          {requirement.valid ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-gray-300" />
                          )}
                          <span style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '12px',
                            color: requirement.valid ? '#16a34a' : '#6b7280'
                          }}>
                            {requirement.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={credentials.rememberMe}
                    onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="rememberMe"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280',
                      cursor: 'pointer'
                    }}
                  >
                    Remember me
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#1976D2'
                  }}
                  disabled={isLoading}
                >
                  Forgot password?
                </Button>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full"
                style={{
                  background: isFormValid && !isLoading 
                    ? 'linear-gradient(135deg, #00BFA5 0%, #1976D2 100%)'
                    : '#e5e7eb',
                  color: isFormValid && !isLoading ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '16px',
                  fontWeight: '500',
                  minHeight: '48px',
                  cursor: isFormValid && !isLoading ? 'pointer' : 'not-allowed'
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Sign In to Admin Portal
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <Alert className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '13px',
                color: '#ffffff'
              }}>
                This is a secure admin portal. All activities are logged and monitored.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        {/* Bottom Action Cards */}
        <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
          <div className="flex items-center justify-between px-2">
            {/* Terms & Conditions */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex flex-col items-center space-y-2 hover:bg-white/20 p-3 rounded-lg transition-all touch-target">
                  <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#ffffff',
                    opacity: '0.9'
                  }}>
                    Terms
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Admin Portal Terms & Conditions
                  </DialogTitle>
                  <DialogDescription style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    By accessing the MyMoolah Admin Portal, you agree to:
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                  <div>
                    <h4 className="font-semibold mb-2">1. Authorized Access Only</h4>
                    <p className="text-gray-600">Access is restricted to authorized personnel only. Unauthorized access is prohibited.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">2. Data Confidentiality</h4>
                    <p className="text-gray-600">All data accessed through this portal is confidential and must not be shared.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">3. Activity Monitoring</h4>
                    <p className="text-gray-600">All activities are logged and monitored for security purposes.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">4. Compliance</h4>
                    <p className="text-gray-600">Users must comply with all regulatory requirements and company policies.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Security Badge - 10% Larger */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex flex-col items-center space-y-2 hover:bg-white/20 p-3 rounded-lg transition-all touch-target transform scale-110">
                  <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#ffffff',
                    opacity: '0.9'
                  }}>
                    Security
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Enterprise Security
                  </DialogTitle>
                  <DialogDescription style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    MyMoolah Admin Portal Security Features
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Multi-factor authentication</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Real-time activity monitoring</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Role-based access control</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Audit trail logging</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* FAQ */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex flex-col items-center space-y-2 hover:bg-white/20 p-3 rounded-lg transition-all touch-target">
                  <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#ffffff',
                    opacity: '0.9'
                  }}>
                    FAQ
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Admin Portal FAQ
                  </DialogTitle>
                  <DialogDescription style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    Frequently asked questions about the admin portal
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                  <div>
                    <h4 className="font-semibold mb-2">How do I reset my password?</h4>
                    <p className="text-gray-600">Contact your system administrator or use the "Forgot password?" link.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">What are the browser requirements?</h4>
                    <p className="text-gray-600">Use the latest version of Chrome, Firefox, Safari, or Edge for optimal experience.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">How long do sessions last?</h4>
                    <p className="text-gray-600">Sessions automatically expire after 30 minutes of inactivity for security.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Who can I contact for support?</h4>
                    <p className="text-gray-600">Contact technical support at support@mymoolah.com or call +27 11 123 4567.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Compliance Footer */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-white/80">
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px'
            }}>
              Banking-grade security
            </span>
            <span>•</span>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px'
            }}>
              Mojaloop compliant
            </span>
            <span>•</span>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px'
            }}>
              ISO 27001 ready
            </span>
          </div>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#ffffff',
            opacity: '0.7'
          }}>
            © 2025 MyMoolah Digital Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;