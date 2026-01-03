import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  apiService, 
  type AirtimeNetwork, 
  type AirtimeVoucherData, 
  type AirtimeTopUpData, 
  type EeziAirtimeData,
  type GlobalService,
  type AirtimePurchaseResult
} from '../services/apiService';
import { 
  Phone, 
  Wifi, 
  Zap, 
  Globe, 
  ChevronRight, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Copy,
  Wallet,
  CreditCard,
  Smartphone,
  Award,
  Star,
  ArrowLeft,
  Receipt
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import worldcallLogo from '../assets/worldcall_logo.png';

// Service interface for type safety
interface AirtimeService {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'voucher' | 'topup' | 'eezi' | 'global' | 'data' | 'electricity' | 'bill-payment';
  available: boolean;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'info';
}

// Service categories
interface AirtimeSection {
  id: string;
  title: string;
  description: string;
  services: AirtimeService[];
  bgGradient: string;
  iconBg: string;
}

export function ServicesPage() {
  const navigate = useNavigate();
  const { user, requiresKYC } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingService, setLoadingService] = useState<string | null>(null);
  const [networks, setNetworks] = useState<AirtimeNetwork[]>([]);
  const [globalServices, setGlobalServices] = useState<GlobalService[]>([]);
  const [walletBalance, setWalletBalance] = useState<string>('R0.00');
  const [error, setError] = useState<string | null>(null);
  
  // Purchase state
  const [selectedNetwork, setSelectedNetwork] = useState<AirtimeNetwork | null>(null);
  const [selectedService, setSelectedService] = useState<AirtimeService | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<AirtimePurchaseResult | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load airtime networks
        const networksData = await apiService.getAirtimeNetworks();
        setNetworks(networksData);
        
        // Load global services
        const globalData = await apiService.getGlobalServices();
        setGlobalServices(globalData);
        
        // Load wallet balance
        await fetchWalletBalance();
        
      } catch (err) {
        console.error('Error loading AirtimePage data:', err);
        setError('Failed to load airtime data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    try {
      const response = await apiService.getWalletBalance();
      
      
      // Handle different response formats
      let balanceValue = 0;
      if (response && response.data && response.data.balance) {
        balanceValue = parseFloat(response.data.balance);
      } else if (response && response.balance) {
        balanceValue = parseFloat(response.balance);
      } else if (typeof response === 'number') {
        balanceValue = response;
      } else if (response && typeof response === 'object' && response.data) {
        balanceValue = parseFloat(response.data);
      }
      
      if (!isNaN(balanceValue)) {
        const formattedBalance = new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(balanceValue);
        setWalletBalance(formattedBalance);
      } else {

        setWalletBalance('R0.00');
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance('R0.00');
    }
  };

  // Service navigation handler
  const handleServiceClick = async (service: AirtimeService) => {
    if (!service.available) return;
    
    setLoadingService(service.id);
    
    try {
      // Check KYC requirements for airtime purchases
      if (requiresKYC('airtime')) {
        navigate('/kyc/documents?returnTo=/services');
        return;
      }

      // Navigate to appropriate service page
      switch (service.type) {
        case 'voucher':
          navigate('/airtime/voucher');
          break;
        case 'topup':
          navigate('/airtime/topup');
          break;
        case 'eezi':
          navigate('/airtime/eezi');
          break;
        case 'global':
          navigate('/airtime/global');
          break;
        default:
          console.error('Unknown service type:', service.type);
      }
    } catch (error) {
      console.error('Error navigating to service:', error);
      setError('Failed to navigate to service. Please try again.');
    } finally {
      setLoadingService(null);
    }
  };

  // Handle network selection
  const handleNetworkSelect = (network: AirtimeNetwork) => {
    setSelectedNetwork(network);
    setSelectedAmount(null);
    setRecipientPhone('');
    setCustomAmount('');
  };

  // Handle amount selection
  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  // Handle custom amount input
  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 2 && numValue <= 1000) {
      setSelectedAmount(numValue);
    } else {
      setSelectedAmount(null);
    }
  };

  // Validate mobile number
  const validateMobileNumber = (phone: string): boolean => {
    const cleanNumber = phone.replace(/\D/g, '');
    const saMobileRegex = /^(27)?[78]\d{8}$/;
    return saMobileRegex.test(cleanNumber);
  };

  // Handle purchase
  const handlePurchase = async () => {
    if (!selectedNetwork || !selectedService || !selectedAmount) {
      setError('Please select network, service, and amount.');
      return;
    }

    if (selectedService.type === 'topup' || selectedService.type === 'eezi') {
      if (!recipientPhone || !validateMobileNumber(recipientPhone)) {
        setError('Please enter a valid South African mobile number.');
        return;
      }
    }

    setIsPurchasing(true);
    setError(null);

    try {
      let result: AirtimePurchaseResult;

      switch (selectedService.type) {
        case 'voucher':
          result = await apiService.purchaseAirtimeVoucher(
            selectedNetwork.id, 
            selectedAmount, 
            recipientPhone || undefined
          );
          break;
        case 'topup':
          result = await apiService.purchaseAirtimeTopUp(
            selectedNetwork.id, 
            selectedAmount, 
            recipientPhone
          );
          break;
        case 'eezi':
          result = await apiService.purchaseEeziAirtime(
            selectedAmount, 
            recipientPhone
          );
          break;
        default:
          throw new Error('Unsupported service type');
      }

      setPurchaseResult(result);
      setShowPurchaseDialog(true);
      
      // Refresh wallet balance
      await fetchWalletBalance();
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      setError(error.message || 'Failed to process purchase. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Copy PIN to clipboard
  const copyPinToClipboard = async (pin: string) => {
    try {
      await navigator.clipboard.writeText(pin);
      // You could show a toast notification here
    } catch (error) {
      console.error('Failed to copy PIN:', error);
    }
  };

  // All service sections
  const serviceSections: AirtimeSection[] = [
    {
      id: 'airtime',
      title: 'Airtime',
      description: 'Purchase airtime vouchers and top-ups',
      bgGradient: 'from-green-500/10 to-green-500/5',
      iconBg: 'bg-green-500/20',
      services: [
        {
          id: 'voucher',
          title: 'Voucher - All Networks',
          description: 'Buy airtime vouchers for any network',
          icon: <CreditCard className="w-6 h-6 text-green-600" />,
          type: 'voucher',
          available: true,
          badge: 'Popular',
          badgeType: 'success'
        },
        {
          id: 'topup',
          title: 'Top Up - All Networks',
          description: 'Direct airtime top-up to mobile numbers',
          icon: <Phone className="w-6 h-6 text-green-600" />,
          type: 'topup',
          available: true,
          badge: 'Instant',
          badgeType: 'info'
        },
        {
          id: 'eezi',
          title: 'eeziAirtime',
          description: 'Flash exclusive airtime service',
          icon: <Smartphone className="w-6 h-6 text-green-600" />,
          type: 'eezi',
          available: true,
          badge: 'Flash',
          badgeType: 'warning'
        }
      ]
    },
    {
      id: 'global',
      title: 'International Airtime',
      description: 'International airtime services',
      bgGradient: 'from-blue-500/10 to-blue-500/5',
      iconBg: 'bg-blue-500/20',
      services: [
        {
          id: 'global-airtime',
          title: 'Global Airtime',
          description: 'International airtime top-up',
          icon: <Globe className="w-6 h-6 text-blue-600" />,
          type: 'global',
          available: true,
          badge: 'Flash',
          badgeType: 'warning'
        },
        {
          id: 'worldcall',
          title: 'Worldcall',
          description: 'International airtime service',
          icon: <img src={worldcallLogo} alt="Worldcall" style={{ width: '24px', height: '24px' }} />,
          type: 'global',
          available: true,
          badge: 'Flash',
          badgeType: 'warning'
        }
      ]
    },
    {
      id: 'data',
      title: 'Data',
      description: 'Purchase data bundles and international data',
      bgGradient: 'from-purple-500/10 to-purple-500/5',
      iconBg: 'bg-purple-500/20',
      services: [
        {
          id: 'local-data',
          title: 'Local Data Bundles',
          description: 'SA network data packages',
          icon: <Wifi className="w-6 h-6 text-purple-600" />,
          type: 'data',
          available: true,
          badge: 'Popular',
          badgeType: 'success'
        },
        {
          id: 'international-data',
          title: 'International Data',
          description: 'Global data roaming packages',
          icon: <Globe className="w-6 h-6 text-purple-600" />,
          type: 'data',
          available: true,
          badge: 'Flash',
          badgeType: 'warning'
        }
      ]
    },
    {
      id: 'electricity',
      title: 'Electricity',
      description: 'Purchase prepaid electricity and international tokens',
      bgGradient: 'from-orange-500/10 to-orange-500/5',
      iconBg: 'bg-orange-500/20',
      services: [
        {
          id: 'prepaid-electricity',
          title: 'Prepaid Electricity',
          description: 'SA municipality prepaid meters',
          icon: <Zap className="w-6 h-6 text-orange-600" />,
          type: 'electricity',
          available: true,
          badge: 'Instant',
          badgeType: 'info'
        },
        {
          id: 'international-electricity',
          title: 'International Electricity',
          description: 'Global electricity tokens',
          icon: <Globe className="w-6 h-6 text-orange-600" />,
          type: 'electricity',
          available: true,
          badge: 'Flash',
          badgeType: 'warning'
        }
      ]
    },
    {
      id: 'bill-payments',
      title: 'Bill Payments',
      description: 'Pay utility bills and municipal accounts',
      bgGradient: 'from-indigo-500/10 to-indigo-500/5',
      iconBg: 'bg-indigo-500/20',
      services: [
        {
          id: 'utility-bills',
          title: 'Utility Bills',
          description: 'Water, electricity, and municipal accounts',
          icon: <CreditCard className="w-6 h-6 text-indigo-600" />,
          type: 'bill-payment',
          available: true,
          badge: 'Instant',
          badgeType: 'info'
        },
        {
          id: 'easy-pay-bills',
          title: 'EasyPay Bills',
          description: 'EasyPay bill payment service',
          icon: <Receipt className="w-6 h-6 text-indigo-600" />,
          type: 'bill-payment',
          available: true,
          badge: 'EasyPay',
          badgeType: 'success'
        }
      ]
    }
  ];

  return (
    <div style={{ 
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Montserrat, sans-serif'
    }}>
      {/* Main Content Area */}
      <div style={{ padding: '16px' }}>
        {/* Card 1: Page Header (Left arrow - Title - Balance badge) */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <button
            onClick={() => navigate('/transact')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft style={{ width: '20px', height: '20px', color: '#6b7280' }} />
          </button>
                                <h1 style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1f2937',
                        margin: '0',
                        textAlign: 'center',
                        flex: 1
                      }}>
                        Services
                      </h1>
          {/* Wallet Balance Badge */}
          <Badge 
            style={{
              backgroundColor: '#86BE41',
              color: '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '9.18px',
              fontWeight: '600',
              padding: '3.06px 6.12px',
              borderRadius: '9.18px',
              border: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {walletBalance}
          </Badge>
        </div>



        {/* User welcome message */}
        {user && (
          <div className="mb-6 p-4 bg-gradient-to-r from-[#86BE41]/10 to-[#2D8CCA]/10 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: '#1f2937',
                  marginBottom: '0.25rem'
                }}>
                  Welcome back, {user.name.split(' ')[0]}
                </p>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-small)',
                  fontWeight: 'var(--font-weight-normal)',
                  color: '#6b7280'
                }}>
                  {user.kycVerified ? 'All services available' : 'Complete KYC to unlock all features'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" style={{ margin: '0 var(--mobile-padding)' }}>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              fontWeight: 'var(--font-weight-normal)',
              color: '#dc2626'
            }}>
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg" style={{ margin: '0 var(--mobile-padding)' }}>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            </div>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              fontWeight: 'var(--font-weight-normal)',
              color: '#2563eb'
            }}>
              Loading airtime services...
            </p>
          </div>
        </div>
      )}

      {/* Service Sections */}
      <div style={{ padding: '0 var(--mobile-padding) var(--mobile-padding)' }}>
                          {serviceSections.map((section, sectionIndex) => (
          <div key={section.id} className="mb-8">
            {/* Section Header */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 ${section.iconBg} rounded-lg flex items-center justify-center`}>
                  <Award className="w-4 h-4" style={{ color: sectionIndex === 0 ? '#86BE41' : '#2D8CCA' }} />
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-lg)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>
                    {section.title}
                  </h2>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    fontWeight: 'var(--font-weight-normal)',
                    color: '#6b7280'
                  }}>
                    {section.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Cards */}
            <div className="grid grid-cols-1 gap-4">
              {section.services.map((service) => (
                <Card 
                  key={service.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    !service.available ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => handleServiceClick(service)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                          {service.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 style={{
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: 'var(--mobile-font-base)',
                              fontWeight: 'var(--font-weight-semibold)',
                              color: '#1f2937'
                            }}>
                              {service.title}
                            </h3>
                            {service.badge && (
                              <Badge 
                                style={{
                                  backgroundColor: service.badgeType === 'success' ? '#86BE41' : 
                                                   service.badgeType === 'warning' ? '#f59e0b' : '#2D8CCA',
                                  color: '#ffffff',
                                  fontFamily: 'Montserrat, sans-serif',
                                  fontSize: '8px',
                                  fontWeight: '600',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  border: 'none'
                                }}
                              >
                                {service.badge}
                              </Badge>
                            )}
                          </div>
                          <p style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: 'var(--mobile-font-small)',
                            fontWeight: 'var(--font-weight-normal)',
                            color: '#6b7280'
                          }}>
                            {service.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingService === service.id ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="sm:max-w-md" aria-describedby="purchase-complete-description">
          <DialogHeader>
            <DialogTitle>Purchase Complete</DialogTitle>
            <div id="purchase-complete-description" className="sr-only">
              Purchase completion details including amount, reference, and voucher PIN if applicable
            </div>
          </DialogHeader>
          {purchaseResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: '#059669'
                  }}>
                    Purchase Successful
                  </p>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    fontWeight: 'var(--font-weight-normal)',
                    color: '#6b7280'
                  }}>
                    Reference: {purchaseResult.reference}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: '#1f2937'
                }}>
                  Amount: R{purchaseResult.amount.toFixed(2)}
                </p>
                {purchaseResult.networkId && (
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: '#1f2937'
                  }}>
                    Network: {purchaseResult.networkId}
                  </p>
                )}
                {purchaseResult.recipientPhone && (
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: '#1f2937'
                  }}>
                    Recipient: {purchaseResult.recipientPhone}
                  </p>
                )}
              </div>

              {/* PIN Display for Vouchers */}
              {purchaseResult.pin && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: '#1f2937',
                    marginBottom: '0.5rem'
                  }}>
                    Your Voucher PIN:
                  </p>
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <code style={{
                      fontFamily: 'monospace',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: '#1f2937',
                      letterSpacing: '0.1em'
                    }}>
                      {purchaseResult.pin}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyPinToClipboard(purchaseResult.pin!)}
                      className="ml-2"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => setShowPurchaseDialog(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
