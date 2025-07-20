import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Eye, EyeOff, Phone, User, Hash, Check, X, AlertTriangle, FileText, Shield, HelpCircle } from 'lucide-react';

// Import logo from src/assets/
import logo2 from '../assets/logo2.svg';

// Multi-input detection utilities (same as authentication)
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

// Recipient validation functions
const validateIdentifier = (identifier: string, type: string): { isValid: boolean; message?: string } => {
  if (!identifier.trim()) {
    return { isValid: false, message: 'This field is required' };
  }

  switch (type) {
    case 'phone':
      const phonePattern = /^(\+27|27|0)[6-8][0-9]{8}$/;
      if (!phonePattern.test(identifier.replace(/\s/g, ''))) {
        return { isValid: false, message: 'Invalid South African mobile number' };
      }
      return { isValid: true };
    
    case 'account':
      if (!/^[0-9]{8,12}$/.test(identifier)) {
        return { isValid: false, message: 'Account number must be 8-12 digits' };
      }
      return { isValid: true };
    
    case 'username':
      if (!/^[a-zA-Z0-9._]{4,32}$/.test(identifier)) {
        return { isValid: false, message: 'Username must be 4-32 characters (letters, numbers, periods, underscores)' };
      }
      return { isValid: true };
    
    default:
      return { isValid: false, message: 'Please enter a valid phone number, account number, or username' };
  }
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  
  // Form state
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Real-time validation
  const inputType = detectInputType(credentials.identifier);
  const identifierValidation = validateIdentifier(credentials.identifier, inputType);

  const getPlaceholderText = () => {
    switch (inputType) {
      case 'phone': return '27 XX XXX XXXX';
      case 'account': return '12345678';
      case 'username': return 'username';
      default: return 'Phone Number';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifierValidation.isValid || !credentials.password) {
      setError('Please fill in all fields correctly');
      return;
    }

    setError('');

    try {
      await login(credentials);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  const handleDemoFill = () => {
    setCredentials({
      identifier: '27821234567',
      password: 'Demo123!'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      <div className="mobile-container">
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '2rem', paddingBottom: '2rem' }}>
          {/* Header with Logo - 10% Larger + Reduced Spacing */}
          <div className="text-center mb-8">
            {/* Logo2.svg - 10% LARGER with REDUCED spacing */}
            <div className="flex justify-center mb-2">
              <img 
                src={logo2} 
                alt="MyMoolah Logo" 
                className="h-16 w-auto"
                style={{ 
                  height: '4.4rem',        // 10% larger (was 4rem)
                  width: 'auto',
                  maxWidth: '220px',       // 10% larger (was 200px)
                  objectFit: 'contain'
                }}
              />
            </div>
            
            <h1 style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'clamp(1.5rem, 4vw, 2rem)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Ready to transact?
            </h1>
            <p style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-base)', 
              fontWeight: 'var(--font-weight-normal)',
              color: 'rgba(255, 255, 255, 0.9)'
            }}>
              Sign in to access your digital wallet
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-base)',
                color: '#dc2626'
              }}>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Login Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader style={{ paddingBottom: '1rem' }}>
              <CardTitle className="text-center" style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)', 
                fontWeight: 'var(--font-weight-bold)', 
                color: '#1f2937'
              }}>
                Sign In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Multi-Input Identifier Field */}
                <div className="space-y-2">
                  <Label htmlFor="identifier" style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-base)', 
                    fontWeight: 'var(--font-weight-medium)', 
                    color: '#374151'
                  }}>
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Input
                      id="identifier"
                      type="text"
                      placeholder={getPlaceholderText()}
                      value={credentials.identifier}
                      onChange={(e) => setCredentials(prev => ({ ...prev, identifier: e.target.value }))}
                      className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-12 ${
                        !identifierValidation.isValid && credentials.identifier.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 
                        identifierValidation.isValid && credentials.identifier.trim() ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''
                      }`}
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
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {inputType === 'phone' && <Phone className="w-4 h-4 text-gray-400" />}
                      {inputType === 'account' && <Hash className="w-4 h-4 text-gray-400" />}
                      {inputType === 'username' && <User className="w-4 h-4 text-gray-400" />}
                      {inputType === 'unknown' && <Phone className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                  
                  <div id="identifier-help" style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-small)'
                  }}>
                    {credentials.identifier.trim() ? (
                      <span className={`inline-flex items-center gap-1 ${identifierValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {identifierValidation.isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {inputType === 'phone' && 'South African mobile number'}
                        {inputType === 'account' && 'Account number (8-12 digits)'}
                        {inputType === 'username' && 'Username (4-32 characters)'}
                        {inputType === 'unknown' && 'Invalid format'}
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>
                        Enter your phone number (27XXXXXXXXX) - also your account no.
                      </span>
                    )}
                  </div>
                  
                  {!identifierValidation.isValid && credentials.identifier.trim() && identifierValidation.message && (
                    <div id="identifier-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)'
                    }}>
                      <AlertTriangle className="w-3 h-3" />
                      {identifierValidation.message}
                    </div>
                  )}
                </div>

                {/* Password Field - NO BLUE FORMAT HINTS */}
                <div className="space-y-2">
                  <Label htmlFor="password" style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-base)', 
                    fontWeight: 'var(--font-weight-medium)', 
                    color: '#374151'
                  }}>
                    Password
                  </Label>
                  
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12"
                      style={{ 
                        height: 'var(--mobile-touch-target)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                      required
                      aria-describedby="password-help"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      style={{ 
                        minHeight: 'var(--mobile-touch-target)',
                        minWidth: 'var(--mobile-touch-target)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Demo Fill Button */}
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="text-xs text-[#2D8CCA] hover:text-[#2680B8] underline"
                  style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-small)',
                    fontWeight: 'var(--font-weight-normal)'
                  }}
                >
                  Fill demo credentials
                </button>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!identifierValidation.isValid || !credentials.password || isLoading}
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
                    <span>Signing in...</span>
                  ) : (
                    <span>Sign In</span>
                  )}
                </Button>
              </form>

              {/* Register Link */}
              <div className="mt-6 text-center">
                <p style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'var(--mobile-font-base)',
                  color: '#6b7280'
                }}>
                  Don't have an account?{' '}
                  <button
                    onClick={() => navigate('/register')}
                    className="text-[#2D8CCA] hover:text-[#2680B8] font-medium underline"
                    style={{ 
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 'var(--font-weight-medium)'
                    }}
                  >
                    Create Wallet
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Card with Icons */}
          <div 
            className="mt-4 bg-white/20 backdrop-blur-sm"
            style={{ 
              padding: 'var(--mobile-padding)', 
              borderRadius: 'var(--mobile-border-radius)'
            }}
          >
            <div className="flex items-center justify-between px-2">
              {/* T&C's Icon */}
              <Dialog>
                <DialogTrigger asChild>
                  <button 
                    className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all"
                    style={{ 
                      minHeight: 'var(--mobile-touch-target)',
                      fontFamily: 'Montserrat, sans-serif'
                    }}
                  >
                    <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white/80" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)'
                    }}>
                      T&C's
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="mobile-container">
                  <DialogHeader>
                    <DialogTitle style={{ 
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
                      fontWeight: 'var(--font-weight-bold)'
                    }}>
                      Terms & Conditions
                    </DialogTitle>
                  </DialogHeader>
                  <div style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-base)',
                    lineHeight: '1.6'
                  }}>
                    <p>By using MyMoolah, you agree to our terms and conditions for secure digital wallet services.</p>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Security Badge - 10% Larger */}
              <Dialog>
                <DialogTrigger asChild>
                  <button 
                    className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all transform scale-110"
                    style={{ 
                      minHeight: 'var(--mobile-touch-target)',
                      fontFamily: 'Montserrat, sans-serif'
                    }}
                  >
                    <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white/80" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)'
                    }}>
                      Security
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="mobile-container">
                  <DialogHeader>
                    <DialogTitle style={{ 
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
                      fontWeight: 'var(--font-weight-bold)'
                    }}>
                      Bank-Grade Security
                    </DialogTitle>
                  </DialogHeader>
                  <div style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-base)',
                    lineHeight: '1.6'
                  }}>
                    <p>MyMoolah uses enterprise-grade encryption and Mojaloop compliance to protect your financial data with the same security standards as major banks.</p>
                  </div>
                </DialogContent>
              </Dialog>

              {/* FAQ Icon */}
              <Dialog>
                <DialogTrigger asChild>
                  <button 
                    className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all"
                    style={{ 
                      minHeight: 'var(--mobile-touch-target)',
                      fontFamily: 'Montserrat, sans-serif'
                    }}
                  >
                    <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                      <HelpCircle className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white/80" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)'
                    }}>
                      FAQ
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="mobile-container">
                  <DialogHeader>
                    <DialogTitle style={{ 
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
                      fontWeight: 'var(--font-weight-bold)'
                    }}>
                      Frequently Asked Questions
                    </DialogTitle>
                  </DialogHeader>
                  <div style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-base)',
                    lineHeight: '1.6'
                  }}>
                    <p><strong>Q: How do I reset my password?</strong></p>
                    <p>A: Contact support for password reset assistance.</p>
                    <br />
                    <p><strong>Q: Is my money safe?</strong></p>
                    <p>A: Yes, MyMoolah uses bank-grade security and is Mojaloop compliant.</p>
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