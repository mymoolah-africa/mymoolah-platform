/**
 * Unallocated Deposits Overlay
 *
 * Lists deposits that arrived at the MyMoolah SBSA treasury account but could
 * not be automatically matched to a wallet (wrong/missing payment reference).
 * Ops staff can manually allocate each deposit by entering the correct
 * mobile number of the intended recipient.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

// ---- Types ------------------------------------------------------------------
interface UnallocatedDeposit {
  id:                 number;
  transactionId:      string;
  referenceNumber:    string;
  amount:             string;
  currency:           string;
  status:             'pending' | 'completed';
  webhookReceivedAt:  string;
  processedAt:        string | null;
  notes:              string | null;
}

interface Pagination {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

interface Summary {
  totalPendingAmount: string;
  currency:           string;
}

type StatusFilter = 'pending' | 'completed' | 'all';

// ---- API helpers ------------------------------------------------------------
const API = axios.create({ baseURL: '/api/v1/admin' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('portal_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Component --------------------------------------------------------------
export const UnallocatedDepositsOverlay: React.FC = () => {
  const [deposits,      setDeposits]      = useState<UnallocatedDeposit[]>([]);
  const [pagination,    setPagination]    = useState<Pagination | null>(null);
  const [summary,       setSummary]       = useState<Summary | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [page,          setPage]          = useState(1);
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('pending');

  // Allocate modal state
  const [allocating,    setAllocating]    = useState<UnallocatedDeposit | null>(null);
  const [mobileInput,   setMobileInput]   = useState('');
  const [notesInput,    setNotesInput]    = useState('');
  const [allocLoading,  setAllocLoading]  = useState(false);
  const [allocError,    setAllocError]    = useState<string | null>(null);
  const [allocSuccess,  setAllocSuccess]  = useState<string | null>(null);

  const fetchDeposits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/unallocated-deposits', {
        params: { page, limit: 20, status: statusFilter },
      });
      setDeposits(res.data.data.deposits);
      setPagination(res.data.data.pagination);
      setSummary(res.data.data.summary);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load unallocated deposits');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

  const openAllocate = (deposit: UnallocatedDeposit) => {
    setAllocating(deposit);
    setMobileInput('');
    setNotesInput('');
    setAllocError(null);
    setAllocSuccess(null);
  };

  const closeAllocate = () => {
    setAllocating(null);
    setAllocError(null);
    setAllocSuccess(null);
  };

  const handleAllocate = async () => {
    if (!allocating) return;
    setAllocLoading(true);
    setAllocError(null);
    try {
      const res = await API.post(`/unallocated-deposits/${allocating.id}/allocate`, {
        mobileNumber: mobileInput.trim(),
        notes: notesInput.trim() || undefined,
      });
      setAllocSuccess(res.data.message);
      // Refresh list after 1.5 s so user sees the success banner before modal closes
      setTimeout(() => {
        closeAllocate();
        fetchDeposits();
      }, 1800);
    } catch (err: any) {
      setAllocError(err?.response?.data?.error || 'Allocation failed — please verify the mobile number and try again.');
    } finally {
      setAllocLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatAmount = (amount: string, currency: string) =>
    `${currency} ${parseFloat(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mymoolah-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="admin-text-heading text-xl mb-1">Unallocated Deposits</h2>
            <p className="admin-text-body text-gray-500 text-sm">
              Deposits that arrived with an unrecognised payment reference. Manually
              match each deposit to the correct wallet.
            </p>
          </div>
          {summary && (
            <div
              className="rounded-xl px-5 py-3 text-right flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)' }}
            >
              <p className="text-xs text-red-100 font-medium uppercase tracking-wide">
                Pending Amount
              </p>
              <p className="text-2xl font-bold text-white">
                R {parseFloat(summary.totalPendingAmount).toLocaleString('en-ZA', {
                  minimumFractionDigits: 2, maximumFractionDigits: 2,
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="mymoolah-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Show:</span>
          {(['pending', 'completed', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize"
              style={statusFilter === s
                ? { background: '#1a3c5e', color: '#fff' }
                : { background: '#f0f0f0', color: '#555' }}
            >
              {s}
            </button>
          ))}
          <button
            onClick={fetchDeposits}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            {loading ? '⟳ Loading…' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="mymoolah-card overflow-hidden">
        {loading && deposits.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : deposits.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-5xl mb-3">✓</div>
            <p className="text-gray-500 font-medium">
              {statusFilter === 'pending' ? 'No unallocated deposits — all clear!' : 'No deposits found for this filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {['Date Received', 'Transaction ID', 'Ref Used (Wrong)', 'Amount', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(dep.webhookReceivedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 font-mono">
                        {dep.transactionId}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block max-w-[200px] truncate font-mono text-xs bg-red-50 text-red-700 border border-red-100 rounded px-2 py-0.5"
                        title={dep.referenceNumber}
                      >
                        {dep.referenceNumber || <em className="text-gray-400">none</em>}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {formatAmount(dep.amount, dep.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={dep.status === 'pending'
                          ? { background: '#fff3cd', color: '#856404' }
                          : { background: '#d4edda', color: '#155724' }}
                      >
                        {dep.status === 'pending' ? '⏳ Pending' : '✓ Resolved'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dep.status === 'pending' ? (
                        <button
                          onClick={() => openAllocate(dep)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                          style={{ background: '#86BE41' }}
                        >
                          Allocate →
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {dep.processedAt ? formatDate(dep.processedAt) : 'Resolved'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Allocate Modal ──────────────────────────────────────────────── */}
      {allocating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Allocate Deposit</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter the correct mobile number (wallet account) for this deposit.
            </p>

            {/* Deposit summary */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-gray-900">
                  {formatAmount(allocating.amount, allocating.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Original Ref</span>
                <span className="font-mono text-red-600 text-xs">
                  {allocating.referenceNumber || <em>none</em>}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-mono text-xs text-gray-600">{allocating.transactionId}</span>
              </div>
            </div>

            {/* Mobile number input */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correct Mobile Number (wallet owner)
            </label>
            <input
              type="tel"
              value={mobileInput}
              onChange={(e) => { setMobileInput(e.target.value); setAllocError(null); }}
              placeholder="e.g. 0821234567 or +27821234567"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-300 outline-none mb-3"
              maxLength={15}
            />

            {/* Notes */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason / Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="e.g. Customer called in — used ID number as reference by mistake"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none mb-4 resize-none"
              rows={2}
              maxLength={500}
            />

            {allocError  && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-3">⚠ {allocError}</div>}
            {allocSuccess && <div className="text-sm text-green-700 bg-green-50 rounded-lg p-3 mb-3">✓ {allocSuccess}</div>}

            <div className="flex gap-3">
              <button
                onClick={closeAllocate}
                disabled={allocLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAllocate}
                disabled={allocLoading || !mobileInput.trim() || !!allocSuccess}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: '#1a3c5e' }}
              >
                {allocLoading ? 'Allocating…' : 'Confirm Allocation'}
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center">
              This action is irreversible and will be logged in the audit trail.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
