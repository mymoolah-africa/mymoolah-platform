import { useLocation, useNavigate } from "react-router-dom";
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
    const activeItem = navItems.find(item => item.path === currentPath);
    return activeItem?.id || 'home';
  };

  const activeTab = getActiveTabId();

  return (
    <div 
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: '#ffffff',
        fontFamily: 'Montserrat, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 16px'
      }}
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
              transition: 'all 0.2s ease'
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
}