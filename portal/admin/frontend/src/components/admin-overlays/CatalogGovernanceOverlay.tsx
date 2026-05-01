import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { CheckCircle, Filter, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem('portal_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface CatalogMapping {
  id: number;
  sourceVariantId: number | null;
  supplierCode: string;
  supplierProductId: string;
  productType: string;
  rawName: string;
  rawSnapshot: Record<string, unknown>;
  canonicalName: string | null;
  canonicalBrand: string | null;
  category: string | null;
  description: string | null;
  iconKey: string | null;
  logoKey: string | null;
  riskTier: 'low' | 'medium' | 'high';
  reviewStatus: string;
  publishStatus: string;
  makerUserId: string | null;
  makerUserEmail: string | null;
  checkerUserEmail: string | null;
  reason: string | null;
  updatedAt: string;
  auditEvents?: CatalogAuditEvent[];
}

interface CatalogAuditEvent {
  id: number;
  action: string;
  actorEmail: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  createdAt: string;
}

interface MappingForm {
  canonicalName: string;
  canonicalBrand: string;
  category: string;
  description: string;
  iconKey: string;
  logoKey: string;
  riskTier: 'low' | 'medium' | 'high';
}

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  suspended: 'bg-orange-50 text-orange-700',
  retired: 'bg-gray-100 text-gray-500',
  published: 'bg-blue-50 text-blue-700',
  unpublished: 'bg-gray-100 text-gray-600',
};

const LIMIT = 25;

function errorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  return axiosError.response?.data?.error || axiosError.response?.data?.message || fallback;
}

function emptyForm(): MappingForm {
  return {
    canonicalName: '',
    canonicalBrand: '',
    category: '',
    description: '',
    iconKey: '',
    logoKey: '',
    riskTier: 'medium',
  };
}

function toForm(mapping: CatalogMapping | null): MappingForm {
  if (!mapping) return emptyForm();
  return {
    canonicalName: mapping.canonicalName || '',
    canonicalBrand: mapping.canonicalBrand || '',
    category: mapping.category || '',
    description: mapping.description || '',
    iconKey: mapping.iconKey || '',
    logoKey: mapping.logoKey || '',
    riskTier: mapping.riskTier || 'medium',
  };
}

export const CatalogGovernanceOverlay: React.FC = () => {
  const [mappings, setMappings] = useState<CatalogMapping[]>([]);
  const [selected, setSelected] = useState<CatalogMapping | null>(null);
  const [form, setForm] = useState<MappingForm>(emptyForm());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    reviewStatus: '',
    publishStatus: '',
    supplierCode: '',
    productType: 'voucher',
    riskTier: '',
    q: '',
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/catalog-governance/mappings', {
        params: { page, limit: LIMIT, ...filters },
      });
      setMappings(res.data.data.mappings);
      setTotal(res.data.data.pagination.total);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load catalog mappings'));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const loadDetail = async (id: number) => {
    setSaving(true);
    setError(null);
    try {
      const res = await API.get(`/catalog-governance/mappings/${id}`);
      setSelected(res.data.data);
      setForm(toForm(res.data.data));
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load mapping detail'));
    } finally {
      setSaving(false);
    }
  };

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const updateForm = (key: keyof MappingForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveDraft = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await API.patch(`/catalog-governance/mappings/${selected.id}`, form);
      await loadDetail(selected.id);
      await fetchMappings();
      setNotice('Catalog mapping saved.');
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to save mapping'));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: 'submit' | 'approve' | 'reject' | 'suspend' | 'retire') => {
    if (!selected) return;
    const reasonRequired = action === 'reject' || action === 'suspend' || action === 'retire';
    const reason = reasonRequired ? window.prompt(`Reason for ${action}?`) : undefined;
    if (reasonRequired && !reason) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await API.post(`/catalog-governance/mappings/${selected.id}/${action}`, reason ? { reason } : {});
      await loadDetail(selected.id);
      await fetchMappings();
      setNotice(`Catalog mapping ${action.replace('_', ' ')} completed.`);
    } catch (err: unknown) {
      setError(errorMessage(err, `Failed to ${action} mapping`));
    } finally {
      setSaving(false);
    }
  };

  const runBackfill = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await API.post('/catalog-governance/backfill', { productType: filters.productType || 'voucher', limit: 1000 });
      await fetchMappings();
      setNotice(`Backfill processed ${res.data.data.processed} active product variants.`);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to run governance backfill'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mymoolah-card flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[var(--primary)]" />
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Catalog Governance</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Review supplier SKUs before they can appear in the wallet catalog.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runBackfill}
            disabled={saving}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Backfill Queue
          </button>
          <button
            type="button"
            onClick={fetchMappings}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div>}

      <div className="mymoolah-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Search" value={filters.q} onChange={(e) => updateFilter('q', e.target.value)} />
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Supplier code" value={filters.supplierCode} onChange={(e) => updateFilter('supplierCode', e.target.value)} />
          <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.reviewStatus} onChange={(e) => updateFilter('reviewStatus', e.target.value)}>
            <option value="">All review states</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="retired">Retired</option>
          </select>
          <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.publishStatus} onChange={(e) => updateFilter('publishStatus', e.target.value)}>
            <option value="">All publish states</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
          <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.productType} onChange={(e) => updateFilter('productType', e.target.value)}>
            <option value="voucher">Voucher</option>
            <option value="airtime">Airtime</option>
            <option value="data">Data</option>
            <option value="electricity">Electricity</option>
            <option value="bill_payment">Bill payment</option>
          </select>
          <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.riskTier} onChange={(e) => updateFilter('riskTier', e.target.value)}>
            <option value="">All risk tiers</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="mymoolah-card overflow-hidden">
          {loading && mappings.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Loading catalog queue...</div>
          ) : mappings.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">No catalog mappings match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    {['Supplier SKU', 'Raw name', 'Canonical', 'Review', 'Publish', 'Risk', 'Updated'].map((header) => (
                      <th key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mappings.map((mapping) => (
                    <tr key={mapping.id} onClick={() => loadDetail(mapping.id)} className="cursor-pointer hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{mapping.supplierCode}</div>
                        <div className="max-w-[180px] truncate text-xs text-gray-400">{mapping.supplierProductId}</div>
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-gray-700">{mapping.rawName}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{mapping.canonicalName || 'Unmapped'}</div>
                        <div className="text-xs text-gray-400">{mapping.canonicalBrand || 'No brand'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[mapping.reviewStatus] || STATUS_CLASS.draft}`}>
                          {mapping.reviewStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[mapping.publishStatus] || STATUS_CLASS.unpublished}`}>
                          {mapping.publishStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">{mapping.riskTier}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(mapping.updatedAt).toLocaleDateString('en-ZA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
            <span>Page {page} of {totalPages} ({total} mappings)</span>
            <div className="flex gap-2">
              <button className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>

        <aside className="mymoolah-card min-h-[520px] p-5">
          {!selected ? (
            <div className="flex h-full min-h-[400px] items-center justify-center text-center text-sm text-gray-500">
              Select a supplier SKU to review raw and canonical catalog fields.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Mapping #{selected.id}</h2>
                  <p className="text-xs text-gray-500">{selected.supplierCode} / {selected.supplierProductId}</p>
                </div>
                <button className="text-sm text-gray-500 hover:text-gray-800" onClick={() => setSelected(null)}>Close</button>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
                <div className="font-semibold text-gray-800">Raw supplier snapshot</div>
                <div className="mt-2 space-y-1">
                  <p><span className="font-medium">Name:</span> {selected.rawName}</p>
                  <p><span className="font-medium">Type:</span> {selected.productType}</p>
                  <p><span className="font-medium">Variant:</span> {selected.sourceVariantId || 'n/a'}</p>
                  {selected.reason && <p><span className="font-medium">Reason:</span> {selected.reason}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-600">Canonical display name</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.canonicalName} onChange={(e) => updateForm('canonicalName', e.target.value)} />
                <label className="block text-xs font-semibold text-gray-600">Brand</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.canonicalBrand} onChange={(e) => updateForm('canonicalBrand', e.target.value)} />
                <label className="block text-xs font-semibold text-gray-600">Category</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.category} onChange={(e) => updateForm('category', e.target.value)} />
                <label className="block text-xs font-semibold text-gray-600">Description</label>
                <textarea className="h-20 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600">Icon key</label>
                    <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.iconKey} onChange={(e) => updateForm('iconKey', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600">Risk tier</label>
                    <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.riskTier} onChange={(e) => updateForm('riskTier', e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button disabled={saving} onClick={saveDraft} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
                <button disabled={saving} onClick={() => runAction('submit')} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50">Submit</button>
                <button disabled={saving} onClick={() => runAction('approve')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50"><CheckCircle className="h-4 w-4" />Approve</button>
                <button disabled={saving} onClick={() => runAction('reject')} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" />Reject</button>
                <button disabled={saving} onClick={() => runAction('suspend')} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 disabled:opacity-50">Suspend</button>
                <button disabled={saving} onClick={() => runAction('retire')} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Retire</button>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Audit history</h3>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {(selected.auditEvents || []).length === 0 ? (
                    <p className="text-xs text-gray-400">No audit events yet.</p>
                  ) : (
                    (selected.auditEvents || []).map((event) => (
                      <div key={event.id} className="rounded-lg border border-gray-100 p-2 text-xs text-gray-600">
                        <div className="font-semibold text-gray-800">{event.action.replace(/_/g, ' ')}</div>
                        <div>{event.actorEmail || 'system'} on {new Date(event.createdAt).toLocaleString('en-ZA')}</div>
                        {event.reason && <div className="mt-1 text-gray-500">{event.reason}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
