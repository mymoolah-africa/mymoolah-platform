import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import logoIcon from '../../assets/logo-icon.png';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Upload,
  LogOut,
  ChevronDown,
  User,
  Building2,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard },
  { label: 'Disbursement Runs', path: '/client/runs', icon: ArrowRightLeft },
  { label: 'Upload Beneficiaries', path: '/client/upload', icon: Upload },
];

const ROUTE_TITLES: { test: (p: string) => boolean; title: string }[] = [
  { test: (p) => p.startsWith('/client/upload'), title: 'Upload Beneficiaries' },
  { test: (p) => /^\/client\/runs\/\d+/.test(p), title: 'Run Detail' },
  { test: (p) => p.startsWith('/client/runs'), title: 'Disbursement Runs' },
  { test: (p) => p.startsWith('/client/dashboard'), title: 'Dashboard' },
];

function getPageTitle(pathname: string): string {
  for (const rule of ROUTE_TITLES) {
    if (rule.test(pathname)) return rule.title;
  }
  return 'Client Portal';
}

export const ClientPortalLayout: React.FC = () => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  const displayName = user?.name || user?.email || 'User';
  const companyName = user?.companyName || 'Client Portal';
  const displayRole = user?.role || 'viewer';
  const initialLetter = (user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/client/login', { replace: true });
  };

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
      setUserMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, handleClickOutside]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)]">
      {/* Top navigation bar */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--border)] bg-white px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="MyMoolah" className="h-8 w-8 flex-shrink-0 rounded-lg" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">{companyName}</p>
            </div>
          </div>

          <div className="hidden h-6 w-px bg-[var(--border)] md:block" aria-hidden />

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/client/dashboard'}
                  className={({ isActive }) =>
                    [
                      'flex min-h-[36px] items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-[var(--primary)]/10 font-medium text-[var(--primary)]'
                        : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="hidden rounded-full border border-[var(--border)] bg-[var(--muted)]/50 px-2.5 py-1 text-[11px] font-medium capitalize text-[var(--muted-foreground)] sm:inline-flex">
            {displayRole}
          </span>

          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 pl-1 pr-2 shadow-sm transition-colors hover:bg-[var(--muted)]"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]">
                {initialLetter}
              </div>
              <span className="hidden max-w-[120px] truncate text-xs font-medium text-[var(--foreground)] lg:block">
                {displayName}
              </span>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
                role="menu"
              >
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">{displayName}</p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">{user?.email}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <Building2 className="h-3 w-3" aria-hidden />
                    {companyName}
                  </p>
                </div>
                <div className="border-t border-[var(--border)]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--border)] bg-white py-2 md:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/client/dashboard'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px]',
                  isActive
                    ? 'font-medium text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)]',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-[var(--muted-foreground)]"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          <span>Sign out</span>
        </button>
      </nav>

      {/* Page title bar */}
      <div className="flex h-12 flex-shrink-0 items-center border-b border-[var(--border)] bg-[var(--card)] px-4 sm:px-6">
        <h1 className="truncate text-base font-semibold text-[var(--foreground)]">{pageTitle}</h1>
      </div>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 md:pb-6">
        <Outlet />
      </main>
    </div>
  );
};
