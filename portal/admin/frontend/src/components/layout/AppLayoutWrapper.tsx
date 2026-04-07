import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoIcon from '../../assets/logo-icon.png';
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
  Briefcase,
  Layers,
  Server,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  ChevronDown,
} from 'lucide-react';

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
    items: [{ label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard }],
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
      { label: 'Partners', path: '/admin/partners', icon: Briefcase },
    ],
  },
];

const ENV_LABEL = import.meta.env.VITE_ENVIRONMENT || 'Development';
const IS_PRODUCTION_ENV = ENV_LABEL === 'Production';

/** Longer / more specific paths first */
const ROUTE_TITLE_RULES: { test: (pathname: string) => boolean; title: string }[] = [
  { test: (p) => p.startsWith('/admin/unallocated-deposits'), title: 'Unallocated Deposits' },
  { test: (p) => p.startsWith('/admin/disbursements'), title: 'Disbursements' },
  { test: (p) => p.startsWith('/admin/settlements'), title: 'Settlement Management' },
  { test: (p) => p.startsWith('/admin/floats'), title: 'Float Management' },
  { test: (p) => p.startsWith('/admin/users'), title: 'Users & KYC' },
  { test: (p) => p.startsWith('/admin/transactions'), title: 'Transaction Monitoring' },
  { test: (p) => p.startsWith('/admin/services'), title: 'Service Management' },
  { test: (p) => p.startsWith('/admin/security'), title: 'Audit Log' },
  { test: (p) => p.startsWith('/admin/reports'), title: 'Reports & Analytics' },
  { test: (p) => p.startsWith('/admin/system'), title: 'System Configuration' },
  { test: (p) => p.startsWith('/admin/partners'), title: 'Partner Onboarding' },
  { test: (p) => p.startsWith('/admin/dashboard'), title: 'Dashboard' },
];

function getPageTitle(pathname: string): string {
  for (const rule of ROUTE_TITLE_RULES) {
    if (rule.test(pathname)) return rule.title;
  }
  return 'Admin Portal';
}

export const AppLayoutWrapper: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  const displayName = user?.entityName || user?.email || 'Admin';
  const displayRole = user?.role || 'admin';
  const initialLetter =
    (user?.entityName?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <aside
        className={`flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] transition-[width] duration-200 ease-in-out ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo + environment */}
        <div
          className={`flex min-h-[44px] items-center gap-3 border-b border-[var(--sidebar-border)] py-4 ${
            collapsed ? 'justify-center px-2' : 'px-4'
          }`}
        >
          <img src={logoIcon} alt="MyMoolah" className="h-9 w-9 flex-shrink-0 rounded-lg" />
          <div
            className={`min-w-0 flex-1 overflow-hidden transition-opacity duration-200 ${
              collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <p className="truncate text-sm font-semibold text-white">MyMoolah</p>
            <span
              className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                IS_PRODUCTION_ENV
                  ? 'animate-pulse bg-red-500/20 text-red-300'
                  : 'bg-blue-500/20 text-blue-200'
              }`}
            >
              {ENV_LABEL}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p
                className={`mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-[var(--muted-foreground)] transition-opacity duration-200 ${
                  collapsed ? 'pointer-events-none h-0 overflow-hidden opacity-0' : 'opacity-100'
                }`}
              >
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path} className="relative">
                      <NavLink
                        to={item.path}
                        end={item.path === '/admin/dashboard'}
                        title={collapsed ? item.label : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          [
                            'flex min-h-[44px] items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                            collapsed ? 'justify-center' : '',
                            isActive
                              ? 'bg-[var(--sidebar-accent)] font-medium text-white'
                              : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]',
                          ].join(' ')
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span
                                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[var(--sidebar-primary)]"
                                aria-hidden
                              />
                            )}
                            <Icon className="h-[18px] w-[18px] flex-shrink-0" aria-hidden />
                            <span
                              className={`truncate transition-opacity duration-200 ${
                                collapsed ? 'pointer-events-none w-0 opacity-0' : 'opacity-100'
                              }`}
                            >
                              {item.label}
                            </span>
                            {!collapsed &&
                              item.badge !== undefined &&
                              item.badge > 0 && (
                                <span className="ml-auto inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-400">
                                  {item.badge}
                                </span>
                              )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse toggle — between nav and user */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex min-h-[44px] w-full items-center justify-center border-t border-[var(--sidebar-border)] text-[var(--sidebar-foreground)] transition-colors hover:bg-[var(--sidebar-accent)] hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4 flex-shrink-0" aria-hidden />
          )}
        </button>

        {/* User section */}
        <div className="border-t border-[var(--sidebar-border)] px-2 py-3">
          <div className={`flex min-h-[44px] items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-xs font-semibold text-[var(--sidebar-primary-foreground)]"
              aria-hidden
            >
              {initialLetter}
            </div>
            <div
              className={`min-w-0 flex-1 overflow-hidden transition-opacity duration-200 ${
                collapsed ? 'pointer-events-none w-0 opacity-0' : 'opacity-100'
              }`}
            >
              <p className="truncate text-sm text-white">{displayName}</p>
              <p className="truncate text-[11px] capitalize text-[var(--muted-foreground)]">
                {displayRole}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-foreground)] transition-colors hover:bg-[var(--sidebar-accent)] hover:text-red-400"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--border)] bg-white px-4 sm:px-6">
          <h1 className="truncate text-base font-semibold text-[var(--foreground)]">{pageTitle}</h1>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Search"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <Search className="h-[18px] w-[18px]" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <Bell className="h-[18px] w-[18px]" aria-hidden />
            </button>

            <div className="hidden h-6 w-px bg-[var(--border)] sm:block" aria-hidden />

            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--success-color)]"
                aria-hidden
              />
              <span className="text-xs text-[var(--muted-foreground)]">System Online</span>
            </div>

            <div
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 pl-1 pr-2 shadow-sm"
              role="group"
              aria-label="Signed-in user"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-xs font-semibold text-[var(--sidebar-primary-foreground)]">
                {initialLetter}
              </div>
              <div className="hidden min-w-0 max-w-[140px] text-left lg:block">
                <p className="truncate text-xs font-medium text-[var(--foreground)]">{displayName}</p>
                <p className="truncate text-[10px] capitalize text-[var(--muted-foreground)]">
                  {displayRole}
                </p>
              </div>
              <ChevronDown
                className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]"
                aria-hidden
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
