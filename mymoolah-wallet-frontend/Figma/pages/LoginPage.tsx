import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Eye, EyeOff, Smartphone, Shield, Zap } from 'lucide-react';

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const [credentials, setCredentials] = useState({ phone: '', pin: '' });
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock authentication - replace with real Mojaloop authentication
      if (credentials.phone && credentials.pin) {
        await login(credentials);
      } else {
        throw new Error('Please enter both phone number and PIN');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading MyMoolah...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="bg-white/20 backdrop-blur-sm rounded-3xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="text-white text-2xl font-bold">M</div>
          </div>
          <h1 className="text-white text-3xl font-bold mb-2">MyMoolah</h1>
          <p className="text-white/90 text-base">Your Digital Wallet</p>
        </div>

        {/* Feature Icons */}
        <div className="flex justify-center space-x-8 mb-8">
          <div className="text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl w-12 h-12 flex items-center justify-center mb-2">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/80 text-xs">Mobile First</p>
          </div>
          <div className="text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl w-12 h-12 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/80 text-xs">Bank Grade Security</p>
          </div>
          <div className="text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl w-12 h-12 flex items-center justify-center mb-2">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/80 text-xs">Instant Transfers</p>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="px-6 pb-8">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl text-gray-900">Welcome Back</CardTitle>
            <CardDescription className="text-gray-600">
              Sign in to access your digital wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27 XX XXX XXXX"
                  value={credentials.phone}
                  onChange={(e) => setCredentials({ ...credentials, phone: e.target.value })}
                  className="h-12 bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="text-gray-700">PIN</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? 'text' : 'password'}
                    placeholder="Enter your 4-digit PIN"
                    value={credentials.pin}
                    onChange={(e) => setCredentials({ ...credentials, pin: e.target.value })}
                    className="h-12 bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12"
                    maxLength={4}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  className="text-[#2D8CCA] hover:text-[#2680B8] text-sm font-medium"
                >
                  Forgot PIN?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <div className="mt-4 p-4 bg-white/20 backdrop-blur-sm rounded-xl">
          <p className="text-white/90 text-sm text-center mb-2">Demo Credentials:</p>
          <p className="text-white text-xs text-center">Phone: +27 123 456 789 | PIN: 1234</p>
        </div>
      </div>
    </div>
  );
}