/**
 * Disbursement Client Detail Overlay — Admin Portal
 * Shows client overview, KYB documents, and fee configuration
 * for a single disbursement client.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem('portal_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

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
  api_key: string | null;
  white_label_slug: string | null;
  created_at: string;
  updated_at: string;
}

interface KybDocument {
  id: number;
  document_type: string;
  entity_type: string;
  file_url: string;
  status: string;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface ClientFee {
  id: number;
  rail: string;
  fee_type: string;
  flat_fee_cents: number;
  percentage_fee: string;
  min_fee_cents: number;
  max_fee_cents: number | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

interface NotificationPreference {
  id: number;
  channel: string;
  event_type: string;
  enabled: boolean;
}

interface ClientUser {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

/* ---------- Status badge color maps ---------- */

const CLIENT_STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700',
  active:    'bg-emerald-50 text-emerald-700',
  suspended: 'bg-red-50 text-red-700',
  closed:    'bg-gray-100 text-gray-500',
};

const KYB_STATUS_BADGE: Record<string, string> = {
  none:      'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  verified:  'bg-emerald-50 text-emerald-700',
  rejected:  'bg-red-50 text-red-700',
};

const DOC_STATUS_BADGE: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  verified:   'bg-emerald-50 text-emerald-700',
  rejected:   'bg-red-50 text-red-700',
  expired:    'bg-gray-100 text-gray-500',
};

/* ---------- Display helpers ---------- */

const ENTITY_TYPE_LABELS: Record<string, string> = {
  sole_proprietor: 'Sole Proprietor',
  company: 'Company',
  close_corporation: 'Close Corporation',
  trust: 'Trust',
  npo: 'NPO',
  partnership: 'Partnership',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  cor15: 'COR15',
  cor14: 'COR14',
  id_document: 'ID Document',
  proof_of_address: 'Proof of Address',
  tax_clearance: 'Tax Clearance',
  bank_confirmation: 'Bank Confirmation',
  trust_deed: 'Trust Deed',
  founding_statement: 'Founding Statement',
  resolution: 'Resolution',
  shareholder_register: 'Shareholder Register',
};

const formatEntityType = (et: string) => ENTITY_TYPE_LABELS[et] || et.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const formatDocType = (dt: string) => DOC_TYPE_LABELS[dt] || dt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const fmtCents = (cents: number) => `R ${(cents / 100).toFixed(2)}`;
const fmtPct = (pct: string) => `${(parseFloat(pct) * 100).toFixed(2)}%`;

const RAILS = ['EFT', 'PayShap', 'Wallet'] as const;
const FEE_TYPES = ['Flat', 'Percentage', 'Flat+Percentage'] as const;

const NOTIFICATION_EVENT_TYPES = [
  'run_submitted', 'run_approved', 'run_rejected', 'run_completed',
  'payment_failed', 'float_low', 'float_credited', 'kyb_status_changed',
] as const;

const NOTIFICATION_CHANNELS = ['webhook', 'email'] as const;

const formatEventType = (et: string) => et.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const DisbursementClientDetailOverlay: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<DisbursementClient | null>(null);
  const [fees, setFees] = useState<ClientFee[]>([]);
  const [documents, setDocuments] = useState<KybDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  /* Edit mode state */
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DisbursementClient>>({});
  const [saving, setSaving] = useState(false);

  /* KYB document upload state */
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  /* Fee form state */
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeForm, setFeeForm] = useState({
    rail: 'EFT',
    fee_type: 'Flat',
    flat_fee_cents: '',
    percentage_fee: '',
    min_fee_cents: '',
    max_fee_cents: '',
  });
  const [addingFee, setAddingFee] = useState(false);

  /* Notification preferences state */
  const [notifications, setNotifications] = useState<NotificationPreference[]>([]);
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifForm, setNotifForm] = useState({ event_type: NOTIFICATION_EVENT_TYPES[0] as string, channel: 'webhook' as string });
  const [addingNotif, setAddingNotif] = useState(false);

  /* Client users state */
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', name: '', role: 'viewer', password: '' });
  const [addingUser, setAddingUser] = useState(false);

  /* Action messages */
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ---------- Data fetching ---------- */

  const fetchClient = useCallback(async () => {
    try {
      const res = await API.get(`/disbursement-clients/${clientId}`);
      const data = res.data.data;
      const { fees, kybDocumentSummary, notificationPreferences, users, ...clientData } = data;
      setClient(clientData as DisbursementClient);
      setFees(fees || []);
      setDocuments(kybDocumentSummary || []);
      setNotifications(notificationPreferences || []);
      setClientUsers(users || []);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(err?.response?.data?.error || 'Failed to load client');
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  /* ---------- Client edit ---------- */

  const startEdit = () => {
    if (!client) return;
    setEditForm({
      company_name: client.company_name,
      entity_type: client.entity_type,
      registration_number: client.registration_number || '',
      contact_name: client.contact_name || '',
      contact_email: client.contact_email,
      contact_phone: client.contact_phone || '',
      status: client.status,
      float_limit: client.float_limit || '',
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditForm({});
  };

  const saveEdit = async () => {
    setSaving(true);
    setActionMsg(null);
    try {
      await API.patch(`/disbursement-clients/${clientId}`, editForm);
      setActionMsg({ type: 'success', text: 'Client updated successfully.' });
      setEditMode(false);
      await fetchClient();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to update client' });
    } finally {
      setSaving(false);
    }
  };

  /* ---------- KYB document actions ---------- */

  const reviewDocument = async (docId: number, action: 'verified' | 'rejected') => {
    setActionMsg(null);
    try {
      await API.patch(`/disbursement-clients/${clientId}/kyb-documents/${docId}`, { status: action });
      setActionMsg({ type: 'success', text: `Document ${action}.` });
      await fetchClient();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.error || 'Review failed' });
    }
  };

  const uploadDocument = async () => {
    if (!uploadDocType || !uploadFileName) return;
    setUploading(true);
    setActionMsg(null);
    try {
      await API.post(`/disbursement-clients/${clientId}/kyb-documents`, {
        document_type: uploadDocType,
        file_url: uploadFileName,
      });
      setActionMsg({ type: 'success', text: 'Document record created.' });
      setShowUpload(false);
      setUploadDocType('');
      setUploadFileName('');
      await fetchClient();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  /* ---------- Fee actions ---------- */

  const addFee = async () => {
    setAddingFee(true);
    setActionMsg(null);
    try {
      await API.post(`/disbursement-clients/${clientId}/fees`, {
        rail: feeForm.rail,
        fee_type: feeForm.fee_type,
        flat_fee_cents: feeForm.flat_fee_cents ? parseInt(feeForm.flat_fee_cents, 10) : 0,
        percentage_fee: feeForm.percentage_fee ? parseFloat(feeForm.percentage_fee) : 0,
        min_fee_cents: feeForm.min_fee_cents ? parseInt(feeForm.min_fee_cents, 10) : 0,
        max_fee_cents: feeForm.max_fee_cents ? parseInt(feeForm.max_fee_cents, 10) : null,
      });
      setActionMsg({ type: 'success', text: 'Fee added successfully.' });
      setShowFeeForm(false);
      setFeeForm({ rail: 'EFT', fee_type: 'Flat', flat_fee_cents: '', percentage_fee: '', min_fee_cents: '', max_fee_cents: '' });
      await fetchClient();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to add fee' });
    } finally {
      setAddingFee(false);
    }
  };

  /* ---------- Notification actions ---------- */

  const addNotification = async () => {
    setAddingNotif(true);
    setActionMsg(null);
    try {
      await API.post(`/disbursement-clients/${clientId}/notifications`, {
        event_type: notifForm.event_type,
        channel: notifForm.channel,
      });
      setActionMsg({ type: 'success', text: 'Notification preference added.' });
      setShowNotifForm(false);
      setNotifForm({ event_type: NOTIFICATION_EVENT_TYPES[0], channel: 'webhook' });
      await fetchClient();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to add notification' });
    } finally {
      setAddingNotif(false);
    }
  };

  const toggleNotification = async (notif: NotificationPreference) => {
    setActionMsg(null);
    try {
      await API.patch(`/disbursement-clients/${clientId}/notifications/${notif.id}`, {
        enabled: !notif.enabled,
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, enabled: !n.enabled } : n))
      );
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to toggle notification' });
    }
  };

  /* ---------- Client user actions ---------- */

  const addClientUser = async () => {
    setAddingUser(true);
    setActionMsg(null);
    try {
      await API.post(`/disbursement-clients/${clientId}/users`, userForm);
      setActionMsg({ type: 'success', text: 'User added successfully.' });
      setShowUserForm(false);
      setUserForm({ email: '', name: '', role: 'viewer', password: '' });
      await fetchClient();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to add user' });
    } finally {
      setAddingUser(false);
    }
  };

  const toggleUserActive = async (userId: number, currentActive: boolean) => {
    setActionMsg(null);
    try {
      await API.patch(`/disbursement-clients/${clientId}/users/${userId}`, {
        is_active: !currentActive,
      });
      await fetchClient();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to update user status' });
    }
  };

  /* ---------- Rendering ---------- */

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (notFound) {
    return (
      <div className="mymoolah-card p-8 text-center">
        <p className="admin-text-heading text-lg mb-4">Client not found</p>
        <button onClick={() => navigate('/admin/disbursement-clients')}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-[var(--primary-foreground)]">
          Back to Clients
        </button>
      </div>
    );
  }
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded-xl">{error}</div>;
  if (!client) return null;

  const currentFees = fees.filter((f) => !f.effective_to);
  const historicalFees = fees.filter((f) => !!f.effective_to);

  return (
    <div className="space-y-5">
      {/* Action message banner */}
      {actionMsg && (
        <div className={`rounded-xl p-4 text-sm font-medium ${actionMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {actionMsg.text}
        </div>
      )}

      {/* ============ Section 1: Client Overview ============ */}
      <div className="mymoolah-card p-6">
        <div className="flex items-start gap-4 flex-wrap mb-4">
          <button onClick={() => navigate('/admin/disbursement-clients')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 self-start text-sm">
            &larr; Back to Clients
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="admin-text-heading text-xl">{client.company_name}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-gray-100 text-gray-600">
                {client.client_code}
              </span>
            </div>
          </div>
          {!editMode && (
            <button onClick={startEdit}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-[var(--primary-foreground)]">
              Edit
            </button>
          )}
        </div>

        {editMode ? (
          /* Inline edit form */
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company Name</label>
                <input type="text" value={editForm.company_name || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, company_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Entity Type</label>
                <select value={editForm.entity_type || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, entity_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300">
                  {Object.entries(ENTITY_TYPE_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Registration Number</label>
                <input type="text" value={editForm.registration_number || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, registration_number: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Name</label>
                <input type="text" value={editForm.contact_name || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, contact_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Email</label>
                <input type="email" value={editForm.contact_email || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, contact_email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Phone</label>
                <input type="text" value={editForm.contact_phone || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, contact_phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                <select value={editForm.status || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300">
                  {Object.keys(CLIENT_STATUS_BADGE).map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Float Limit (cents)</label>
                <input type="text" value={editForm.float_limit || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, float_limit: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 bg-[var(--primary)] text-[var(--primary-foreground)]">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={cancelEdit}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Read-only fields */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: 'Entity Type', value: formatEntityType(client.entity_type) },
              { label: 'Registration Number', value: client.registration_number || '\u2014' },
              { label: 'Contact Name', value: client.contact_name || '\u2014' },
              { label: 'Contact Email', value: client.contact_email },
              { label: 'Contact Phone', value: client.contact_phone || '\u2014' },
              { label: 'Ledger Account', value: client.ledger_account_code || '\u2014' },
              { label: 'Float Limit', value: client.float_limit ? fmtCents(parseInt(client.float_limit, 10)) : '\u2014' },
            ].map((f) => (
              <div key={f.label} className="flex items-baseline gap-2 py-1.5 border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-400 uppercase w-40 shrink-0">{f.label}</span>
                <span className="admin-text-body text-sm text-gray-800">{f.value}</span>
              </div>
            ))}
            <div className="flex items-baseline gap-2 py-1.5 border-b border-gray-50">
              <span className="text-xs font-semibold text-gray-400 uppercase w-40 shrink-0">Status</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CLIENT_STATUS_BADGE[client.status] || ''}`}>
                {client.status}
              </span>
            </div>
            <div className="flex items-baseline gap-2 py-1.5 border-b border-gray-50">
              <span className="text-xs font-semibold text-gray-400 uppercase w-40 shrink-0">KYB Status</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${KYB_STATUS_BADGE[client.kyb_status] || ''}`}>
                {client.kyb_status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ============ Section 2: KYB Documents ============ */}
      <div className="mymoolah-card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="admin-text-heading text-lg">KYB Documents</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Required documents for {formatEntityType(client.entity_type)} entities
            </p>
          </div>
          <button onClick={() => setShowUpload(!showUpload)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-[var(--primary-foreground)]">
            {showUpload ? 'Cancel' : '+ Upload Document'}
          </button>
        </div>

        {showUpload && (
          <div className="p-5 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Document Type</label>
                <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300">
                  <option value="">Select type...</option>
                  {Object.entries(DOC_TYPE_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">File Name</label>
                <input type="text" placeholder="e.g. cor15_acme_2026.pdf"
                  value={uploadFileName} onChange={(e) => setUploadFileName(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300 w-64" />
              </div>
              <button onClick={uploadDocument} disabled={uploading || !uploadDocType || !uploadFileName}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 bg-[var(--primary)] text-[var(--primary-foreground)]">
                {uploading ? 'Creating...' : 'Create Record'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {['Type', 'Entity Type', 'Status', 'Verified By', 'Verified At', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No KYB documents uploaded yet
                  </td>
                </tr>
              ) : documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{formatDocType(doc.document_type)}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{formatEntityType(doc.entity_type)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${DOC_STATUS_BADGE[doc.status] || ''}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{doc.verified_by || '\u2014'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{doc.verified_at ? fmtDate(doc.verified_at) : '\u2014'}</td>
                  <td className="px-4 py-2.5">
                    {['pending', 'processing'].includes(doc.status) && (
                      <div className="flex gap-2">
                        <button onClick={() => reviewDocument(doc.id, 'verified')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[var(--success-color)]">
                          Approve
                        </button>
                        <button onClick={() => reviewDocument(doc.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 text-red-600 hover:bg-red-50">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ Section 3: Fee Configuration ============ */}
      <div className="mymoolah-card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="admin-text-heading text-lg">Fee Configuration</h3>
          </div>
          <button onClick={() => setShowFeeForm(!showFeeForm)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-[var(--primary-foreground)]">
            {showFeeForm ? 'Cancel' : '+ Add Fee'}
          </button>
        </div>

        {showFeeForm && (
          <div className="p-5 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Rail</label>
                <select value={feeForm.rail} onChange={(e) => setFeeForm((p) => ({ ...p, rail: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300">
                  {RAILS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fee Type</label>
                <select value={feeForm.fee_type} onChange={(e) => setFeeForm((p) => ({ ...p, fee_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300">
                  {FEE_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Flat Fee (cents)</label>
                <input type="number" value={feeForm.flat_fee_cents}
                  onChange={(e) => setFeeForm((p) => ({ ...p, flat_fee_cents: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Percentage Fee (decimal)</label>
                <input type="number" step="0.0001" value={feeForm.percentage_fee}
                  onChange={(e) => setFeeForm((p) => ({ ...p, percentage_fee: e.target.value }))}
                  placeholder="0.0000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Min Fee (cents)</label>
                <input type="number" value={feeForm.min_fee_cents}
                  onChange={(e) => setFeeForm((p) => ({ ...p, min_fee_cents: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Max Fee (cents, optional)</label>
                <input type="number" value={feeForm.max_fee_cents}
                  onChange={(e) => setFeeForm((p) => ({ ...p, max_fee_cents: e.target.value }))}
                  placeholder="optional"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
            </div>
            <div className="mt-4">
              <button onClick={addFee} disabled={addingFee}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 bg-[var(--primary)] text-[var(--primary-foreground)]">
                {addingFee ? 'Adding...' : 'Add Fee'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {['Rail', 'Fee Type', 'Flat Fee', 'Percentage', 'Min Fee', 'Max Fee', 'Effective From'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentFees.length === 0 && historicalFees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No fees configured
                  </td>
                </tr>
              ) : (
                <>
                  {currentFees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800 uppercase">{fee.rail}</td>
                      <td className="px-4 py-2.5 text-gray-600 capitalize">{fee.fee_type}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-700">{fmtCents(fee.flat_fee_cents)}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-700">{fmtPct(fee.percentage_fee)}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-700">{fmtCents(fee.min_fee_cents)}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-700">{fee.max_fee_cents != null ? fmtCents(fee.max_fee_cents) : '\u2014'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(fee.effective_from)}</td>
                    </tr>
                  ))}
                  {historicalFees.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50">
                          Historical Fees
                        </td>
                      </tr>
                      {historicalFees.map((fee) => (
                        <tr key={fee.id} className="opacity-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800 uppercase">{fee.rail}</td>
                          <td className="px-4 py-2.5 text-gray-600 capitalize">{fee.fee_type}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-700">{fmtCents(fee.flat_fee_cents)}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-700">{fmtPct(fee.percentage_fee)}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-700">{fmtCents(fee.min_fee_cents)}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-700">{fee.max_fee_cents != null ? fmtCents(fee.max_fee_cents) : '\u2014'}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(fee.effective_from)}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ Section 4: Notification Settings ============ */}
      <div className="mymoolah-card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="admin-text-heading text-lg">Notification Settings</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Configure webhook and email notifications for disbursement events
            </p>
          </div>
          <button onClick={() => setShowNotifForm(!showNotifForm)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-[var(--primary-foreground)]">
            {showNotifForm ? 'Cancel' : '+ Add Notification'}
          </button>
        </div>

        {showNotifForm && (
          <div className="p-5 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Event Type</label>
                <select value={notifForm.event_type} onChange={(e) => setNotifForm((p) => ({ ...p, event_type: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300">
                  {NOTIFICATION_EVENT_TYPES.map((et) => (
                    <option key={et} value={et}>{formatEventType(et)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Channel</label>
                <select value={notifForm.channel} onChange={(e) => setNotifForm((p) => ({ ...p, channel: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300">
                  {NOTIFICATION_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</option>
                  ))}
                </select>
              </div>
              <button onClick={addNotification} disabled={addingNotif}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 bg-[var(--primary)] text-[var(--primary-foreground)]">
                {addingNotif ? 'Adding...' : 'Add Preference'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {['Event Type', 'Channel', 'Enabled'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No notification preferences configured
                  </td>
                </tr>
              ) : notifications.map((notif) => (
                <tr key={notif.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{formatEventType(notif.event_type)}</td>
                  <td className="px-4 py-2.5 text-gray-600 capitalize">{notif.channel}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleNotification(notif)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        notif.enabled
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {notif.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ Section 5: Client Users ============ */}
      <div className="mymoolah-card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="admin-text-heading text-lg">Client Portal Users</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Manage portal login users for this disbursement client
            </p>
          </div>
          <button onClick={() => setShowUserForm(!showUserForm)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-[var(--primary-foreground)]">
            {showUserForm ? 'Cancel' : '+ Add User'}
          </button>
        </div>

        {showUserForm && (
          <div className="p-5 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" value={userForm.email}
                  onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="user@company.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name</label>
                <input type="text" value={userForm.name}
                  onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
                <select value={userForm.role}
                  onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300">
                  <option value="admin">Admin</option>
                  <option value="maker">Maker</option>
                  <option value="checker">Checker</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
                <input type="password" value={userForm.password}
                  onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Initial password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300" />
              </div>
            </div>
            <div className="mt-4">
              <button onClick={addClientUser} disabled={addingUser || !userForm.email || !userForm.name || !userForm.password}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 bg-[var(--primary)] text-[var(--primary-foreground)]">
                {addingUser ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Created'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No client users yet
                  </td>
                </tr>
              ) : clientUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{user.name}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{user.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase ${
                      user.role === 'admin' ? 'bg-blue-50 text-blue-700' :
                      user.role === 'maker' ? 'bg-emerald-50 text-emerald-700' :
                      user.role === 'checker' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleUserActive(user.id, user.is_active)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        user.is_active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{user.last_login_at ? fmtDate(user.last_login_at) : '\u2014'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
