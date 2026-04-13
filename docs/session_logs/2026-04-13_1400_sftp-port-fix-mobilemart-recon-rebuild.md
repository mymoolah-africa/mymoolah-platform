# Session Log - 2026-04-13 - SFTP Port 5022 Standardisation + MobileMart Recon Rebuild

**Session Date**: 2026-04-13 14:00  
**Agent**: Cursor AI Agent  
**User**: Andre  
**Session Duration**: ~2 hours

---

## Session Summary
Fixed all SFTP port 22 references across the entire codebase to the correct port 5022 (18+ files, 3 new migrations). Rebuilt the MobileMart reconciliation adapter from scratch to match Jarod Ramos's actual Fulcrum Recon Spec v1.1 (pipe-delimited H/D/T format, 24 body fields, cents-based amounts). The previous adapter incorrectly assumed comma-delimited CSV with 8 generic fields. Created Zapper recon adapter. Drafted EasyPay endpoint clarification reply and MobileMart SFTP activation email.

---

## Tasks Completed
- [x] Drafted reply to Razeen (EasyPay) clarifying V5 endpoint discrepancy (api.mymoolah.africa vs api-mm.mymoolah.africa)
- [x] Read all emails mentioning Jarod Ramos / MobileMart SFTP via Gmail MCP
- [x] Identified SFTP port 22 vs 5022 discrepancy across all partner configs
- [x] Fixed all SFTP port 22 references to 5022 (18+ files across docs, migrations, archive)
- [x] Created migration `20260413_02` to fix port in DB for MobileMart, Flash, EasyPay
- [x] Read MobileMart "Merchant Recon Spec Final (1).pdf" — identified adapter was completely wrong
- [x] Rebuilt `MobileMartAdapter.js` from scratch to match Fulcrum spec v1.1
- [x] Created migration `20260413_03` to fix MobileMart DB config (format, delimiter, schema, matching rules)
- [x] Updated `FileParserService.js` validation for MobileMart's footer shape
- [x] Updated `SFTPWatcherService.js` pattern matcher to support SQL `%` wildcards
- [x] Updated all documentation referencing MobileMart recon format (7+ docs)
- [x] Drafted MobileMart SFTP activation email to Jarod (with corrected spec confirmation)
- [x] Saved email draft as `docs/integrations/MOBILEMART_SFTP_RECON_EMAIL_DRAFT.md`

---

## Key Decisions
- **MobileMart adapter rewrite (not patch)**: The old adapter was built from assumed CSV format with 8 fields. The actual Fulcrum spec uses pipe-delimited text with H/D/T record identifiers and 24 body fields — too different to patch. Complete rewrite required.
- **Pipe splitting done in adapter (not csv-parse)**: MobileMart files use `|` delimiter with H/D/T record structure. The adapter splits lines and pipes internally rather than using csv-parse, which is designed for CSV.
- **Footer validation made conditional**: MobileMart's footer only has a record count (no total_amount). Made the amount validation in `FileParserService.validateParsedData` conditional so it works for both MobileMart (count-only) and other suppliers (count + amount).
- **SQL `%` wildcard support in SFTPWatcherService**: MobileMart file pattern uses `FULCRUM.MERCHANT.%.RECON.%.txt`. Added `%` -> `.+` regex conversion alongside existing YYYY/MM/DD date placeholders.
- **POPIA compliance**: MSISDN and meter numbers redacted (last 4 digits only) in adapter metadata, consistent with existing redaction patterns.
- **Session logs / changelog NOT edited**: Historical records referencing port 22 were left unchanged as they accurately record what happened at that time.

---

## Files Modified

### New Files
- `services/reconciliation/adapters/ZapperAdapter.js` — Zapper CSV mark-off file parser
- `migrations/20260413_01_add_zapper_reconciliation_config.js` — Zapper DB seed
- `migrations/20260413_02_fix_sftp_port_5022.js` — Port 22->5022 for all suppliers in DB
- `migrations/20260413_03_fix_mobilemart_recon_config.js` — MobileMart format/schema fix
- `docs/integrations/MOBILEMART_SFTP_RECON_EMAIL_DRAFT.md` — Email draft to Jarod
- `docs/integrations/ZAPPER_EMAIL_DRAFT_SETTLEMENT_AND_SFTP.md` — Zapper SFTP email
- `docs/integrations/ZAPPER_SFTP_SETUP_GUIDE.md` — Zapper SFTP setup guide

### Modified Files (SFTP port fixes)
- `docs/DEPLOYMENT_GUIDE.md` — RECON_SFTP_PORT + firewall rule
- `docs/archive/SETUP_GUIDE.md` — RECON_SFTP_PORT
- `docs/EASYPAY_V5_FINALISATION_PLAN.md` — EasyPay SFTP port
- `docs/SECURITY.md` — SFTP host:port
- `docs/integrations/EasyPay_API_Integration_Guide.md` — port + sftp command
- `docs/integrations/Flash_Reconciliation.md` — port + checklist
- `docs/RECONCILIATION_QUICK_START.md` — MobileMart port + file examples
- `docs/integrations/EASYPAY_UAT_CREDENTIALS_EMAIL_DRAFT.md` — port
- `docs/DEVELOPMENT_GUIDE.md` — port + test examples
- `docs/archive/easypay/EASYPAY_INTEGRATION_STATUS_SUMMARY.md` — port (2 locations)
- `docs/archive/EASYPAY_INTEGRATION_STATUS_BRIEF.md` — port
- `docs/archive/deployment/DEPLOYMENT_CHECKLIST.md` — firewall rules
- `docs/archive/agent_handover_history.md` — port + firewall description

### Modified Files (MobileMart recon rebuild)
- `services/reconciliation/adapters/MobileMartAdapter.js` — complete rewrite
- `services/reconciliation/FileParserService.js` — conditional footer validation
- `services/reconciliation/SFTPWatcherService.js` — % wildcard pattern support
- `docs/RECONCILIATION_FRAMEWORK.md` — MobileMart config example
- `docs/API_DOCUMENTATION.md` — file path examples
- `docs/TESTING_GUIDE.md` — test examples
- `docs/architecture.md` — adapter description
- `.gitignore` — FULCRUM.MERCHANT.*.txt pattern
- `integrations/zapper/ZAPPER_REFERENCE.md` — port confirmed 5022

---

## Issues Encountered
- **MobileMart adapter was completely wrong**: Built from assumed CSV format, not from Jarod's actual spec. Pipe-delimited, 24 fields, cents amounts — everything was different. Required full rewrite.
- **SFTP port 22 scattered across 18+ files**: Port was changed to 5022 on Mar 17 but many docs and migrations still referenced 22.
- **FileParserService validation too rigid**: Assumed all suppliers have `total_amount` in footer. MobileMart only has record count. Made conditional.
- **SFTPWatcherService pattern matcher**: Couldn't handle SQL `%` wildcards needed for `FULCRUM.MERCHANT.%.RECON.%.txt`. Added conversion.

---

## Testing Performed
- [x] Linter check on all modified JS files — zero errors
- [ ] Unit tests pending — need sample Fulcrum file from MobileMart
- [ ] Integration tests pending — awaiting MobileMart SSH key + test file upload
- [ ] Migrations not yet run — need to run in Codespaces

---

## Next Steps
- [ ] Run migrations on UAT/staging/production: `./scripts/run-migrations-master.sh [env]`
- [ ] Send MobileMart email to Jarod (copy from `docs/integrations/MOBILEMART_SFTP_RECON_EMAIL_DRAFT.md`)
- [ ] Send EasyPay reply to Razeen (endpoint clarification)
- [ ] Send Zapper email to Dillon (from `docs/integrations/ZAPPER_EMAIL_DRAFT_SETTLEMENT_AND_SFTP.md`)
- [ ] Once Jarod provides SSH key + IP: add key to SFTP gateway, create firewall rule
- [ ] Once test file received: verify end-to-end parsing with rebuilt adapter
- [ ] SBSA SFTP: still awaiting firewall whitelisting from Colette

---

## Important Context for Next Agent
- The SFTP gateway VM (`sftp-1-vm`) runs on **port 5022**, not 22. Port 22 is CLOSED. All partner configs must use 5022.
- MobileMart recon files are **pipe-delimited plain text** (NOT CSV), format: `FULCRUM.MERCHANT.[NAME].RECON.[DATETIME].txt`
- MobileMart amounts are in **cents with implied decimal** (9900 = R99.00)
- The adapter does NOT use `csv-parse` — it splits lines and pipes internally
- `FileParserService.validateParsedData` is now conditional — MobileMart footer has no `total_amount`
- Three new migrations (`20260413_01`, `_02`, `_03`) need to be run on all environments
- The MobileMart email draft is ready to send but Andre hasn't sent it yet
- Session logs and changelog entries referencing old port 22 are historical — do not change them

---

## Related Documentation
- `docs/integrations/MOBILEMART_SFTP_RECON_EMAIL_DRAFT.md` — email draft to Jarod
- `docs/integrations/ZAPPER_SFTP_SETUP_GUIDE.md` — Zapper SFTP setup
- `docs/RECONCILIATION_QUICK_START.md` — updated recon quick start
- `docs/RECONCILIATION_FRAMEWORK.md` — updated framework with Fulcrum schema
- `/Users/andremacbookpro/Downloads/Merchant Recon Spec Final (1).pdf` — source spec from Jarod
