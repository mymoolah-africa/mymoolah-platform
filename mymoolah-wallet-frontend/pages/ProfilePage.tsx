import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Import icons directly from lucide-react
import { 
  User,
  Shield,
  Settings,
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff,
  Edit3,
  Check,
  X,
  Lock,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  MessageCircle,
  ArrowLeft,
  Wallet,
  History
} from 'lucide-react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';

interface ProfileSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
  badgeColor?: 'green' | 'orange' | 'blue' | 'red';
  disabled?: boolean;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateKYCStatus, requiresKYC } = useAuth();
  
  // State management
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phoneNumber || user?.identifier || ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Get KYC status information
  const getKYCStatusInfo = () => {
    if (!user) return { status: 'Unknown', color: 'gray', description: 'Please log in' };
    
    switch (user.kycStatus) {
      case 'verified':
        return { 
          status: 'Verified', 
          color: 'green', 
          description: 'Your identity has been verified successfully'
        };
      case 'under_review':
        return { 
          status: 'Under Review', 
          color: 'blue', 
          description: 'Your documents are being reviewed (2-5 minutes)'
        };
      case 'documents_uploaded':
        return { 
          status: 'Documents Uploaded', 
          color: 'orange', 
          description: 'Documents received, verification starting soon'
        };
      case 'rejected':
        return { 
          status: 'Action Required', 
          color: 'red', 
          description: 'Some documents need to be re-submitted'
        };
      default:
        return { 
          status: 'Not Started', 
          color: 'orange', 
          description: 'Complete verification to unlock all features'
        };
    }
  };

  const kycInfo = getKYCStatusInfo();

  // Profile sections configuration
  const profileSections: ProfileSection[] = [
    {
      id: 'kyc-status',
      title: 'Identity Verification',
      description: kycInfo.description,
      icon: <Shield className="w-5 h-5" />,
      badge: kycInfo.status,
      badgeColor: kycInfo.color as any,
      onClick: () => {
        if (user?.kycStatus === 'not_started') {
          navigate('/kyc/documents');
        } else {
          navigate('/kyc/status');
        }
      }
    },
    {
      id: 'transaction-history',
      title: 'Transaction History',
      description: 'View all your wallet transactions and transfers',
      icon: <History className="w-5 h-5" />,
      onClick: () => alert('Transaction History page coming soon!')
    },
    {
      id: 'wallet-settings',
      title: 'Wallet Settings',
      description: 'Manage your digital wallet preferences',
      icon: <Wallet className="w-5 h-5" />,
      onClick: () => alert('Wallet Settings coming soon!')
    },
    {
      id: 'security-settings',
      title: 'Security & Authentication',
      description: 'Password, PIN, and security preferences',
      icon: <Lock className="w-5 h-5" />,
      onClick: () => setIsChangingPassword(true)
    },
    {
      id: 'notification-settings',
      title: 'Notifications',
      description: 'Manage alerts and communication preferences',
      icon: <Bell className="w-5 h-5" />,
      onClick: () => alert('Notification settings coming soon!')
    },
    {
      id: 'device-management',
      title: 'Device Management',
      description: 'Manage logged-in devices and sessions',
      icon: <Smartphone className="w-5 h-5" />,
      onClick: () => alert('Device management coming soon!')
    },
    {
      id: 'help-support',
      title: 'Help & Support',
      description: 'Get help, contact support, or view FAQs',
      icon: <HelpCircle className="w-5 h-5" />,
      onClick: () => alert('Help & Support center coming soon!')
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      description: 'Help us improve MyMoolah with your suggestions',
      icon: <MessageCircle className="w-5 h-5" />,
      onClick: () => alert('Feedback system coming soon!')
    }
  ];

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      const token = localStorage.getItem('mymoolah_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/users/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: profileForm.name,
          phoneNumber: profileForm.phone
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      alert('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    // Basic validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      alert('New password must be at least 8 characters');
      return;
    }

    try {
      const token = localStorage.getItem('mymoolah_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/users/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      alert('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error) {
      alert('Failed to change password. Please try again.');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of MyMoolah?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        alert('Logout failed. Please try again.');
      }
    }
  };

  // Get badge color classes
  const getBadgeColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'orange':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'blue':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'red':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!user) {
    return (
      <div style={{ fontFamily: 'Montserrat, sans-serif', backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: '#6b7280' }}>
            Please log in to view your profile.
          </p>
          <Button 
            onClick={() => navigate('/login')}
            className="mymoolah-btn-primary mt-4"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', backgroundColor: '#ffffff', minHeight: '100vh' }}>
      {/* Top Navigation Bar */}
      <div 
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          zIndex: 10
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
            padding: '0 16px'
          }}
        >
          {/* Left: Back Button */}
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Back to Dashboard"
          >
            <ArrowLeft style={{ width: '24px', height: '24px', color: '#6b7280' }} />
          </button>

          {/* Center: Page Title */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}
            >
              Profile
            </h1>
          </div>

          {/* Right: Edit Profile */}
          <button 
            onClick={() => setIsEditingProfile(true)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Edit Profile"
          >
            <Edit3 style={{ width: '24px', height: '24px', color: '#6b7280' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* User Profile Header */}
        <div 
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Profile Avatar */}
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <User style={{ width: '32px', height: '32px', color: '#ffffff' }} />
            </div>

            {/* User Information */}
            <div style={{ flex: 1 }}>
              <h2 
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: '0 0 4px 0'
                }}
              >
                {user.name}
              </h2>
              <p 
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 8px 0'
                }}
              >
                {user.phoneNumber || user.identifier}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge 
                  className={getBadgeColorClasses(kycInfo.color)}
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  {kycInfo.status}
                </Badge>
                <span 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}
                >
                  Member since Nov 2024
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KYC Status Alert (if not verified) */}
        {user.kycStatus !== 'verified' && (
          <Alert 
            style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '12px',
              marginBottom: '24px'
            }}
          >
            <AlertTriangle style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
            <AlertDescription>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#92400e',
                      margin: '0 0 4px 0'
                    }}
                  >
                    {user.kycStatus === 'not_started' 
                      ? 'Complete identity verification to unlock all features'
                      : user.kycStatus === 'rejected'
                      ? 'Action required: Re-submit your verification documents'
                      : 'Your verification is in progress'
                    }
                  </p>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#a16207',
                      margin: '0'
                    }}
                  >
                    {kycInfo.description}
                  </p>
                </div>
                <Button
                  onClick={() => navigate(user.kycStatus === 'not_started' ? '/kyc/documents' : '/kyc/status')}
                  style={{
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {user.kycStatus === 'not_started' ? 'Verify Now' : 'View Status'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {profileSections.map((section) => (
            <button
              key={section.id}
              onClick={section.onClick}
              disabled={section.disabled}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: section.disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: section.disabled ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (!section.disabled) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#86BE41';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (!section.disabled) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#86BE41',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {React.cloneElement(section.icon as React.ReactElement, {
                      style: { color: '#ffffff' }
                    })}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1f2937',
                          margin: '0'
                        }}
                      >
                        {section.title}
                      </p>
                      {section.badge && (
                        <Badge 
                          className={getBadgeColorClasses(section.badgeColor || 'gray')}
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}
                        >
                          {section.badge}
                        </Badge>
                      )}
                    </div>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: '0'
                      }}
                    >
                      {section.description}
                    </p>
                  </div>
                </div>
                <ChevronRight style={{ width: '20px', height: '20px', color: '#6b7280' }} />
              </div>
            </button>
          ))}
        </div>

        {/* Logout Section */}
        <div style={{ marginTop: '32px', marginBottom: '24px' }}>
          <Separator style={{ marginBottom: '24px' }} />
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
              e.currentTarget.style.borderColor = '#dc2626';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.borderColor = '#fecaca';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#dc2626',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LogOut style={{ width: '24px', height: '24px', color: '#ffffff' }} />
              </div>
              <div>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#dc2626',
                    margin: '0 0 4px 0'
                  }}
                >
                  Log Out
                </p>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#7f1d1d',
                    margin: '0'
                  }}
                >
                  Sign out of your MyMoolah account
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* App Version Information */}
        <div 
          style={{
            textAlign: 'center',
            padding: '16px',
            marginBottom: '24px'
          }}
        >
          <p 
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#9ca3af',
              margin: '0'
            }}
          >
            MyMoolah v1.0.0 • Build 2024.11
          </p>
          <p 
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#9ca3af',
              margin: '4px 0 0 0'
            }}
          >
            © 2024 MyMoolah. All rights reserved.
          </p>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent 
          style={{
            fontFamily: 'Montserrat, sans-serif',
            maxWidth: '340px',
            backgroundColor: '#ffffff',
            borderRadius: '16px'
          }}
        >
          <DialogHeader>
            <DialogTitle 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937'
              }}
            >
              Edit Profile
            </DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <Label 
                  htmlFor="edit-name"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}
                >
                  Full Name
                </Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    height: '44px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    borderRadius: '8px',
                    marginTop: '4px'
                  }}
                />
              </div>
              <div>
                <Label 
                  htmlFor="edit-phone"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}
                >
                  Phone Number
                </Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  style={{
                    height: '44px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    borderRadius: '8px',
                    marginTop: '4px'
                  }}
                  disabled
                />
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: '4px 0 0 0'
                  }}
                >
                  Phone number cannot be changed for security reasons
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              <Button
                onClick={() => setIsEditingProfile(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '8px',
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProfileUpdate}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent 
          style={{
            fontFamily: 'Montserrat, sans-serif',
            maxWidth: '340px',
            backgroundColor: '#ffffff',
            borderRadius: '16px'
          }}
        >
          <DialogHeader>
            <DialogTitle 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937'
              }}
            >
              Change Password
            </DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Current Password */}
              <div>
                <Label 
                  htmlFor="current-password"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}
                >
                  Current Password
                </Label>
                <div style={{ position: 'relative', marginTop: '4px' }}>
                  <Input
                    id="current-password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    style={{
                      height: '44px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      borderRadius: '8px',
                      paddingRight: '48px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      width: '24px',
                      height: '24px'
                    }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <Label 
                  htmlFor="new-password"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}
                >
                  New Password
                </Label>
                <div style={{ position: 'relative', marginTop: '4px' }}>
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    style={{
                      height: '44px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      borderRadius: '8px',
                      paddingRight: '48px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      width: '24px',
                      height: '24px'
                    }}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <Label 
                  htmlFor="confirm-password"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}
                >
                  Confirm New Password
                </Label>
                <div style={{ position: 'relative', marginTop: '4px' }}>
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    style={{
                      height: '44px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      borderRadius: '8px',
                      paddingRight: '48px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      width: '24px',
                      height: '24px'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              <Button
                onClick={() => setIsChangingPassword(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '8px',
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordChange}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}