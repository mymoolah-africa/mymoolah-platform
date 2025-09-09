import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

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
}

// Service categories
interface ServiceSection {
  id: string;
  title: string;
  description: string;
  services: Service[];
  bgGradient: string;
  iconBg: string;
}

export function TransactPage() {
  const navigate = useNavigate();
  const { user, requiresKYC } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingService, setLoadingService] = useState<string | null>(null);
  const [trendingProducts, setTrendingProducts] = useState<VASProduct[]>([]);
  const [bestDeals, setBestDeals] = useState<VASProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    
    // Show loading state for service
    setLoadingService(service.id);
    
    try {
      // Check KYC requirements for sensitive services
      const kycRequiredServices = ['send-money', 'request-money', 'withdraw'];
      
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

  // Define service sections with comprehensive service offerings
  const serviceSections: ServiceSection[] = [
    {
      id: 'payments',
      title: 'Payments & Transfers',
      description: 'Send money, receive funds, and manage transfers',
      bgGradient: 'from-[#86BE41]/10 to-[#86BE41]/5',
      iconBg: 'bg-[#86BE41]/20',
      services: [
        {
          id: 'send-money',
          title: 'Pay Beneficiary',
          description: 'Transfer money to MyMoolah users or bank accounts',
          icon: <Send className="w-6 h-6 text-[#86BE41]" />,
          route: '/send-money',
          available: true,
          badge: 'Popular',
          badgeType: 'success'
        },
        {
          id: 'request-money',
          title: 'Request Money',
          description: 'Request payment from MyMoolah users or bank accounts',
          icon: <Download className="w-6 h-6 text-[#86BE41]" />,
          route: '/request-money',
          available: true,
          badge: 'New',
          badgeType: 'info'
        },
        {
          id: 'qr-scan',
          title: 'Scan QR to Pay',
          description: 'Pay merchants by scanning QR codes',
          icon: <QrCode className="w-6 h-6 text-[#86BE41]" />,
          route: '/qr-payment',
          available: true,
          badge: 'Zapper',
          badgeType: 'info'
        },
        {
          id: 'wallet-withdraw',
          title: 'Cash Withdrawal',
          description: 'Get cash at Flash traders or Formal retail brands',
          icon: <Banknote className="w-6 h-6 text-[#86BE41]" />,
          route: '/service-cash_withdrawal',
          available: true,
          comingSoon: true
        }
      ]
    },
    {
      id: 'bills',
      title: 'Bills & Utilities',
      description: 'Pay your bills and utilities with ease',
      bgGradient: 'from-[#2D8CCA]/10 to-[#2D8CCA]/5',
      iconBg: 'bg-[#2D8CCA]/20',
      services: [
        {
          id: 'airtime',
          title: 'Airtime',
          description: 'Buy airtime with best deals from Flash & MobileMart',
          icon: <Smartphone className="w-6 h-6 text-[#2D8CCA]" />,
          route: '/airtime',
          available: true,
          badge: bestDeals.length > 0 ? `${bestDeals.length} Deals` : 'Live',
          badgeType: 'success'
        },
        {
          id: 'data',
          title: 'Data',
          description: 'Purchase data bundles with AI-powered best deals',
          icon: <Smartphone className="w-6 h-6 text-[#2D8CCA]" />,
          route: '/data',
          available: true,
          badge: trendingProducts.length > 0 ? `${trendingProducts.length} Trending` : 'Live',
          badgeType: 'info'
        },
        {
          id: 'electricity',
          title: 'Electricity & Water',
          description: 'Pay your utility bills quickly',
          icon: <Zap className="w-6 h-6 text-[#2D8CCA]" />,
          route: '/electricity',
          available: true,
          comingSoon: true
        },
        {
          id: 'bill-payments',
          title: 'Bill Payments',
          description: 'Pay municipal and service bills',
          icon: <Receipt className="w-6 h-6 text-[#2D8CCA]" />,
          route: '/bill-payments',
          available: true,
          comingSoon: true
        },
        {
          id: 'insurance',
          title: 'Insurance',
          description: 'Pay insurance premiums',
          icon: <Home className="w-6 h-6 text-[#2D8CCA]" />,
          route: '/service-insurance',
          available: true,
          comingSoon: true
        }
      ]
    },
    {
      id: 'vouchers',
      title: 'Vouchers & Digital Services',
      description: 'Buy vouchers and digital products',
      bgGradient: 'from-orange-500/10 to-orange-500/5',
      iconBg: 'bg-orange-500/20',
      services: [
        {
          id: 'vouchers',
          title: 'Vouchers',
          description: 'Buy and send digital vouchers',
          icon: <Gift className="w-6 h-6 text-orange-600" />,
          route: '/vouchers',
          available: true,
          badge: 'Hot',
          badgeType: 'warning'
        },
        {
          id: 'gaming',
          title: 'Gaming Credits',
          description: 'Top up gaming accounts',
          icon: <CreditCard className="w-6 h-6 text-orange-600" />,
          route: '/service-gaming',
          available: true,
          comingSoon: true
        },
        {
          id: 'streaming',
          title: 'Streaming Services',
          description: 'Pay for Netflix, Spotify, etc.',
          icon: <Wallet className="w-6 h-6 text-orange-600" />,
          route: '/service-streaming',
          available: true,
          comingSoon: true
        }
      ]
    },
    {
      id: 'loyalty',
      title: 'Loyalty & Promotions',
      description: 'Earn rewards and access exclusive deals',
      bgGradient: 'from-purple-500/10 to-purple-500/5',
      iconBg: 'bg-purple-500/20',
      services: [
        {
          id: 'rewards',
          title: 'MyMoolah Rewards',
          description: 'Earn points on every transaction',
          icon: <Star className="w-6 h-6 text-purple-600" />,
          route: '/service-rewards',
          available: false,
          badge: 'Earn Points',
          badgeType: 'info',
          comingSoon: true
        },
        {
          id: 'cashback',
          title: 'Cashback Deals',
          description: 'Get money back on purchases',
          icon: <TrendingUp className="w-6 h-6 text-purple-600" />,
          route: '/service-cashback',
          available: false,
          comingSoon: true
        },
        {
          id: 'discounts',
          title: 'Special Offers',
          description: 'Exclusive discounts for members',
          icon: <Percent className="w-6 h-6 text-purple-600" />,
          route: '/service-offers',
          available: false,
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
        <div className="text-center mb-6">
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

      {/* Service Sections */}
      <div style={{ padding: '0 var(--mobile-padding) var(--mobile-padding)' }}>
        {serviceSections.map((section, sectionIndex) => (
          <div key={section.id} className="mb-8">
            {/* Section Header */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 ${section.iconBg} rounded-lg flex items-center justify-center`}>
                  <Award className="w-4 h-4" style={{ color: sectionIndex === 0 ? '#86BE41' : sectionIndex === 1 ? '#2D8CCA' : sectionIndex === 2 ? '#f59e0b' : '#8b5cf6' }} />
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
                fontSize: 'var(--mobile-font-small)',
                fontWeight: 'var(--font-weight-normal)',
                color: '#6b7280',
                marginLeft: '2.75rem'
              }}>
                {section.description}
              </p>
            </div>

            {/* Service Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {section.services.map((service) => (
                <Card
                  key={service.id}
                  className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${
                    service.available 
                      ? 'border-gray-200 hover:border-[#86BE41]/50 hover:bg-gray-50' 
                      : 'border-gray-100 bg-gray-50/50'
                  }`}
                  style={{ 
                    borderRadius: 'var(--mobile-border-radius)',
                    height: '160px',
                    opacity: service.available ? 1 : 0.7
                  }}
                  onClick={() => service.available && handleServiceClick(service)}
                >
                  <CardContent style={{ 
                    padding: '1rem',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    {/* Service Icon and Badge */}
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        sectionIndex === 0 ? 'bg-[#86BE41]/20' :
                        sectionIndex === 1 ? 'bg-[#2D8CCA]/20' :
                        sectionIndex === 2 ? 'bg-orange-500/20' : 'bg-purple-500/20'
                      }`}>
                        {loadingService === service.id ? (
                          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                        ) : (
                          service.icon
                        )}
                      </div>
                      
                      {service.badge && (
                        <Badge 
                          variant={service.badgeType === 'success' ? 'default' : 'secondary'}
                          className={`text-xs ${
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
                        <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600" style={{ 
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '10px',
                          fontWeight: 'var(--font-weight-medium)'
                        }}>
                          Soon
                        </Badge>
                      )}
                    </div>

                    {/* Service Content */}
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-medium)',
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

                    {/* Service Action */}
                    {service.available && (
                      <div className="flex justify-end">
                        <ChevronRight className={`w-4 h-4 transition-colors ${
                          service.available ? 'text-[#86BE41]' : 'text-gray-400'
                        }`} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA Section */}
      <div className="mt-8 mb-6" style={{ padding: '0 var(--mobile-padding)' }}>
        <Card className="bg-gradient-to-r from-[#86BE41]/10 to-[#2D8CCA]/10 border-0">
          <CardContent style={{ padding: '1.5rem' }}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                More Services Coming Soon
              </h3>
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-normal)',
                color: '#6b7280',
                marginBottom: '1rem'
              }}>
                We're constantly adding new features to make your financial life easier
              </p>
              {!user?.kycVerified && (
                <button
                  onClick={() => navigate('/kyc/documents')}
                  className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white border-none rounded-lg transition-all hover:shadow-lg"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    padding: '12px 24px',
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
    </div>
  );
}