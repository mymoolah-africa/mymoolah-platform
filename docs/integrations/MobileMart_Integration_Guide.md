# MobileMart Integration Guide

**Last Updated**: February 18, 2026  
**Status**: Production-ready. 1,769 products synced (99.4% success).

---

## Overview

MobileMart (Fulcrum Switch) provides VAS products: Airtime, Data, Vouchers, Bill Payment, Electricity. MyMoolah integrates via OAuth 2.0, product catalog sync, and purchase flows. Environment-aware: UAT (simulation), Staging/Production (real API).

---

## Key Documentation

| Topic | Document |
|-------|----------|
| **Production Sync** | [MOBILEMART_PRODUCTION_SYNC_FINAL_SUMMARY.md](../MOBILEMART_PRODUCTION_SYNC_FINAL_SUMMARY.md) - Sync results, challenges, scripts |
| **Staging Sync** | [MOBILEMART_STAGING_SYNC_GUIDE.md](../MOBILEMART_STAGING_SYNC_GUIDE.md) - Execution guide |
| **Sync Fixes** | [MOBILEMART_SYNC_FIX_SUMMARY.md](../MOBILEMART_SYNC_FIX_SUMMARY.md) - Business logic, bug fixes |
| **Production Credentials** | [MOBILEMART_PRODUCTION_INTEGRATION_SUMMARY.md](../MOBILEMART_PRODUCTION_INTEGRATION_SUMMARY.md) - Credentials, architecture |
| **UAT vs Production** | [MOBILEMART_UAT_VS_PRODUCTION_COMPARISON_RESULTS.md](../MOBILEMART_UAT_VS_PRODUCTION_COMPARISON_RESULTS.md) |
| **API Payloads** | [MOBILEMART_UAT_API_PAYLOADS.md](../MOBILEMART_UAT_API_PAYLOADS.md) |
| **Bill Payment** | [BILL_PAYMENT_FRONTEND_VERIFICATION.md](../BILL_PAYMENT_FRONTEND_VERIFICATION.md) |

---

## Product Summary

| VAS Type | Products | Success Rate |
|----------|----------|--------------|
| Airtime | 80/82 | 97.6% |
| Data | 332/332 | 100% |
| Voucher | 99/108 | 91.7% |
| Bill Payment | 1,258/1,258 | 100% |
| **Total** | **1,769/1,780** | **99.4%** |

---

## Key Scripts

- `scripts/sync-mobilemart-production-to-staging.js` - Main sync
- `scripts/categorize-bill-payment-products.js` - Bill payment categories
- `scripts/debug-bill-payment-products.js` - Debugging

---

## Architecture

- **Auth**: OAuth 2.0 Client Credentials (`mobilemartAuthService.js`), `scope=api` required
- **Base URLs**: UAT `uat.fulcrumswitch.com`, Production `fulcrumswitch.com`
- **Controller**: `mobilemartController.js` - products, purchase, health
- **Reconciliation**: See [Flash_Reconciliation.md](./Flash_Reconciliation.md) for SFTP pattern (MobileMart uses same)
