import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

const API_BASE = '/api/v1/admin/transactions';

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

function typeDot(type: string | null | undefined): string {
  const t = normalizeType(type);
  switch (t) {
    case 'deposit':
      return 'bg-blue-500';
    case 'withdrawal':
      return 'bg-orange-500';
    case 'purchase':
      return 'bg-violet-500';
    case 'transfer':
      return 'bg-slate-500';
    default:
      return 'bg-gray-400';
  }
}

function typeTextClass(type: string | null | undefined): string {
  const t = normalizeType(type);
  switch (t) {
    case 'deposit':
      return 'text-blue-700';
    case 'withdrawal':
      return 'text-orange-700';
    case 'purchase':
      return 'text-violet-700';
    case 'transfer':
      return 'text-slate-700';
    default:
      return 'text-[var(--muted-foreground)]';
  }
}

function statusDot(status: string | null | undefined): string {
  const s = (status || '').toLowerCase().trim();
  switch (s) {
    case 'completed':
      return 'bg-emerald-500';
    case 'pending':
      return 'bg-amber-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function statusTextClass(status: string | null | undefined): string {
  const s = (status || '').toLowerCase().trim();
  switch (s) {
    case 'completed':
      return 'text-emerald-700';
    case 'pending':
      return 'text-amber-700';
    case 'failed':
      return 'text-red-700';
    default:
      return 'text-[var(--muted-foreground)]';
  }
}

function amountClass(type: string | null | undefined): string {
  const t = normalizeType(type);
  if (t === 'deposit') return 'font-semibold text-emerald-600';
  if (t === 'withdrawal') return 'font-semibold text-red-600';
  return 'font-semibold text-[var(--foreground)]';
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

const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-[var(--border)]">
        {Array.from({ length: 7 }).map((__, j) => (
          <td key={j} className="px-4 py-3">
            <div className="h-4 w-full max-w-[8rem] rounded bg-[var(--muted)] animate-pulse" />
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

  const closeDrawer = () => setDrawerTxId(null);

  const summaryCount = summary?.transactionCount ?? pagination?.total ?? 0;
  const summaryAmount = summary?.totalAmount;

  const tx = detailPayload?.transaction;
  const detailUser = detailPayload?.user;
  const journalEntries = detailPayload?.journalEntries;

  const openRow = (row: TransactionRow) => {
    setDrawerTxId(row.id);
  };

  const showFrom = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const showTo = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;
  const showTotal = pagination?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">Transaction Monitoring</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Search and review platform transactions, statuses, and ledger journal lines.
          </p>
        </div>
      </div>

      {/* Summary stats row */}
      {!listLoading && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]">
            Total: {Intl.NumberFormat('en-ZA').format(Number(summaryCount) || 0)}
          </span>
          {summaryAmount != null && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
              Volume: {fmtZar(summaryAmount)}
            </span>
          )}
        </div>
      )}

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
            placeholder="Search reference or description…"
            className="w-full min-h-[44px] rounded-lg border border-[var(--border)] bg-white pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition-shadow placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            aria-label="Search transactions"
          />
        </div>

        <select
          id="tx-type-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TxTypeFilter)}
          className="min-h-[44px] min-w-[140px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          aria-label="Type filter"
        >
          <option value="">Type: All</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="purchase">Purchase</option>
          <option value="transfer">Transfer</option>
        </select>

        <select
          id="tx-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TxStatusFilter)}
          className="min-h-[44px] min-w-[140px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          aria-label="Status filter"
        >
          <option value="">Status: All</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <input
          id="tx-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="min-h-[44px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          aria-label="From date"
        />

        <input
          id="tx-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="min-h-[44px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          aria-label="To date"
        />

        <input
          id="tx-user-id"
          type="text"
          inputMode="numeric"
          placeholder="User ID"
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value.replace(/\D/g, ''))}
          className="min-h-[44px] w-28 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          aria-label="Filter by user ID"
        />
      </div>

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
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Date</th>
              </tr>
            </thead>
            {listLoading && transactions.length === 0 ? (
              <TableSkeleton />
            ) : transactions.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <Activity className="h-10 w-10 text-[var(--muted-foreground)]/40" strokeWidth={1.25} aria-hidden />
                      <p className="text-base font-medium text-[var(--foreground)]">No transactions found</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Try adjusting your filters or date range.
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
                    className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50 focus:bg-[var(--muted)]/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--primary)]/30"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-[var(--foreground)]">{row.reference || '—'}</td>
                    <td className="max-w-[220px] px-4 py-3 text-sm text-[var(--muted-foreground)]" title={row.description || undefined}>
                      {truncate(row.description, 48)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono tabular-nums ${amountClass(row.type)}`}>
                      {fmtZar(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${typeDot(row.type)}`} />
                        <span className={`text-xs font-medium capitalize ${typeTextClass(row.type)}`}>
                          {row.type || '—'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${statusDot(row.status)}`} />
                        <span className={`text-xs font-medium capitalize ${statusTextClass(row.status)}`}>
                          {row.status || '—'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-[var(--foreground)]">{displayUserName(row.user)}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{row.user?.phoneNumber || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap text-[var(--muted-foreground)]">
                      {fmtDateTime(row.createdAt ?? undefined)}
                    </td>
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
      {listLoading && transactions.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" aria-hidden />
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
          <div className="relative flex h-full w-full max-w-lg flex-col border-l border-[var(--border)] bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[var(--primary)]" aria-hidden />
                <h3 id="tx-drawer-title" className="text-lg font-semibold text-[var(--foreground)]">
                  Transaction Details
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
                  <p className="text-sm text-[var(--muted-foreground)]">Loading transaction…</p>
                </div>
              )}

              {/* Error */}
              {!detailLoading && detailError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                  <p className="flex-1 text-sm text-red-800">{detailError}</p>
                  <button
                    type="button"
                    onClick={() => fetchDetail(drawerTxId)}
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
                  {/* Transaction fields */}
                  <section>
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      <Receipt className="h-4 w-4" aria-hidden />
                      Transaction
                    </h4>
                    {tx && Object.keys(tx).length > 0 ? (
                      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                        <dl className="divide-y divide-[var(--border)]">
                          {[
                            ['ID', String(tx.id ?? drawerTxId)],
                            ['Reference', String(tx.reference ?? '—')],
                            ['Description', String(tx.description ?? '—')],
                            [
                              'Amount',
                              <span key="amt" className={`font-mono tabular-nums ${amountClass(String(tx.type))}`}>
                                {fmtZar(tx.amount as number | string | undefined)}
                                {tx.currency != null ? ` ${String(tx.currency)}` : ''}
                              </span>,
                            ],
                            ['Type', String(tx.type ?? '—')],
                            ['Status', String(tx.status ?? '—')],
                            ['Created', fmtDateTime(tx.createdAt as string | undefined)],
                          ].map(([k, v]) => (
                            <div key={String(k)} className="flex items-center justify-between gap-4 px-4 py-2.5">
                              <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{k}</dt>
                              <dd className="break-words text-right text-sm text-[var(--foreground)]">{v}</dd>
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
                              <div key={key} className="flex items-center justify-between gap-4 px-4 py-2.5">
                                <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{key}</dt>
                                <dd className="max-w-[60%] break-words text-right font-mono text-xs text-[var(--foreground)]">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No transaction payload.</p>
                    )}
                  </section>

                  {/* User */}
                  {detailUser && Object.keys(detailUser).length > 0 && (
                    <section>
                      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Wallet User</h4>
                      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                        <dl className="divide-y divide-[var(--border)]">
                          {Object.entries(detailUser).map(([key, val]) => (
                            <div key={key} className="flex items-center justify-between gap-2 px-4 py-2.5">
                              <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{key}</dt>
                              <dd className="max-w-[55%] break-words text-right text-sm text-[var(--foreground)]">{String(val)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </section>
                  )}

                  {/* Journal entries */}
                  <section>
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      <BookOpen className="h-4 w-4" aria-hidden />
                      Journal Entries
                    </h4>
                    {Array.isArray(journalEntries) && journalEntries.length > 0 ? (
                      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Account</th>
                              <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                                <span className="inline-flex items-center gap-1">
                                  <ArrowDownLeft className="h-3 w-3 text-red-500" aria-hidden />
                                  Debit
                                </span>
                              </th>
                              <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                                <span className="inline-flex items-center gap-1">
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
                                <tr key={String(rk)} className="border-b border-[var(--border)] last:border-0">
                                  <td className="px-4 py-2.5 font-mono text-[var(--foreground)]">{account}</td>
                                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-red-700">{debit}</td>
                                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-700">{credit}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No journal entries returned.</p>
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
