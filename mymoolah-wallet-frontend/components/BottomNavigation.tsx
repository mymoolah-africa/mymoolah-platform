import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { 
  Home, 
  Send, 
  Receipt, 
  Gift, 
  User
} from "lucide-react";

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: () => JSX.Element;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    path: '/dashboard',
    label: 'Home',
    icon: () => <Home style={{ width: '20px', height: '20px' }} />
  },
  {
    id: 'send',
    path: '/send-money',
    label: 'Send Money',
    icon: () => <Send style={{ width: '20px', height: '20px' }} />
  },
  {
    id: 'transact',
    path: '/transact',
    label: 'Transact',
    icon: () => <Receipt style={{ width: '28px', height: '28px' }} />
  },
  {
    id: 'vouchers',
    path: '/vouchers',
    label: 'Vouchers',
    icon: () => <Gift style={{ width: '20px', height: '20px' }} />
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
  const showBottomNav = ['/dashboard', '/send-money', '/transact', '/vouchers', '/profile', '/transactions'].includes(location.pathname);
  
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
        transform: 'none !important',
        filter: 'none !important',
        perspective: 'none !important',
        contain: 'none !important',
        isolation: 'auto !important',
        willChange: 'auto !important',
        backfaceVisibility: 'visible !important',
        transformStyle: 'flat !important',
        
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