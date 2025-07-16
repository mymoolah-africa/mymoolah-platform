import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Bell, 
  CreditCard, 
  FileText, 
  Settings, 
  LogOut,
  ArrowLeft,
  Edit2,
  CheckCircle,
  AlertCircle,
  Lock,
  Smartphone,
  Eye,
  Download,
  HelpCircle,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: user?.name || 'John Doe',
    email: user?.email || 'john@example.com',
    phone: user?.phone || '+27 123 456 789'
  });

  const [preferences, setPreferences] = useState({
    notifications: true,
    biometric: true,
    marketing: false,
    transactionAlerts: true
  });

  const securityFeatures = [
    { id: 'twoFactor', name: '2-Factor Authentication', enabled: true, icon: Shield },
    { id: 'biometric', name: 'Biometric Login', enabled: true, icon: Smartphone },
    { id: 'autoLock', name: 'Auto Lock (5 min)', enabled: true, icon: Lock },
    { id: 'loginAlerts', name: 'Login Alerts', enabled: true, icon: Bell }
  ];

  const accountStats = [
    { label: 'Account Created', value: 'Jan 2024', icon: User },
    { label: 'Transactions', value: '127', icon: CreditCard },
    { label: 'Reward Points', value: '2,450', icon: Star },
    { label: 'Verification Level', value: 'Verified', icon: CheckCircle }
  ];

  const handleSaveProfile = () => {
    setEditMode(false);
    // Mock save - integrate with real API
    alert('Profile updated successfully!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] px-6 py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="p-2 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">Profile</h1>
        </div>

        {/* Profile Card */}
        <Card className="bg-white/95 backdrop-blur-sm border-0">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] rounded-full w-16 h-16 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{userInfo.name}</h2>
                <p className="text-gray-600">{userInfo.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Verified Account</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className="p-2"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-6 space-y-6">
        {/* Account Stats */}
        <div className="grid grid-cols-2 gap-4">
          {accountStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4 text-center">
                <div className="bg-gray-100 rounded-full w-10 h-10 mx-auto mb-2 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className="font-medium text-gray-900">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Personal Information
              {editMode && (
                <div className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile}>
                    Save
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={userInfo.name}
                onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                disabled={!editMode}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                disabled={!editMode}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={userInfo.phone}
                onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                disabled={!editMode}
                className="h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Security & Privacy</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {securityFeatures.map((feature) => (
              <div key={feature.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 rounded-full p-2">
                    <feature.icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-sm">{feature.name}</span>
                </div>
                <Switch
                  checked={feature.enabled}
                  disabled={feature.id === 'twoFactor'} // Keep 2FA always on for security
                />
              </div>
            ))}
            
            <Separator />
            
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Lock className="w-4 h-4 mr-2" />
                Change PIN
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Eye className="w-4 h-4 mr-2" />
                Login History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Push Notifications</span>
              <Switch
                checked={preferences.notifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, notifications: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Transaction Alerts</span>
              <Switch
                checked={preferences.transactionAlerts}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, transactionAlerts: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Marketing Updates</span>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, marketing: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>App Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Download Statements
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Terms & Conditions
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help & Support
            </Button>
          </CardContent>
        </Card>

        {/* Mojaloop Integration Status */}
        <Alert>
          <Shield className="w-4 h-4" />
          <AlertDescription>
            Your account is secured by Mojaloop's enterprise-grade security protocols.
            All transactions are encrypted and monitored for fraud protection.
          </AlertDescription>
        </Alert>

        {/* Logout */}
        <Card className="border-red-200">
          <CardContent className="p-4">
            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}