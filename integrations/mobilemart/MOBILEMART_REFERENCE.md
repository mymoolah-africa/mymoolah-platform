# MobileMart Integration Reference

**Last Updated**: 2026-02-21  
**Purpose**: Master reference for MobileMart integration — source of truth links, document inventory, credentials, and testing guide

---

## 🔗 **MobileMart Google Drive (Source of Truth — Official Documents)**

**Shared Drive:** https://drive.google.com/drive/folders/1_qpaRxUBTCr40wlFl54qqSjNZ6HX8xs3?usp=sharing

**IMPORTANT for all agents**: Always check this Google Drive first for the latest MobileMart documentation before making any assumptions. This drive contains the authoritative versions of all API specs, product lists, legal docs, and the signed agreement.

### Drive Contents

| File | Date | Description |
|------|------|-------------|
| `MMART Legal/` | Mar 25, 2025 | Legal agreements and contracts folder |
| `Merchant Recon Spec Final.pdf` | Jan 2026 | Merchant reconciliation specification |
| `Mobile Mart Account Balance Top-UP - Aproved.pdf` | May 12, 2025 | Approved account balance top-up spec |
| `MobileMart Fulcrum Integration-2024082908403356.pdf` | Aug 29, 2024 | Full Fulcrum API integration documentation (6.1 MB) |
| `Mobilemart Master Sheet_Bill Payment 20240918.xlsx` | Sep 18, 2024 | Bill payment product master sheet |
| `Mobilemart MyMoolah - Annexure A 13-8-2024.pdf` | Aug 13, 2024 | Signed commercial annexure |
| `Mobilemart Product Master List 20240918.xlsx` | Sep 18, 2024 | Product master list (Sep 2024) |
| `Mobilemart Product Master List 20250424.xlsx` | Apr 24, 2025 | **Latest** product master list (Apr 2025, 228 KB) |
| `PRODUCT MANAGEMENT_V1.pdf` | Apr 24, 2025 | Product management specification V1 |

---

## 🌐 **API Environments**

| Environment | Base URL |
|-------------|----------|
| UAT | `https://uat-api.mobilemart.co.za` |
| Production | `https://api.mobilemart.co.za` |

---

## ⚙️ **Environment Configuration**

**UAT / Codespaces** (`.env.codespaces`):
```bash
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_SCOPE=api
MOBILEMART_API_URL=https://uat-api.mobilemart.co.za
# UAT credentials stored in .env.codespaces
```

**Staging / Production** (Google Cloud Secret Manager):
```bash
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_SCOPE=api
MOBILEMART_API_URL=https://api.mobilemart.co.za
# Credentials: MOBILEMART_CLIENT_ID, MOBILEMART_CLIENT_SECRET via Secret Manager
```

---

## 🔄 **Product Catalog Sync**

- **Scheduler**: Daily at 02:00 SAST (`node-cron`)
- **Manual trigger**: `POST /api/v1/catalog-sync/sweep`
- **Sync script**: `scripts/sync-mobilemart-products.js`
- **Strategy**: Variable-first filtering — variable-range products imported first, then fixed-denomination
- **Filter**: `pinless` products only (`productType: 'pinless'`)
- **Both environments**: Staging and Production Cloud Run instances run the scheduler independently

---

## 📋 **Key Integration Files (Local)**

| File | Purpose |
|------|---------|
| `integrations/mobilemart/MOBILEMART_FULCRUM_DOCUMENTATION_ANALYSIS.md` | Full Fulcrum API analysis |
| `integrations/mobilemart/MOBILEMART_ENDPOINT_PATHS_FINAL.md` | Confirmed endpoint paths |
| `integrations/mobilemart/MOBILEMART_SCHEMAS_REFERENCE.md` | Request/response schemas |
| `integrations/mobilemart/PRODUCTION_CREDENTIALS_QUICK_REFERENCE.md` | Production credential guide |
| `integrations/mobilemart/MOBILEMART_INTEGRATION_FINAL_REPORT.md` | Final integration report |
| `integrations/mobilemart/MOBILEMART_RECON_EMAIL_INGEST_DESIGN.md` | Reconciliation design |
| `services/mobilemartService.js` | Core MobileMart service |
| `controllers/mobilemartController.js` | MobileMart API controller |

---

## 📚 **Related Documentation**

- `docs/agent_handover.md` — current project status
- `integrations/mobilemart/MOBILEMART_INTEGRATION_FINAL_REPORT.md` — full integration history
- Google Drive (above) — official documents and product lists
