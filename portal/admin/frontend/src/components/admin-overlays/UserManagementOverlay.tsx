import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';

const API_BASE = '/api/v1/admin/wallet-users';

const fmtZar = (amount: number | string | null | undefined) => {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (amount == null || Number.isNaN(n)) {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(0);
  }
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA');
};

type KycFilter = '' | 'pending' | 'approved' | 'rejected' | 'reset';

export interface WalletUserRow {
  id: number;
  phoneNumber?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  kycStatus?: string | null;
  kycTier?: number | string | null;
  isActive?: boolean;
  walletBalance?: number | string | null;
  createdAt?: string | null;
}

interface ListPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('portal_token');
  const h: Record<string, string> = { Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function kycDot(status: string | null | undefined): string {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'approved':
      return 'bg-emerald-500';
    case 'pending':
      return 'bg-amber-500';
    case 'rejected':
      return 'bg-red-500';
    case 'reset':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
}

function kycTextClass(status: string | null | undefined): string {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'approved':
      return 'text-emerald-700';
    case 'pending':
      return 'text-amber-700';
    case 'rejected':
      return 'text-red-700';
    default:
      return 'text-[var(--muted-foreground)]';
  }
}

function displayName(u: WalletUserRow): string {
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  const n = `${a} ${b}`.trim();
  return n || '—';
}

const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-[var(--border)]">
        <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-[var(--muted)] animate-pulse" /></td>
        <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-[var(--muted)] animate-pulse" /></td>
        <td className="px-4 py-3"><div className="h-4 w-36 rounded bg-[var(--muted)] animate-pulse" /></td>
        <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-[var(--muted)] animate-pulse" /></td>
        <td className="px-4 py-3"><div className="h-4 w-8 rounded bg-[var(--muted)] animate-pulse" /></td>
        <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-[var(--muted)] animate-pulse" /></td>
        <td className="px-4 py-3"><div className="h-3 w-3 rounded-full bg-[var(--muted)] animate-pulse mx-auto" /></td>
        <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-[var(--muted)] animate-pulse" /></td>
      </tr>
    ))}
  </tbody>
);

export const UserManagementOverlay: React.FC = () => {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kycStatus, setKycStatus] = useState<KycFilter>('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [users, setUsers] = useState<WalletUserRow[]>([]);
  const [pagination, setPagination] = useState<ListPagination | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [drawerUserId, setDrawerUserId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailPayload, setDetailPayload] = useState<Record<string, unknown> | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, kycStatus, activeOnly, limit]);

  const handleUnauthorized = useCallback(() => {
    sessionStorage.removeItem('portal_token');
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const fetchList = useCallback(async () => {
    listAbortRef.current?.abort();
    const ac = new AbortController();
    listAbortRef.current = ac;

    setListLoading(true);
    setListError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (kycStatus) params.set('kycStatus', kycStatus);
    if (activeOnly) params.set('isActive', 'true');

    try {
      const res = await fetch(`${API_BASE}?${params.toString()}`, {
        method: 'GET',
        headers: authHeaders(),
        signal: ac.signal,
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setListError((json as { error?: string }).error || 'Failed to load users');
        setUsers([]);
        setPagination(null);
        return;
      }

      const data = (json as { data?: { users?: WalletUserRow[]; pagination?: ListPagination } }).data;
      setUsers(Array.isArray(data?.users) ? data!.users! : []);
      setPagination(data?.pagination ?? null);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setListError('Network error while loading users');
      setUsers([]);
      setPagination(null);
    } finally {
      setListLoading(false);
    }
  }, [page, limit, debouncedSearch, kycStatus, activeOnly, handleUnauthorized]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fetchDetail = useCallback(
    async (id: number) => {
      detailAbortRef.current?.abort();
      const ac = new AbortController();
      detailAbortRef.current = ac;

      setDetailLoading(true);
      setDetailError(null);
      setDetailPayload(null);

      try {
        const res = await fetch(`${API_BASE}/${id}`, {
          method: 'GET',
          headers: authHeaders(),
          signal: ac.signal,
        });

        if (res.status === 401) {
          handleUnauthorized();
          return;
        }

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setDetailError((json as { error?: string }).error || 'Failed to load user details');
          return;
        }

        const data = (json as { data?: Record<string, unknown> }).data;
        setDetailPayload(data && typeof data === 'object' ? data : {});
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setDetailError('Network error while loading details');
      } finally {
        setDetailLoading(false);
      }
    },
    [handleUnauthorized],
  );

  useEffect(() => {
    if (drawerUserId == null) {
      detailAbortRef.current?.abort();
      setDetailPayload(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    fetchDetail(drawerUserId);
  }, [drawerUserId, fetchDetail]);

  const totalPages = useMemo(() => {
    if (pagination?.totalPages != null) return Math.max(1, pagination.totalPages);
    return 1;
  }, [pagination]);

  const closeDrawer = () => setDrawerUserId(null);

  const userObj = detailPayload?.user as Record<string, unknown> | undefined;
  const walletObj = detailPayload?.wallet as Record<string, unknown> | undefined;
  const kycObj = detailPayload?.kyc as Record<string, unknown> | undefined;
  const recentTx = detailPayload?.recentTransactions as unknown[] | undefined;

  const showFrom = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const showTo = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;
  const showTotal = pagination?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">User Management</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Search wallet users, review KYC status, balances, and recent activity.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search phone, email, or name…"
            className="w-full min-h-[44px] rounded-lg border border-[var(--border)] bg-white pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition-shadow placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            aria-label="Search users"
          />
        </div>

        <select
          id="kyc-filter"
          value={kycStatus}
          onChange={(e) => setKycStatus(e.target.value as KycFilter)}
          className="min-h-[44px] min-w-[140px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          aria-label="KYC status filter"
        >
          <option value="">KYC: All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="reset">Reset</option>
        </select>

        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
          />
          Active only
        </label>
      </div>

      {/* Summary stats */}
      {pagination && !listLoading && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]">
            Total: {Intl.NumberFormat('en-ZA').format(showTotal)}
          </span>
        </div>
      )}

      {/* Error state */}
      {listError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <p className="flex-1 text-sm text-red-800">{listError}</p>
          <button
            type="button"
            onClick={fetchList}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">KYC</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Tier</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Joined</th>
              </tr>
            </thead>
            {listLoading && users.length === 0 ? (
              <TableSkeleton />
            ) : users.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <Users className="h-10 w-10 text-[var(--muted-foreground)]/40" strokeWidth={1.25} aria-hidden />
                      <p className="text-base font-medium text-[var(--foreground)]">No users found</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Try adjusting your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setDrawerUserId(u.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDrawerUserId(u.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50 focus:bg-[var(--muted)]/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--primary)]/30"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{displayName(u)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{u.phoneNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${kycDot(u.kycStatus)}`} />
                        <span className={`text-xs font-medium capitalize ${kycTextClass(u.kycStatus)}`}>
                          {u.kycStatus || '—'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{u.kycTier ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono tabular-nums text-[var(--foreground)]">{fmtZar(u.walletBalance)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}
                        />
                        <span className={`text-xs ${u.isActive ? 'text-emerald-700' : 'text-[var(--muted-foreground)]'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{fmtDate(u.createdAt ?? undefined)}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
            {pagination ? (
              <span>Showing {showFrom}–{showTo} of {Intl.NumberFormat('en-ZA').format(showTotal)}</span>
            ) : (
              <span>Page {page}</span>
            )}
            <label className="flex items-center gap-2">
              <span>Rows</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={listLoading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Previous
            </button>
            <span className="hidden min-w-[3rem] text-center text-sm font-medium text-[var(--foreground)] sm:inline-block">
              {page}
            </span>
            <button
              type="button"
              disabled={listLoading || (pagination != null && page >= totalPages)}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Inline refresh spinner */}
      {listLoading && users.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" aria-hidden />
          Updating results…
        </div>
      )}

      {/* Detail drawer */}
      {drawerUserId != null && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="user-drawer-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
            aria-label="Close drawer"
            onClick={closeDrawer}
          />
          <div className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[var(--primary)]" aria-hidden />
                <h3 id="user-drawer-title" className="text-lg font-semibold text-[var(--foreground)]">
                  User Details
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Loading */}
              {detailLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" aria-hidden />
                  <p className="text-sm text-[var(--muted-foreground)]">Loading user…</p>
                </div>
              )}

              {/* Error */}
              {!detailLoading && detailError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                  <p className="flex-1 text-sm text-red-800">{detailError}</p>
                  <button
                    type="button"
                    onClick={() => fetchDetail(drawerUserId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    Retry
                  </button>
                </div>
              )}

              {/* Content */}
              {!detailLoading && !detailError && detailPayload && (
                <div className="space-y-6">
                  {/* Profile */}
                  <section>
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      <User className="h-4 w-4" aria-hidden />
                      Profile
                    </h4>
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                      <dl className="divide-y divide-[var(--border)]">
                        {[
                          ['Name', [userObj?.firstName, userObj?.lastName].filter(Boolean).join(' ') || '—'],
                          ['Phone', String(userObj?.phoneNumber ?? '—')],
                          ['Email', String(userObj?.email ?? '—')],
                          ['Role', String(userObj?.role ?? '—')],
                          ['KYC', String(userObj?.kycStatus ?? '—')],
                          ['Tier', userObj?.kycTier != null ? String(userObj.kycTier) : '—'],
                          ['Joined', fmtDate(userObj?.createdAt as string | undefined)],
                        ].map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
                            <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{k}</dt>
                            <dd className="text-sm text-[var(--foreground)]">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </section>

                  {/* Wallet */}
                  <section>
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      <Wallet className="h-4 w-4" aria-hidden />
                      Wallet
                    </h4>
                    <div className="rounded-xl border border-[var(--border)] p-4">
                      <p className="text-2xl font-semibold font-mono tabular-nums text-[var(--foreground)]">
                        {fmtZar(
                          (walletObj?.balance as number | string | undefined) ??
                            (walletObj?.availableBalance as number | string | undefined),
                        )}
                      </p>
                      {walletObj && Object.keys(walletObj).length > 0 && (
                        <dl className="mt-4 divide-y divide-[var(--border)]">
                          {Object.entries(walletObj)
                            .filter(([key]) => !['balance', 'availableBalance'].includes(key))
                            .slice(0, 8)
                            .map(([key, val]) => (
                              <div key={key} className="flex items-center justify-between gap-2 py-2">
                                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{key}</dt>
                                <dd className="max-w-[55%] truncate text-right font-mono text-xs text-[var(--foreground)]">{String(val)}</dd>
                              </div>
                            ))}
                        </dl>
                      )}
                    </div>
                  </section>

                  {/* KYC record */}
                  <section>
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      <FileText className="h-4 w-4" aria-hidden />
                      KYC Record
                    </h4>
                    {kycObj && Object.keys(kycObj).length > 0 ? (
                      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                        <dl className="divide-y divide-[var(--border)]">
                          {Object.entries(kycObj).map(([key, val]) => (
                            <div key={key} className="flex items-center justify-between gap-2 px-4 py-2.5">
                              <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{key}</dt>
                              <dd className="max-w-[55%] break-words text-right text-sm text-[var(--foreground)]">{String(val)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No KYC details returned.</p>
                    )}
                  </section>

                  {/* Recent transactions */}
                  <section>
                    <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Recent Transactions</h4>
                    {Array.isArray(recentTx) && recentTx.length > 0 ? (
                      <ul className="space-y-2">
                        {recentTx.map((txItem, idx) => {
                          const row = txItem as Record<string, unknown>;
                          const id = row.id ?? row.reference ?? idx;
                          return (
                            <li
                              key={String(id)}
                              className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium font-mono tabular-nums text-[var(--foreground)]">
                                  {fmtZar(row.amount as number | string | undefined)}
                                </span>
                                <span className="text-xs text-[var(--muted-foreground)]">{fmtDate(row.createdAt as string | undefined)}</span>
                              </div>
                              {(row.type || row.status || row.description) && (
                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                  {[row.type, row.status, row.description].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No recent transactions.</p>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
