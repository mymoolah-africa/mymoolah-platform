/**
 * Disbursement Client Management Overlay — Admin Portal
 * Lists, creates, and manages corporate disbursement clients.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface DisbursementClient {
  id: number;
  client_code: string;
  company_name: string;
  entity_type: string;
  registration_number: string | null;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: string;
  kyb_status: string;
  ledger_account_code: string | null;
  float_limit: string | null;
  created_at: string;
}

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem('portal_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const CLIENT_STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700',
  active:    'bg-emerald-50 text-emerald-700',
  suspended: 'bg-red-50 text-red-700',
  closed:    'bg-gray-100 text-gray-500',
};

const KYB_STATUS_COLORS: Record<string, string> = {
  none:      'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  verified:  'bg-emerald-50 text-emerald-700',
  rejected:  'bg-red-50 text-red-700',
};

const ENTITY_TYPE_OPTIONS = [
  { value: 'company',          label: 'Company' },
  { value: 'sole_proprietor',  label: 'Sole Proprietor' },
  { value: 'trust',            label: 'Trust' },
  { value: 'partnership',      label: 'Partnership' },
  { value: 'npo',              label: 'NPO' },
];

const formatEntityType = (t: string) =>
  t.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const INITIAL_FORM = {
  client_code: '',
  company_name: '',
  entity_type: 'company',
  contact_email: '',
  contact_name: '',
  contact_phone: '',
  registration_number: '',
  float_limit: '',
};

export const DisbursementClientManagementOverlay: React.FC = () => {
  const navigate = useNavigate();

  const [clients, setClients] = useState<DisbursementClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const LIMIT = 20;

  const [statusFilter, setStatusFilter] = useState('');
  const [kybFilter, setKybFilter]       = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm]           = useState({ ...INITIAL_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      if (kybFilter) params.kyb_status = kybFilter;
      const res = await API.get('/disbursement-clients', { params });
      setClients(res.data.data.clients);
      setTotal(res.data.data.pagination.total);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load disbursement clients');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, kybFilter]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => { setPage(1); }, [statusFilter, kybFilter]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        client_code: form.client_code.trim(),
        company_name: form.company_name.trim(),
        entity_type: form.entity_type,
        contact_email: form.contact_email.trim(),
      };
      if (form.contact_name.trim()) payload.contact_name = form.contact_name.trim();
      if (form.contact_phone.trim()) payload.contact_phone = form.contact_phone.trim();
      if (form.registration_number.trim()) payload.registration_number = form.registration_number.trim();
      if (form.float_limit.trim()) payload.float_limit = parseFloat(form.float_limit);

      await API.post('/disbursement-clients', payload);
      setIsCreateModalOpen(false);
      setForm({ ...INITIAL_FORM });
      fetchClients();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mymoolah-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="admin-text-heading text-xl mb-1">Disbursement Clients</h2>
          <p className="admin-text-body text-gray-500 text-sm">
            Manage corporate clients for bulk disbursements.
          </p>
        </div>
        <button
          onClick={() => { setForm({ ...INITIAL_FORM }); setFormError(null); setIsCreateModalOpen(true); }}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors bg-[var(--primary)] text-[var(--primary-foreground)]"
        >
          + New Client
        </button>
      </div>

      {/* Filters */}
      <div className="mymoolah-card p-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">KYB Status</label>
          <select
            value={kybFilter}
            onChange={(e) => setKybFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200"
          >
            <option value="">All</option>
            <option value="none">None</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="mymoolah-card overflow-hidden">
        {loading && clients.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : clients.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-4xl mb-3">🏢</p>
            <p className="text-gray-500 font-medium">No disbursement clients yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create your first client to start managing bulk disbursements.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {['Client Code', 'Company Name', 'Entity Type', 'Contact Email', 'Status', 'KYB Status', 'Created', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/disbursement-clients/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 font-mono">{c.client_code}</code>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{c.company_name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatEntityType(c.entity_type)}</td>
                    <td className="px-4 py-3 text-gray-600">{c.contact_email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CLIENT_STATUS_COLORS[c.status] || CLIENT_STATUS_COLORS.pending}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${KYB_STATUS_COLORS[c.kyb_status] || KYB_STATUS_COLORS.none}`}
                      >
                        {c.kyb_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/disbursement-clients/${c.id}`); }}
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
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Create Client Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <h3 className="admin-text-heading text-lg font-semibold">Create Disbursement Client</h3>
              <p className="admin-text-body text-sm text-gray-500 mt-1">
                Register a new corporate client for bulk disbursements.
              </p>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{formError}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Code *</label>
                  <input
                    name="client_code"
                    value={form.client_code}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="e.g. ACME-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
                  <input
                    name="company_name"
                    value={form.company_name}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="Acme Holdings (Pty) Ltd"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entity Type *</label>
                  <select
                    name="entity_type"
                    value={form.entity_type}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                  >
                    {ENTITY_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Registration Number</label>
                  <input
                    name="registration_number"
                    value={form.registration_number}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="e.g. 2024/123456/07"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email *</label>
                <input
                  name="contact_email"
                  type="email"
                  value={form.contact_email}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                  placeholder="finance@acme.co.za"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name</label>
                  <input
                    name="contact_name"
                    value={form.contact_name}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact Phone</label>
                  <input
                    name="contact_phone"
                    value={form.contact_phone}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="+27 82 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Float Limit (ZAR)</label>
                <input
                  name="float_limit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.float_limit}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                  placeholder="e.g. 500000.00"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 bg-[var(--primary)] text-[var(--primary-foreground)]"
                >
                  {submitting ? 'Creating…' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
