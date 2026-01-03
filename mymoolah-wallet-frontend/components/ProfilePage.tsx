// import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

// Import icons directly from lucide-react
import { 
  User,
  Shield,
  Settings,
  CreditCard,
  Bell,
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
  History,
  Phone,
  Loader2
} from 'lucide-react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '../components/ui/input-otp';

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

// Helper function to format registration date
function formatRegistrationDate(createdAt?: string): string {
  if (!createdAt) {
    return 'Member since Nov 2024'; // Fallback for users without createdAt
  }
  
  try {
    const date = new Date(createdAt);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `Member since ${month} ${year}`;
  } catch (error) {
    console.error('Error formatting registration date:', error);
    return 'Member since Nov 2024'; // Fallback
  }
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateKYCStatus, requiresKYC, changePassword, refreshUserStatus } = useAuth();
  
  // State management
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [phoneChangeStep, setPhoneChangeStep] = useState<'input' | 'otp' | 'success'>('input');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingPhoneChange, setIsLoadingPhoneChange] = useState(false);
  const [phoneChangeError, setPhoneChangeError] = useState('');
  
  // Form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phoneNumber || ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Phone change form state
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');

  // Refresh user status when ProfilePage mounts to ensure latest KYC status
  React.useEffect(() => {
    if (refreshUserStatus) {
      refreshUserStatus();
    }
  }, []); // Run once on mount

  // Ensure the form reflects the latest authenticated user data when the user changes
  // or when the Edit Profile dialog is opened
  React.useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        // Display phone in local 0XXXXXXXXX format for UX only
        phone: (user.phoneNumber || user.identifier || '').replace(/^\+?27/, '0')
      });
    }
  }, [user, isEditingProfile]);

  // Derived validation state for password change
  const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const passwordsMatch = passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword.length > 0;
  const validStrength = passwordStrengthRegex.test(passwordForm.newPassword);
  const canSubmitPassword = Boolean(passwordForm.currentPassword) && passwordsMatch && validStrength;

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
          status: 'KYC Required', 
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
      id: 'wallet-settings',
      title: 'Wallet Settings',
      description: 'Manage your digital wallet preferences',
      icon: <Wallet className="w-5 h-5" />,
      onClick: () => navigate('/wallet-settings')
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
      title: 'Notification Settings',
      description: 'Manage alerts, marketing, and update notifications',
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
      id: 'feedback',
      title: 'Send Feedback',
      description: 'Help us improve MyMoolah with your suggestions',
      icon: <MessageCircle className="w-5 h-5" />,
      onClick: () => navigate('/feedback')
    }
  ];

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      // In demo mode, just update local state
      alert('Profile updated successfully! (Demo mode)');
      setIsEditingProfile(false);
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    }
  };

  // SA Mobile Number validation
  const validateSAMobileNumber = (phoneNumber: string): { isValid: boolean; message?: string } => {
    if (!phoneNumber.trim()) {
      return { isValid: false, message: "Phone number is required" };
    }
    const cleanNumber = phoneNumber.replace(/\s/g, "");
    const saPhonePattern = /^(\+27|27|0)[6-8][0-9]{8}$/;
    if (!saPhonePattern.test(cleanNumber)) {
      return { isValid: false, message: "Please enter a valid South African mobile number" };
    }
    return { isValid: true };
  };

  // Format phone number for display
  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+27')) {
      const digits = cleaned.slice(3);
      if (digits.length <= 9) {
        if (digits.length >= 3) {
          return `+27 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
        }
        return `+27 ${digits}`;
      }
    } else if (cleaned.startsWith('27')) {
      const digits = cleaned.slice(2);
      if (digits.length <= 9) {
        if (digits.length >= 3) {
          return `27 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
        }
        return `27 ${digits}`;
      }
    } else if (cleaned.startsWith('0')) {
      const digits = cleaned.slice(1);
      if (digits.length <= 9) {
        if (digits.length >= 3) {
          return `0${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
        }
        return `0${digits}`;
      }
    }
    return cleaned.slice(0, 13);
  };

  const newPhoneValidation = validateSAMobileNumber(newPhoneNumber);

  // Handle request phone change OTP
  const handleRequestPhoneChange = async () => {
    if (!newPhoneValidation.isValid) return;
    
    setPhoneChangeError('');
    setIsLoadingPhoneChange(true);
    
    try {
      const cleanPhone = newPhoneNumber.replace(/\s/g, "");
      await apiService.requestPhoneChange(cleanPhone);
      setPhoneChangeStep('otp');
    } catch (err) {
      setPhoneChangeError(err instanceof Error ? err.message : "Failed to send OTP. Please try again.");
    } finally {
      setIsLoadingPhoneChange(false);
    }
  };

  // Handle verify phone change
  const handleVerifyPhoneChange = async () => {
    if (phoneOtp.length !== 6) return;
    
    setPhoneChangeError('');
    setIsLoadingPhoneChange(true);
    
    try {
      const cleanPhone = newPhoneNumber.replace(/\s/g, "");
      await apiService.verifyPhoneChange(cleanPhone, phoneOtp);
      setPhoneChangeStep('success');
      // Refresh user data
      if (refreshUserStatus) {
        await refreshUserStatus();
      }
    } catch (err) {
      setPhoneChangeError(err instanceof Error ? err.message : "Invalid or expired OTP. Please try again.");
    } finally {
      setIsLoadingPhoneChange(false);
    }
  };

  // Reset phone change dialog
  const resetPhoneChangeDialog = () => {
    setIsChangingPhone(false);
    setPhoneChangeStep('input');
    setNewPhoneNumber('');
    setPhoneOtp('');
    setPhoneChangeError('');
  };

  // Handle password change
  const handlePasswordChange = async () => {
    // Client-side validation to match registration rules
    const strength = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New password and confirmation do not match');
      return;
    }
    if (!strength.test(passwordForm.newPassword)) {
      alert('Password must be at least 8 characters and contain a letter, a number, and a special character');
      return;
    }
    try {
      await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      alert('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error: any) {
      alert(error?.message || 'Failed to change password. Please try again.');
    }
  };

  // Handle logout button click - show modal
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  // Handle logout confirmation
  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      setIsLoggingOut(false);
      alert('Logout failed. Please try again.');
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
                  {formatRegistrationDate(user?.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>



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
                    {section.icon}
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
            onClick={handleLogoutClick}
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
          aria-describedby="edit-profile-description"
        >
          <DialogDescription id="edit-profile-description" className="sr-only">
            Edit your profile information including name and phone number
          </DialogDescription>
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={profileForm.phone}
                    style={{
                      height: '44px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      borderRadius: '8px',
                      marginTop: '4px',
                      flex: 1,
                      backgroundColor: '#f3f4f6'
                    }}
                    disabled
                  />
                  <Button
                    onClick={() => {
                      setIsEditingProfile(false);
                      setIsChangingPhone(true);
                    }}
                    style={{
                      height: '44px',
                      marginTop: '4px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: '#2D8CCA',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      padding: '0 12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Change
                  </Button>
                </div>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: '4px 0 0 0'
                  }}
                >
                  Phone number change requires OTP verification
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
          aria-describedby="change-password-description"
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
            <div id="change-password-description" className="sr-only">
              Change your account password by entering current and new password
            </div>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'grid', gap: '16px' }}>
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
                <div style={{ position: 'relative' }}>
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
                      marginTop: '4px',
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
                      color: '#6b7280'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
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
                <div style={{ position: 'relative' }}>
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
                      marginTop: '4px',
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
                      color: '#6b7280'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {!validStrength && passwordForm.newPassword.length > 0 && (
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                    Password must be at least 8 characters and contain a letter, a number, and a special character
                  </p>
                )}
              </div>
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
                <div style={{ position: 'relative' }}>
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
                      marginTop: '4px',
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
                      color: '#6b7280'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {!passwordsMatch && passwordForm.confirmPassword.length > 0 && (
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                    Confirmation does not match the new password
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              <Button
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
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
                disabled={!canSubmitPassword}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  height: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: canSubmitPassword ? 1 : 0.6,
                  cursor: canSubmitPassword ? 'pointer' : 'not-allowed'
                }}
              >
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Phone Number Dialog */}
      <Dialog open={isChangingPhone} onOpenChange={(open) => !open && resetPhoneChangeDialog()}>
        <DialogContent 
          style={{
            fontFamily: 'Montserrat, sans-serif',
            maxWidth: '340px',
            backgroundColor: '#ffffff',
            borderRadius: '16px'
          }}
          aria-describedby="change-phone-description"
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
              {phoneChangeStep === 'success' ? 'Phone Number Updated' : 'Change Phone Number'}
            </DialogTitle>
            <div id="change-phone-description" className="sr-only">
              Change your phone number with OTP verification
            </div>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            {phoneChangeError && (
              <Alert style={{ marginBottom: '16px', backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                <AlertDescription style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#dc2626' }}>
                  {phoneChangeError}
                </AlertDescription>
              </Alert>
            )}

            {phoneChangeStep === 'input' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <Label 
                    htmlFor="new-phone"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151'
                    }}
                  >
                    New Phone Number
                  </Label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      id="new-phone"
                      type="tel"
                      placeholder="0XX XXX XXXX"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(formatPhoneNumber(e.target.value))}
                      style={{
                        height: '44px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        borderRadius: '8px',
                        marginTop: '4px',
                        paddingLeft: '44px'
                      }}
                    />
                    <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#6b7280' }} />
                  </div>
                  {newPhoneNumber && !newPhoneValidation.isValid && (
                    <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#dc2626', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <X style={{ width: '12px', height: '12px' }} />
                      {newPhoneValidation.message}
                    </p>
                  )}
                  {newPhoneNumber && newPhoneValidation.isValid && (
                    <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check style={{ width: '12px', height: '12px' }} />
                      Valid phone number
                    </p>
                  )}
                </div>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280' }}>
                  An OTP will be sent to the new number for verification
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    onClick={resetPhoneChangeDialog}
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
                    onClick={handleRequestPhoneChange}
                    disabled={!newPhoneValidation.isValid || isLoadingPhoneChange}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      height: '44px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: newPhoneValidation.isValid && !isLoadingPhoneChange ? 1 : 0.6,
                      cursor: newPhoneValidation.isValid && !isLoadingPhoneChange ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {isLoadingPhoneChange ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        Sending...
                      </span>
                    ) : 'Send OTP'}
                  </Button>
                </div>
              </div>
            )}

            {phoneChangeStep === 'otp' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <Label 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151'
                    }}
                  >
                    Enter OTP
                  </Label>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                    <InputOTP maxLength={6} value={phoneOtp} onChange={setPhoneOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>
                    Enter the 6-digit code sent to {newPhoneNumber}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    onClick={() => { setPhoneChangeStep('input'); setPhoneOtp(''); setPhoneChangeError(''); }}
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
                    Back
                  </Button>
                  <Button
                    onClick={handleVerifyPhoneChange}
                    disabled={phoneOtp.length !== 6 || isLoadingPhoneChange}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      height: '44px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: phoneOtp.length === 6 && !isLoadingPhoneChange ? 1 : 0.6,
                      cursor: phoneOtp.length === 6 && !isLoadingPhoneChange ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {isLoadingPhoneChange ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        Verifying...
                      </span>
                    ) : 'Verify'}
                  </Button>
                </div>
              </div>
            )}

            {phoneChangeStep === 'success' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <CheckCircle style={{ width: '32px', height: '32px', color: '#059669' }} />
                </div>
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                  Phone Number Updated!
                </h3>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                  Your phone number has been successfully changed to {newPhoneNumber}.
                </p>
                <Button
                  onClick={resetPhoneChangeDialog}
                  style={{
                    width: '100%',
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
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Modal */}
      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent style={{ zIndex: 9999 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              Log Out of MyMoolah?
            </AlertDialogTitle>
            <AlertDialogDescription style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              Are you sure you want to log out of your MyMoolah account? You will need to log in again to access your wallet and services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px'
          }}>
            <AlertDialogCancel
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
              style={{
                flex: 1,
                height: '44px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                opacity: isLoggingOut ? 0.6 : 1
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              disabled={isLoggingOut}
              style={{
                flex: 1,
                height: '44px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                opacity: isLoggingOut ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!isLoggingOut) {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoggingOut) {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }
              }}
            >
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}