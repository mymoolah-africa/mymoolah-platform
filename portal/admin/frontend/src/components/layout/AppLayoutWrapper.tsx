import React, { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Landmark,
  ArrowRightLeft,
  Users,
  Activity,
  Wallet,
  FileText,
  Shield,
  Settings,
  Handshake,
  Layers,
  Server,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

interface AppLayoutWrapperProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Deposits', path: '/admin/unallocated-deposits', icon: Landmark },
      { label: 'Disbursements', path: '/admin/disbursements', icon: ArrowRightLeft },
      { label: 'Settlements', path: '/admin/settlements', icon: Layers },
      { label: 'Float Management', path: '/admin/floats', icon: Wallet },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { label: 'Users & KYC', path: '/admin/users', icon: Users },
      { label: 'Transactions', path: '/admin/transactions', icon: Activity },
      { label: 'Services', path: '/admin/services', icon: Server },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { label: 'Audit Log', path: '/admin/security', icon: Shield },
      { label: 'Reports', path: '/admin/reports', icon: FileText },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Configuration', path: '/admin/system', icon: Settings },
      { label: 'Partners', path: '/admin/partners', icon: Handshake },
    ],
  },
];

const ENV_LABEL = import.meta.env.VITE_ENVIRONMENT || 'Development';

export const AppLayoutWrapper: React.FC<AppLayoutWrapperProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-60';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarWidth} flex flex-col transition-all duration-200 ease-in-out flex-shrink-0`}
        style={{ backgroundColor: '#1E293B' }}
      >
        {/* Logo + environment */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: '#00B894' }}
          >
            M
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white text-sm font-semibold truncate">MyMoolah</p>
              <span
                className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: ENV_LABEL === 'Production' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
                  color: ENV_LABEL === 'Production' ? '#fca5a5' : '#93c5fd',
                }}
              >
                {ENV_LABEL}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-medium tracking-widest text-slate-500 uppercase">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-slate-700/60 text-white font-medium'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                        }`
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <div
                              className="absolute left-0 w-[3px] h-5 rounded-r"
                              style={{ backgroundColor: '#00B894' }}
                            />
                          )}
                          <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                          {!collapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                          {!collapsed && item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/20 text-amber-400">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center py-2 border-t border-slate-700 text-slate-500 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* User section */}
        <div className="border-t border-slate-700 px-3 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: '#00B894' }}
            >
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user?.entityName || user?.email || 'Admin'}</p>
                <p className="text-[11px] text-slate-500 capitalize">{user?.role || 'admin'}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-500">System Online</span>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
