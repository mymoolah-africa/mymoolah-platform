# Session Log - 2026-05-05 - OTT Commercial Volume Forecast

**Session Date**: 2026-05-05 13:33 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: OTT commercial forecast artefact and documentation update

---

## Session Summary
Created an official one-page MyMoolah x OTT 36-month transaction volume forecast for OTT commercial rate discussions. The final forecast is face-value-only, uses market-informed MyMoolah target-market assumptions, and reflects André's correction that OTT voucher / betting top-up behaviour is a major repeat-use driver.

---

## Tasks Completed
- [x] Reviewed the current OTT integration context, session logs, and relevant visual/report skills.
- [x] Drafted and agreed forecast structure before building the HTML artefact.
- [x] Created `docs/integrations/OTT_COMMERCIAL_VOLUME_FORECAST.html`.
- [x] Updated the forecast to avoid commission/fee/revenue assumptions and show transaction count plus face value only.
- [x] Adjusted the OTT voucher / betting top-up line upward to reflect MyMoolah's target-market sports-betting behaviour.
- [x] Renamed the document title to `MyMoolah x OTT 36-Month Transaction Volume Forecast`.
- [x] Updated changelog, handover, and OTT framework references.

---

## Key Decisions
- **Face-value-only forecast**: The table excludes commissions, fees, rebates, revenue share, VAT, settlement charges, failed transactions, and reversals so it can be used safely for OTT pricing discussions without implying a commercial model.
- **Official title**: The document title is `MyMoolah x OTT 36-Month Transaction Volume Forecast`; the phrase `betting-adjusted` was removed because it made the artefact sound like a special-case draft instead of an official forecast.
- **Higher OTT voucher/top-up line**: The final forecast assumes EWA, salary/wage disbursements, inbound wallet funds, PayShap inflows, OTT voucher spend, and OTT merchant network usage create repeat OTT voucher / betting top-up transactions.
- **Amazon excluded**: Amazon Gift Card remains excluded from assumptions until OTT confirms provider availability.

---

## Files Modified
- `docs/integrations/OTT_COMMERCIAL_VOLUME_FORECAST.html` - New self-contained official HTML forecast artefact.
- `docs/integrations/OTT_MOBILE_INTEGRATION_FRAMEWORK.md` - Added a reference to the commercial forecast artefact.
- `docs/CHANGELOG.md` - Added the OTT commercial volume forecast entry.
- `docs/AGENT_HANDOVER.md` - Updated current status and session log index.
- `docs/session_logs/2026-05-05_1333_ott-commercial-volume-forecast.md` - Added this session log.

---

## Code Changes Summary
No runtime code changed. This was a documentation and partner-facing HTML artefact update only.

Forecast milestone totals in the final HTML:
- Month 12: `145.5k` monthly transactions, `R47.1m` monthly face value.
- Month 18: `399k` monthly transactions, `R121.7m` monthly face value.
- Month 24: `1.07m` monthly transactions, `R314.5m` monthly face value.
- Month 36: `2.92m` monthly transactions, `R880.0m` monthly face value.

---

## Issues Encountered
- **Initial title issue**: A temporary draft title included `betting-adjusted`, which André rejected. The document was retitled as an official MyMoolah x OTT forecast and the temporary draft artefact was removed.
- **Chat file link issue**: `file://` links did not open reliably from chat, so the file was opened directly with the OS `open` command and the plain filesystem path was provided.

---

## Testing Performed
- [x] HTML parse validation performed.
- [x] Cursor lints checked on the generated HTML.
- [x] Test results: pass.

Commands/results:
- `python3` with `html.parser.HTMLParser` parsed `docs/integrations/OTT_COMMERCIAL_VOLUME_FORECAST.html` successfully.
- Cursor lints on `docs/integrations/OTT_COMMERCIAL_VOLUME_FORECAST.html`: no linter errors.

---

## Next Steps
- [ ] André can share or export `docs/integrations/OTT_COMMERCIAL_VOLUME_FORECAST.html` for OTT commercial discussions.
- [ ] Update the forecast if OTT provides production provider lists, pricing tiers, or a preferred forecast template.
- [ ] Keep Amazon Gift Card excluded until OTT confirms provider `141` availability.

---

## Important Context for Next Agent
- The forecast is an indicative commercial planning document, not a committed transaction guarantee.
- It is intentionally face-value-only and must not be edited to imply commissions, fees, VAT, or MyMoolah revenue unless André explicitly asks.
- Do not reintroduce `betting-adjusted` into the title; the accepted title is `MyMoolah x OTT 36-Month Transaction Volume Forecast`.
- No production writes, API calls, or wallet-debit tests were performed.

---

## Questions/Unresolved Items
- OTT still needs to confirm Amazon Gift Card provider availability.
- OTT production provider IDs and active product lists must be validated separately from staging before go-live.

---

## Related Documentation
- `docs/integrations/OTT_COMMERCIAL_VOLUME_FORECAST.html`
- `docs/integrations/OTT_MOBILE_INTEGRATION_FRAMEWORK.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
