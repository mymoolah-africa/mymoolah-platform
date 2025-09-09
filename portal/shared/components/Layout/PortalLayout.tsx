import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Store, 
  UserCheck, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  ChevronDown
} from 'lucide-react';

interface PortalLayoutProps {
  children: React.ReactNode;
  portalType: 'admin' | 'supplier' | 'client' | 'merchant' | 'reseller';
  user: {
    id: string;
    entityName: string;
    entityType: string;
    role: string;
    hasDualRole?: boolean;
    dualRoles?: string[];
  };
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: number;
  children?: NavigationItem[];
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children, portalType, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Portal-specific navigation items
  const getNavigationItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: `/${portalType}/dashboard`
      }
    ];

    switch (portalType) {
      case 'admin':
        return [
          ...baseItems,
          {
            id: 'entities',
            label: 'Entities',
            icon: Users,
            path: `/${portalType}/entities`,
            children: [
              { id: 'suppliers', label: 'Suppliers', icon: Building2, path: `/${portalType}/entities/suppliers` },
              { id: 'clients', label: 'Clients', icon: Users, path: `/${portalType}/entities/clients` },
              { id: 'merchants', label: 'Merchants', icon: Store, path: `/${portalType}/entities/merchants` },
              { id: 'resellers', label: 'Resellers', icon: UserCheck, path: `/${portalType}/entities/resellers` }
            ]
          },
          {
            id: 'dual-roles',
            label: 'Dual-Role Entities',
            icon: Building2,
            path: `/${portalType}/dual-roles`,
            badge: 12
          },
          {
            id: 'settlements',
            label: 'Settlements',
            icon: Settings,
            path: `/${portalType}/settlements`
          },
          {
            id: 'analytics',
            label: 'Analytics',
            icon: LayoutDashboard,
            path: `/${portalType}/analytics`
          },
          {
            id: 'settings',
            label: 'System Settings',
            icon: Settings,
            path: `/${portalType}/settings`
          }
        ];

      case 'supplier':
        return [
          ...baseItems,
          {
            id: 'products',
            label: 'Product Catalog',
            icon: Store,
            path: `/${portalType}/products`
          },
          {
            id: 'transactions',
            label: 'Transactions',
            icon: LayoutDashboard,
            path: `/${portalType}/transactions`
          },
          ...(user.hasDualRole ? [{
            id: 'merchant-role',
            label: 'Merchant Operations',
            icon: Store,
            path: `/${portalType}/merchant`,
            badge: 5
          }] : []),
          {
            id: 'settlements',
            label: 'Settlements',
            icon: Settings,
            path: `/${portalType}/settlements`
          },
          {
            id: 'analytics',
            label: 'Analytics',
            icon: LayoutDashboard,
            path: `/${portalType}/analytics`
          }
        ];

      case 'client':
        return [
          ...baseItems,
          {
            id: 'employees',
            label: 'Employee Management',
            icon: Users,
            path: `/${portalType}/employees`
          },
          {
            id: 'usage',
            label: 'Usage Analytics',
            icon: LayoutDashboard,
            path: `/${portalType}/usage`
          },
          {
            id: 'services',
            label: 'Service Configuration',
            icon: Settings,
            path: `/${portalType}/services`
          },
          {
            id: 'reports',
            label: 'Reports',
            icon: LayoutDashboard,
            path: `/${portalType}/reports`
          }
        ];

      case 'merchant':
        return [
          ...baseItems,
          {
            id: 'sales',
            label: 'Sales Monitoring',
            icon: Store,
            path: `/${portalType}/sales`
          },
          {
            id: 'payments',
            label: 'Payment Processing',
            icon: LayoutDashboard,
            path: `/${portalType}/payments`
          },
          {
            id: 'commissions',
            label: 'Commissions',
            icon: Settings,
            path: `/${portalType}/commissions`
          },
          {
            id: 'customers',
            label: 'Customer Management',
            icon: Users,
            path: `/${portalType}/customers`
          }
        ];

      case 'reseller':
        return [
          ...baseItems,
          {
            id: 'clients',
            label: 'Client Portfolio',
            icon: Users,
            path: `/${portalType}/clients`
          },
          {
            id: 'performance',
            label: 'Performance Tracking',
            icon: LayoutDashboard,
            path: `/${portalType}/performance`
          },
          {
            id: 'commissions',
            label: 'Commissions',
            icon: Settings,
            path: `/${portalType}/commissions`
          },
          {
            id: 'growth',
            label: 'Growth Analytics',
            icon: LayoutDashboard,
            path: `/${portalType}/growth`
          }
        ];

      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  // Get portal-specific colors
  const getPortalColors = () => {
    switch (portalType) {
      case 'admin':
        return {
          primary: 'var(--portal-admin)',
          gradient: 'linear-gradient(135deg, var(--portal-admin) 0%, #a855f7 100%)',
          text: 'text-portal-admin'
        };
      case 'supplier':
        return {
          primary: 'var(--portal-supplier)',
          gradient: 'linear-gradient(135deg, var(--portal-supplier) 0%, #10b981 100%)',
          text: 'text-portal-supplier'
        };
      case 'client':
        return {
          primary: 'var(--portal-client)',
          gradient: 'linear-gradient(135deg, var(--portal-client) 0%, #3b82f6 100%)',
          text: 'text-portal-client'
        };
      case 'merchant':
        return {
          primary: 'var(--portal-merchant)',
          gradient: 'linear-gradient(135deg, var(--portal-merchant) 0%, #ef4444 100%)',
          text: 'text-portal-merchant'
        };
      case 'reseller':
        return {
          primary: 'var(--portal-reseller)',
          gradient: 'linear-gradient(135deg, var(--portal-reseller) 0%, #f97316 100%)',
          text: 'text-portal-reseller'
        };
      default:
        return {
          primary: 'var(--mymoolah-green)',
          gradient: 'linear-gradient(135deg, var(--mymoolah-green) 0%, var(--mymoolah-blue) 100%)',
          text: 'text-mymoolah-green'
        };
    }
  };

  const portalColors = getPortalColors();

  // Set active item based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const activeItem = navigationItems.find(item => 
      currentPath.startsWith(item.path) || 
      (item.children && item.children.some(child => currentPath.startsWith(child.path)))
    );
    setActiveItem(activeItem?.id || '');
  }, [location.pathname, navigationItems]);

  const handleLogout = () => {
    // Clear portal session
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
    navigate(`/${portalType}/login`);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isActive = activeItem === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const Icon = item.icon;

    return (
      <div key={item.id}>
        <button
          onClick={() => !hasChildren && handleNavigation(item.path)}
          className={`
            w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-200
            ${level === 0 ? 'font-medium' : 'font-normal text-sm'}
            ${isActive 
              ? 'bg-white text-gray-900 shadow-sm border-r-2' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
            ${level > 0 ? 'pl-8' : ''}
          `}
          style={{
            borderRightColor: isActive ? portalColors.primary : 'transparent'
          }}
        >
          <div className="flex items-center gap-3">
            <Icon size={18} />
            <span>{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {item.badge && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </button>
        
        {hasChildren && isActive && (
          <div className="bg-gray-50">
            {item.children?.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <aside className="portal-sidebar">
        <div className="h-full flex flex-col">
          {/* Logo/Brand */}
          <div 
            className="p-6 border-b border-gray-200"
            style={{ background: portalColors.gradient }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color: portalColors.primary }}>
                  MM
                </span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">MyMoolah</h1>
                <p className="text-white/80 text-sm capitalize">{portalType} Portal</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {user.entityName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.entityName}</p>
                <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                {user.hasDualRole && (
                  <p className="text-xs text-blue-600">
                    Dual-Role: {user.dualRoles?.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto">
            <div className="py-2">
              {navigationItems.map(item => renderNavigationItem(item))}
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header className="portal-header">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900 capitalize">
              {portalType} Portal
            </h2>
            {user.hasDualRole && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Dual-Role
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.entityName}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium text-sm">
                {user.entityName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="portal-main">
        {children}
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Mobile Logo/Brand */}
          <div 
            className="p-6 border-b border-gray-200"
            style={{ background: portalColors.gradient }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color: portalColors.primary }}>
                  MM
                </span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">MyMoolah</h1>
                <p className="text-white/80 text-sm capitalize">{portalType} Portal</p>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 overflow-y-auto">
            <div className="py-2">
              {navigationItems.map(item => renderNavigationItem(item))}
            </div>
          </nav>

          {/* Mobile Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalLayout;
