import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { APP_CONFIG } from "../config/app-config";
import { 
  Home, 
  Send, 
  Receipt, 
  Ticket, 
  User,
  Wifi,
  Zap,
  CreditCard,
  Download
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

// Service mapping for quick access services
const serviceMapping = {
  send_money: {
    id: 'send_money',
    path: '/send-money',
    label: 'Send Money',
    icon: () => <Send style={{ width: '20px', height: '20px' }} />
  },
  request_money: {
    id: 'request_money',
    path: '/request-money',
    label: 'Request Money',
    icon: () => <Download style={{ width: '20px', height: '20px' }} />
  },
  airtime_data: {
    id: 'airtime_data',
    path: '/airtime-data',
    label: 'Airtime & Data',
    icon: () => <Wifi style={{ width: '20px', height: '20px' }} />
  },
  electricity: {
    id: 'electricity',
    path: '/electricity',
    label: 'Electricity',
    icon: () => <Zap style={{ width: '20px', height: '20px' }} />
  },
  bill_payments: {
    id: 'bill_payments',
    path: '/bill-payments',
    label: 'Bill Payments',
    icon: () => <CreditCard style={{ width: '20px', height: '20px' }} />
  },
  vouchers: {
    id: 'vouchers',
    path: '/vouchers',
    label: 'Vouchers',
    icon: () => <Ticket style={{ width: '20px', height: '20px' }} />
  }
};

// Default navigation items (positions 1, 3, 5)
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
    id: 'profile',
    path: '/profile',
    label: 'Profile',
    icon: () => <User style={{ width: '20px', height: '20px' }} />
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
        const { getToken } = await import('../utils/authToken');
        const token = localStorage.getItem('token') || getToken();
        if (!token) {
          console.log('No authentication token found, using default services');
          setQuickAccessServices(['send_money', 'airtime_data']);
          setLoading(false);
          return;
        }

        // Only fetch settings if we're on a page that shows bottom navigation
        const currentPath = location.pathname;
        const shouldShowNav = ['/dashboard', '/send-money', '/transact', '/vouchers', '/profile', '/transactions', '/wallet-settings', '/request-money', '/airtime-data', '/electricity', '/bill-payments'].includes(currentPath);
        
        if (!shouldShowNav) {
          console.log('Not on a page that shows bottom navigation, using default services');
          setQuickAccessServices(['send_money', 'airtime_data']);
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
            console.log('No quick access services found, using defaults');
            setQuickAccessServices(['send_money', 'airtime_data']);
          }
        } else if (response.status === 403) {
          console.log('Access forbidden (user not logged in), using default services');
          setQuickAccessServices(['send_money', 'airtime_data']);
        } else if (response.status === 401) {
          console.log('Unauthorized (invalid token), using default services');
          setQuickAccessServices(['send_money', 'airtime_data']);
        } else {
          console.log(`API error ${response.status}, using default services`);
          setQuickAccessServices(['send_money', 'airtime_data']);
        }
      } catch (error) {
        console.error('Failed to fetch user settings:', error);
        // Fallback to default services
        setQuickAccessServices(['send_money', 'airtime_data']);
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
        serviceMapping.send_money, // Default Send Money
        defaultNavItems[1], // Transact
        serviceMapping.airtime_data, // Default Airtime & Data
        defaultNavItems[2] // Profile
      ];
    }

    // Get the first two selected services (max 2 allowed)
    const selectedServices = quickAccessServices.slice(0, 2);
    
    // Ensure we have exactly 2 services, fallback to defaults if needed
    const service1 = selectedServices[0] && serviceMapping[selectedServices[0] as keyof typeof serviceMapping] 
      ? serviceMapping[selectedServices[0] as keyof typeof serviceMapping] 
      : serviceMapping.send_money;
    
    const service2 = selectedServices[1] && serviceMapping[selectedServices[1] as keyof typeof serviceMapping] 
      ? serviceMapping[selectedServices[1] as keyof typeof serviceMapping] 
      : serviceMapping.airtime_data;

    return [
      defaultNavItems[0], // Home (position 1)
      service1, // First selected service (position 2)
      defaultNavItems[1], // Transact (position 3)
      service2, // Second selected service (position 4)
      defaultNavItems[2] // Profile (position 5)
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
  const showBottomNav = ['/dashboard', '/send-money', '/transact', '/vouchers', '/profile', '/transactions', '/wallet-settings', '/request-money', '/airtime-data', '/electricity', '/bill-payments'].includes(location.pathname);
  
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
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const IconComponent = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
              minWidth: '60px',
              padding: '8px',
              backgroundColor: isActive ? '#f3f4f6' : 'transparent',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              fontWeight: 'var(--font-weight-normal)',
              transition: 'all 0.2s ease',
              position: 'relative',
              
              // Ensure buttons don't create containing blocks
              transform: 'none',
              filter: 'none',
              willChange: 'auto'
            }}
            aria-label={item.label}
          >
            <div 
              style={{ 
                marginBottom: '4px',
                color: isActive 
                  ? item.id === 'home' || item.id === 'transact'
                    ? '#86BE41' 
                    : '#2D8CCA'
                  : '#6b7280'
              }}
            >
              <IconComponent />
            </div>
            <span 
              style={{ 
                fontSize: '12px',
                fontWeight: isActive ? '500' : '400',
                color: isActive 
                  ? item.id === 'home' || item.id === 'transact'
                    ? '#86BE41' 
                    : '#2D8CCA'
                  : '#6b7280',
                fontFamily: 'Montserrat, sans-serif',
                lineHeight: '1.2',
                textAlign: 'center'
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return createPortal(navigationElement, document.body);
}