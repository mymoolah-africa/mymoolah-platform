import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, type VASProduct, type SupplierComparison } from '../services/apiService';
import { 
  Send, 
  Download, 
  QrCode, 
  Gift, 
  Smartphone, 
  Zap, 
  Receipt, 
  Star,
  TrendingUp,
  Percent,
  Award,
  ChevronRight,
  Wallet,
  CreditCard,
  Home,
  Banknote,
  Loader2,
  AlertTriangle,
  DollarSign,
  AtSign,
  HandCoins,
  Play,
  Tag,
  Ticket
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import EarnMoolahsModal from '../components/modals/EarnMoolahsModal';

// Service interface for type safety
interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  available: boolean;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'info';
  comingSoon?: boolean;
  hidden?: boolean; // hides tile from UI without removing config
}

// Service categories
interface ServiceSection {
  id: string;
  title: string;
  description: string;
  services: Service[];
  color: string;
}

export function TransactPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, requiresKYC } = useAuth();
  const [showEarnMoolahsModal, setShowEarnMoolahsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingService, setLoadingService] = useState<string | null>(null);
  const [trendingProducts, setTrendingProducts] = useState<VASProduct[]>([]);
  const [bestDeals, setBestDeals] = useState<VASProduct[]>([]);
  const [giftCardApprovedCount, setGiftCardApprovedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for watch-to-earn query param and auto-open modal (from Quick Access Services)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('service') === 'watch-to-earn') {
      setShowEarnMoolahsModal(true);
      // Clean up URL by removing query param
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Load trending products and best deals on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load trending products
        const trending = await apiService.getTrendingProducts();
        setTrendingProducts(trending);
        
        // Load best deals for airtime
        const airtimeDeals = await apiService.compareSuppliers('airtime');
        setBestDeals(airtimeDeals.bestDeals || []);

        try {
          const giftCards = await apiService.getVouchers(undefined, undefined, true);
          setGiftCardApprovedCount(giftCards.total ?? giftCards.vouchers.length);
        } catch (giftCardError) {
          console.warn('Gift card catalog count unavailable:', giftCardError);
          setGiftCardApprovedCount(null);
        }
        
      } catch (err) {
        console.error('Error loading TransactPage data:', err);
        setError('Failed to load service data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Service navigation handler with KYC checks
  const handleServiceClick = async (service: Service) => {
    if (!service.available) return;
    
    // Special case: Watch to Earn opens modal instead of navigating
    if (service.id === 'watch-to-earn') {
      setShowEarnMoolahsModal(true);
      return;
    }
    
    // Show loading state for service
    setLoadingService(service.id);
    
    try {
      // Check KYC requirements for sensitive services
      const kycRequiredServices = ['send-money', 'request-money', 'flash-eezicash', 'withdraw-cash'];
      
      if (kycRequiredServices.includes(service.id) && requiresKYC('send')) {
        navigate('/kyc/documents?returnTo=' + service.route);
        return;
      }
      
      // Navigate to service page
      navigate(service.route);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setLoadingService(null);
    }
  };

  const _viteMode: string = (import.meta as any).env?.MODE ?? 'production';
  const isUAT = _viteMode !== 'production';

  // Define service sections by user intent. Supplier/provider choices stay inside flows.
  const serviceSections: ServiceSection[] = [
    {
      id: 'payments',
      title: 'Payments',
      description: 'Pay people, request money, or scan to pay',
      color: '#86BE41',
      services: [
        {
          id: 'send-money',
          title: 'Pay Someone',
          description: 'Transfer to MyMoolah users or bank accounts',
          icon: <Send className="w-6 h-6" />,
          route: '/send-money',
          available: true,
          badge: 'Live',
          badgeType: 'success'
        },
        {
          id: 'request-money',
          title: 'Request Money',
          description: 'Ask someone to pay you',
          icon: <HandCoins className="w-6 h-6" />,
          route: '/request-money',
          available: true,
          badge: 'Live',
          badgeType: 'success'
        },
        {
          id: 'qr-payments',
          title: 'QR Payments',
          description: 'Scan QR codes to make instant payments',
          icon: <QrCode className="w-6 h-6" />,
          route: '/qr-payment',
          available: true,
          badge: 'Live',
          badgeType: 'success'
        }
      ]
    },
    {
      id: 'add-money',
      title: 'Add Money',
      description: 'Put money into your MyMoolah wallet',
      color: '#2D8CCA',
      services: [
        {
          id: 'add-money-eft',
          title: 'Bank Transfer',
          description: 'Use your mobile number as the payment reference',
          icon: <Banknote className="w-6 h-6" />,
          route: '/add-money-eft',
          available: true,
          badge: 'Live',
          badgeType: 'success'
        },
        {
          id: 'topup-voucher',
          title: 'Voucher Top-up',
          description: 'Redeem a 1Voucher, Flash Pay, or FNB voucher into your wallet',
          icon: <Ticket className="w-6 h-6" />,
          route: '/topup-voucher',
          available: true,
          badge: 'New',
          badgeType: 'success'
        },
        {
          id: 'tap-to-add-money',
          title: 'Tap to Add Money',
          description: 'Tap your card or use Google Pay / Apple Pay to add money to your wallet',
          icon: <CreditCard className="w-6 h-6" />,
          route: '/tap-to-add-money',
          available: false,
          hidden: true,
        },
        {
          id: 'topup-easypay',
          title: 'EasyPay Top-up',
          description: 'Create a top-up request and pay at EasyPay',
          icon: <Wallet className="w-6 h-6" />,
          route: '/topup-easypay',
          available: true,
          badge: 'New',
          badgeType: 'success'
        }
      ]
    },
    {
      id: 'withdraw-cash',
      title: 'Withdraw Cash',
      description: 'Get a cash PIN by SMS from a supported provider',
      color: '#86BE41',
      services: [
        {
          id: 'flash-eezicash',
          title: 'Flash eeziCash',
          description: 'Legacy direct Flash cash-withdrawal PIN flow',
          icon: <DollarSign className="w-6 h-6" />,
          route: '/flash-eezicash-overlay',
          available: true,
          hidden: true,
        },
        {
          id: 'withdraw-cash',
          title: 'Withdraw Cash',
          description: 'Get a provider cash PIN sent to your phone',
          icon: <AtSign className="w-6 h-6" />,
          route: '/withdraw-cash-overlay',
          available: true,
          badge: 'New',
          badgeType: 'success',
        },
        {
          id: 'cashout-easypay',
          title: 'EasyPay Cash-out',
          description: 'Withdraw cash at EasyPay stores',
          icon: <DollarSign className="w-6 h-6" />,
          route: '/cashout-easypay',
          available: false,
          badge: 'Coming Soon',
          badgeType: 'info',
          comingSoon: true
        },
        {
          id: 'mmcash-retail',
          title: 'Retail Cash-out',
          description: 'Withdraw cash at retail partners',
          icon: <DollarSign className="w-6 h-6" />,
          route: '/mmcash-retail-overlay',
          available: false,
          badge: 'Coming Soon',
          badgeType: 'info',
          comingSoon: true
        }
      ]
    },
    {
      id: 'buy',
      title: 'Buy',
      description: 'Buy airtime, utilities, bills, and retail vouchers',
      color: '#f59e0b',
      services: [
        {
          id: 'airtime-data-overlay',
          title: 'Airtime & Data',
          description: 'Top up airtime and data instantly',
          icon: <Smartphone className="w-6 h-6" />,
          route: '/airtime-data-overlay',
          available: true,
          badge: bestDeals.length > 0 ? `${bestDeals.length} Deals` : 'Live',
          badgeType: 'success'
        },
        {
          id: 'electricity-overlay',
          title: 'Electricity',
          description: 'Buy prepaid electricity tokens',
          icon: <Zap className="w-6 h-6" />,
          route: '/electricity-overlay',
          available: true,
          badge: 'Live',
          badgeType: 'success'
        },
        {
          id: 'bill-payment-overlay',
          title: 'Bills',
          description: 'Pay bills and utilities',
          icon: <Receipt className="w-6 h-6" />,
          route: '/bill-payment-overlay',
          available: true,
          badge: 'Live',
          badgeType: 'success'
        },
        {
          id: 'gift-cards-overlay',
          title: 'Gift Cards',
          description: 'Food, coffee, entertainment and shopping gifts',
          icon: <Gift className="w-6 h-6" />,
          route: '/gift-cards-overlay',
          available: true,
          badge: 'New',
          badgeType: 'success',
          hidden: giftCardApprovedCount === 0
        },
        {
          id: 'vouchers-overlay',
          title: 'Buy Retail Vouchers',
          description: 'Groceries, betting and retail vouchers',
          icon: <Ticket className="w-6 h-6" />,
          route: '/vouchers-overlay',
          available: true,
          badge: 'Hot',
          badgeType: 'warning'
        }
      ]
    },
    {
      id: 'loyalty',
      title: 'Loyalty & Promotions',
      description: 'Earn rewards and access exclusive deals',
      color: '#8b5cf6',
      services: [
        {
          id: 'watch-to-earn',
          title: 'Watch to Earn',
          description: 'Watch videos and earn R2-R3 per ad',
          icon: <Play className="w-6 h-6" />,
          route: '#watch-to-earn',
          available: isUAT,
          badge: isUAT ? 'New' : 'Coming Soon',
          badgeType: isUAT ? 'success' : 'info',
          comingSoon: !isUAT
        },
        {
          id: 'rewards-program',
          title: 'Rewards Program',
          description: 'Cashback deals and special offers',
          icon: <Star className="w-6 h-6" />,
          route: '/rewards-program',
          available: false,
          badge: 'Coming Soon',
          badgeType: 'info',
          comingSoon: true
        },
        {
          id: 'promotions',
          title: 'Promotions',
          description: 'Exclusive deals and discounts',
          icon: <Tag className="w-6 h-6" />,
          route: '/promotions',
          available: false,
          badge: 'Coming Soon',
          badgeType: 'info',
          comingSoon: true
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
      {/* Header Section */}
      <div style={{ padding: 'var(--mobile-padding)' }}>
        <div className="text-center mb-8">
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            MyMoolah Services
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'var(--mobile-font-base)',
            fontWeight: 'var(--font-weight-normal)',
            color: '#6b7280'
          }}>
            Your complete digital banking solution
          </p>
        </div>

        {/* User welcome message */}
        {user && (
          <div className="mb-8 p-4 bg-gradient-to-r from-[#86BE41]/10 to-[#2D8CCA]/10 rounded-lg">
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
                  Welcome back, {user.name}
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
                Loading service data...
              </p>
            </div>
          </div>
        )}

      {/* Service Sections - 4 Distinct Containers */}
      <div style={{ padding: '0 var(--mobile-padding)' }}>
        {serviceSections.map((section, sectionIndex) => (
          <div key={section.id} className="mb-12">
            {/* Container with heading and banner */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-lg">
              {/* Section Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${section.color}20` }}>
                    <Award className="w-4 h-4" style={{ color: section.color }} />
                  </div>
                  <h2 style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: '#1f2937'
                  }}>
                    {section.title}
                  </h2>
                </div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-normal)',
                  color: '#6b7280',
                  marginLeft: '2.75rem'
                }}>
                  {section.description}
                </p>
              </div>

              {/* Service Banner */}
              <div className="grid grid-cols-1 gap-4">
                {section.services.filter(s => !s.hidden).map((service) => (
                  <Card
                    key={service.id}
                    className={`cursor-pointer transition-all duration-200 border hover:shadow-md ${
                      service.available 
                        ? 'border-gray-200 hover:border-gray-300' 
                        : 'border-gray-100 bg-gray-50'
                    }`}
                    style={{ 
                      borderRadius: '12px',
                      height: '100px',
                      opacity: service.available ? 1 : 0.7
                    }}
                    onClick={() => service.available && handleServiceClick(service)}
                  >
                    <CardContent style={{ 
                      padding: '1rem',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${section.color}20` }}>
                        {loadingService === service.id ? (
                          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                        ) : (
                          <div style={{ color: section.color }}>
                            {service.icon}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h3 style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: service.available ? '#1f2937' : '#9ca3af',
                          marginBottom: '0.25rem',
                          lineHeight: '1.3'
                        }}>
                          {service.title}
                        </h3>
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-normal)',
                          color: service.available ? '#6b7280' : '#9ca3af',
                          lineHeight: '1.4'
                        }}>
                          {service.description}
                        </p>
                      </div>

                      {/* Badge */}
                      {service.badge && (
                        <Badge 
                          variant={service.badgeType === 'success' ? 'default' : 'secondary'}
                          className={`text-xs px-2 py-1 rounded-full ${
                            service.badgeType === 'success' ? 'bg-[#86BE41] text-white' :
                            service.badgeType === 'info' ? 'bg-[#2D8CCA] text-white' :
                            service.badgeType === 'warning' ? 'bg-orange-500 text-white' :
                            'bg-gray-200 text-gray-700'
                          }`}
                          style={{ 
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '10px',
                            fontWeight: 'var(--font-weight-medium)'
                          }}
                        >
                          {service.badge}
                        </Badge>
                      )}
                      
                      {service.comingSoon && !service.badge && (
                        <Badge variant="secondary" className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600" style={{ 
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '10px',
                          fontWeight: 'var(--font-weight-medium)'
                        }}>
                          Soon
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA Section */}
      <div className="mt-16 mb-8" style={{ padding: '0 var(--mobile-padding)' }}>
        <Card className="bg-gradient-to-r from-[#86BE41]/10 to-[#2D8CCA]/10 border-0">
          <CardContent style={{ padding: '2rem' }}>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] rounded-full flex items-center justify-center">
                <Star className="w-10 h-10 text-white" />
              </div>
              <h3 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937',
                marginBottom: '0.75rem'
              }}>
                More Services Coming Soon
              </h3>
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-normal)',
                color: '#6b7280',
                marginBottom: '1.5rem'
              }}>
                We're constantly adding new features to make your financial life easier
              </p>
              {!user?.kycVerified && (
                <button
                  onClick={() => navigate('/kyc/documents')}
                  className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white border-none rounded-xl transition-all hover:shadow-lg"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    padding: '16px 32px',
                    minHeight: 'var(--mobile-touch-target)'
                  }}
                >
                  Verify Identity to Unlock All Features
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Watch to Earn Modal */}
      {showEarnMoolahsModal && (
        <EarnMoolahsModal
          isOpen={showEarnMoolahsModal}
          onClose={() => setShowEarnMoolahsModal(false)}
        />
      )}
    </div>
  );
}