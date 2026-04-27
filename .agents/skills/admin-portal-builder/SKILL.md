---
name: admin-portal-builder
version: 1.1.0
description: >
  Build and review the MMTP Admin Portal (MMAP): portal React screens,
  portal backend APIs, RBAC, maker-checker workflows, admin audit logging,
  dashboard metrics, server-side data tables, and management overlays. Use for
  any work under `portal/`, `/api/v1/admin/`, portal auth, or operational admin UI.
tags:
  - portal
  - admin
  - dashboard
  - rbac
  - maker-checker
  - react
  - express
---

# MMTP Admin Portal Builder

## Use This Skill When

Use this for:
- Any file under `portal/`.
- Admin/portal screens, overlays, dashboards, metric cards, KPI panels, or charts.
- Portal backend routes/controllers/middleware.
- RBAC, `portalAuth`, `requireRole`, `requirePermission`, and admin audit logging.
- Maker-checker workflows and operational approvals.
- Server-side tables with pagination, filtering, export, or drill-down.

Also read:
- `docs/PORTAL_DEVELOPMENT_GUIDE.md` for current portal patterns.
- `reference-full.md` for the detailed previous long-form skill content.
- `security-best-practices` for auth/secrets/PII work.
- `auditing` for financial approval or ledger-affecting workflows.

## Architecture Anchors

- Portal frontend: `portal/admin/frontend/`.
- Portal backend: `portal/backend/`.
- Portal shared components: `portal/shared/`.
- Routes: `portal/admin/frontend/src/components/routing/RouteConfig.tsx`.
- Overlay screens: `portal/admin/frontend/src/components/admin-overlays/`.
- Backend routes/controllers: `portal/backend/routes/`, `portal/backend/controllers/`.
- Auth middleware: `portal/backend/middleware/portalAuth.js`.

Portal is desktop-first. Wallet is mobile-first. Keep concerns separate.

## Database Rule

Portal backend reads the same Cloud SQL databases as the main app, but new portal DB access must use `scripts/db-connection-helper.js` directly or the existing portal helper wrapper. Do not create `new Sequelize(...)`, `new Pool(...)`, or independent `DATABASE_URL` pools in portal code.

Pattern:

```js
const { getProductionClient } = require('../../../scripts/db-connection-helper');

async function handler(req, res) {
  const client = await getProductionClient();
  try {
    const result = await client.query('SELECT ... WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: result.rows });
  } finally {
    client.release();
  }
}
```

## RBAC Rules

- Every admin endpoint must use `portalAuth('admin')`.
- Use `requireRole()` or `requirePermission()` for sensitive operations.
- Never rely on frontend hiding for authorization.
- Correct granular permission check pattern:

```js
if (req.portalUser.role !== 'admin' && !req.portalUser.permissions?.['settlement.approve']) {
  return res.status(403).json({ success: false, error: 'INSUFFICIENT_PERMISSION' });
}
```

## Maker-Checker Rules

Require maker-checker for:
- Financial approvals or reversals.
- Float top-ups, allocations, or settlement processing.
- Commission/rate/fee configuration changes.
- User role, permission, or access changes.
- Any action that can affect ledger state, customer balances, or compliance posture.

The maker must not approve their own request.

## Admin Audit Logging

Every admin action must be logged with:
- Actor: portal user id, role, portal type.
- Action: domain-specific event name.
- Target: entity type/id.
- Outcome: success/failure.
- Metadata: safe, PII-redacted context only.

Do not log full ID numbers, phone numbers, account numbers, documents, tokens, or secrets.

## UI Standards

- Brand primary: `#86BE41`; secondary: `#2D8CCA`; font: Montserrat.
- Use portal CSS variables (`--primary`, `--mymoolah-blue`) and Tailwind utilities.
- Use Lucide icons, not emoji, in production portal UI.
- Use `mymoolah-card` for content containers where available.
- Render all four states: loading, empty, error, data.
- Tables must use server-side pagination for real datasets.
- Desktop-first minimum target: 1024px; degrade gracefully below that.

## Build Pattern

For a new portal screen:
1. Confirm it is not already implemented in `portal/admin/frontend/src/components/admin-overlays/`.
2. Add or update the overlay component.
3. Register route/navigation in `RouteConfig.tsx`.
4. Add backend route/controller under `portal/backend/` if data is needed.
5. Apply `portalAuth('admin')`, validation, rate limiting, and parameterized SQL.
6. Add audit logging for writes.
7. Add loading/empty/error/data states and server-side pagination for lists.
8. Run portal frontend build when frontend files changed.

## Review Checklist

- [ ] `portalAuth('admin')` on every admin endpoint.
- [ ] Permission or role checks on sensitive actions.
- [ ] Maker-checker for financial/destructive/admin-risk operations.
- [ ] Parameterized SQL via `db-connection-helper.js`; `client.release()` in `finally`.
- [ ] No PII/secrets in logs or UI debug output.
- [ ] Server-side pagination for tables.
- [ ] Montserrat + `#86BE41` / `#2D8CCA` brand tokens.
- [ ] Loading, empty, error, data states.
- [ ] Route registered with protected portal layout.
- [ ] Zero TypeScript/lint/build errors.
