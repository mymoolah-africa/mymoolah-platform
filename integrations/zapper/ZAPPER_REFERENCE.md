# Zapper Integration Reference

**Last Updated**: 2026-02-21
**Purpose**: Master reference for Zapper integration — source of truth links, document inventory, credentials, and testing guide

---

## 🔗 **Zapper Google Drive (Source of Truth — Official Documents)**

**Shared Drive:** https://drive.google.com/drive/folders/1cvXKEACgwbvZsp8A-8KPy8-q0QvWcVgh?usp=sharing

**IMPORTANT for all agents**: Always check this Google Drive first for the latest Zapper documentation before making any assumptions. This drive contains the authoritative versions of the API spec, SLA, legal docs, and QR test codes.

### Drive Contents

| File | Date | Description |
|------|------|-------------|
| `zapper/` | Nov 20, 2025 | Zapper integration documents subfolder |
| `Zapper prod test qr codes/` | Nov 20, 2025 | Production QR code test assets folder |
| `MyMoolah_Zapper_API SLA_20251120.pdf` | Nov 20, 2025 | **Signed SLA** — MyMoolah ↔ Zapper API Service Level Agreement (479 KB) |
| `Zapper API Documentation 20250909.docx` | Sep 9, 2025 | **Official Zapper API Documentation** (42 KB) — PRIMARY TECHNICAL REFERENCE |
| `zapper_qr_1.png` | Sep 23, 2025 | Production test QR code 1 |
| `zapper_qr_2.png` | Sep 23, 2025 | Production test QR code 2 |

---

## 🌐 **API Environments**

| Environment | Details |
|-------------|---------|
| UAT | Zapper UAT/sandbox environment |
| Production | Zapper production environment |

---

## ⚙️ **Integration Overview**

Zapper is a QR-code-based payment acceptance integration. Customers scan a Zapper QR code to pay from their Zapper wallet. MyMoolah receives the payment notification via callback.

**Key flow:**
1. MyMoolah generates a Zapper QR code for the transaction
2. Customer scans QR with their Zapper app and confirms payment
3. Zapper calls our callback endpoint to notify of payment
4. MyMoolah credits the relevant wallet/account

---

## 📋 **Key Integration Files (Local)**

| File | Purpose |
|------|---------|
| `services/zapperService.js` | Core Zapper service implementation |
| `docs/archive/zapper/ZAPPER_INTEGRATION_REQUIREMENTS.md` | Integration requirements |
| `docs/archive/zapper/ZAPPER_UAT_TEST_REPORT.md` | UAT test results |
| `docs/archive/zapper/ZAPPER_CREDENTIALS_TEST_RESULTS.md` | Credential test results |
| `docs/archive/zapper/ZAPPER_PRODUCTION_CREDENTIALS_TEST_RESULTS.md` | Production credential test results |
| `docs/archive/zapper/ZAPPER_QR_TYPES_REFACTORING.md` | QR type refactoring notes |
| `docs/archive/ZAPPER_INTEGRATION_AUDIT_REPORT.md` | Full integration audit |
| `docs/archive/ZAPPER_PRODUCTION_DEPLOYMENT_PLAN.md` | Production deployment plan |
| `docs/archive/ZAPPER_POST_CREDENTIALS_CHECKLIST.md` | Post-credentials checklist |
| `docs/archive/ZAPPER_TEAM_QUESTIONS.md` | Outstanding questions for Zapper team |

---

## 📚 **Related Documentation**

- `docs/agent_handover.md` — current project status
- `docs/archive/ZAPPER_INTEGRATION_AUDIT_REPORT.md` — full integration audit history
- Google Drive (above) — official API docs, SLA, and QR test codes
