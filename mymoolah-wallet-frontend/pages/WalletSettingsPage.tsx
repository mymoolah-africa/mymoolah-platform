import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Settings,
  Send,
  Download,
  Smartphone,
  Zap,
  Receipt,
  Gift,
  Bell,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Fingerprint,
  CreditCard,
  Wallet,
  DollarSign,
  Info,
  Check,
  Plus,
  ArrowRight,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  QrCode,
  Banknote,
  Home,
  Store,
  AtSign,
  Star,
  Play
} from 'lucide-react';
import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';

// Service interface for Quick Access Services
interface QuickAccessService {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  available: boolean;
  comingSoon?: boolean;
  category: 'payment' | 'utility' | 'financial';
  color: string;
  bgColor: string;
}

// User settings interface
interface UserSettings {
  id: number;
  userId: number;
  quickAccessServices: string[];
  showBalance: boolean;
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  dailyTransactionLimit: number;
  monthlyTransactionLimit: number;
  shareAnalytics: boolean;
  darkMode: boolean;
  language: string;
  displayCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export function WalletSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [services, setServices] = useState<QuickAccessService[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [transactionLimits, setTransactionLimits] = useState({
    daily: 5000,
    monthly: 25000
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalData, setLimitModalData] = useState<{ serviceName: string; enabledServices: string[] } | null>(null);

  // Service icons mapping - SINGLE SOURCE OF TRUTH from TransactPage
  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      // Payments & Transfers
      case 'send-money':
        return <Send className="w-6 h-6" />;
      case 'request-money':
        return <Download className="w-6 h-6" />;
      case 'qr-scan':
        return <QrCode className="w-6 h-6" />;
      case 'cashout-easypay':
        return <DollarSign className="w-6 h-6" />;
      case 'topup-easypay':
        return <Wallet className="w-6 h-6" />;
      // Bills & Utilities
      case 'airtime-data':
        return <Smartphone className="w-6 h-6" />;
      case 'electricity':
        return <Zap className="w-6 h-6" />;
      case 'bill-payments':
        return <Receipt className="w-6 h-6" />;
      // Vouchers & Digital Services
      case 'vouchers':
        return <Gift className="w-6 h-6" />;
      // New Cash-out Services
      case 'flash-eezicash':
        return <DollarSign className="w-6 h-6" />;
      case 'mmcash-retail':
        return <Store className="w-6 h-6" />;
      case 'atm-cashsend':
        return <AtSign className="w-6 h-6" />;
      // Loyalty & Promotions
      case 'loyalty':
        return <Play className="w-6 h-6" />;
      default:
        return <Settings className="w-6 h-6" />;
    }
  };

  // Load user settings from API
  const loadUserSettings = async () => {
    try {
      setLoading(true);
      setError('');

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load user settings');
      }

      const data = await response.json();
      
      if (data.success) {
        setUserSettings(data.data.settings);
        setShowBalance(data.data.settings.showBalance);
        setBiometricEnabled(data.data.settings.biometricEnabled);
        setNotificationsEnabled(data.data.settings.notificationsEnabled);
        setTransactionLimits({
          daily: data.data.settings.dailyTransactionLimit,
          monthly: data.data.settings.monthlyTransactionLimit
        });

        // Transform services data
        const transformedServices = data.data.availableServices
          .map((service: any) => ({
            id: service.id,
            name: service.name,
            description: service.description,
            icon: getServiceIcon(service.id),
            enabled: service.enabled,
            available: service.available,
            comingSoon: service.comingSoon,
            category: service.category,
            color: service.enabled ? '#ffffff' : '#6b7280',
            bgColor: service.enabled ? '#86BE41' : '#f8fafc'
          }))
          .sort((a, b) => {
            // Active services first
            if (a.comingSoon !== b.comingSoon) {
              return a.comingSoon ? 1 : -1;
            }
            // Then alphabetical by name
            return a.name.localeCompare(b.name);
          });

        setServices(transformedServices);
      } else {
        throw new Error(data.message || 'Failed to load settings');
      }
    } catch (err) {
      console.error('Error loading user settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Save user settings to API
  const saveUserSettings = async () => {
    try {
      setSaving(true);
      setError('');

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const enabledServices = services.filter(s => s.enabled).map(s => s.id);

      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quickAccessServices: enabledServices,
          showBalance,
          biometricEnabled,
          notificationsEnabled,
          dailyTransactionLimit: transactionLimits.daily,
          monthlyTransactionLimit: transactionLimits.monthly
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save user settings');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update local state with new settings
        if (data.data.settings) {
          setUserSettings(data.data.settings);
        }

        // Dispatch event to update bottom navigation
        window.dispatchEvent(new CustomEvent('settingsUpdated'));
      } else {
        throw new Error(data.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving user settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle service toggle
  const handleServiceToggle = (serviceId: string) => {
    const enabledCount = services.filter(s => s.enabled).length;
    const service = services.find(s => s.id === serviceId);
    
    // Prevent selection of unavailable or coming soon services
    if (!service?.available || service?.comingSoon) return;
    
    // Prevent unselecting when only 1 service is selected (minimum requirement is 2)
    if (service.enabled && enabledCount <= 1) {
      return; // Don't allow unselecting if we're at the absolute minimum
    }
    
    // Limit to 2 enabled services maximum
    if (!service.enabled && enabledCount >= 2) {
      const enabledServices = services.filter(s => s.enabled).map(s => s.name);
      setLimitModalData({
        serviceName: service.name,
        enabledServices
      });
      setShowLimitModal(true);
      return;
    }
    
    setServices(prev => prev.map(s => 
      s.id === serviceId 
        ? { ...s, enabled: !s.enabled, bgColor: !s.enabled ? '#86BE41' : '#f8fafc', color: !s.enabled ? '#ffffff' : '#6b7280' }
        : s
    ));
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get enabled services count
  const enabledServicesCount = services.filter(s => s.enabled).length;

  // Load settings on component mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  // Auto-save settings when they change
  useEffect(() => {
    if (userSettings && !loading) {
      const timeoutId = setTimeout(() => {
        saveUserSettings();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [services, showBalance, biometricEnabled, notificationsEnabled, transactionLimits]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#86BE41]" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        backgroundColor: '#ffffff',
        minHeight: 'auto',
        fontFamily: 'Montserrat, sans-serif'
      }}
    >
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
            onClick={() => navigate('/profile')}
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
              transition: 'background-color 0.2s ease',
              fontFamily: 'Montserrat, sans-serif'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Go back"
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
              Wallet Settings
            </h1>
          </div>

          {/* Right: Empty space for balance */}
          <div style={{ width: '44px' }}></div>
        </div>
      </div>

      <div style={{ padding: 'var(--mobile-padding)' }}>
        {/* Page Description */}
        <div className="mb-6">
          <p 
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-base)',
              fontWeight: 'var(--font-weight-normal)',
              color: '#6b7280',
              marginTop: '0.5rem',
              marginBottom: '1.5rem'
            }}
          >
            Customize your wallet experience and preferences
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Saving Indicator */}
        {saving && (
          <Alert className="border-blue-200 bg-blue-50 mb-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-700">
              Saving settings...
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Access Services Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#86BE41]" />
              Quick Access Services
            </CardTitle>
            <p className="text-sm text-gray-600">
              Choose 2 services to appear in your bottom navigation for quick access
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`relative p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    service.enabled 
                      ? 'border-[#86BE41] bg-[#86BE41] text-white shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${!service.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => handleServiceToggle(service.id)}
                  style={{ minHeight: '120px' }}
                >
                  {/* Service Icon */}
                  <div className="mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                      style={{ 
                        backgroundColor: service.enabled ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                        color: service.enabled ? '#ffffff' : '#6b7280'
                      }}
                    >
                      {service.icon}
                    </div>
                  </div>

                  {/* Service Info */}
                  <div>
                    <h3 className={`font-semibold text-sm mb-1 ${service.enabled ? 'text-white' : 'text-gray-900'}`}>
                      {service.name}
                    </h3>
                    <p className={`text-xs ${service.enabled ? 'text-white/80' : 'text-gray-600'}`}>
                      {service.description}
                    </p>
                  </div>

                  {/* Status Indicators */}
                  <div className="absolute top-2 right-2">
                    {service.enabled && (
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {service.comingSoon && (
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-500 text-center">
              {enabledServicesCount}/2 services selected
            </div>
          </CardContent>
        </Card>

        {/* Wallet Display Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#86BE41]" />
              Wallet Display
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-balance">Show Balance</Label>
                  <p className="text-sm text-gray-600">Display your wallet balance on the dashboard</p>
                </div>
                <Switch
                  id="show-balance"
                  checked={showBalance}
                  onCheckedChange={setShowBalance}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#86BE41]" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="biometric">Biometric Authentication</Label>
                  <p className="text-sm text-gray-600">Use fingerprint or face ID for login</p>
                </div>
                <Switch
                  id="biometric"
                  checked={biometricEnabled}
                  onCheckedChange={setBiometricEnabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Notification Toggle */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#86BE41]" />
              Basic Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Push Notifications</Label>
                  <p className="text-sm text-gray-600">Enable basic transaction and security notifications</p>
                </div>
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
              <p className="text-xs text-gray-500">
                For detailed notification preferences, go to Profile → Notification Settings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Limits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#86BE41]" />
              Transaction Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="daily-limit">Daily Limit</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Maximum amount you can transact per day: {formatCurrency(transactionLimits.daily)}
                </p>
                <input
                  id="daily-limit"
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={transactionLimits.daily}
                  onChange={(e) => setTransactionLimits(prev => ({
                    ...prev,
                    daily: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="monthly-limit">Monthly Limit</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Maximum amount you can transact per month: {formatCurrency(transactionLimits.monthly)}
                </p>
                <input
                  id="monthly-limit"
                  type="range"
                  min="5000"
                  max="50000"
                  step="1000"
                  value={transactionLimits.monthly}
                  onChange={(e) => setTransactionLimits(prev => ({
                    ...prev,
                    monthly: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <Button
          onClick={() => navigate('/profile')}
          variant="outline"
          className="w-full"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>

        {/* Service Limit Modal */}
        {showLimitModal && limitModalData && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
          >
            <div 
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '400px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div 
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Info className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1f2937',
                      margin: 0
                    }}
                  >
                    Service Limit Reached
                  </h3>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0
                    }}
                  >
                    You can only select 2 services
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '16px',
                    color: '#374151',
                    marginBottom: '16px',
                    lineHeight: '1.5'
                  }}
                >
                  To select <strong>"{limitModalData.serviceName}"</strong>, you need to deselect one of your current services first.
                </p>
                
                <div 
                  style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '12px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      margin: '0 0 8px 0'
                    }}
                  >
                    Currently selected:
                  </p>
                  <ul 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0,
                      paddingLeft: '16px'
                    }}
                  >
                    {limitModalData.enabledServices.map((service, index) => (
                      <li key={index} style={{ marginBottom: '4px' }}>
                        • {service}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => setShowLimitModal(false)}
                className="w-full"
                style={{
                  backgroundColor: '#86BE41',
                  borderColor: '#86BE41'
                }}
              >
                Got it
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}