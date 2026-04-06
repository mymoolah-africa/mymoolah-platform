import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Layers,
  Activity,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardData {
  systemMetrics: {
    totalPortalUsers: number;
    dualRoleEntitiesCount: number;
    entitiesByType: Record<string, number>;
    recentActivity: number;
    systemHealth: string;
    uptime: number;
  };
  dualRoleEntities: {
    entityId: string;
    entityName: string;
    primaryRole: string;
    supplierBalance: number;
    merchantBalance: number;
    netBalance: number;
    status: string;
    requiresSettlement: boolean;
  }[];
  settlementSummary: {
    pendingSettlements: number;
    totalSettlementAmount: number;
    nextSettlementAt: string | null;
    autoSettlementEnabled: number;
    settlementBreakdown: {
      entityName: string;
      settlementAmount: number;
      direction: string;
    }[];
  };
  recentAlerts: {
    type: string;
    category: string;
    title: string;
    message: string;
    timestamp: string;
  }[];
  performanceAnalytics: {
    totalActiveUsers: number;
    dualRoleEntities: number;
    entityDistribution: { type: string; count: number }[];
  };
}

const formatZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(n);

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const AlertIcon: React.FC<{ type: string }> = ({ type }) => {
  const cls = 'h-4 w-4 shrink-0';
  switch (type) {
    case 'warning':
      return <AlertTriangle className={`${cls} text-amber-500`} />;
    case 'error':
      return <XCircle className={`${cls} text-red-500`} />;
    case 'success':
      return <CheckCircle className={`${cls} text-emerald-500`} />;
    default:
      return <Info className={`${cls} text-blue-500`} />;
  }
};

function alertLeftBorderClass(type: string): string {
  switch (type) {
    case 'warning':
      return 'border-l-amber-500';
    case 'error':
      return 'border-l-red-500';
    case 'success':
      return 'border-l-emerald-500';
    default:
      return 'border-l-blue-500';
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-[var(--muted)]" />
          <div className="h-4 w-48 animate-pulse rounded-md bg-[var(--muted)]" />
        </div>
        <div className="h-9 w-24 shrink-0 animate-pulse rounded-lg bg-[var(--muted)]" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--muted)] bg-[var(--card)] p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-[var(--muted)]" />
              <div className="h-10 w-10 rounded-xl bg-[var(--muted)]" />
            </div>
            <div className="h-8 w-20 rounded-md bg-[var(--muted)]" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="animate-pulse overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div className="h-5 w-40 rounded bg-[var(--muted)]" />
            <div className="h-6 w-20 rounded-full bg-[var(--muted)]" />
          </div>
          <div className="space-y-4 p-5">
            <div className="h-4 w-full rounded bg-[var(--muted)]" />
            <div className="h-4 w-5/6 rounded bg-[var(--muted)]" />
            <div className="h-4 w-4/6 rounded bg-[var(--muted)]" />
            <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex justify-between gap-4">
                  <div className="h-4 flex-1 rounded bg-[var(--muted)]" />
                  <div className="h-4 w-24 rounded bg-[var(--muted)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="animate-pulse overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <div className="h-5 w-36 rounded bg-[var(--muted)]" />
          </div>
          <div className="divide-y divide-[var(--border)] p-2">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="flex gap-3 px-3 py-3">
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-[var(--muted)]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-[var(--muted)]" />
                  <div className="h-3 w-full rounded bg-[var(--muted)]" />
                </div>
                <div className="h-3 w-12 shrink-0 rounded bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const token = sessionStorage.getItem('portal_token');
      if (!token) {
        navigate('/admin/login', { replace: true });
        return;
      }

      try {
        const res = await fetch('/api/v1/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          sessionStorage.removeItem('portal_token');
          sessionStorage.removeItem('portal_user');
          navigate('/admin/login', { replace: true });
          return;
        }

        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load dashboard');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border-2 border-red-500 bg-[var(--card)] p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-7 w-7 text-red-600" aria-hidden />
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">{error}</p>
            <button
              type="button"
              onClick={() => fetchDashboard()}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { systemMetrics, dualRoleEntities, settlementSummary, recentAlerts } = data;
  const uptimeHours = Math.floor(systemMetrics.uptime / 3600);
  const uptimeStr = uptimeHours >= 24 ? `${Math.floor(uptimeHours / 24)}d ${uptimeHours % 24}h` : `${uptimeHours}h`;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName =
    user?.entityName?.trim() ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'there';
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const kpis = [
    {
      label: 'Active Users',
      value: systemMetrics.totalPortalUsers.toLocaleString(),
      icon: Users,
      border: 'border-l-emerald-500',
      iconBg: 'bg-emerald-500/15 text-emerald-600',
    },
    {
      label: 'Dual-Role Entities',
      value: systemMetrics.dualRoleEntitiesCount.toLocaleString(),
      icon: Layers,
      border: 'border-l-blue-500',
      iconBg: 'bg-blue-500/15 text-blue-600',
    },
    {
      label: 'Activity (24h)',
      value: systemMetrics.recentActivity.toLocaleString(),
      icon: Activity,
      border: 'border-l-violet-500',
      iconBg: 'bg-violet-500/15 text-violet-600',
    },
    {
      label: 'Uptime',
      value: uptimeStr,
      icon: Clock,
      border: 'border-l-amber-500',
      iconBg: 'bg-amber-500/15 text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {greeting}, {displayName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{todayFormatted}</p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Finance control room
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          aria-label="Refresh dashboard data"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)]/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border border-[var(--border)] border-l-4 ${kpi.border} bg-[var(--card)] p-5 shadow-sm transition-shadow hover:shadow-md`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--muted-foreground)]">{kpi.label}</span>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.iconBg}`}
              >
                <kpi.icon className="h-5 w-5" aria-hidden />
              </div>
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-[var(--foreground)]">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Layers className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Settlements</h2>
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {settlementSummary.pendingSettlements} pending
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/settlements')}
              className="text-sm font-medium text-[var(--primary)] transition hover:underline"
            >
              View All
            </button>
          </div>
          <div className="p-5">
            <div className="space-y-3 border-b border-[var(--border)] pb-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-[var(--muted-foreground)]">Total pending</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-[var(--foreground)]">
                  {formatZAR(settlementSummary.totalSettlementAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-[var(--muted-foreground)]">Auto-settlement</span>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  <span className="font-mono tabular-nums">{settlementSummary.autoSettlementEnabled}</span>{' '}
                  entities
                </span>
              </div>
              {settlementSummary.nextSettlementAt && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--muted-foreground)]">Next settlement</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {new Date(settlementSummary.nextSettlementAt).toLocaleDateString('en-ZA')}
                  </span>
                </div>
              )}
            </div>

            {settlementSummary.settlementBreakdown.length > 0 && (
              <ul className="mt-4 divide-y divide-[var(--border)]">
                {settlementSummary.settlementBreakdown.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">
                      {s.entityName}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {s.direction === 'payout' ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" aria-hidden />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" aria-hidden />
                      )}
                      <span className="font-mono text-sm font-semibold tabular-nums text-[var(--foreground)]">
                        {formatZAR(s.settlementAmount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Recent Alerts</h2>
          </div>
          <div className="p-3">
            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-500/80" aria-hidden />
                <p className="text-sm font-medium text-[var(--muted-foreground)]">No active alerts</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentAlerts.slice(0, 6).map((alert, i) => (
                  <li
                    key={i}
                    className={`flex gap-3 rounded-lg border border-[var(--border)] border-l-4 ${alertLeftBorderClass(alert.type)} bg-[var(--card)] px-3 py-3 shadow-sm`}
                  >
                    <div className="mt-0.5">
                      <AlertIcon type={alert.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{alert.title}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{alert.message}</p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-[var(--muted-foreground)]">
                      {relativeTime(alert.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {dualRoleEntities.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
            <Landmark className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden />
            <h2 className="text-base font-semibold text-[var(--foreground)]">Dual-Role Entities</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--muted)] text-left shadow-sm">
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Entity
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Primary Role
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Supplier
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Merchant
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Net
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {dualRoleEntities.map((entity, rowIdx) => (
                  <tr
                    key={entity.entityId}
                    className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50 ${rowIdx % 2 === 1 ? 'bg-[var(--muted)]/30' : ''}`}
                  >
                    <td className="px-5 py-3 align-middle">
                      <p className="font-semibold text-[var(--foreground)]">{entity.entityName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{entity.entityId}</p>
                    </td>
                    <td className="px-5 py-3 capitalize text-[var(--foreground)]">{entity.primaryRole}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-[var(--foreground)]">
                      {formatZAR(entity.supplierBalance)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-[var(--foreground)]">
                      {formatZAR(entity.merchantBalance)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono text-sm font-semibold tabular-nums ${entity.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {formatZAR(entity.netBalance)}
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 shrink-0 rounded-full ${entity.status === 'active' ? 'bg-emerald-500' : 'bg-[var(--muted-foreground)]'}`}
                          aria-hidden
                        />
                        <span className="capitalize text-[var(--foreground)]">{entity.status}</span>
                        {entity.requiresSettlement && (
                          <span className="inline-flex rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Due
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
