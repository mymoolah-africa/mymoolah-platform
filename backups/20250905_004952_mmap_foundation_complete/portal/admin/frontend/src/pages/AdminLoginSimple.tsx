import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent } from '../components/ui/card';

const AdminLoginSimple = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: 'admin@mymoolah.africa',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string | boolean) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Demo login for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (credentials.email === 'admin@mymoolah.africa' && credentials.password.length >= 8) {
        localStorage.setItem('portal_token', 'demo_token');
        localStorage.setItem('portal_user', JSON.stringify({
          id: 'admin-001',
          email: credentials.email,
          name: 'Admin User',
          role: 'admin'
        }));
        
        navigate('/admin/dashboard');
      } else {
        setError('Invalid credentials. Please check your email and password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* MyMoolah Logo */}
        <div className="text-center mb-8 w-full">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.svg" 
              alt="MyMoolah" 
              className="h-32 w-auto"
              style={{ maxWidth: '100%', height: 'auto' }}
              onLoad={() => console.log('Logo loaded successfully')}
              onError={(e) => {
                console.error('Logo failed to load:', e);
                e.currentTarget.src = '/logo2.svg';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold admin-portal-title">
            <span className="text-mymoolah-green">ADMIN</span>
            <span className="text-mymoolah-blue">&nbsp;PORTAL</span>
          </h1>
        </div>

        {/* Sign In Card */}
        <Card className="wallet-card bg-white border border-gray-200 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In</h2>
            
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="wallet-alert alert-error">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="wallet-form-label">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    value={credentials.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 wallet-form-input"
                    placeholder="Enter your admin email"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="wallet-form-label">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10 wallet-form-input"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={credentials.rememberMe}
                  onCheckedChange={(checked) => handleInputChange('rememberMe', checked)}
                  className="admin-portal-checkbox"
                />
                <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Remember me
                </Label>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-center mt-2">
                <button
                  type="button"
                  onClick={() => {
                    // TODO: Implement forgot password functionality
                    console.log('Forgot password clicked');
                  }}
                  className="forgot-password-link text-sm"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full wallet-btn-primary py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Sign In</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button className="text-mymoolah-blue hover:text-mymoolah-blue/80 font-medium underline">
              Create Admin Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginSimple;
