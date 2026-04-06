import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  User,
  Wallet,
  X,
} from 'lucide-react';

const API_BASE = '/api/v1/admin/wallet-users';

const ACCENT = '#00B894';
const TEXT_DARK = '#1a1a2e';

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
  const token = localStorage.getItem('portal_token');
  const h: Record<string, string> = { Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function kycBadgeClass(status: string | null | undefined): string {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    case 'reset':
      return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
    default:
      return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
  }
}

function displayName(u: WalletUserRow): string {
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  const n = `${a} ${b}`.trim();
  return n || '—';
}

const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-gray-100">
        <td className="px-4 py-3">
          <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
        </td>
        <td className="px-4 py-3">
          <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
        </td>
        <td className="px-4 py-3">
          <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
        </td>
        <td className="px-4 py-3">
          <div className="h-6 w-20 rounded-full bg-gray-100 animate-pulse" />
        </td>
        <td className="px-4 py-3">
          <div className="h-4 w-8 rounded bg-gray-100 animate-pulse" />
        </td>
        <td className="px-4 py-3">
          <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-gray-100 animate-pulse mx-auto" />
        </td>
        <td className="px-4 py-3">
          <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
        </td>
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
    localStorage.removeItem('portal_token');
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

  const pageLabel = pagination
    ? `Page ${pagination.page} of ${totalPages}`
    : `Page ${page} of ${totalPages}`;

  const closeDrawer = () => setDrawerUserId(null);

  const userObj = detailPayload?.user as Record<string, unknown> | undefined;
  const walletObj = detailPayload?.wallet as Record<string, unknown> | undefined;
  const kycObj = detailPayload?.kyc as Record<string, unknown> | undefined;
  const recentTx = detailPayload?.recentTransactions as unknown[] | undefined;

  return (
    <div className="space-y-6" style={{ color: TEXT_DARK }}>
      {/* Header + filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight" style={{ color: TEXT_DARK }}>
              User management
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Search wallet users, review KYC, balances, and recent activity.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search phone, email, or name…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-shadow focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20"
              aria-label="Search users"
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="kyc-filter" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                KYC status
              </label>
              <select
                id="kyc-filter"
                value={kycStatus}
                onChange={(e) => setKycStatus(e.target.value as KycFilter)}
                className="min-w-[160px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="reset">Reset</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Account</span>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  style={{ accentColor: ACCENT }}
                />
                <span>Active users only</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {listError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{listError}</div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">KYC</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Tier</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Joined</th>
              </tr>
            </thead>
            {listLoading && users.length === 0 ? (
              <TableSkeleton />
            ) : users.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <User className="h-10 w-10 text-gray-300" strokeWidth={1.25} aria-hidden />
                      <p className="text-base font-medium text-gray-600">No users found</p>
                      <p className="text-sm text-gray-400">
                        Try adjusting search or filters, or clear the search box to see all users.
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
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50/80 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#00B894]/30"
                  >
                    <td className="px-4 py-3 font-medium">{displayName(u)}</td>
                    <td className="px-4 py-3 text-gray-600">{u.phoneNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${kycBadgeClass(u.kycStatus)}`}
                      >
                        {u.kycStatus || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.kycTier ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-800">{fmtZar(u.walletBalance)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="mx-auto inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: u.isActive ? ACCENT : '#d1d5db' }}
                        title={u.isActive ? 'Active' : 'Inactive'}
                        aria-label={u.isActive ? 'Active' : 'Inactive'}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(u.createdAt ?? undefined)}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span>{pageLabel}</span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <label className="flex items-center gap-2">
              <span className="text-gray-500">Rows per page</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20"
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
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Previous
            </button>
            <button
              type="button"
              disabled={listLoading || (pagination != null && page >= totalPages)}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Inline list refresh spinner when data already shown */}
      {listLoading && users.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: ACCENT }} aria-hidden />
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
          <div className="relative flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" style={{ color: ACCENT }} aria-hidden />
                <h3 id="user-drawer-title" className="text-lg font-semibold" style={{ color: TEXT_DARK }}>
                  User details
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {detailLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: ACCENT }} aria-hidden />
                  <p className="text-sm">Loading user…</p>
                </div>
              )}

              {!detailLoading && detailError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{detailError}</div>
              )}

              {!detailLoading && !detailError && detailPayload && (
                <div className="space-y-6">
                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <User className="h-4 w-4" aria-hidden />
                      Profile
                    </h4>
                    <dl className="space-y-2 text-sm">
                      {[
                        ['Name', [userObj?.firstName, userObj?.lastName].filter(Boolean).join(' ') || '—'],
                        ['Phone', String(userObj?.phoneNumber ?? '—')],
                        ['Email', String(userObj?.email ?? '—')],
                        ['Role', String(userObj?.role ?? '—')],
                        ['KYC', String(userObj?.kycStatus ?? '—')],
                        ['Tier', userObj?.kycTier != null ? String(userObj.kycTier) : '—'],
                        ['Joined', fmtDate(userObj?.createdAt as string | undefined)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                          <dt className="text-gray-500">{k}</dt>
                          <dd className="text-right font-medium text-gray-900">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <Wallet className="h-4 w-4" aria-hidden />
                      Wallet
                    </h4>
                    <p className="text-2xl font-semibold tabular-nums" style={{ color: TEXT_DARK }}>
                      {fmtZar(
                        (walletObj?.balance as number | string | undefined) ??
                          (walletObj?.availableBalance as number | string | undefined),
                      )}
                    </p>
                    {walletObj && Object.keys(walletObj).length > 0 && (
                      <dl className="mt-3 space-y-2 text-sm text-gray-600">
                        {Object.entries(walletObj)
                          .filter(([key]) => !['balance', 'availableBalance'].includes(key))
                          .slice(0, 8)
                          .map(([key, val]) => (
                            <div key={key} className="flex justify-between gap-2">
                              <dt className="text-gray-500">{key}</dt>
                              <dd className="max-w-[55%] truncate text-right font-mono text-xs">{String(val)}</dd>
                            </div>
                          ))}
                      </dl>
                    )}
                  </section>

                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <FileText className="h-4 w-4" aria-hidden />
                      KYC record
                    </h4>
                    {kycObj && Object.keys(kycObj).length > 0 ? (
                      <dl className="space-y-2 text-sm">
                        {Object.entries(kycObj).map(([key, val]) => (
                          <div key={key} className="flex justify-between gap-2 border-b border-gray-100 pb-2 last:border-0">
                            <dt className="text-gray-500">{key}</dt>
                            <dd className="max-w-[55%] break-words text-right text-gray-900">{String(val)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-400">No KYC details returned.</p>
                    )}
                  </section>

                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Recent transactions</h4>
                    {Array.isArray(recentTx) && recentTx.length > 0 ? (
                      <ul className="space-y-3">
                        {recentTx.map((tx, idx) => {
                          const row = tx as Record<string, unknown>;
                          const id = row.id ?? row.reference ?? idx;
                          return (
                            <li
                              key={String(id)}
                              className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 text-xs text-gray-700"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium">
                                  {fmtZar(row.amount as number | string | undefined)}
                                </span>
                                <span className="text-gray-500">{fmtDate(row.createdAt as string | undefined)}</span>
                              </div>
                              {(row.type || row.status || row.description) && (
                                <p className="mt-1 text-gray-500">
                                  {[row.type, row.status, row.description].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400">No recent transactions.</p>
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
