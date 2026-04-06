import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Receipt,
  Search,
  X,
} from 'lucide-react';

const API_BASE = '/api/v1/admin/transactions';

const ACCENT = '#00B894';
const TEXT_DARK = '#1a1a2e';

const fmtZar = (amount: number | string | null | undefined) => {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (amount == null || Number.isNaN(n)) {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(0);
  }
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
};

const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('portal_token');
  const h: Record<string, string> = { Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export interface TransactionUser {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
}

export interface TransactionRow {
  id: number | string;
  reference?: string | null;
  description?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  user?: TransactionUser | null;
}

interface ListPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ListSummary {
  totalAmount?: number | string | null;
  transactionCount?: number | null;
}

type TxTypeFilter = '' | 'deposit' | 'withdrawal' | 'purchase' | 'transfer';
type TxStatusFilter = '' | 'completed' | 'pending' | 'failed';

function normalizeType(t: string | null | undefined): string {
  return (t || '').toLowerCase().trim();
}

function typeBadgeClass(type: string | null | undefined): string {
  const t = normalizeType(type);
  switch (t) {
    case 'deposit':
      return 'bg-blue-50 text-blue-800 ring-1 ring-blue-200';
    case 'withdrawal':
      return 'bg-orange-50 text-orange-800 ring-1 ring-orange-200';
    case 'purchase':
      return 'bg-violet-50 text-violet-800 ring-1 ring-violet-200';
    case 'transfer':
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    default:
      return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
  }
}

function statusBadgeClass(status: string | null | undefined): string {
  const s = (status || '').toLowerCase().trim();
  switch (s) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
    case 'failed':
      return 'bg-red-50 text-red-800 ring-1 ring-red-200';
    default:
      return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
  }
}

function amountClass(type: string | null | undefined): string {
  const t = normalizeType(type);
  if (t === 'deposit') return 'font-semibold text-emerald-600';
  if (t === 'withdrawal') return 'font-semibold text-red-600';
  return 'font-semibold text-gray-900';
}

function displayUserName(u: TransactionUser | null | undefined): string {
  if (!u) return '—';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  const n = `${a} ${b}`.trim();
  return n || '—';
}

function truncate(s: string | null | undefined, max: number): string {
  if (!s) return '—';
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-gray-100">
        {Array.from({ length: 7 }).map((__, j) => (
          <td key={j} className="px-4 py-3">
            <div className="h-4 w-full max-w-[8rem] rounded bg-gray-100 animate-pulse" />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

function pickJournalFields(row: Record<string, unknown>): {
  account: string;
  debit: string;
  credit: string;
} {
  const account =
    row.accountCode != null
      ? String(row.accountCode)
      : row.account_code != null
        ? String(row.account_code)
        : row.code != null
          ? String(row.code)
          : row.ledgerAccountCode != null
            ? String(row.ledgerAccountCode)
            : '—';

  const debitRaw =
    row.debitAmount ?? row.debit ?? row.debit_amount ?? row.amountDebit ?? row.dr;
  const creditRaw =
    row.creditAmount ?? row.credit ?? row.credit_amount ?? row.amountCredit ?? row.cr;

  const debitNum = debitRaw != null && debitRaw !== '' ? Number(debitRaw) : NaN;
  const creditNum = creditRaw != null && creditRaw !== '' ? Number(creditRaw) : NaN;

  return {
    account,
    debit: !Number.isNaN(debitNum) && debitNum !== 0 ? fmtZar(debitNum) : '—',
    credit: !Number.isNaN(creditNum) && creditNum !== 0 ? fmtZar(creditNum) : '—',
  };
}

export const TransactionMonitoringOverlay: React.FC = () => {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('');
  const [statusFilter, setStatusFilter] = useState<TxStatusFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [pagination, setPagination] = useState<ListPagination | null>(null);
  const [summary, setSummary] = useState<ListSummary | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [drawerTxId, setDrawerTxId] = useState<string | number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailPayload, setDetailPayload] = useState<{
    transaction?: Record<string, unknown> | null;
    user?: Record<string, unknown> | null;
    journalEntries?: unknown[] | null;
  } | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter, dateFrom, dateTo, userIdFilter, limit]);

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
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const uid = userIdFilter.trim();
    if (uid) params.set('userId', uid);

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
        setListError((json as { error?: string }).error || 'Failed to load transactions');
        setTransactions([]);
        setPagination(null);
        setSummary(null);
        return;
      }

      const data = (
        json as {
          data?: {
            transactions?: TransactionRow[];
            pagination?: ListPagination;
            summary?: ListSummary;
          };
        }
      ).data;

      setTransactions(Array.isArray(data?.transactions) ? data!.transactions! : []);
      setPagination(data?.pagination ?? null);
      setSummary(data?.summary ?? null);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setListError('Network error while loading transactions');
      setTransactions([]);
      setPagination(null);
      setSummary(null);
    } finally {
      setListLoading(false);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    typeFilter,
    statusFilter,
    dateFrom,
    dateTo,
    userIdFilter,
    handleUnauthorized,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fetchDetail = useCallback(
    async (id: string | number) => {
      detailAbortRef.current?.abort();
      const ac = new AbortController();
      detailAbortRef.current = ac;

      setDetailLoading(true);
      setDetailError(null);
      setDetailPayload(null);

      try {
        const res = await fetch(`${API_BASE}/${encodeURIComponent(String(id))}`, {
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
          setDetailError((json as { error?: string }).error || 'Failed to load transaction');
          return;
        }

        const data = (json as { data?: Record<string, unknown> }).data;
        if (data && typeof data === 'object') {
          setDetailPayload({
            transaction: (data.transaction as Record<string, unknown>) ?? null,
            user: (data.user as Record<string, unknown>) ?? null,
            journalEntries: Array.isArray(data.journalEntries) ? data.journalEntries : [],
          });
        } else {
          setDetailPayload({ transaction: null, user: null, journalEntries: [] });
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setDetailError('Network error while loading transaction');
      } finally {
        setDetailLoading(false);
      }
    },
    [handleUnauthorized],
  );

  useEffect(() => {
    if (drawerTxId == null) {
      detailAbortRef.current?.abort();
      setDetailPayload(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    fetchDetail(drawerTxId);
  }, [drawerTxId, fetchDetail]);

  const totalPages = useMemo(() => {
    if (pagination?.totalPages != null) return Math.max(1, pagination.totalPages);
    return 1;
  }, [pagination]);

  const pageLabel = pagination
    ? `Page ${pagination.page} of ${totalPages}`
    : `Page ${page} of ${totalPages}`;

  const closeDrawer = () => setDrawerTxId(null);

  const summaryCount = summary?.transactionCount ?? pagination?.total ?? 0;
  const summaryAmount = summary?.totalAmount;

  const tx = detailPayload?.transaction;
  const detailUser = detailPayload?.user;
  const journalEntries = detailPayload?.journalEntries;

  const openRow = (row: TransactionRow) => {
    setDrawerTxId(row.id);
  };

  return (
    <div className="space-y-6" style={{ color: TEXT_DARK }}>
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight" style={{ color: TEXT_DARK }}>
              Transaction monitoring
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Search and review platform transactions, statuses, and ledger journal lines.
            </p>
          </div>
        </div>

        {/* Summary bar */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total count</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: TEXT_DARK }}>
              {listLoading && transactions.length === 0 ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-200" />
              ) : (
                Intl.NumberFormat('en-ZA').format(Number(summaryCount) || 0)
              )}
            </p>
            <p className="mt-1 text-xs text-gray-400">Matches current filters (this page context)</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total amount (ZAR)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: ACCENT }}>
              {listLoading && transactions.length === 0 ? (
                <span className="inline-block h-8 w-40 animate-pulse rounded bg-gray-200" />
              ) : (
                fmtZar(summaryAmount)
              )}
            </p>
            <p className="mt-1 text-xs text-gray-400">From API summary for filtered result set</p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="mt-6 flex flex-col gap-4">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search reference or description…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-shadow focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20"
              aria-label="Search transactions"
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tx-type-filter" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Type
              </label>
              <select
                id="tx-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TxTypeFilter)}
                className="min-w-[160px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20"
              >
                <option value="">All</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="purchase">Purchase</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tx-status-filter" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </label>
              <select
                id="tx-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TxStatusFilter)}
                className="min-w-[160px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20"
              >
                <option value="">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tx-date-from" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                From
              </label>
              <input
                id="tx-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tx-date-to" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                To
              </label>
              <input
                id="tx-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tx-user-id" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                User ID
              </label>
              <input
                id="tx-user-id"
                type="text"
                inputMode="numeric"
                placeholder="Optional"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value.replace(/\D/g, ''))}
                className="w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20"
                aria-label="Filter by user ID"
              />
            </div>
          </div>
        </div>
      </div>

      {listError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{listError}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">User</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
              </tr>
            </thead>
            {listLoading && transactions.length === 0 ? (
              <TableSkeleton />
            ) : transactions.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <Receipt className="h-10 w-10 text-gray-300" strokeWidth={1.25} aria-hidden />
                      <p className="text-base font-medium text-gray-600">No transactions found</p>
                      <p className="text-sm text-gray-400">
                        Adjust search, filters, or date range, or clear filters to see more results.
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {transactions.map((row) => (
                  <tr
                    key={String(row.id)}
                    onClick={() => openRow(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openRow(row);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50/80 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#00B894]/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">{row.reference || '—'}</td>
                    <td className="max-w-[220px] px-4 py-3 text-gray-700" title={row.description || undefined}>
                      {truncate(row.description, 48)}
                    </td>
                    <td className={`px-4 py-3 tabular-nums ${amountClass(row.type)}`}>{fmtZar(row.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeBadgeClass(row.type)}`}
                      >
                        {row.type || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
                      >
                        {row.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">{displayUserName(row.user)}</div>
                      <div className="text-xs text-gray-500">{row.user?.phoneNumber || '—'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{fmtDateTime(row.createdAt ?? undefined)}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

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

      {listLoading && transactions.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: ACCENT }} aria-hidden />
          Updating results…
        </div>
      )}

      {/* Detail drawer */}
      {drawerTxId != null && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-drawer-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
            aria-label="Close drawer"
            onClick={closeDrawer}
          />
          <div className="relative flex h-full w-full max-w-lg flex-col border-l border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5" style={{ color: ACCENT }} aria-hidden />
                <h3 id="tx-drawer-title" className="text-lg font-semibold" style={{ color: TEXT_DARK }}>
                  Transaction details
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
                  <p className="text-sm">Loading transaction…</p>
                </div>
              )}

              {!detailLoading && detailError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{detailError}</div>
              )}

              {!detailLoading && !detailError && detailPayload && (
                <div className="space-y-6">
                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <Receipt className="h-4 w-4" aria-hidden />
                      Transaction
                    </h4>
                    {tx && Object.keys(tx).length > 0 ? (
                      <dl className="space-y-2 text-sm">
                        {[
                          ['ID', String(tx.id ?? drawerTxId)],
                          ['Reference', String(tx.reference ?? '—')],
                          ['Description', String(tx.description ?? '—')],
                          [
                            'Amount',
                            <span key="amt" className={amountClass(String(tx.type))}>
                              {fmtZar(tx.amount as number | string | undefined)}
                              {tx.currency != null ? ` ${String(tx.currency)}` : ''}
                            </span>,
                          ],
                          ['Type', String(tx.type ?? '—')],
                          ['Status', String(tx.status ?? '—')],
                          ['Created', fmtDateTime(tx.createdAt as string | undefined)],
                        ].map(([k, v]) => (
                          <div
                            key={String(k)}
                            className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                          >
                            <dt className="shrink-0 text-gray-500">{k}</dt>
                            <dd className="break-words text-right font-medium text-gray-900">{v}</dd>
                          </div>
                        ))}
                        {Object.entries(tx)
                          .filter(
                            ([key]) =>
                              ![
                                'id',
                                'reference',
                                'description',
                                'amount',
                                'currency',
                                'type',
                                'status',
                                'createdAt',
                                'user',
                                'userId',
                              ].includes(key),
                          )
                          .map(([key, val]) => (
                            <div
                              key={key}
                              className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                            >
                              <dt className="shrink-0 text-gray-500">{key}</dt>
                              <dd className="max-w-[60%] break-words text-right font-mono text-xs text-gray-800">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </dd>
                            </div>
                          ))}
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-400">No transaction payload.</p>
                    )}
                  </section>

                  {detailUser && Object.keys(detailUser).length > 0 && (
                    <section className="rounded-xl border border-gray-200 p-4">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Wallet user</h4>
                      <dl className="space-y-2 text-sm">
                        {Object.entries(detailUser).map(([key, val]) => (
                          <div
                            key={key}
                            className="flex justify-between gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                          >
                            <dt className="text-gray-500">{key}</dt>
                            <dd className="max-w-[55%] break-words text-right text-gray-900">{String(val)}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}

                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <BookOpen className="h-4 w-4" aria-hidden />
                      Journal entries
                    </h4>
                    {Array.isArray(journalEntries) && journalEntries.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[280px] text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-left text-gray-500">
                              <th className="py-2 pr-2 font-semibold">Account</th>
                              <th className="py-2 pr-2 font-semibold">
                                <span className="inline-flex items-center gap-0.5">
                                  <ArrowDownLeft className="h-3 w-3 text-red-500" aria-hidden />
                                  Debit
                                </span>
                              </th>
                              <th className="py-2 font-semibold">
                                <span className="inline-flex items-center gap-0.5">
                                  <ArrowUpRight className="h-3 w-3 text-emerald-600" aria-hidden />
                                  Credit
                                </span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {journalEntries.map((raw, idx) => {
                              const row = raw as Record<string, unknown>;
                              const { account, debit, credit } = pickJournalFields(row);
                              const rk = row.id ?? row.lineId ?? row.journalEntryId ?? idx;
                              return (
                                <tr key={String(rk)} className="border-b border-gray-100 last:border-0">
                                  <td className="py-2 pr-2 font-mono text-gray-800">{account}</td>
                                  <td className="py-2 pr-2 tabular-nums text-red-700">{debit}</td>
                                  <td className="py-2 tabular-nums text-emerald-700">{credit}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No journal entries returned.</p>
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
