# MyMoolah Scripts Directory

Scripts for managing and maintaining the MyMoolah Treasury Platform.
**160 scripts** after March 2026 cleanup (84 redundant/one-off scripts removed).

---

## Core Scripts (Use These)

### Deployment (Run from LOCAL MAC)
| Script | Purpose |
|--------|---------|
| `deploy-backend.sh --staging\|--production` | Build + push + deploy backend |
| `deploy-wallet.sh --staging\|--production` | Build + push + deploy wallet frontend |
| `build-push-deploy-staging.sh` | Legacy staging backend deploy (still works) |
| `build-push-deploy-production.sh` | Legacy production backend deploy (still works) |

### Database Migrations (Run from CODESPACES)
| Script | Purpose |
|--------|---------|
| `run-migrations-master.sh uat\|staging\|production` | Run migrations (auto-starts proxy) |
| `run-migration.js` | Low-level Sequelize migration runner |
| `db-connection-helper.js` | Shared DB connection helper (UAT/Staging/Production) |

### Codespaces Startup
| Script | Purpose |
|--------|---------|
| `one-click-restart-and-start.sh` | Main Codespaces startup |
| `start-codespace-with-proxy.sh` | Full startup (proxy + Redis + backend) |
| `start-dual-proxies.sh` | Start UAT + Staging proxies |
| `ensure-proxies-running.sh` | Verify proxies are running |
| `start-cs-ip.js` | Start backend with Codespaces IP |

### User Management
| Script | Purpose |
|--------|---------|
| `lookup-user.js <phone\|name\|userId>` | User lookup |
| `change-user-password.js <id> <password>` | Change password |
| `verify-password.js <id> <password>` | Verify password |
| `check-kyc-status.js <id>` | KYC status check |
| `reset-kyc-via-api.sh` | Reset KYC via API |

### Catalog Sync
| Script | Purpose |
|--------|---------|
| `sync-flash-catalog.js` | Flash product catalog sync |
| `sync-mobilemart-to-product-variants.js` | MobileMart → product variants |
| `sync-mobilemart-uat-catalog.js` | MobileMart UAT catalog |
| `sync-mobilemart-production-to-staging.js` | MobileMart prod → staging |

### Seed Scripts
| Script | Purpose |
|--------|---------|
| `seed-easypay-data.js` | EasyPay test data |
| `seed-flash-data.js` | Flash supplier data |
| `seed-mobilemart-data.js` | MobileMart supplier data |
| `seed-dtmercury-data.js` | dtMercury supplier data |
| `seed-complete-float-system.js` | Float accounts |
| `seed-settlement-system.js` | Settlement system |
| `seed-support-knowledge-base.js` | AI support KB |
| `seed-watch-to-earn.js` | Watch to Earn ads |
| `seed-test-referrals.js` | Test referral data |
| `seed-product-variants.js` | Product variants |
| `seed-staging-beneficiaries.js` | Staging beneficiaries |
| `seed-uat-biller-beneficiaries.js` | UAT biller beneficiaries |

### Integration Tests (Active)
| Script | Purpose |
|--------|---------|
| `test-easypay-5-scenarios.sh` | EasyPay 5-scenario test (11 tests) |
| `test-easypay-api.sh` | EasyPay API test |
| `test-mobilemart-uat-complete.js` | MobileMart UAT suite |
| `test-mobilemart-uat-credentials.js` | MobileMart credentials |
| `test-flash-auth.js` | Flash auth test |
| `test-zapper-uat-complete.js` | Zapper UAT suite |
| `test-zapper-credentials.js` | Zapper credentials |
| `test-valr-integration.js` | VALR integration |
| `api-smoke-test.js` | API health check |

### Operational
| Script | Purpose |
|--------|---------|
| `process-referral-payouts.js` | Daily referral payouts |
| `cleanup-expired-otps.js` | OTP cleanup (cron) |
| `refresh-vas-best-offers.js` | VAS best offers refresh |
| `generate-daily-product-availability-report.js` | Daily availability report |
| `run-voucher-expiry-now.js` | Process expired vouchers |
| `reconcile-all-wallets.js` | Wallet reconciliation |
| `check-all-supplier-float-balances.js` | Float balance check |

---

## Running Scripts

All scripts run from the project root:

```bash
cd /path/to/mymoolah
node scripts/[script-name].js [options]
# or
./scripts/[script-name].sh [options]
```

## Script Development Guidelines

1. Include header documentation with usage examples
2. Use `db-connection-helper.js` for database connections
3. Use `set -euo pipefail` in bash scripts
4. Include error handling and colored output
5. Check prerequisites before running
6. Sweep `scripts/` before creating new scripts (Rule 9A)
