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
  const cls = 'w-4 h-4';
  switch (type) {
    case 'warning': return <AlertTriangle className={`${cls} text-amber-500`} />;
    case 'error': return <XCircle className={`${cls} text-red-500`} />;
    case 'success': return <CheckCircle className={`${cls} text-emerald-500`} />;
    default: return <Info className={`${cls} text-blue-500`} />;
  }
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');

    const token = sessionStorage.getItem('portal_token');
    if (!token) { navigate('/admin/login', { replace: true }); return; }

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
  }, [navigate]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={() => fetchDashboard()} className="text-sm text-emerald-600 hover:underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const { systemMetrics, dualRoleEntities, settlementSummary, recentAlerts } = data;
  const uptimeHours = Math.floor(systemMetrics.uptime / 3600);
  const uptimeStr = uptimeHours >= 24 ? `${Math.floor(uptimeHours / 24)}d ${uptimeHours % 24}h` : `${uptimeHours}h`;

  const kpis = [
    {
      label: 'Active Users',
      value: systemMetrics.totalPortalUsers.toLocaleString(),
      icon: Users,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Dual-Role Entities',
      value: systemMetrics.dualRoleEntitiesCount.toLocaleString(),
      icon: Layers,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Activity (24h)',
      value: systemMetrics.recentActivity.toLocaleString(),
      icon: Activity,
      accent: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Uptime',
      value: uptimeStr,
      icon: Clock,
      accent: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Treasury Platform overview</p>
        </div>
        <button
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{kpi.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.accent}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Two-column: Settlements + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settlement summary */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Settlements</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
              {settlementSummary.pendingSettlements} pending
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total pending</span>
              <span className="text-sm font-medium text-gray-900">{formatZAR(settlementSummary.totalSettlementAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Auto-settlement</span>
              <span className="text-sm font-medium text-gray-900">{settlementSummary.autoSettlementEnabled} entities</span>
            </div>
            {settlementSummary.nextSettlementAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Next settlement</span>
                <span className="text-sm text-gray-700">{new Date(settlementSummary.nextSettlementAt).toLocaleDateString('en-ZA')}</span>
              </div>
            )}

            {settlementSummary.settlementBreakdown.length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {settlementSummary.settlementBreakdown.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate max-w-[60%]">{s.entityName}</span>
                    <div className="flex items-center gap-1">
                      {s.direction === 'payout'
                        ? <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                      <span className="font-medium text-gray-900">{formatZAR(s.settlementAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Alerts</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentAlerts.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No active alerts</p>
            ) : (
              recentAlerts.slice(0, 6).map((alert, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className="mt-0.5"><AlertIcon type={alert.type} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{alert.message}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">{relativeTime(alert.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dual-role entities table */}
      {dualRoleEntities.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Dual-Role Entities</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Role</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Supplier</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Merchant</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Net</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dualRoleEntities.map((entity) => (
                  <tr key={entity.entityId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{entity.entityName}</p>
                      <p className="text-xs text-gray-400">{entity.entityId}</p>
                    </td>
                    <td className="px-5 py-3 capitalize text-gray-600">{entity.primaryRole}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{formatZAR(entity.supplierBalance)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{formatZAR(entity.merchantBalance)}</td>
                    <td className={`px-5 py-3 text-right font-medium ${entity.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatZAR(entity.netBalance)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${entity.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        <span className="capitalize text-gray-600">{entity.status}</span>
                        {entity.requiresSettlement && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
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
