import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Filter,
} from 'lucide-react';
import { useClientAuth } from '../../contexts/ClientAuthContext';

interface RunRow {
  id: number;
  run_reference: string;
  rail: string;
  pay_period: string | null;
  total_amount: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  status: string;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const formatZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(n);

const formatDate = (iso: string | null) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'partial', label: 'Partial' },
  { value: 'failed', label: 'Failed' },
];

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ClientRunsOverlay: React.FC = () => {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { getToken } = useClientAuth();
  const navigate = useNavigate();

  const fetchRuns = useCallback(async (page = 1) => {
    setLoading(true);
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);

    try {
      const res = await fetch(`/api/v1/client-portal/runs?${params}`, { headers });
      const data = await res.json();
      if (data.success) {
        setRuns(data.data.runs || []);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken, statusFilter]);

  useEffect(() => {
    fetchRuns(1);
  }, [fetchRuns]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchRuns(newPage);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[36px] rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => fetchRuns(pagination.page)}
          className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-[var(--muted)] border-t-[var(--primary)]" />
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="mb-3 h-10 w-10 text-[var(--muted-foreground)]/40" aria-hidden />
            <p className="text-sm text-[var(--muted-foreground)]">No runs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Reference</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Rail</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Period</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)] text-right">Amount</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)] text-center">OK / Fail / Pend</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Created</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
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
                    <td className="px-5 py-3 text-[var(--muted-foreground)]">
                      {run.pay_period || '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[var(--foreground)]">
                      {formatZAR(parseFloat(run.total_amount || '0'))}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono text-xs">
                        <span className="text-emerald-600">{run.success_count}</span>
                        {' / '}
                        <span className="text-red-600">{run.failed_count}</span>
                        {' / '}
                        <span className="text-amber-600">{run.pending_count}</span>
                      </span>
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
                      {formatDate(run.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} runs)
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
