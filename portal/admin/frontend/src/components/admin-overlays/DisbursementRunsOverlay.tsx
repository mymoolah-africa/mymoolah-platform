/**
 * Disbursement Runs Overlay — Admin Portal
 * Lists all disbursement runs and navigates to create/detail screens.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface DisbursementRun {
  id:             number;
  run_reference:  string;
  rail:           string;
  pay_period:     string;
  total_amount:   string;
  total_count:    number;
  success_count:  number;
  failed_count:   number;
  pending_count:  number;
  status:         string;
  created_at:     string;
  submitted_at:   string | null;
  completed_at:   string | null;
}

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('portal_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const STATUS_COLORS: Record<string, React.CSSProperties> = {
  draft:            { background: '#f0f0f0', color: '#555' },
  pending_approval: { background: '#fff3cd', color: '#856404' },
  approved:         { background: '#cce5ff', color: '#004085' },
  submitted:        { background: '#d1ecf1', color: '#0c5460' },
  processing:       { background: '#d1ecf1', color: '#0c5460' },
  completed:        { background: '#d4edda', color: '#155724' },
  partial:          { background: '#fff3cd', color: '#856404' },
  failed:           { background: '#f8d7da', color: '#721c24' },
  cancelled:        { background: '#e2e3e5', color: '#383d41' },
};

export const DisbursementRunsOverlay: React.FC = () => {
  const navigate = useNavigate();
  const [runs,    setRuns]    = useState<DisbursementRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const LIMIT = 20;

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/disbursements', { params: { page, limit: LIMIT } });
      setRuns(res.data.data.runs);
      setTotal(res.data.data.pagination.total);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load disbursement runs');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const fmtAmount = (a: string) =>
    `R ${parseFloat(a).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mymoolah-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="admin-text-heading text-xl mb-1">Disbursement Runs</h2>
          <p className="admin-text-body text-gray-500 text-sm">
            Bulk wage &amp; salary disbursements via SBSA H2H.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/disbursements/create')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ background: '#86BE41' }}
        >
          + New Disbursement Run
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">⚠ {error}</div>
      )}

      {/* Table */}
      <div className="mymoolah-card overflow-hidden">
        {loading && runs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : runs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-4xl mb-3">💼</p>
            <p className="text-gray-500 font-medium">No disbursement runs yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first run to disburse wages or salaries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {['Run Reference', 'Pay Period', 'Rail', 'Total', 'Payments', 'Status', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/disbursements/${r.id}`)}>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 font-mono">{r.run_reference}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.pay_period || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="uppercase text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{r.rail}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{fmtAmount(r.total_amount)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-green-600 font-medium">{r.success_count}✓</span>
                      {r.failed_count > 0 && <span className="text-red-500 font-medium ml-1">{r.failed_count}✗</span>}
                      {r.pending_count > 0 && <span className="text-gray-400 ml-1">{r.pending_count}…</span>}
                      <span className="text-gray-400 ml-1">/ {r.total_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={STATUS_COLORS[r.status] || STATUS_COLORS.draft}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/disbursements/${r.id}`); }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * LIMIT >= total}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
};
