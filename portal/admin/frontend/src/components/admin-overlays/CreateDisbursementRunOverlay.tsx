/**
 * Create Disbursement Run Overlay — Admin Portal
 * Maker uploads a CSV or enters beneficiaries manually, then submits for approval.
 *
 * CSV format (header row required):
 *   employee_ref, name, account_number, branch_code, bank_name, amount, reference
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('portal_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface BeneficiaryRow {
  employeeRef?:   string;
  name:           string;
  accountNumber:  string;
  branchCode:     string;
  bankName?:      string;
  amount:         string;
  reference?:     string;
}

const EMPTY_ROW: BeneficiaryRow = { name: '', accountNumber: '', branchCode: '', amount: '' };

function parseCSV(text: string): BeneficiaryRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const idx = (keys: string[]) => keys.map((k) => header.indexOf(k)).find((i) => i >= 0) ?? -1;

  const nameIdx    = idx(['name', 'beneficiary_name', 'employee_name']);
  const accIdx     = idx(['account_number', 'account', 'acc_no', 'acc_number']);
  const branchIdx  = idx(['branch_code', 'branch', 'branch_no']);
  const amountIdx  = idx(['amount', 'salary', 'wage', 'net_pay']);
  const refIdx     = idx(['reference', 'ref', 'narrative']);
  const empIdx     = idx(['employee_ref', 'employee_id', 'emp_id', 'emp_ref']);
  const bankIdx    = idx(['bank_name', 'bank']);

  if (nameIdx < 0 || accIdx < 0 || branchIdx < 0 || amountIdx < 0) {
    throw new Error('CSV must have columns: name, account_number, branch_code, amount');
  }

  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const amount = parseFloat(cols[amountIdx]);
    if (isNaN(amount) || amount <= 0) throw new Error(`Row ${i + 2}: invalid amount "${cols[amountIdx]}"`);
    return {
      employeeRef:   empIdx >= 0  ? cols[empIdx]    : undefined,
      name:          cols[nameIdx],
      accountNumber: cols[accIdx],
      branchCode:    cols[branchIdx],
      bankName:      bankIdx >= 0 ? cols[bankIdx]   : undefined,
      amount:        amount.toFixed(2),
      reference:     refIdx >= 0  ? cols[refIdx]    : undefined,
    };
  });
}

export const CreateDisbursementRunOverlay: React.FC = () => {
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [mode,       setMode]       = useState<'csv' | 'manual'>('csv');
  const [rail,       setRail]       = useState<'eft' | 'rtc'>('eft');
  const [payPeriod,  setPayPeriod]  = useState(new Date().toISOString().slice(0, 7));
  const [email,      setEmail]      = useState('');
  const [webhook,    setWebhook]    = useState('');

  const [rows,       setRows]       = useState<BeneficiaryRow[]>([{ ...EMPTY_ROW }]);
  const [csvError,   setCsvError]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const totalAmount = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target?.result as string);
        setRows(parsed);
      } catch (err: any) {
        setCsvError(err.message);
        setRows([]);
      }
    };
    reader.readAsText(file);
  }, []);

  const updateRow = (i: number, field: keyof BeneficiaryRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const addRow    = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (rows.length === 0) { setError('Add at least one beneficiary'); return; }
    for (const r of rows) {
      if (!r.name || !r.accountNumber || !r.branchCode || !r.amount) {
        setError('All beneficiaries must have name, account number, branch code, and amount'); return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const channels: Record<string, string> = {};
      if (email.trim())   channels.email   = email.trim();
      if (webhook.trim()) channels.webhook = webhook.trim();

      const res = await API.post('/disbursements', {
        rail,
        payPeriod,
        beneficiaries:        rows,
        notificationChannels: Object.keys(channels).length ? channels : undefined,
      });

      // Submit for approval immediately
      const runId = res.data.data.run.id;
      await API.post(`/disbursements/${runId}/submit`);

      navigate(`/admin/disbursements/${runId}`, { state: { justCreated: true } });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create disbursement run');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mymoolah-card p-6 flex items-center gap-4">
        <button onClick={() => navigate('/admin/disbursements')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          ← Back
        </button>
        <div>
          <h2 className="admin-text-heading text-xl mb-0.5">New Disbursement Run</h2>
          <p className="admin-text-body text-gray-500 text-sm">Upload a CSV or enter beneficiaries manually</p>
        </div>
      </div>

      {/* Run settings */}
      <div className="mymoolah-card p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Run Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pay Period</label>
            <input type="month" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Rail</label>
            <select value={rail} onChange={(e) => setRail(e.target.value as 'eft' | 'rtc')}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none">
              <option value="eft">EFT — Next Business Day (cheaper)</option>
              <option value="rtc">RTC — Real-Time Clearing (faster, higher cost)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Results Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@company.co.za"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Results Webhook URL <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="url" value={webhook} onChange={(e) => setWebhook(e.target.value)}
            placeholder="https://your-system.com/webhooks/disbursement-results"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none" />
        </div>
      </div>

      {/* Beneficiary input mode toggle */}
      <div className="mymoolah-card p-6">
        <div className="flex gap-3 mb-5">
          {['csv', 'manual'].map((m) => (
            <button key={m} onClick={() => setMode(m as 'csv' | 'manual')}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize"
              style={mode === m ? { background: '#1a3c5e', color: '#fff' } : { background: '#f0f0f0', color: '#555' }}>
              {m === 'csv' ? '📄 Upload CSV' : '✏️ Manual Entry'}
            </button>
          ))}
        </div>

        {mode === 'csv' && (
          <div>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <p className="text-4xl mb-2">📁</p>
              <p className="font-medium text-gray-700">Click to upload CSV</p>
              <p className="text-sm text-gray-400 mt-1">
                Required columns: <code>name, account_number, branch_code, amount</code>
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Optional: employee_ref, bank_name, reference
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleCSVUpload} className="hidden" />
            {csvError && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">⚠ {csvError}</p>}
            {rows.length > 0 && !csvError && (
              <p className="mt-3 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                ✓ {rows.length} beneficiaries loaded — total {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalAmount)}
              </p>
            )}

            {/* Download CSV template */}
            <button
              className="mt-3 text-xs text-blue-600 hover:underline"
              onClick={() => {
                const csv = 'employee_ref,name,account_number,branch_code,bank_name,amount,reference\nEMP001,Jane Smith,1234567890,051001,Standard Bank,15000.00,SALARY MAR 2026';
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                a.download = 'disbursement_template.csv';
                a.click();
              }}
            >
              ⬇ Download CSV Template
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="text-left bg-gray-50 border-b border-gray-100">
                    {['Emp Ref', 'Name *', 'Account No *', 'Branch Code *', 'Bank', 'Amount (R) *', 'Reference', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row, i) => (
                    <tr key={i}>
                      {(['employeeRef', 'name', 'accountNumber', 'branchCode', 'bankName', 'amount', 'reference'] as (keyof BeneficiaryRow)[]).map((field) => (
                        <td key={field} className="px-1 py-1">
                          <input
                            type={field === 'amount' ? 'number' : 'text'}
                            value={row[field] || ''}
                            onChange={(e) => updateRow(i, field, e.target.value)}
                            placeholder={field === 'amount' ? '0.00' : field === 'branchCode' ? '6 digits' : ''}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-300 outline-none"
                            style={{ minWidth: field === 'name' ? '140px' : '80px' }}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1">
                        <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 px-2 text-base">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addRow}
              className="text-sm text-blue-600 hover:underline">+ Add row</button>
          </div>
        )}
      </div>

      {/* Summary + submit */}
      <div className="mymoolah-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {rows.length} beneficiar{rows.length === 1 ? 'y' : 'ies'} ·{' '}
              <strong>Total: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalAmount)}</strong>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Rail: {rail.toUpperCase()} · Pay period: {payPeriod}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/admin/disbursements')}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || rows.length === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ background: '#1a3c5e' }}
            >
              {submitting ? 'Creating…' : 'Create & Submit for Approval'}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">⚠ {error}</p>}
        <p className="text-xs text-gray-400 mt-3">
          ⚠ A second authorised user (checker) must approve this run before it is sent to SBSA.
        </p>
      </div>
    </div>
  );
};
