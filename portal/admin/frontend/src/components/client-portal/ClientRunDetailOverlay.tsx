import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useClientAuth } from '../../contexts/ClientAuthContext';

interface Payment {
  id: number;
  employee_ref: string | null;
  beneficiary_name: string;
  account_number: string;
  branch_code: string;
  bank_name: string | null;
  amount: string;
  reference: string | null;
  status: string;
  rejection_code: string | null;
  rejection_reason: string | null;
  processed_at: string | null;
  fee_cents: number;
  payment_rail: string;
}

interface RunDetail {
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
  maker_user_id: number;
  checker_user_id: number | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  payments: Payment[];
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
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PaymentStatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const cls = 'h-4 w-4 shrink-0';
  switch (status) {
    case 'success':
      return <CheckCircle className={`${cls} text-emerald-500`} />;
    case 'failed':
    case 'rejected':
      return <XCircle className={`${cls} text-red-500`} />;
    default:
      return <Clock className={`${cls} text-amber-500`} />;
  }
};

export const ClientRunDetailOverlay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken, user } = useClientAuth();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchRun = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`/api/v1/client-portal/runs/${id}`, { headers });
      const data = await res.json();
      if (data.success) {
        setRun(data.data);
      } else {
        setError(data.error || 'Failed to load run');
      }
    } catch (err) {
      setError('Failed to load run details');
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  const handleSubmitForApproval = async () => {
    if (!run) return;
    setSubmitting(true);
    setError('');

    const token = getToken();
    try {
      const res = await fetch(`/api/v1/client-portal/runs/${run.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        await fetchRun();
      } else {
        setError(data.error || 'Failed to submit');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadResults = async () => {
    if (!run) return;
    const token = getToken();
    try {
      const res = await fetch(`/api/v1/client-portal/runs/${run.id}/results`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setError('Failed to download results');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${run.run_reference}_results.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--muted)] border-t-[var(--primary)]" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-3 h-10 w-10 text-amber-500" />
        <p className="text-sm text-[var(--foreground)]">{error || 'Run not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/client/runs')}
          className="mt-4 text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Back to runs
        </button>
      </div>
    );
  }

  const canSubmit = run.status === 'draft' && (user?.role === 'maker' || user?.role === 'admin');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/client/runs')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
            aria-label="Back to runs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{run.run_reference}</h2>
            <span
              className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                STATUS_STYLES[run.status] || 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {statusLabel(run.status)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchRun}
            className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>

          {canSubmit && (
            <button
              type="button"
              onClick={handleSubmitForApproval}
              disabled={submitting}
              className="flex min-h-[36px] items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}

          {run.payments && run.payments.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadResults}
              className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
          {error}
        </div>
      )}

      {/* Run info cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Total Amount</p>
          <p className="mt-1 text-lg font-bold text-[var(--foreground)]">
            {formatZAR(parseFloat(run.total_amount || '0'))}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Payments</p>
          <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{run.total_count}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Rail</p>
          <p className="mt-1 text-lg font-bold uppercase text-[var(--foreground)]">{run.rail}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Created</p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{formatDate(run.created_at)}</p>
        </div>
      </div>

      {/* Progress bar */}
      {run.total_count > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--foreground)]">Payment Progress</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Success: {run.success_count}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Failed: {run.failed_count}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Pending: {run.pending_count}
              </span>
            </div>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-[var(--muted)]">
            {run.success_count > 0 && (
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(run.success_count / run.total_count) * 100}%` }}
              />
            )}
            {run.failed_count > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(run.failed_count / run.total_count) * 100}%` }}
              />
            )}
            {run.pending_count > 0 && (
              <div
                className="bg-amber-400 transition-all"
                style={{ width: `${(run.pending_count / run.total_count) * 100}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Payments table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Payments ({run.payments?.length || 0})
          </h3>
        </div>

        {(!run.payments || run.payments.length === 0) ? (
          <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
            No payments in this run
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Beneficiary</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Account</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Bank</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)] text-right">Amount</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Reference</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Rail</th>
                  <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Rejection</th>
                </tr>
              </thead>
              <tbody>
                {run.payments.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <PaymentStatusIcon status={p.status} />
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[p.status] || 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}
                        >
                          {statusLabel(p.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--foreground)]">{p.beneficiary_name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                      {p.account_number}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--muted-foreground)]">
                      {p.bank_name || p.branch_code}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[var(--foreground)]">
                      {formatZAR(parseFloat(p.amount || '0'))}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--muted-foreground)]">
                      {p.reference || '-'}
                    </td>
                    <td className="px-5 py-3 text-xs uppercase text-[var(--muted-foreground)]">
                      {p.payment_rail}
                    </td>
                    <td className="max-w-[200px] px-5 py-3 text-xs text-red-600">
                      {p.rejection_reason ? (
                        <span title={p.rejection_reason}>
                          {p.rejection_code ? `[${p.rejection_code}] ` : ''}
                          {p.rejection_reason.length > 50
                            ? p.rejection_reason.substring(0, 50) + '...'
                            : p.rejection_reason}
                        </span>
                      ) : (
                        '-'
                      )}
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
