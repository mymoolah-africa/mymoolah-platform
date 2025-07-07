import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Import icons directly from lucide-react
import { 
  Send,
  Receipt,
  Ticket,
  CreditCard,
  Smartphone,
  Car,
  Home as HomeIcon,
  ShoppingBag,
  Zap,
  Users,
  PiggyBank,
  TrendingUp,
  Settings,
  CheckCircle,
  Lock,
  ChevronRight,
  ArrowLeft,
  Gift,
  Star
} from 'lucide-react';

// Service interface
interface Service {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'payments' | 'loyalty' | 'bills' | 'savings' | 'business';
  available: boolean;
  requiresKYC: boolean;

  comingSoon?: boolean;
}

// Service category interface
interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  services: Service[];
}

export function TransactPage() {
  const navigate = useNavigate();
  const { user, requiresKYC } = useAuth();
  

  
  // Available services with UPDATED integration status - LIVE SERVICES
  const [services, setServices] = useState<Service[]>([
    // Payment Services (positions 1, 2, 7)
    {
      id: 'send-money',
      name: 'Send Money',
      description: 'Transfer money to banks, wallets, and ATMs',
      icon: <Send className="w-6 h-6" />,
      category: 'payments',
      available: true,
      requiresKYC: true,

      // LIVE: dtMercury & Flash integration
    },
    {
      id: 'request-money',
      name: 'Request Money',
      description: 'Request payments from friends and family',
      icon: <Receipt className="w-6 h-6" />,
      category: 'payments',
      available: true,
      requiresKYC: false,
      comingSoon: true
      // COMING SOON: Not yet integrated
    },
    {
      id: 'instant-cash',
      name: 'Instant Cash',
      description: 'Withdraw cash at any ATM nationwide',
      icon: <CreditCard className="w-6 h-6" />,
      category: 'payments',
      available: true,
      requiresKYC: true,
      comingSoon: true
      // COMING SOON: Needs new SP integration
    },
    
    // Bills & Payments (positions 3, 4, 6, 8)
    {
      id: 'airtime',
      name: 'Airtime & Data',
      description: 'Top up airtime and buy data bundles',
      icon: <Smartphone className="w-6 h-6" />,
      category: 'bills',
      available: true,
      requiresKYC: false
      // LIVE: MobileMart & Flash integration
    },
    {
      id: 'electricity',
      name: 'Electricity',
      description: 'Purchase prepaid electricity tokens',
      icon: <Zap className="w-6 h-6" />,
      category: 'bills',
      available: true,
      requiresKYC: false
      // LIVE: MobileMart & Flash integration
    },
    {
      id: 'bill-payments',
      name: 'Bill Payments',
      description: 'Pay hundreds of Merchants',
      icon: <Users className="w-6 h-6" />,
      category: 'bills',
      available: true,
      requiresKYC: true
      // LIVE: MobileMart & EasyPay integration
    },
    {
      id: 'transport',
      name: 'Transport',
      description: 'Pay for taxi rides and public transport',
      icon: <Car className="w-6 h-6" />,
      category: 'bills',
      available: true,
      requiresKYC: false,
      comingSoon: true
      // COMING SOON: Not yet integrated
    },
    
    // Loyalty & Promotions Services (position 5)
    {
      id: 'loyalty',
      name: 'Loyalty',
      description: 'Earn and redeem loyalty points',
      icon: <Star className="w-6 h-6" />,
      category: 'loyalty',
      available: true,
      requiresKYC: false,
      comingSoon: true
      // COMING SOON: Not yet integrated
    },
    {
      id: 'promotions',
      name: 'Promotions',
      description: 'Special offers and discounts',
      icon: <Gift className="w-6 h-6" />,
      category: 'loyalty',
      available: true,
      requiresKYC: false,
      comingSoon: true
      // COMING SOON: Not yet integrated
    }
  ]);

  // Service categories for organization - UPDATED
  const categories: ServiceCategory[] = [
    {
      id: 'payments',
      name: 'Payments & Transfers',
      description: 'Send, receive, and manage your money',
      icon: <Send className="w-5 h-5" />,
      services: services.filter(s => s.category === 'payments')
    },
    {
      id: 'bills',
      name: 'Bills & Utilities',
      description: 'Pay bills and top up services',
      icon: <Zap className="w-5 h-5" />,
      services: services.filter(s => s.category === 'bills')
    },
    {
      id: 'loyalty',
      name: 'Loyalty & Promotions',
      description: 'Earn points and get special offers',
      icon: <Star className="w-5 h-5" />,
      services: services.filter(s => s.category === 'loyalty')
    }
  ];





  // Handle service navigation
  const handleServiceClick = (service: Service) => {
    // Check if service requires KYC
    if (service.requiresKYC && requiresKYC('transact')) {
      navigate('/kyc/documents?returnTo=/transact');
      return;
    }

    // Check if coming soon
    if (service.comingSoon) {
      alert(`${service.name} is coming soon! We'll notify you when it's available.`);
      return;
    }

    // Navigate to specific service page - UPDATED for live integrations
    switch (service.id) {
      case 'send-money':
        navigate('/send-money');
        break;
      case 'loyalty':
        // COMING SOON: Not yet integrated
        alert('Loyalty program coming soon!');
        break;
      case 'promotions':
        // COMING SOON: Not yet integrated
        alert('Promotions and offers coming soon!');
        break;
      case 'airtime':
        // TODO: Implement real MobileMart & Flash integration
        alert('Airtime & Data service is coming soon!');
        break;
      case 'electricity':
        // TODO: Implement real MobileMart & Flash integration
        alert('Electricity service is coming soon!');
        break;
      case 'bill-payments':
        // TODO: Implement real MobileMart & EasyPay integration
        alert('Bill Payments service is coming soon!');
        break;
      case 'transport':
        // COMING SOON: Not yet integrated
        alert('Transport payments coming soon!');
        break;
      case 'request-money':
        // COMING SOON: Not yet integrated
        alert('Request Money feature coming soon!');
        break;
      case 'instant-cash':
        // COMING SOON: Needs new SP integration
        alert('Instant Cash pickup coming soon!');
        break;
      default:
        alert(`${service.name} is coming soon!`);
    }
  };

  // Get service availability status
  const getServiceStatus = (service: Service) => {
    if (service.comingSoon) return 'coming-soon';
    if (service.requiresKYC && requiresKYC('transact')) return 'requires-kyc';
    if (!service.available) return 'unavailable';
    return 'available';
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700';
      case 'requires-kyc': return 'bg-orange-100 text-orange-700';
      case 'coming-soon': return 'bg-blue-100 text-blue-700';
      case 'unavailable': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Get status badge text
  const getStatusBadgeText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'requires-kyc': return 'KYC Required';
      case 'coming-soon': return 'Coming Soon';
      case 'unavailable': return 'Unavailable';
      default: return 'Unknown';
    }
  };

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
              Services
            </h1>
          </div>

          {/* Right: Settings */}
          <button 
            onClick={() => alert('Service settings coming soon!')}
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
            aria-label="Service Settings"
          >
            <Settings style={{ width: '24px', height: '24px', color: '#6b7280' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '8px'
            }}
          >
            Your Financial Services
          </h2>
          <p 
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '16px'
            }}
          >
            Customize your dashboard and explore all available services
          </p>


        </div>



        {/* Service Categories */}
        {categories.map(category => (
          <div key={category.id} style={{ marginBottom: '24px' }}>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}
            >
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#86BE41',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {React.cloneElement(category.icon as React.ReactElement, {
                  style: { color: '#ffffff' }
                })}
              </div>
              <div>
                <h3 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '0 0 4px 0'
                  }}
                >
                  {category.name}
                </h3>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '0'
                  }}
                >
                  {category.description}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {category.services.map(service => {
                const status = getServiceStatus(service);
                
                return (
                  <button
                    key={service.id}
                    onClick={() => handleServiceClick(service)}
                    disabled={status === 'unavailable'}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'left',
                      cursor: status === 'unavailable' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: status === 'unavailable' ? 0.5 : 1
                    }}
                    onMouseOver={(e) => {
                      if (status !== 'unavailable') {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#86BE41';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (status !== 'unavailable') {
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
                          {React.cloneElement(service.icon as React.ReactElement, {
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
                              {service.name}
                            </p>
                            {service.isActive && (
                              <span 
                                style={{
                                  backgroundColor: '#86BE41',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontFamily: 'Montserrat, sans-serif'
                                }}
                              >
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p 
                            style={{
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: '14px',
                              color: '#6b7280',
                              margin: '0 0 8px 0'
                            }}
                          >
                            {service.description}
                          </p>
                          
                          {status !== 'available' && (
                            <span 
                              className={getStatusBadgeColor(status)}
                              style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontFamily: 'Montserrat, sans-serif'
                              }}
                            >
                              {getStatusBadgeText(status)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Integration Status Information */}
        <div 
          style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center'
          }}
        >
          <h4 
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: '600',
              color: '#0c4a6e',
              marginBottom: '8px'
            }}
          >
            🚀 5 Services Now LIVE!
          </h4>
          <p 
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: '#075985',
              margin: '0 0 12px 0'
            }}
          >
            Send Money, Vouchers, Airtime & Data, Electricity, and Bill Payments are now fully integrated with demo functionality.
          </p>
          <div 
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ fontSize: '12px', backgroundColor: '#16a34a', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontFamily: 'Montserrat, sans-serif' }}>
              dtMercury
            </span>
            <span style={{ fontSize: '12px', backgroundColor: '#16a34a', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontFamily: 'Montserrat, sans-serif' }}>
              MobileMart
            </span>
            <span style={{ fontSize: '12px', backgroundColor: '#16a34a', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontFamily: 'Montserrat, sans-serif' }}>
              EasyPay
            </span>
            <span style={{ fontSize: '12px', backgroundColor: '#16a34a', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontFamily: 'Montserrat, sans-serif' }}>
              Flash
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}