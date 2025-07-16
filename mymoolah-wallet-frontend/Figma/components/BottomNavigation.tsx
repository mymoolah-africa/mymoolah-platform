import { Icons } from "./Icons";
import { useLocation, useNavigate } from "react-router-dom";

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: () => JSX.Element;
  isDynamic?: boolean;
  isLarger?: boolean;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    path: '/dashboard',
    label: 'Home',
    icon: Icons.Home,
    isDynamic: false
  },
  {
    id: 'send',
    path: '/send-money',
    label: 'Send Money',
    icon: Icons.Send,
    isDynamic: true // Can be changed on Transact page
  },
  {
    id: 'transact',
    path: '/transact',
    label: 'Transact',
    icon: Icons.Transact,
    isDynamic: false,
    isLarger: true // Larger icon
  },
  {
    id: 'vouchers',
    path: '/vouchers',
    label: 'Vouchers',
    icon: Icons.Vouchers,
    isDynamic: true // Can be changed on Transact page
  },
  {
    id: 'profile',
    path: '/profile',
    label: 'Profile',
    icon: Icons.User,
    isDynamic: false
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

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-gray-50">
      <nav className="w-full max-w-sm bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center justify-center py-2 px-2 min-w-[65px] rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 active:scale-95 ${
                  isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                } ${item.isLarger ? 'py-1' : ''}`}
                aria-label={item.label}
              >
                <div 
                  className={`transition-colors ${item.isLarger ? 'mb-0' : 'mb-1'} ${
                    isActive 
                      ? item.id === 'home' || item.id === 'transact'
                        ? 'text-[#86BE41]' 
                        : 'text-[#2D8CCA]'
                      : 'text-gray-500'
                  }`}
                >
                  <IconComponent />
                </div>
                <span 
                  className={`text-xs font-medium transition-colors leading-tight text-center ${
                    isActive 
                      ? item.id === 'home' || item.id === 'transact'
                        ? 'text-[#86BE41]' 
                        : 'text-[#2D8CCA]'
                      : 'text-gray-500'
                  }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}