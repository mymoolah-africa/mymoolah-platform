---
name: admin-portal-builder
version: 1.0.0
description: >
  Guide for building the MMTP Admin Portal (MMAP) — a banking-grade
  administrative interface for the MyMoolah Treasury Platform. Covers
  RBAC, dashboard architecture, data tables, maker-checker workflows,
  admin audit logging, and overlay patterns. Use when building portal
  screens, admin APIs, or management interfaces.
tags:
  - portal
  - admin
  - dashboard
  - rbac
  - management
  - react
  - express
---

# MMTP Admin Portal Builder Skill

## 1. Purpose

You are an expert full-stack developer building the MyMoolah Treasury
Platform Admin Portal (MMAP). When this skill is active you MUST follow
the patterns, file conventions, and security requirements documented
below for every portal screen, admin API endpoint, dashboard widget, and
management interface you create or modify.

**This skill activates when the context involves:**
- Admin or portal screens (dashboards, overlays, management views)
- Dashboard widgets, metric cards, KPI panels, or charts
- Admin API endpoints under `/api/v1/admin/`
- RBAC (role-based access control) for portal users
- Maker-checker approval workflows
- Data tables with server-side pagination, filtering, or export
- Admin audit logging or compliance-related UI
- Portal user management (creating/editing portal accounts)
- Any file inside the `portal/` directory tree

> **Relationship to Wallet Frontend**: The portal is a *separate* React
> app from the wallet (`mymoolah-wallet-frontend/`). It shares the same
> PostgreSQL database via Cloud SQL but runs its own Express backend and
> Vite dev server. Portal is **desktop-first**; wallet is mobile-first.
> Both use Tailwind CSS and the MyMoolah design system.

---

## 2. Portal Architecture

### 2.1 File Structure

```
portal/
├── admin/
│   └── frontend/                  # React + Vite admin SPA
│       ├── src/
│       │   ├── App.tsx            # Root component
│       │   ├── main.tsx           # Vite entry point
│       │   ├── index.css          # Tailwind imports + global styles
│       │   ├── pages/
│       │   │   ├── AdminDashboard.tsx
│       │   │   ├── AdminLogin.tsx
│       │   │   └── AdminLoginSimple.tsx
│       │   ├── components/
│       │   │   ├── routing/
│       │   │   │   └── RouteConfig.tsx      # All portal routes
│       │   │   ├── layout/
│       │   │   │   └── AppLayoutWrapper.tsx  # Sidebar + top bar shell
│       │   │   ├── admin-overlays/           # Feature screens
│       │   │   │   ├── UnallocatedDepositsOverlay.tsx  ← LIVE
│       │   │   │   ├── DisbursementRunsOverlay.tsx     ← LIVE
│       │   │   │   ├── DisbursementRunDetailOverlay.tsx ← LIVE
│       │   │   │   ├── CreateDisbursementRunOverlay.tsx ← LIVE
│       │   │   │   ├── UserManagementOverlay.tsx        ← PLACEHOLDER
│       │   │   │   ├── TransactionMonitoringOverlay.tsx ← PLACEHOLDER
│       │   │   │   ├── FloatManagementOverlay.tsx       ← PLACEHOLDER
│       │   │   │   ├── SettlementManagementOverlay.tsx  ← PLACEHOLDER
│       │   │   │   ├── ReportingAnalyticsOverlay.tsx    ← PLACEHOLDER
│       │   │   │   ├── ServiceManagementOverlay.tsx     ← PLACEHOLDER
│       │   │   │   ├── SystemConfigurationOverlay.tsx   ← PLACEHOLDER
│       │   │   │   ├── SecurityAuditOverlay.tsx         ← PLACEHOLDER
│       │   │   │   └── PartnerOnboardingOverlay.tsx     ← PLACEHOLDER
│       │   │   ├── ui/              # Shadcn-style primitives
│       │   │   │   ├── button.tsx
│       │   │   │   ├── card.tsx
│       │   │   │   ├── table.tsx
│       │   │   │   ├── badge.tsx
│       │   │   │   ├── dialog.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   ├── label.tsx
│       │   │   │   ├── alert.tsx
│       │   │   │   ├── checkbox.tsx
│       │   │   │   ├── separator.tsx
│       │   │   │   └── dropdown-menu.tsx
│       │   │   ├── common/
│       │   │   │   └── ErrorBoundary.tsx
│       │   │   └── providers/
│       │   │       └── AppProviders.tsx
│       │   ├── contexts/
│       │   │   ├── AuthContext.tsx
│       │   │   └── MoolahContext.tsx
│       │   └── lib/
│       │       └── utils.ts         # cn() helper (clsx + tailwind-merge)
│       ├── tailwind.config.js
│       ├── vite.config.ts
│       └── package.json
├── backend/                        # Express API for portal
│   ├── app.js                      # Express app setup
│   ├── server.js                   # HTTP listener
│   ├── routes/
│   │   ├── admin.js                # /api/v1/admin/* routes
│   │   └── auth.js                 # /api/v1/auth/* routes
│   ├── controllers/
│   │   ├── adminController.js
│   │   └── authController.js
│   ├── middleware/
│   │   └── portalAuth.js           # JWT auth + RBAC middleware
│   ├── models/
│   │   ├── index.js
│   │   ├── PortalUser.js
│   │   └── DualRoleFloat.js
│   ├── migrations/
│   │   └── 20250904_create_portal_tables.js
│   ├── seeders/
│   │   └── 20250904_seed_admin_user.js
│   ├── config/
│   │   └── config.json
│   └── package.json
├── shared/                         # Cross-portal shared components
│   ├── components/
│   │   ├── Cards/
│   │   │   └── MetricCard.tsx
│   │   └── Layout/
│   │       └── PortalLayout.tsx
│   └── styles/
│       ├── portal-config.css
│       └── globals.css
├── package.json
└── env.template
```

### 2.2 Separation from Wallet App

| Concern | Wallet | Admin Portal |
|---------|--------|-------------|
| Codebase | `mymoolah-wallet-frontend/` | `portal/admin/frontend/` |
| Backend | Main Express app (`server.js`, `routes/`) | `portal/backend/` |
| Design focus | Mobile-first | Desktop-first |
| Users | End-user wallet holders | Ops staff, admins, managers |
| Auth | JWT via main `/api/v1/auth` | JWT via `portal/backend/middleware/portalAuth.js` |
| Database | Cloud SQL (via `db-connection-helper.js`) | **Same** Cloud SQL (via `db-connection-helper.js`) |

### 2.3 Database Access

The portal backend connects to the **same** Cloud SQL instances as the
main MMTP app. All queries MUST use `scripts/db-connection-helper.js`:

```js
// portal/backend/controllers/adminController.js
const { getUATClient, getStagingClient, getProductionClient } = require('../../../scripts/db-connection-helper');

async function getFloatBalances(req, res) {
  const client = await getProductionClient();
  try {
    const result = await client.query(
      `SELECT la.code, la.name, la.balance
       FROM ledger_accounts la
       WHERE la.code LIKE '1200-%'
       ORDER BY la.code`,
    );
    res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
  } finally {
    client.release();
  }
}
```

**Never** use `new Sequelize(...)`, `new Pool(...)`, or raw
`process.env.DATABASE_URL` in portal code.

### 2.4 Shared Models

The portal reads from the same tables as the main app. In addition,
portal-specific tables exist:

| Table | Model | Purpose |
|-------|-------|---------|
| `portal_users` | `PortalUser` | Admin/supplier/merchant login accounts |
| `dual_role_floats` | `DualRoleFloat` | Float tracking for dual-role entities |

When querying main-app tables (e.g. `users`, `transactions`,
`journal_entries`, `ledger_accounts`) from the portal backend, use
`db-connection-helper.js` raw queries — do NOT import main-app Sequelize
models.

---

## 3. Authentication & Authorization (RBAC)

### 3.1 JWT-Based Auth

Portal authentication is handled by `portal/backend/middleware/portalAuth.js`.

**Exported middleware functions:**

| Middleware | Purpose | Usage |
|-----------|---------|-------|
| `portalAuth(portalType)` | Verify JWT + check portal access | `portalAuth('admin')` on every admin route |
| `requireRole(roles)` | Restrict to specific roles | `requireRole(['admin', 'manager'])` |
| `requirePermission(perm)` | Check granular permission | `requirePermission('float.topup')` |
| `requireDualRole(role)` | Check dual-role access | `requireDualRole('supplier')` |
| `requireEntityOwnership(param)` | Scope to own entity data | `requireEntityOwnership('entityId')` |
| `auditLog(action)` | Log admin action to audit trail | `auditLog('VIEW_USERS')` |

**Chaining middleware on a route:**

```js
router.post('/floats/:id/topup',
  portalAuth('admin'),
  requireRole(['admin', 'manager']),
  auditLog('FLOAT_TOPUP'),
  strictLimit,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('amount must be positive'),
    body('reason').notEmpty().isLength({ max: 500 }),
  ],
  adminController.topUpFloat.bind(adminController)
);
```

### 3.2 Role Hierarchy

```
admin        Full access. Can approve own-entity changes, manage all entities.
  └── manager    Can initiate financial operations, manage users within scope.
        └── user       Can view data, initiate non-financial operations.
              └── viewer   Read-only access to dashboards and reports.
```

The `admin` role implicitly has all permissions. Lower roles require
explicit entries in the `permissions` JSONB column of `portal_users`.

### 3.3 Entity Types

```
supplier   — VAS suppliers (Flash, MobileMart, eeziCash, etc.)
client     — Corporate clients using treasury services
merchant   — Point-of-sale merchants (NFC deposits, cashout)
reseller   — Sub-distributors reselling VAS products
admin      — MyMoolah internal operations staff
```

Each `PortalUser` has an `entityType` and `entityId` linking them to the
corresponding entity in the core MMTP database. A user with
`hasDualRole: true` can access multiple portal types (e.g. a merchant
who is also a supplier).

### 3.4 Permission Checking Patterns

```js
// In a controller — check granular permission
if (!req.portalUser.role === 'admin' && !req.portalUser.permissions?.['settlement.approve']) {
  return res.status(403).json({ success: false, error: 'Insufficient permissions.', timestamp: new Date().toISOString() });
}
```

On the frontend, use the `AuthContext` to gate UI elements:

```tsx
import { useAuth } from '../contexts/AuthContext';

function SettlementActions() {
  const { user } = useAuth();
  const canApprove = user?.role === 'admin' || user?.permissions?.['settlement.approve'];

  return canApprove ? <Button onClick={handleApprove}>Approve</Button> : null;
}
```

### 3.5 Session Management

- Token stored in `localStorage` as `portal_token`
- User object stored as `portal_user`
- Frontend `ProtectedRoute` component (in `RouteConfig.tsx`) checks both
  exist before rendering protected routes; redirects to `/admin/login`
  otherwise
- Token expiry: short-lived (configurable via `PORTAL_JWT_SECRET` env var)
- Account lockout: 5 failed login attempts → 2-hour lockout

---

## 4. Dashboard Architecture

### 4.1 MetricCard Component

The shared `MetricCard` component (`portal/shared/components/Cards/MetricCard.tsx`)
renders a single KPI tile:

```tsx
import MetricCard from '../../shared/components/Cards/MetricCard';
import { DollarSign } from 'lucide-react';

<MetricCard
  title="Total Float Balance"
  value={2450000}
  format="currency"           // 'currency' | 'number' | 'percentage' | 'text'
  color="green"               // 'green' | 'blue' | 'red' | 'orange' | 'purple' | 'gray'
  icon={DollarSign}
  subtitle="Across all suppliers"
  change={{ value: 4.2, type: 'increase' }}
  loading={isLoading}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | KPI label |
| `value` | `string \| number` | Metric value |
| `format` | `'currency' \| 'number' \| 'percentage' \| 'text'` | How to format `value` |
| `color` | `string` | Card accent color |
| `icon` | `LucideIcon` | Icon from `lucide-react` |
| `subtitle` | `string?` | Secondary text below value |
| `change` | `{ value: number, type: 'increase' \| 'decrease' \| 'neutral' }?` | Trend indicator |
| `loading` | `boolean?` | Show placeholder while fetching |

### 4.2 Dashboard Data Fetching

Use a **single aggregate API endpoint** to fetch all dashboard metrics
in one call, reducing round trips and ensuring consistent timestamps:

```js
// Backend: GET /api/v1/admin/dashboard
async getDashboard(req, res) {
  const client = await getProductionClient();
  try {
    const [metrics, alerts, recentTxns] = await Promise.all([
      client.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE "isActive" = true) AS total_users,
          (SELECT SUM(balance) FROM ledger_accounts WHERE code LIKE '1200-%') AS total_float,
          (SELECT COUNT(*) FROM transactions WHERE "createdAt" > NOW() - INTERVAL '24 hours') AS txns_24h
      `),
      client.query(`SELECT * FROM admin_alerts WHERE resolved = false ORDER BY created_at DESC LIMIT 10`),
      client.query(`SELECT * FROM transactions ORDER BY "createdAt" DESC LIMIT 20`),
    ]);
    res.json({
      success: true,
      data: { metrics: metrics.rows[0], alerts: alerts.rows, recentTransactions: recentTxns.rows },
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
}
```

### 4.3 Real-Time vs Polling

| Strategy | When to Use | Implementation |
|----------|-------------|---------------|
| Polling (30s) | Dashboard metrics, float balances | `setInterval` + `useEffect` cleanup |
| Polling (5s) | Active settlement processing, disbursement runs | Short interval during active operations only |
| Manual refresh | Data tables, transaction search | Refresh button in header |
| SSE/WebSocket | Future: real-time alerts | Not implemented yet |

```tsx
useEffect(() => {
  fetchDashboard();
  const interval = setInterval(fetchDashboard, 30_000);
  return () => clearInterval(interval);
}, []);
```

### 4.4 KPI Categories

**Financial KPIs:**
- Total float balances (per supplier and aggregate)
- Commission revenue (today, MTD, YTD)
- Transaction volume (ZAR) by period
- Unallocated deposit total (suspense account `2600-01-01`)
- Settlement amounts due

**Operational KPIs:**
- Transaction count (24h, 7d, 30d)
- Auto-match rate for deposits
- Supplier circuit breaker status (open/closed/half-open)
- API response times (P50, P95, P99)
- System uptime percentage

**Compliance KPIs:**
- KYC completion rate (Tier 0 → Tier 1 → Tier 2 conversion)
- FICA reporting status (STR/SAR filed)
- Audit trail integrity (hash-chain verification)
- POPIA data subject requests pending

### 4.5 Chart Types

| Chart | Use For |
|-------|---------|
| Line | Transaction volume over time, revenue trends |
| Bar | Supplier comparison, daily volumes |
| Donut/Pie | Entity distribution, KYC tier breakdown |
| Sparkline | Inline trend in MetricCard subtitle |
| Heatmap | Transaction volume by hour/day |

Use a lightweight chart library (`recharts` or `chart.js`) — avoid
pulling in heavy visualization bundles.

---

## 5. Data Table Patterns

### 5.1 Server-Side Pagination (Mandatory)

**All portal data tables MUST use server-side pagination.** Client-side
pagination is forbidden for banking data because:
- Tables may contain millions of rows (transactions, journal entries)
- Loading all rows exposes sensitive data unnecessarily
- Memory exhaustion on the client

**Backend pattern:**

```js
async getTransactions(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const client = await getProductionClient();
  try {
    const [dataResult, countResult] = await Promise.all([
      client.query(
        `SELECT id, type, amount, status, "createdAt"
         FROM transactions
         ORDER BY "createdAt" DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      client.query(`SELECT COUNT(*) AS total FROM transactions`),
    ]);

    const total = parseInt(countResult.rows[0].total);
    res.json({
      success: true,
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
}
```

**Frontend pagination component:**

```tsx
function Pagination({ pagination, onPageChange }: {
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>
        Showing {((pagination.page - 1) * pagination.limit) + 1}–
        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}>
          Previous
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
}
```

### 5.2 Server-Side Filtering & Search

Pass filter params as query strings. Always validate with `express-validator`:

```js
router.get('/transactions',
  portalAuth('admin'),
  standardLimit,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'reversed']),
    query('type').optional().isIn(['deposit', 'withdrawal', 'transfer', 'purchase']),
    query('search').optional().isLength({ max: 255 }).trim().escape(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('minAmount').optional().isFloat({ min: 0 }),
    query('maxAmount').optional().isFloat({ min: 0 }),
  ],
  adminController.getTransactions.bind(adminController)
);
```

Build `WHERE` clauses dynamically with parameterized queries:

```js
const conditions = [];
const params = [];
let paramIdx = 1;

if (req.query.status && req.query.status !== 'all') {
  conditions.push(`status = $${paramIdx++}`);
  params.push(req.query.status);
}
if (req.query.search) {
  conditions.push(`(reference ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`);
  params.push(`%${req.query.search}%`);
  paramIdx++;
}
if (req.query.dateFrom) {
  conditions.push(`"createdAt" >= $${paramIdx++}`);
  params.push(req.query.dateFrom);
}

const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
```

### 5.3 Server-Side Sorting

Accept `sortBy` and `sortOrder` query params. Whitelist allowed columns
to prevent SQL injection:

```js
const SORTABLE_COLUMNS = ['createdAt', 'amount', 'status', 'type', 'reference'];
const sortBy = SORTABLE_COLUMNS.includes(req.query.sortBy) ? `"${req.query.sortBy}"` : '"createdAt"';
const sortOrder = req.query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
```

### 5.4 Bulk Actions

For operations on multiple rows (e.g. approve all pending settlements):

1. Frontend sends array of IDs
2. Backend validates each ID exists and user has permission
3. Wrap in a database transaction
4. Maker-checker required for financial bulk actions (see Section 7)
5. Return per-item success/failure results

```js
body('ids').isArray({ min: 1, max: 100 }).withMessage('ids must be 1–100 items'),
body('ids.*').isInt({ min: 1 }).withMessage('each id must be a positive integer'),
```

### 5.5 Row Actions

Standard row actions for data tables:

| Action | Icon | Permission | Confirmation |
|--------|------|-----------|-------------|
| View | `Eye` | Any role | None |
| Edit | `Pencil` | `manager+` | None |
| Approve | `CheckCircle` | `admin` | Maker-checker dialog |
| Reject | `XCircle` | `admin` | Reason required |
| Export | `Download` | `manager+` | None |

### 5.6 Export

**CSV export** for operational data:

```js
router.get('/transactions/export',
  portalAuth('admin'),
  requireRole(['admin', 'manager']),
  auditLog('EXPORT_TRANSACTIONS'),
  strictLimit,
  adminController.exportTransactions.bind(adminController)
);
```

Set response headers for download:

```js
res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', `attachment; filename="transactions_${Date.now()}.csv"`);
```

**PDF export** for audit reports — use `pdfkit` or `puppeteer` server-side.
Never generate PDFs on the client with sensitive data.

### 5.7 ZAR Monetary Formatting

All monetary values displayed in the portal MUST use South African
formatting:

```ts
function formatZAR(amount: number): string {
  return amount.toLocaleString('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
```

In database queries, store and compare monetary values as `DECIMAL(18,2)`.
Never use floating-point types for money.

---

## 6. Overlay / Screen Patterns

### 6.1 Existing Patterns

The portal uses **overlay components** (full-page content panels rendered
inside `AppLayoutWrapper`) rather than modals. Each overlay is a React
component in `portal/admin/frontend/src/components/admin-overlays/`.

**Reference implementations:**
- `UnallocatedDepositsOverlay.tsx` — data table with filters, pagination,
  action modal (allocate deposit)
- `DisbursementRunsOverlay.tsx` — list view with status badges
- `CreateDisbursementRunOverlay.tsx` — form overlay with validation
- `DisbursementRunDetailOverlay.tsx` — detail view with child data table

### 6.2 Standard Overlay Structure

Every overlay MUST follow this structure:

```tsx
export const [Feature]Overlay: React.FC = () => {
  // State: data, pagination, loading, error, filters
  const [data, setData] = useState<Item[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API instance with auth interceptor
  const API = axios.create({ baseURL: '/api/v1/admin' });
  API.interceptors.request.use((config) => {
    const token = localStorage.getItem('portal_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Fetch function
  const fetchData = useCallback(async () => { /* ... */ }, [page, filters]);
  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* 1. Header — title, description, summary badge, primary action */}
      <div className="mymoolah-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="admin-text-heading text-xl mb-1">[Title]</h2>
            <p className="admin-text-body text-gray-500 text-sm">[Description]</p>
          </div>
          {/* Optional: summary badge or primary action button */}
        </div>
      </div>

      {/* 2. Filters — status tabs, search, date range, refresh */}
      <div className="mymoolah-card p-4">
        {/* Filter controls */}
      </div>

      {/* 3. Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 4. Data table / content */}
      <div className="mymoolah-card overflow-hidden">
        {loading && data.length === 0 ? (
          /* Loading state */
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          /* Empty state */
          <div className="p-10 text-center">
            <p className="text-gray-500 font-medium">No records found.</p>
          </div>
        ) : (
          /* Data state — table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">{/* ... */}</table>
          </div>
        )}
      </div>

      {/* 5. Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination pagination={pagination} onPageChange={setPage} />
      )}

      {/* 6. Action modals (if needed) */}
    </div>
  );
};
```

### 6.3 Four Required States

Every overlay MUST render all four states:

| State | Condition | Rendering |
|-------|-----------|-----------|
| **Loading** | `loading && data.length === 0` | Centered spinner or "Loading..." |
| **Empty** | `!loading && data.length === 0` | Friendly message, optional illustration |
| **Error** | `error !== null` | Red alert banner with retry button |
| **Data** | `data.length > 0` | Table/cards with content |

### 6.4 Form Overlays

For create/edit operations, use a dedicated overlay with form validation:

```tsx
const [formData, setFormData] = useState({ amount: '', reason: '' });
const [formErrors, setFormErrors] = useState<Record<string, string>>({});
const [submitting, setSubmitting] = useState(false);

function validate(): boolean {
  const errors: Record<string, string> = {};
  if (!formData.amount || parseFloat(formData.amount) <= 0) {
    errors.amount = 'Amount must be positive';
  }
  if (!formData.reason.trim()) {
    errors.reason = 'Reason is required';
  }
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
}

async function handleSubmit() {
  if (!validate()) return;
  setSubmitting(true);
  try {
    await API.post('/endpoint', formData);
    // success handling
  } catch (err) {
    setError(err?.response?.data?.error || 'Operation failed');
  } finally {
    setSubmitting(false);
  }
}
```

### 6.5 Wizard Flows

For multi-step operations (settlement processing, disbursement creation):

```tsx
const [step, setStep] = useState<1 | 2 | 3>(1);

return (
  <div>
    {/* Step indicator */}
    <div className="flex gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div key={s} className={`flex-1 h-1 rounded ${s <= step ? 'bg-green-500' : 'bg-gray-200'}`} />
      ))}
    </div>

    {step === 1 && <StepOne onNext={() => setStep(2)} />}
    {step === 2 && <StepTwo onBack={() => setStep(1)} onNext={() => setStep(3)} />}
    {step === 3 && <StepThree onBack={() => setStep(2)} onSubmit={handleSubmit} />}
  </div>
);
```

### 6.6 Adding New Overlays

When creating a new overlay:

1. Create the component in `portal/admin/frontend/src/components/admin-overlays/`
2. Import and add a `<Route>` in `RouteConfig.tsx` wrapped with `ProtectedRoute` + `AppLayoutWrapper`
3. Add the corresponding backend route in `portal/backend/routes/admin.js`
4. Add the controller method in `portal/backend/controllers/adminController.js`
5. Add a sidebar navigation link in `AppLayoutWrapper.tsx`

---

## 7. Maker-Checker Workflows (Banking-Grade)

### 7.1 When Required

Maker-checker (dual authorization) is **mandatory** for:

| Operation | Initiator (Maker) | Approver (Checker) |
|-----------|-------------------|-------------------|
| Float top-up | `manager+` | `admin` (different user) |
| Settlement processing | `manager+` | `admin` (different user) |
| SAR/STR filing | `manager+` | `admin` (different user) |
| User role changes | `admin` | Different `admin` |
| Ledger corrections/manual JEs | `admin` | Different `admin` |
| Commission rate changes | `manager+` | `admin` (different user) |
| System configuration changes | `admin` | Different `admin` |

### 7.2 Workflow

```
┌─────────┐      ┌─────────────┐      ┌──────────────┐      ┌──────────┐
│  Maker   │ ──→  │  PENDING     │ ──→  │   Checker     │ ──→  │ APPROVED │
│ creates  │      │  request     │      │  reviews +    │      │ or       │
│ request  │      │  (audit log) │      │  decides      │      │ REJECTED │
└─────────┘      └─────────────┘      └──────────────┘      └──────────┘
```

### 7.3 Segregation of Duties

The initiator (maker) **cannot** approve their own request. Enforce this
in the backend:

```js
async approveRequest(req, res) {
  const request = await getApprovalRequest(req.params.id);

  if (request.initiatedBy === req.portalUser.id) {
    return res.status(403).json({
      success: false,
      error: 'Segregation of duties violation: you cannot approve your own request.',
      timestamp: new Date().toISOString(),
    });
  }

  // proceed with approval...
}
```

### 7.4 Database Schema for Approval Requests

```sql
CREATE TABLE approval_requests (
  id             SERIAL PRIMARY KEY,
  request_type   VARCHAR(50) NOT NULL,   -- 'FLOAT_TOPUP', 'SETTLEMENT', 'ROLE_CHANGE', etc.
  payload        JSONB NOT NULL,         -- full details of what is being requested
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | expired
  initiated_by   INTEGER NOT NULL REFERENCES portal_users(id),
  approved_by    INTEGER REFERENCES portal_users(id),
  rejection_reason TEXT,
  expires_at     TIMESTAMPTZ,            -- auto-expire stale requests
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_approval_status ON approval_requests(status);
CREATE INDEX idx_approval_type ON approval_requests(request_type);
```

### 7.5 Timeout & Escalation

- Pending approvals older than 24 hours should trigger a notification
  to all admin-role users
- Approvals older than 72 hours should auto-expire with status `expired`
- The dashboard should show a badge count of pending approvals

---

## 8. Admin Audit Logging

### 8.1 Audit Trail Requirements

Every admin action MUST be logged. The portal uses the `auditLog`
middleware from `portalAuth.js` which logs a structured JSON entry:

```json
{
  "action": "ALLOCATE_DEPOSIT",
  "portalUser": {
    "id": 1,
    "entityId": "MMTP-ADMIN",
    "entityType": "admin",
    "role": "admin"
  },
  "method": "POST",
  "url": "/api/v1/admin/unallocated-deposits/42/allocate",
  "ip": "10.0.0.1",
  "userAgent": "Mozilla/5.0 ...",
  "timestamp": "2026-04-06T10:30:00.000Z"
}
```

### 8.2 Event Types

| Event Type | Description | When |
|-----------|-------------|------|
| `ADMIN_LOGIN` | Portal login (success or failure) | Auth route |
| `ADMIN_LOGOUT` | Portal logout | Auth route |
| `ADMIN_VIEW_SENSITIVE` | Viewed PII or financial details | Transaction detail, user profile |
| `ADMIN_ACTION` | General admin operation | Any write operation |
| `FLOAT_TOPUP` | Float top-up initiated or approved | Float management |
| `SETTLEMENT_PROCESS` | Settlement run initiated or approved | Settlement management |
| `ALLOCATE_DEPOSIT` | Manual deposit allocation | Unallocated deposits |
| `USER_ROLE_CHANGE` | Portal user role modified | User management |
| `CONFIG_CHANGE` | System configuration modified | System config |
| `EXPORT_DATA` | Data export (CSV/PDF) | Any export action |
| `MAKER_CHECKER_APPROVE` | Approval request approved | Approval workflow |
| `MAKER_CHECKER_REJECT` | Approval request rejected | Approval workflow |

### 8.3 PII Redaction

Admin audit logs follow the same POPIA requirements as the main app.
**Never** log:

- Full phone numbers (redact to `07****4567`)
- ID numbers
- Full names when associated with financial data
- Account balances in log messages (log the action, not the data)

```js
function redactPhone(phone) {
  if (!phone || phone.length < 6) return '***';
  return phone.slice(0, 2) + '****' + phone.slice(-4);
}
```

### 8.4 Hash-Chain Pattern

For critical admin actions (financial operations, role changes), follow
the same SHA-256 hash-chain pattern used by the `ReconAuditTrail` model.
Each audit entry includes the hash of the previous entry, creating an
immutable, tamper-evident chain. See the `auditing` skill for
implementation details.

---

## 9. API Design for Admin Endpoints

### 9.1 Route Conventions

| Convention | Value |
|-----------|-------|
| Prefix | `/api/v1/admin/` |
| Auth middleware | `portalAuth('admin')` on every route |
| Rate limiter (reads) | `standardLimit` — 100 req / 15 min |
| Rate limiter (writes) | `strictLimit` — 20 req / 15 min |
| Validation | `express-validator` on all inputs |

### 9.2 Standard Response Format

**Success (single item):**

```json
{
  "success": true,
  "data": { "id": 1, "name": "..." },
  "timestamp": "2026-04-06T10:30:00.000Z"
}
```

**Success (paginated list):**

```json
{
  "success": true,
  "data": [ { "id": 1 }, { "id": 2 } ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  },
  "timestamp": "2026-04-06T10:30:00.000Z"
}
```

**Error:**

```json
{
  "success": false,
  "error": "Human-readable error message",
  "timestamp": "2026-04-06T10:30:00.000Z"
}
```

Never include stack traces, internal error codes, or database details in
error responses.

### 9.3 Validation Pattern

Always validate before processing. Return all validation errors at once:

```js
const { validationResult } = require('express-validator');

async myEndpoint(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array().map(e => e.msg).join('; '),
      timestamp: new Date().toISOString(),
    });
  }
  // ... proceed
}
```

### 9.4 Route File Organization

Group routes by domain in `portal/backend/routes/admin.js`:

```js
// ============================================================================
// DASHBOARD
// ============================================================================
router.get('/dashboard', portalAuth('admin'), strictLimit, adminController.getDashboard);

// ============================================================================
// USER MANAGEMENT
// ============================================================================
router.get('/users', portalAuth('admin'), standardLimit, getPortalUsersValidation, adminController.getPortalUsers);
router.post('/users', portalAuth('admin'), strictLimit, createPortalUserValidation, adminController.createPortalUser);

// ============================================================================
// UNALLOCATED DEPOSITS
// ============================================================================
router.get('/unallocated-deposits', portalAuth('admin'), standardLimit, [...], adminController.getUnallocatedDeposits);
router.post('/unallocated-deposits/:id/allocate', portalAuth('admin'), strictLimit, [...], adminController.allocateDeposit);
```

### 9.5 Error Handling Middleware

The admin routes file includes a catch-all error handler. All controller
errors should be caught and returned in standard format:

```js
async myEndpoint(req, res) {
  const client = await getProductionClient();
  try {
    // ... business logic
  } catch (err) {
    console.error('Admin endpoint error:', { action: 'myEndpoint', error: err.message });
    res.status(500).json({
      success: false,
      error: 'An internal error occurred. Please try again.',
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
}
```

---

## 10. Portal Screens — Implementation Priority

Build screens in this order. Each references the route already defined
in `RouteConfig.tsx`:

| # | Screen | Route | Status | Backend Endpoint |
|---|--------|-------|--------|-----------------|
| 1 | **Dashboard** | `/admin/dashboard` | PARTIAL | `GET /dashboard` |
| 2 | **Unallocated Deposits** | `/admin/unallocated-deposits` | LIVE | `GET/POST /unallocated-deposits` |
| 3 | **Disbursements** | `/admin/disbursements` | LIVE | `GET/POST /disbursements` |
| 4 | **User Management** | `/admin/users` | PLACEHOLDER | `GET/POST /users` (portal users exist, wallet users TODO) |
| 5 | **Transaction Monitoring** | `/admin/transactions` | PLACEHOLDER | TODO: `GET /transactions`, `GET /transactions/:id` |
| 6 | **Float Management** | `/admin/floats` | PLACEHOLDER | TODO: `GET /floats`, `POST /floats/:id/topup` (maker-checker) |
| 7 | **KB Review** | TODO (no route yet) | NOT STARTED | TODO: `GET /kb/pending`, `POST /kb/:id/approve`, `POST /kb/:id/reject` |
| 8 | **Commission Configuration** | TODO (no route yet) | NOT STARTED | TODO: `GET /commissions`, `PUT /commissions` (reads/writes `config/supplier-commissions.json`) |
| 9 | **Circuit Breaker Monitoring** | TODO (no route yet) | NOT STARTED | TODO: `GET /circuit-breakers`, `POST /circuit-breakers/:supplier/reset` |
| 10 | **Settlement Management** | `/admin/settlements` | PLACEHOLDER | TODO: `GET /settlements`, `POST /settlements/:id/process` (maker-checker) |
| 11 | **Reconciliation Reports** | `/admin/reports` | PLACEHOLDER | TODO: `GET /recon/runs`, `GET /recon/runs/:id` |
| 12 | **Compliance Dashboard** | TODO (no route yet) | NOT STARTED | TODO: `GET /compliance/kyc-stats`, `GET /compliance/fica` |
| 13 | **Service Management** | `/admin/services` | PLACEHOLDER | TODO: supplier health, product catalog management |
| 14 | **System Configuration** | `/admin/system` | PLACEHOLDER | TODO: env vars, feature flags, rate limit config |
| 15 | **Security & Audit** | `/admin/security` | PLACEHOLDER | TODO: audit trail viewer, login history |

### Screen-Specific Notes

**User Management** — Must show *wallet* users (from main `users` table),
not just portal users. Include: search by phone/name, KYC status,
wallet balance (read-only), transaction count, account status
(active/suspended). Write operations (suspend, tier change) require
maker-checker.

**Transaction Monitoring** — Must support search by reference, phone,
amount range, date range, status, type. Detail view shows full
transaction lifecycle including journal entries. Export to CSV.

**Float Management** — Show real-time float balances from
`ledger_accounts` where code matches `1200-*`. Alert when float drops
below configurable threshold. Top-up requests go through maker-checker.

**KB Review** — Review auto-learned RAG knowledge base entries. Approve
adds to production KB. Reject discards. Show the original user question,
AI-generated answer, and confidence score.

**Commission Configuration** — Read/write to
`config/supplier-commissions.json`. Show current rates in a table. Edit
requires maker-checker approval. Validate new rates are within acceptable
bounds.

**Circuit Breaker Monitoring** — Show per-supplier circuit breaker state
(closed/open/half-open), failure counts, last failure timestamp. Manual
reset button (admin only) for moving open → half-open.

---

## 11. Frontend Component Standards

### 11.1 CSS Framework

Use **Tailwind CSS** with the portal's `tailwind.config.js`. The UI
primitives in `components/ui/` follow the Shadcn pattern (headless +
Tailwind classes). Use `cn()` from `lib/utils.ts` for conditional classes:

```tsx
import { cn } from '../lib/utils';

<div className={cn(
  'rounded-lg border p-4',
  isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'
)} />
```

### 11.2 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Montserrat | 700 (bold) | `text-xl` to `text-3xl` |
| Body text | Montserrat | 400 (regular) | `text-sm` to `text-base` |
| Mono (amounts, refs) | System mono | 400 | `text-xs` to `text-sm` |
| Labels | Montserrat | 500 (medium) | `text-xs` to `text-sm` |

### 11.3 Brand Colors

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| MyMoolah Green | `#86BE41` | 134, 190, 65 | **Primary** — buttons, CTAs, active states, accents, sidebar highlights |
| MyMoolah Blue | `#2D8CCA` | 45, 140, 202 | **Secondary** — info states, links, secondary actions, chart accent |
| Brand dark | `#1a1a2e` | 26, 26, 46 | Dark backgrounds, sidebar, headers |
| Light gray | `#f8f9fa` | 248, 249, 250 | Page background |
| Error red | `#dc2626` | 220, 38, 38 | Error states, destructive actions, negative amounts |
| Warning amber | `#f59e0b` | 245, 158, 11 | Pending states, alerts |
| Success green | `#16a34a` | 22, 163, 74 | Success confirmations (distinct from brand green) |

> **Note**: `#86BE41` and `#2D8CCA` are the official MyMoolah brand colors (confirmed from brand guide).
> The CSS variable `--primary` in `portal/admin/frontend/src/index.css` maps to `#86BE41`.
> Use `var(--primary)` for brand green and `var(--mymoolah-blue)` for brand blue.

### 11.4 Card Component

Use `mymoolah-card` class (defined in portal CSS) for content containers:

```tsx
<div className="mymoolah-card p-6">
  {/* content */}
</div>
```

### 11.5 Desktop-First Responsive Design

Unlike the wallet (mobile-first), the portal is **desktop-first**:
- Default layout assumes 1024px+ viewport
- Use `sm:` breakpoint for tablet adjustments
- Use responsive flex: `flex flex-col sm:flex-row`
- Data tables should scroll horizontally on small screens (`overflow-x-auto`)

### 11.6 Icons

Use `lucide-react` for all icons. Import only the icons you need:

```tsx
import { Users, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
```

### 11.7 Accessibility (WCAG 2.2 AA)

- All interactive elements must be keyboard-navigable
- Color contrast ratio minimum 4.5:1 for text
- Form inputs must have associated `<label>` elements
- Status changes must be announced to screen readers (`aria-live`)
- Focus trapping in modal dialogs
- `role` and `aria-*` attributes on custom components

### 11.8 Dark Mode

Support dark mode via CSS variables and Tailwind's `dark:` prefix. Store
preference in `localStorage`. Toggle in the top-bar user menu.

---

## 12. Code Review Checklist for Portal PRs

Before merging any portal code, verify:

**Security:**
- [ ] `portalAuth('admin')` on every admin endpoint
- [ ] `requireRole()` or `requirePermission()` where needed
- [ ] Input validation via `express-validator` on all route params, query, and body
- [ ] Rate limiting applied — `strictLimit` for writes, `standardLimit` for reads
- [ ] No PII in console.log or structured logs
- [ ] No hardcoded credentials, API keys, or secrets
- [ ] Parameterized queries only (no string interpolation in SQL)
- [ ] Database access via `db-connection-helper.js` only

**Banking-Grade:**
- [ ] Maker-checker enforced for all destructive/financial operations
- [ ] Audit trail entry for every admin action (via `auditLog` middleware)
- [ ] Monetary values stored as `DECIMAL(18,2)`, displayed with ZAR formatting
- [ ] Server-side pagination for all data tables
- [ ] Database transactions (`BEGIN/COMMIT/ROLLBACK`) for multi-step writes

**Frontend Quality:**
- [ ] All four states rendered: loading, empty, error, data
- [ ] Tailwind CSS classes only (no inline styles except brand gradients)
- [ ] `cn()` for conditional classes
- [ ] Keyboard navigable, WCAG 2.2 AA contrast
- [ ] Responsive: works at 1024px+, degrades gracefully on smaller screens
- [ ] Lucide icons (no emoji in production UI)

**Code Quality:**
- [ ] Zero linter errors
- [ ] TypeScript types for all component props and API responses
- [ ] `useCallback` / `useMemo` for expensive computations and stable refs
- [ ] Error boundaries wrapping each overlay
- [ ] Route added to `RouteConfig.tsx` with `ProtectedRoute` + `AppLayoutWrapper`
- [ ] `client.release()` always called in `finally` block
