# MMTP Admin Portal — Development Guide

**Version**: 1.1.0 (2026-04-07)  
**Status**: Active development — UI overhaul complete, brand logos integrated, building out remaining screens  
**Skill reference**: `.agents/skills/admin-portal-builder/SKILL.md`

---

## 1. Architecture Overview

```
portal/
├── admin/
│   └── frontend/          ← React + Vite + Tailwind (port 3003)
│       ├── src/
│       │   ├── pages/            ← Login, Dashboard
│       │   ├── components/
│       │   │   ├── layout/       ← AppLayoutWrapper (sidebar + header)
│       │   │   ├── admin-overlays/ ← All screen content components
│       │   │   ├── routing/      ← RouteConfig.tsx
│       │   │   ├── common/       ← ErrorBoundary
│       │   │   ├── providers/    ← AppProviders
│       │   │   └── ui/           ← shadcn primitives (button, card, table, etc.)
│       │   ├── assets/           ← Brand logos (PNG)
│       │   │   ├── logo-stacked.png     ← Diamond + wordmark (login brand panel)
│       │   │   ├── logo-icon.png        ← Diamond icon only (sidebar, mobile header)
│       │   │   └── logo-horizontal.png  ← Inline wordmark (future: reports, emails)
│       │   ├── contexts/         ← AuthContext, MoolahContext
│       │   ├── index.css         ← Design system tokens (170 lines)
│       │   ├── vite-env.d.ts     ← PNG/JPG/SVG module declarations
│       │   ├── main.tsx          ← App entry
│       │   └── App.tsx           ← Provider wiring
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── vite.config.ts        ← Proxy /api → portal backend :3002
│
└── backend/               ← Express (port 3002)
    ├── server.js           ← Listener, DB auth, graceful shutdown
    ├── app.js              ← Middleware stack, route mounts, error handlers
    ├── helpers/
    │   └── getDbClient.js  ← Wraps scripts/db-connection-helper.js
    ├── controllers/
    │   ├── authController.js
    │   ├── adminController.js
    │   ├── userManagementController.js
    │   └── transactionMonitoringController.js
    ├── routes/
    │   ├── auth.js         ← /api/v1/admin/auth/*
    │   └── admin.js        ← /api/v1/admin/*
    ├── middleware/
    │   └── portalAuth.js   ← JWT HS512 guard with role check
    └── models/
        └── index.js        ← Sequelize init via db-connection-helper config
```

---

## 2. Design System — CSS Tokens

All tokens live in `portal/admin/frontend/src/index.css` under `:root`.

### Brand Colors (from official MyMoolah brand guide)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--primary` | `#86BE41` | 134, 190, 65 | **MyMoolah Green** — buttons, accents, active states, CTAs |
| `--mymoolah-green` | `#86BE41` | 134, 190, 65 | Alias for primary (gradient start) |
| `--mymoolah-blue` | `#2D8CCA` | 45, 140, 202 | **MyMoolah Blue** — info, links, secondary actions (gradient end) |
| `--sidebar` | `#1a1a2e` | 26, 26, 46 | Dark sidebar background |
| `--sidebar-foreground` | `#cbd5e1` | — | Sidebar text |
| `--sidebar-primary` | `#86BE41` | 134, 190, 65 | Active sidebar item accent |

### Semantic Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `#f8f9fa` | Page background |
| `--foreground` | `#1a1a2e` | Primary text |
| `--card` | `#ffffff` | Card/panel background |
| `--border` | `#e2e8f0` | Borders and dividers |
| `--muted` | `#f1f5f9` | Muted/secondary surfaces |
| `--muted-foreground` | `#64748b` | Secondary text |
| `--destructive` | `#dc2626` | Error/danger actions |
| `--radius` | `0.75rem` | Default border radius |

### How to Use Tokens in Components

```tsx
// CORRECT — CSS variable via Tailwind arbitrary value
<div className="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-[var(--radius)]">

// CORRECT — Tailwind semantic classes (for status colors)
<span className="text-emerald-600 bg-emerald-50">Active</span>

// WRONG — never use inline styles or hardcoded hex
<div style={{ background: '#00B894' }}>  // ← DO NOT DO THIS
<div className="bg-[#00B894]">          // ← also avoid, use var(--primary)
```

### Typography

- **Font**: Montserrat (imported via Google Fonts in `index.css`)
- **Financial amounts**: Always use `font-mono tabular-nums` for column alignment
- **Weights**: 400 (body), 500 (labels), 600 (headings), 700 (hero/KPI)

### Logo Assets

Three official MyMoolah logo PNGs live in `portal/admin/frontend/src/assets/`. Import them as Vite modules:

```tsx
import logoIcon from '../assets/logo-icon.png';
import logoStacked from '../assets/logo-stacked.png';
import logoHorizontal from '../assets/logo-horizontal.png';
```

| File | Dimensions | Where used | Description |
|------|-----------|-----------|-------------|
| `logo-icon.png` | 1024×1024 | Sidebar header, mobile login header | Diamond icon only (green M + blue M) |
| `logo-stacked.png` | 1024×1024 | Login brand panel (centered, `drop-shadow-lg`) | Diamond + "MYMOOLAH" wordmark below |
| `logo-horizontal.png` | 1024×282 | Available for reports, emails, print | Inline diamond + "MYMOOLAH" wordmark |

**Usage rules**:
- Always use `<img>` with `alt="MyMoolah"` for accessibility
- Sidebar icon: `className="h-9 w-9 flex-shrink-0 rounded-lg"`
- Login panel: `className="mb-8 w-48 drop-shadow-lg"`
- Never recreate the logo with CSS/SVG — use the official PNGs
- `vite-env.d.ts` declares `*.png` modules so TypeScript resolves them

---

## 3. Screen Status — Current State

### Fully Functional + Styled (CSS variables, zero inline styles)

| Route | Component | Lines | What It Does |
|-------|-----------|-------|-------------|
| `/admin/login` | `AdminLogin.tsx` | 187 | Split-screen brand layout, Eye/EyeOff toggle, security badges |
| `/admin/dashboard` | `AdminDashboard.tsx` | 521 | KPI cards, settlements panel, alerts, dual-role entity table, skeleton loading |
| — (layout shell) | `AppLayoutWrapper.tsx` | 324 | Dark sidebar with nav groups, header with page title + search/notifications |
| `/admin/users` | `UserManagementOverlay.tsx` | 661 | User list, search, KYC status dots, detail drawer |
| `/admin/transactions` | `TransactionMonitoringOverlay.tsx` | 864 | Transaction list, filters (type/status/date), journal entry drawer |

### Functional but Needs Style Migration (still uses inline `style={{}}`)

| Route | Component | Lines | What It Does | Priority |
|-------|-----------|-------|-------------|----------|
| `/admin/unallocated-deposits` | `UnallocatedDepositsOverlay.tsx` | 385 | Deposit list, filters, allocate modal | HIGH |
| `/admin/disbursements` | `DisbursementRunsOverlay.tsx` | 178 | Disbursement run list, status chips | MEDIUM |
| `/admin/disbursements/create` | `CreateDisbursementRunOverlay.tsx` | 319 | CSV upload, manual entry, create run | MEDIUM |
| `/admin/disbursements/:id` | `DisbursementRunDetailOverlay.tsx` | 340 | Run detail, approve/reject, payment table | MEDIUM |
| `/admin/disbursement-clients` | `DisbursementClientManagementOverlay.tsx` | ~350 | Client list, filters, create modal | MEDIUM |
| `/admin/disbursement-clients/:clientId` | `DisbursementClientDetailOverlay.tsx` | ~500 | Client detail, KYB docs, fee config | MEDIUM |

### Placeholder — "Coming Soon" (properly styled with icons + feature grid)

| Route | Component | Sidebar Section | Backend API Needed |
|-------|-----------|----------------|-------------------|
| `/admin/floats` | `FloatManagementOverlay.tsx` | Operations | Yes — float balances, top-up history |
| `/admin/settlements` | `SettlementManagementOverlay.tsx` | Operations | Yes — settlement runs, netting |
| `/admin/services` | `ServiceManagementOverlay.tsx` | Management | Yes — VAS service config |
| `/admin/system` | `SystemConfigurationOverlay.tsx` | System | Yes — env vars, feature flags |
| `/admin/security` | `SecurityAuditOverlay.tsx` | Compliance | Yes — audit log viewer |
| `/admin/reports` | `ReportingAnalyticsOverlay.tsx` | Compliance | Yes — report generation |
| `/admin/partners` | `PartnerOnboardingOverlay.tsx` | Management | Yes — partner CRUD |

---

## 4. Backend API Endpoints (Existing)

| Method | Path | Controller | Auth | Description |
|--------|------|-----------|------|-------------|
| `POST` | `/api/v1/admin/auth/login` | `authController` | Public | JWT HS512 login |
| `POST` | `/api/v1/admin/auth/logout` | `authController` | Public | Logout |
| `GET` | `/api/v1/admin/auth/verify` | `authController` | Token | Verify JWT |
| `POST` | `/api/v1/admin/auth/refresh` | `authController` | Token | Refresh JWT |
| `GET` | `/api/v1/admin/health` | `adminController` | Public | Health check |
| `GET` | `/api/v1/admin/dashboard` | `adminController` | Admin | Dashboard KPIs |
| `GET` | `/api/v1/admin/users` | `adminController` | Admin | Portal admin users |
| `POST` | `/api/v1/admin/users` | `adminController` | Admin | Create portal admin |
| `GET` | `/api/v1/admin/wallet-users` | `userMgmt` | Admin | Wallet user list (paginated) |
| `GET` | `/api/v1/admin/wallet-users/:id` | `userMgmt` | Admin | Wallet user detail |
| `GET` | `/api/v1/admin/transactions` | `txnMonitor` | Admin | Transaction list (paginated) |
| `GET` | `/api/v1/admin/transactions/:id` | `txnMonitor` | Admin | Transaction + journal entries |
| `GET` | `/api/v1/admin/unallocated-deposits` | `adminController` | Admin | Unallocated deposit list |
| `POST` | `/api/v1/admin/unallocated-deposits/:id/allocate` | `adminController` | Admin | Allocate deposit to user |
| `GET` | `/api/v1/disbursement-clients` | `disbursementClientCtrl` | JWT | Client list (paginated) |
| `GET` | `/api/v1/disbursement-clients/:id` | `disbursementClientCtrl` | JWT | Client detail + fees + KYB |
| `POST` | `/api/v1/disbursement-clients` | `disbursementClientCtrl` | JWT | Create disbursement client |
| `PATCH` | `/api/v1/disbursement-clients/:id` | `disbursementClientCtrl` | JWT | Update client |
| `POST` | `/api/v1/disbursement-clients/:id/kyb-documents` | `disbursementClientCtrl` | JWT | Upload KYB document |
| `PATCH` | `/api/v1/disbursement-clients/:id/kyb-documents/:docId` | `disbursementClientCtrl` | JWT | Review KYB document |
| `GET` | `/api/v1/disbursement-clients/:id/fees` | `disbursementClientCtrl` | JWT | List fee configs |
| `POST` | `/api/v1/disbursement-clients/:id/fees` | `disbursementClientCtrl` | JWT | Create fee config |
| `POST` | `/api/v1/disbursement-clients/:id/upload-beneficiaries` | `disbursementClientCtrl` | JWT | Parse beneficiary file |

Disbursement client endpoints are on the **main backend** (port 3001), not the portal backend. The Vite proxy routes `/api` (non-admin) to port 3001.

All admin endpoints use `portalAuth('admin')` middleware. All DB queries use `portal/backend/helpers/getDbClient.js` (raw parameterized SQL, never ORM).

---

## 5. Building a New Portal Screen — Step by Step

### 5.1 Create the Overlay Component

File: `portal/admin/frontend/src/components/admin-overlays/YourNewOverlay.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const YourNewOverlay: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('portal_token');
      const res = await fetch('/api/v1/admin/your-endpoint', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <YourSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Page Title</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Description</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius)]
                     bg-[var(--primary)] text-[var(--primary-foreground)]
                     hover:opacity-90 transition-opacity text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Content card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Column</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                <td className="px-4 py-3 text-[var(--foreground)]">{item.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### 5.2 Add Route

In `portal/admin/frontend/src/components/routing/RouteConfig.tsx`:

```tsx
import { YourNewOverlay } from '../admin-overlays/YourNewOverlay';

// Inside <Routes>:
<Route path="/admin/your-page" element={
  <ProtectedRoute>
    <AppLayoutWrapper>
      <YourNewOverlay />
    </AppLayoutWrapper>
  </ProtectedRoute>
} />
```

### 5.3 Add Sidebar Link

In `AppLayoutWrapper.tsx`, add to the relevant nav group:

```tsx
{ path: '/admin/your-page', label: 'Your Page', icon: SomeIcon },
```

### 5.4 Create Backend Endpoint (if needed)

In `portal/backend/controllers/adminController.js`:

```js
const { getClient } = require('../helpers/getDbClient');

exports.getYourData = async (req, res) => {
  const client = await getClient();
  try {
    const result = await client.query('SELECT ... FROM ... WHERE ...', []);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal error' });
  } finally {
    client.release();
  }
};
```

In `portal/backend/routes/admin.js`:

```js
router.get('/your-endpoint', portalAuth('admin'), adminController.getYourData);
```

---

## 6. Conventions & Rules

### Styling
- **ALL tokens** in `:root` in `index.css` — never define colors elsewhere
- **CSS variables** via Tailwind arbitrary values: `bg-[var(--primary)]`
- **Zero inline styles** (`style={{}}`) in new components
- **Financial amounts**: `font-mono tabular-nums` (auditing skill convention)
- **Status indicators**: Tailwind semantic colors (`emerald`, `amber`, `red`) for badges

### Auth
- JWT HS512, stored in `sessionStorage` (not `localStorage` — banking-grade)
- Token key: `portal_token`, user key: `portal_user`
- Seed admin users: `PORTAL_ADMIN_PASSWORD=xxx node scripts/seed-portal-admin.js`

### Data Access
- Portal backend uses `portal/backend/helpers/getDbClient.js` for ALL queries
- Raw parameterized SQL only — no Sequelize ORM queries in controllers
- Environment auto-detected: `PORTAL_ENV` || `MM_DEPLOYMENT_ENV` || `'uat'`

### Codespaces Testing
```bash
git pull origin main
cd portal/admin/frontend && npm install && npm run build && cd ../../..
./scripts/start-all-services.sh
```
Portal frontend: port 3003, portal backend: port 3002.

---

## 7. Recommended Build Order for Remaining Screens

Based on `.agents/skills/admin-portal-builder/SKILL.md` priority list and existing backend data availability:

| Priority | Screen | Route | Backend Data | Effort |
|----------|--------|-------|-------------|--------|
| 1 | Float Management | `/admin/floats` | `supplier_floats` table exists; main backend has float monitoring | Medium |
| 2 | Security / Audit Log | `/admin/security` | `admin_audit_log` table exists in portal DB | Medium |
| 3 | Settlement Management | `/admin/settlements` | `settlement_runs`, `settlement_line_items` tables exist | Medium-High |
| 4 | Reporting & Analytics | `/admin/reports` | Aggregate queries on existing tables | High |
| 5 | Service Management | `/admin/services` | `product_variants`, `suppliers`, circuit breaker status | Medium |
| 6 | System Configuration | `/admin/system` | Env vars, feature flags (new table needed) | High |
| 7 | Partner Onboarding | `/admin/partners` | New tables needed for partner lifecycle | High |

### Also (style migration for existing screens):
- `UnallocatedDepositsOverlay.tsx` — migrate inline styles to CSS vars (HIGH priority)
- `DisbursementRunsOverlay.tsx` + `Create` + `Detail` — migrate inline styles (MEDIUM)

---

## 8. File Quick Reference

| What | File |
|------|------|
| Design tokens | `portal/admin/frontend/src/index.css` |
| Brand logos | `portal/admin/frontend/src/assets/logo-*.png` |
| TS module declarations | `portal/admin/frontend/src/vite-env.d.ts` |
| Sidebar + header shell | `portal/admin/frontend/src/components/layout/AppLayoutWrapper.tsx` |
| Route definitions | `portal/admin/frontend/src/components/routing/RouteConfig.tsx` |
| Auth context | `portal/admin/frontend/src/contexts/AuthContext.tsx` |
| Portal backend entry | `portal/backend/server.js` → `portal/backend/app.js` |
| DB helper | `portal/backend/helpers/getDbClient.js` |
| Admin API routes | `portal/backend/routes/admin.js` |
| Auth API routes | `portal/backend/routes/auth.js` |
| Vite proxy config | `portal/admin/frontend/vite.config.ts` |
| Admin seed script | `scripts/seed-portal-admin.js` |
| Portal builder skill | `.agents/skills/admin-portal-builder/SKILL.md` |
| Frontend design skill | `.agents/skills/frontend-design/SKILL.md` |
