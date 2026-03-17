/**
 * Disbursement Run Detail Overlay — Admin Portal
 * Shows full run info: approve/reject (checker), per-payment status table,
 * and resubmit-failed action.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('portal_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface Payment {
  id:               number;
  employee_ref:     string | null;
  beneficiary_name: string;
  account_number:   string;
  branch_code:      string;
  bank_name:        string | null;
  amount:           string;
  reference:        string | null;
  status:           string;
  rejection_code:   string | null;
  rejection_reason: string | null;
  processed_at:     string | null;
}

interface Run {
  id:               number;
  run_reference:    string;
  rail:             string;
  pay_period:       string;
  total_amount:     string;
  total_count:      number;
  success_count:    number;
  failed_count:     number;
  pending_count:    number;
  status:           string;
  maker_user_id:    number;
  checker_user_id:  number | null;
  submitted_at:     string | null;
  completed_at:     string | null;
  created_at:       string;
  payments:         Payment[];
  metadata:         Record<string, any> | null;
}

const STATUS_BADGE: Record<string, React.CSSProperties> = {
  pending:    { background: '#fff3cd', color: '#856404' },
  accepted:   { background: '#d4edda', color: '#155724' },
  rejected:   { background: '#f8d7da', color: '#721c24' },
  resubmitted:{ background: '#cce5ff', color: '#004085' },
  cancelled:  { background: '#e2e3e5', color: '#383d41' },
};

const RUN_STATUS_BADGE: Record<string, React.CSSProperties> = {
  draft:            { background: '#f0f0f0', color: '#555' },
  pending_approval: { background: '#fff3cd', color: '#856404' },
  submitted:        { background: '#d1ecf1', color: '#0c5460' },
  processing:       { background: '#d1ecf1', color: '#0c5460' },
  completed:        { background: '#d4edda', color: '#155724' },
  partial:          { background: '#fff3cd', color: '#856404' },
  failed:           { background: '#f8d7da', color: '#721c24' },
};

export const DisbursementRunDetailOverlay: React.FC = () => {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const [run,      setRun]      = useState<Run | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Action state
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);
  const [acting,       setActing]       = useState(false);
  const [actionMsg,    setActionMsg]    = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Resubmit — per-failed-payment correction
  const [corrections, setCorrections] = useState<Record<number, { account?: string; branch?: string }>>({});

  const fetchRun = useCallback(async () => {
    try {
      const res = await API.get(`/disbursements/${id}`);
      setRun(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load run');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  const doAction = async (action: 'approve' | 'reject' | 'resubmit') => {
    if (!run) return;
    setActing(true);
    setActionMsg(null);
    try {
      if (action === 'approve') {
        await API.post(`/disbursements/${run.id}/approve`);
        setActionMsg({ type: 'success', text: 'Run approved and submitted to SBSA.' });
      } else if (action === 'reject') {
        await API.post(`/disbursements/${run.id}/reject`, { reason: rejectReason });
        setActionMsg({ type: 'success', text: 'Run rejected and returned to maker.' });
        setShowReject(false);
      } else if (action === 'resubmit') {
        const corrList = Object.entries(corrections).map(([paymentId, fix]) => ({
          paymentId: parseInt(paymentId, 10),
          correctedAccountNumber: fix.account,
          correctedBranchCode:    fix.branch,
        })).filter((c) => c.correctedAccountNumber || c.correctedBranchCode);
        const res = await API.post(`/disbursements/${run.id}/resubmit-failed`, { corrections: corrList });
        setActionMsg({ type: 'success', text: `Resubmission run created: ${res.data.data.run.run_reference}` });
      }
      await fetchRun();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.error || 'Action failed' });
    } finally {
      setActing(false);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const fmtAmt = (a: string) =>
    `R ${parseFloat(a).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredPayments = run?.payments.filter((p) =>
    statusFilter === 'all' ? true : p.status === statusFilter
  ) || [];

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (error)   return <div className="p-6 text-red-600 bg-red-50 rounded-xl">⚠ {error}</div>;
  if (!run)    return null;

  const isPendingApproval = run.status === 'pending_approval';
  const canResubmit = ['partial', 'failed'].includes(run.status) && run.failed_count > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="mymoolah-card p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <button onClick={() => navigate('/admin/disbursements')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 self-start">← Back</button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="admin-text-heading text-xl">{run.run_reference}</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                style={RUN_STATUS_BADGE[run.status] || RUN_STATUS_BADGE.draft}>
                {run.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span>Rail: <strong className="text-gray-700 uppercase">{run.rail}</strong></span>
              <span>Pay Period: <strong className="text-gray-700">{run.pay_period || '—'}</strong></span>
              <span>Created: {fmt(run.created_at)}</span>
              {run.submitted_at && <span>Submitted: {fmt(run.submitted_at)}</span>}
              {run.completed_at && <span>Completed: {fmt(run.completed_at)}</span>}
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Total',     val: fmtAmt(run.total_amount),     color: '#1a3c5e' },
              { label: 'Payments',  val: String(run.total_count),       color: '#555' },
              { label: '✓ Success', val: String(run.success_count),     color: '#27ae60' },
              { label: '✗ Failed',  val: String(run.failed_count),      color: run.failed_count > 0 ? '#c0392b' : '#aaa' },
            ].map((k) => (
              <div key={k.label} className="text-center bg-gray-50 rounded-xl px-4 py-2 min-w-[80px]">
                <p className="text-xs text-gray-400 mb-0.5">{k.label}</p>
                <p className="font-bold text-sm" style={{ color: k.color }}>{k.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action banner */}
      {actionMsg && (
        <div className={`rounded-xl p-4 text-sm font-medium ${actionMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {actionMsg.type === 'success' ? '✓' : '⚠'} {actionMsg.text}
        </div>
      )}

      {/* Checker actions */}
      {isPendingApproval && (
        <div className="mymoolah-card p-5 border-2 border-amber-300 bg-amber-50">
          <h3 className="font-semibold text-amber-800 mb-1">Awaiting Checker Approval</h3>
          <p className="text-sm text-amber-700 mb-4">
            Review the payment details below. Once approved, a Pain.001 file will be submitted to SBSA immediately.
            You cannot approve runs you created (4-eyes principle).
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => doAction('approve')}
              disabled={acting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#27ae60' }}
            >
              {acting ? 'Approving…' : '✓ Approve & Submit to SBSA'}
            </button>
            <button
              onClick={() => setShowReject(!showReject)}
              disabled={acting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              ✗ Reject
            </button>
          </div>
          {showReject && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-amber-800 mb-1">Rejection Reason</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why the run is being rejected…"
                className="w-full border border-amber-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                rows={2} />
              <button
                onClick={() => doAction('reject')}
                disabled={acting}
                className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resubmit failed */}
      {canResubmit && (
        <div className="mymoolah-card p-5 border-2 border-red-200 bg-red-50">
          <h3 className="font-semibold text-red-800 mb-1">{run.failed_count} Failed Payments</h3>
          <p className="text-sm text-red-700 mb-3">
            Correct account details below (optional) then resubmit failed payments as a new run.
          </p>
          <button
            onClick={() => doAction('resubmit')}
            disabled={acting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#c0392b' }}
          >
            {acting ? 'Creating…' : '↺ Resubmit Failed Payments'}
          </button>
        </div>
      )}

      {/* Payment table */}
      <div className="mymoolah-card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-gray-600 mr-2">Filter:</span>
          {['all', 'pending', 'accepted', 'rejected'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
              style={statusFilter === s ? { background: '#1a3c5e', color: '#fff' } : { background: '#f0f0f0', color: '#555' }}>
              {s}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">{filteredPayments.length} rows</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {['Emp Ref', 'Name', 'Bank Account', 'Amount', 'Reference', 'Status', 'Rejection Reason'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
                {canResubmit && <th className="px-4 py-3 text-xs font-semibold text-gray-500">Correct Account</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No payments match this filter</td></tr>
              ) : filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{p.employee_ref || '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{p.beneficiary_name}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-600">
                    {p.account_number} / {p.branch_code}
                    {p.bank_name && <span className="ml-1 text-gray-400">({p.bank_name})</span>}
                  </td>
                  <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{fmtAmt(p.amount)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{p.reference || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={STATUS_BADGE[p.status] || {}}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-red-600">
                    {p.rejection_code ? (
                      <span title={p.rejection_reason || ''}>
                        <strong>{p.rejection_code}</strong>: {p.rejection_reason}
                      </span>
                    ) : '—'}
                  </td>
                  {canResubmit && (
                    <td className="px-4 py-2.5">
                      {p.status === 'rejected' && (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="New account"
                            value={corrections[p.id]?.account || ''}
                            onChange={(e) => setCorrections((prev) => ({ ...prev, [p.id]: { ...prev[p.id], account: e.target.value } }))}
                            className="border border-gray-200 rounded px-2 py-1 text-xs w-28 font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Branch"
                            value={corrections[p.id]?.branch || ''}
                            onChange={(e) => setCorrections((prev) => ({ ...prev, [p.id]: { ...prev[p.id], branch: e.target.value } }))}
                            className="border border-gray-200 rounded px-2 py-1 text-xs w-20 font-mono"
                          />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
