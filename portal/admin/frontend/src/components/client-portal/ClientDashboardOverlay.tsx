import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Activity,
  CheckCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useClientAuth } from '../../contexts/ClientAuthContext';

interface SummaryData {
  totalRuns: number;
  activeRuns: number;
  totalDisbursed: number;
  failedPayments: number;
}

interface RunRow {
  id: number;
  run_reference: string;
  rail: string;
  total_amount: string;
  total_count: number;
  status: string;
  created_at: string;
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

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  submitted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-orange-50 text-orange-700 border-orange-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
};

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ClientDashboardOverlay: React.FC = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken, user } = useClientAuth();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [summaryRes, runsRes] = await Promise.all([
        fetch('/api/v1/client-portal/summary', { headers }),
        fetch('/api/v1/client-portal/runs?limit=5', { headers }),
      ]);

      const summaryData = await summaryRes.json();
      const runsData = await runsRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (runsData.success) setRecentRuns(runsData.data.runs || []);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cards = [
    {
      label: 'Total Runs',
      value: summary?.totalRuns ?? '-',
      icon: ArrowRightLeft,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Runs',
      value: summary?.activeRuns ?? '-',
      icon: Activity,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Total Disbursed',
      value: summary ? formatZAR(summary.totalDisbursed) : '-',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Failed Payments',
      value: summary?.failedPayments ?? '-',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[var(--muted)] border-t-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Welcome back, {user?.name || 'User'}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {user?.companyName || 'Your company'} disbursement overview
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchData}
            className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>
          {(user?.role === 'maker' || user?.role === 'admin') && (
            <button
              type="button"
              onClick={() => navigate('/client/upload')}
              className="flex min-h-[36px] items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New Run
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="mymoolah-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted-foreground)]">{card.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} aria-hidden />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent runs table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Recent Runs</h3>
          <button
            type="button"
            onClick={() => navigate('/client/runs')}
            className="text-sm font-medium text-[var(--primary)] transition-colors hover:underline"
          >
            View all
          </button>
        </div>

        {recentRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="mb-3 h-10 w-10 text-[var(--muted-foreground)]/40" aria-hidden />
            <p className="text-sm text-[var(--muted-foreground)]">No disbursement runs yet</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Upload a beneficiary file to create your first run
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Reference</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Rail</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)] text-right">Amount</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)] text-right">Count</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => navigate(`/client/runs/${run.id}`)}
                    className="cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--muted)]/30"
                  >
                    <td className="px-5 py-3 font-medium text-[var(--foreground)]">
                      {run.run_reference}
                    </td>
                    <td className="px-5 py-3 uppercase text-[var(--muted-foreground)]">
                      {run.rail}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[var(--foreground)]">
                      {formatZAR(parseFloat(run.total_amount || '0'))}
                    </td>
                    <td className="px-5 py-3 text-right text-[var(--muted-foreground)]">
                      {run.total_count}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[run.status] || 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {statusLabel(run.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--muted-foreground)]">
                      {relativeTime(run.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
