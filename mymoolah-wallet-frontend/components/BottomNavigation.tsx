import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { APP_CONFIG } from "../config/app-config";
import { getToken } from "../utils/authToken";
import { 
  Home, 
  Send, 
  Receipt, 
  Ticket, 
  User,
  Wifi,
  Zap,
  CreditCard,
  Download,
  QrCode,
  Banknote,
  Smartphone,
  Gift,
  Wallet,
  HelpCircle,
  MessageSquare,
  DollarSign,
  Store,
  AtSign
} from "lucide-react";

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: () => JSX.Element;
}

interface QuickAccessService {
  id: string;
  name: string;
  description: string;
  category: 'payment' | 'utility' | 'financial';
  available: boolean;
  comingSoon?: boolean;
}

// Service mapping for quick access services - SINGLE SOURCE OF TRUTH from TransactPage
const serviceMapping = {
  'send-money': {
    id: 'send-money',
    path: '/send-money',
    label: 'Pay Beneficiary',
    icon: () => <Send style={{ width: '20px', height: '20px' }} />
  },
  'request-money': {
    id: 'request-money',
    path: '/request-money',
    label: 'Request Money',
    icon: () => <Download style={{ width: '20px', height: '20px' }} />
  },
  'qr-scan': {
    id: 'qr-scan',
    path: '/qr-payment',
    label: 'Scan QR to Pay',
    icon: () => <QrCode style={{ width: '20px', height: '20px' }} />
  },
  'wallet-withdraw': {
    id: 'wallet-withdraw',
    path: '/service-cash_withdrawal',
    label: 'Cash Withdrawal',
    icon: () => <Banknote style={{ width: '20px', height: '20px' }} />
  },
  'airtime-data': {
    id: 'airtime-data',
    path: '/airtime-data-overlay',
    label: 'Airtime & Data',
    icon: () => <Smartphone style={{ width: '20px', height: '20px' }} />
  },
  'electricity': {
    id: 'electricity',
    path: '/electricity-overlay',
    label: 'Electricity & Water',
    icon: () => <Zap style={{ width: '20px', height: '20px' }} />
  },
  'bill-payments': {
    id: 'bill-payments',
    path: '/bill-payment-overlay',
    label: 'Bill Payments',
    icon: () => <Receipt style={{ width: '20px', height: '20px' }} />
  },
  'insurance': {
    id: 'insurance',
    path: '/services',
    label: 'Insurance',
    icon: () => <Home style={{ width: '20px', height: '20px' }} />
  },
  'vouchers': {
    id: 'vouchers',
    path: '/vouchers',
    label: 'Vouchers',
    icon: () => <Ticket style={{ width: '20px', height: '20px' }} />
  },
  'gaming': {
    id: 'gaming',
    path: '/service-gaming',
    label: 'Gaming Credits',
    icon: () => <CreditCard style={{ width: '20px', height: '20px' }} />
  },
  'streaming': {
    id: 'streaming',
    path: '/service-streaming',
    label: 'Streaming Services',
    icon: () => <Wallet style={{ width: '20px', height: '20px' }} />
  },
  // New Cash-out Services
  'flash-eezicash': {
    id: 'flash-eezicash',
    path: '/flash-eezicash-overlay',
    label: 'Cash-out at Flash',
    icon: () => <DollarSign style={{ width: '20px', height: '20px' }} />
  },
  'mmcash-retail': {
    id: 'mmcash-retail',
    path: '/mmcash-retail-overlay',
    label: 'Cash-out at Retail',
    icon: () => <Store style={{ width: '20px', height: '20px' }} />
  },
  'atm-cashsend': {
    id: 'atm-cashsend',
    path: '/atm-cashsend-overlay',
    label: 'ATM Cash Send',
    icon: () => <AtSign style={{ width: '20px', height: '20px' }} />
  }
};

// Default navigation items (positions 1, 3, 5, 7)
const defaultNavItems: NavItem[] = [
  {
    id: 'home',
    path: '/dashboard',
    label: 'Home',
    icon: () => <Home style={{ width: '20px', height: '20px' }} />
  },
  {
    id: 'transact',
    path: '/transact',
    label: 'Transact',
    icon: () => <Receipt style={{ width: '28px', height: '28px' }} />
  },
  {
    id: 'support',
    path: '/support',
    label: 'Support',
    icon: () => <HelpCircle style={{ width: '20px', height: '20px' }} />
  },
  {
    id: 'feedback',
    path: '/feedback',
    label: 'Feedback',
    icon: () => <MessageSquare style={{ width: '20px', height: '20px' }} />
  }
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [quickAccessServices, setQuickAccessServices] = useState<string[]>(['send_money', 'airtime_data']);
  const [loading, setLoading] = useState(true);

  // Fetch user's quick access services
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        // Check if user is authenticated
        const token = getToken();
        if (!token) {
          
        setQuickAccessServices(['airtime-data', 'vouchers']);
          setLoading(false);
          return;
        }

        // Only fetch settings if we're on a page that shows bottom navigation
        const currentPath = location.pathname;
        const shouldShowNav = ['/dashboard', '/send-money', '/transact', '/qr-payment', '/vouchers', '/vouchers-overlay', '/profile', '/transactions', '/wallet-settings', '/request-money', '/services', '/electricity', '/bill-payments', '/support', '/airtime-data-overlay', '/electricity-overlay', '/bill-payment-overlay', '/flash-eezicash-overlay', '/mmcash-retail-overlay', '/atm-cashsend-overlay'].includes(currentPath);
        
        if (!shouldShowNav) {
          setQuickAccessServices(['airtime-data', 'vouchers']);
          setLoading(false);
          return;
        }

        const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.settings?.quickAccessServices) {
            setQuickAccessServices(data.data.settings.quickAccessServices);
          } else {
            setQuickAccessServices(['airtime-data', 'vouchers']);
          }
        } else if (response.status === 403) {
          setQuickAccessServices(['airtime-data', 'vouchers']);
        } else if (response.status === 401) {
          setQuickAccessServices(['airtime-data', 'vouchers']);
        } else {
          setQuickAccessServices(['airtime-data', 'vouchers']);
        }
      } catch (error) {
        console.error('Failed to fetch user settings:', error);
        // Fallback to default services
        setQuickAccessServices(['airtime-data', 'vouchers']);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSettings();

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      fetchUserSettings();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  // Build dynamic navigation items
  const buildNavItems = (): NavItem[] => {
    if (loading) {
      // Return default navigation while loading
      return [
        defaultNavItems[0], // Home
        serviceMapping['airtime-data'], // Default Airtime & Data
        defaultNavItems[1], // Transact
        serviceMapping.vouchers, // Default Vouchers
        defaultNavItems[2] // Support
      ];
    }

    // Get the first two selected services (max 2 allowed)
    const selectedServices = quickAccessServices.slice(0, 2);
    
    // Ensure we have exactly 2 services, fallback to defaults if needed
    const service1 = selectedServices[0] && serviceMapping[selectedServices[0] as keyof typeof serviceMapping] 
      ? serviceMapping[selectedServices[0] as keyof typeof serviceMapping] 
      : serviceMapping['airtime-data'];
    
    const service2 = selectedServices[1] && serviceMapping[selectedServices[1] as keyof typeof serviceMapping] 
      ? serviceMapping[selectedServices[1] as keyof typeof serviceMapping] 
      : serviceMapping.vouchers;

    return [
      defaultNavItems[0], // Home (position 1)
      service1, // First selected service (position 2)
      defaultNavItems[1], // Transact (position 3)
      service2, // Second selected service (position 4)
      defaultNavItems[2] // Support (position 5)
    ];
  };

  const navItems = buildNavItems();

  const getActiveTabId = () => {
    const currentPath = location.pathname;
    
    // Special case: transaction-history should highlight the Home tab
    if (currentPath === '/transactions') {
      return 'home';
    }
    
    const activeItem = navItems.find(item => item.path === currentPath);
    return activeItem?.id || 'home';
  };

  const activeTab = getActiveTabId();

  // Check if we should show the bottom navigation
  const showBottomNav = ['/dashboard', '/send-money', '/transact', '/qr-payment', '/vouchers', '/vouchers-overlay', '/profile', '/transactions', '/wallet-settings', '/request-money', '/services', '/electricity', '/bill-payments', '/support', '/airtime-data-overlay', '/electricity-overlay', '/bill-payment-overlay', '/flash-eezicash-overlay', '/mmcash-retail-overlay', '/atm-cashsend-overlay'].includes(location.pathname);
  
  if (!showBottomNav) return null;

  // ULTIMATE FIX: Margin-based centering with zero containing block interference
  const navigationElement = (
    <div 
      style={{
        // PURE VIEWPORT FIXED POSITIONING - NO CONTAINING BLOCKS
        position: 'fixed',
        bottom: '0px',
        left: '50%',
        marginLeft: '-187.5px', // Exact half of 375px for perfect centering
        width: '375px',
        height: '80px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 2147483647, // Maximum z-index
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 16px',
        fontFamily: 'Montserrat, sans-serif',
        
        // CRITICAL: Eliminate ALL containing block creators
        transform: 'none',
        filter: 'none',
        perspective: 'none',
        contain: 'none',
        isolation: 'auto',
        willChange: 'auto',
        backfaceVisibility: 'visible',
        transformStyle: 'flat',
        
        // Ensure no interference from any CSS properties
        clip: 'auto',
        clipPath: 'none',
        mask: 'none',
        maskImage: 'none',
        
        // Force proper stacking without creating contexts
        overflow: 'visible'
      }}
      data-fixed-navigation="true"
    >
      {navItems.map((item, index) => {
        const isActive = activeTab === item.id;
        const isTransact = item.id === 'transact';
        
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 4px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              minWidth: '0',
              flex: isTransact ? '1.2' : '1',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '10px',
              fontWeight: isActive ? '600' : '400',
              color: isActive ? '#86BE41' : '#6B7280',
              transition: 'all 0.2s ease',
              borderRadius: '8px',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {/* Icon Container */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isTransact ? '32px' : '24px',
                height: isTransact ? '32px' : '24px',
                borderRadius: '6px',
                backgroundColor: isActive ? '#86BE41' : 'transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Icon with conditional styling */}
              <div style={{
                color: isActive ? '#FFFFFF' : '#6B7280',
                transition: 'color 0.2s ease'
              }}>
                {item.icon()}
              </div>
              
              {/* Active indicator dot */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: '#86BE41',
                    border: '2px solid #FFFFFF'
                  }}
                />
              )}
            </div>
            
            {/* Label */}
            <span
              style={{
                fontSize: '10px',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#86BE41' : '#6B7280',
                textAlign: 'center',
                lineHeight: '1.2',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  // Use createPortal to render outside of any containing blocks
  return createPortal(navigationElement, document.body);
}