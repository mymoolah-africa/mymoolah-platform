# Peach Payments Integration - Archival Record

**Status**: ARCHIVED  
**Date Archived**: 2025-11-26  
**Archived By**: MMTP Development Team  
**Reason**: Peach Payments temporarily canceled integration agreement due to PayShap provider competition with MyMoolah

---

## Archival Details

- **Integration Type**: PayShap RPP/RTP, Payment Processing
- **Archival Type**: Soft Archive (code preserved, functionality disabled)
- **Data Retention**: All data preserved per banking compliance requirements
- **Reactivation**: Possible if business relationship resumes
- **Archive Flag**: `PEACH_INTEGRATION_ARCHIVED=true` in `.env`

---

## Affected Components

### Routes (Disabled)
- `/api/v1/peach/*` - All Peach API endpoints disabled
- `/api/v1/peach/status` - New endpoint returns archived status

### Code Components (Preserved)
- `controllers/peachController.js` - Controller logic preserved
- `models/PeachPayment.js` - Database model preserved (for data access)
- `integrations/peach/client.js` - Integration client preserved
- `routes/peach.js` - Route definitions preserved
- `migrations/` - All Peach-related migrations preserved

### Database (Preserved)
- `peach_payments` table - All transaction data preserved
- No data deletion - Compliance requirement
- Historical records accessible for compliance queries

### Configuration
- `config/security.js` - Updated to check archive flag
- `server.js` - Updated to conditionally load routes
- `.env` - Archive flag added: `PEACH_INTEGRATION_ARCHIVED=true`

---

## Business Context

Peach Payments decided to temporarily cancel the integration agreement with MyMoolah Treasury Platform (MMTP) due to their PayShap provider being in direct competition with MyMoolah's PayShap services.

This is a business decision, not a technical issue. The integration code is fully functional and preserved for potential future reactivation.

---

## Reactivation Procedure

If the business relationship resumes, follow these steps:

1. **Remove Archive Flag**
   - Remove `PEACH_INTEGRATION_ARCHIVED=true` from `.env` files (local and Codespaces)

2. **Verify Credentials**
   - Confirm Peach Payments credentials are still valid
   - Test OAuth authentication endpoint
   - Verify entity IDs and merchant IDs

3. **Test Integration**
   - Test health check endpoint: `GET /api/v1/peach/health`
   - Test PayShap RPP endpoint: `POST /api/v1/peach/payshap/rpp`
   - Test PayShap RTP endpoint: `POST /api/v1/peach/payshap/rtp`
   - Verify webhook handling (if implemented)

4. **Update Status**
   - Update health check to show active status
   - Remove archived status endpoint
   - Update documentation

5. **Notify Stakeholders**
   - Inform development team
   - Update project status documentation
   - Update changelog

---

## Compliance Notes

### Data Retention
- All transaction data preserved per regulatory requirements
- No PII (Personally Identifiable Information) deleted
- Historical records accessible for compliance queries
- Audit trail maintained

### Banking-Grade Standards
- Archival follows banking best practices for deprecated integrations
- Mojaloop-compliant service lifecycle management
- Proper audit trail and documentation
- Zero resource consumption while archived

### Security
- Credentials remain in `.env` (not deleted)
- No security exposure from archived code
- Routes disabled prevent unauthorized access
- Status endpoint provides transparency

---

## Technical Implementation

### Archive Flag Check
The integration checks `PEACH_INTEGRATION_ARCHIVED` environment variable:
- If `true`: Routes disabled, credentials ignored
- If `false` or unset: Normal operation (if credentials exist)

### Code Flow
1. `config/security.js` checks archive flag first
2. If archived, `credentials.peach = false` (even if credentials exist)
3. `server.js` checks archive flag before loading routes
4. Health check shows `"archived"` status instead of boolean

### Status Endpoint
`GET /api/v1/peach/status` returns:
```json
{
  "status": "archived",
  "reason": "Integration temporarily canceled due to PayShap provider competition",
  "archivedDate": "2025-11-26",
  "reactivationProcedure": "See docs/archive/PEACH_ARCHIVAL_RECORD.md"
}
```

---

## Related Documentation

- `docs/integrations/PeachPayments.md` - Integration documentation (with archived notice)
- `docs/archive/PEACH_PAYMENTS_UAT_REQUIREMENTS.md` - UAT testing requirements
- `docs/archive/PEACH_PAYMENTS_UAT_TEST_RESULTS.md` - UAT test results
- `docs/PEACH_PAYMENTS_PRODUCTION_CREDENTIALS_REQUEST.md` - Production credentials request

---

## Change History

- **2025-11-26**: Integration archived due to business competition conflict
- **2025-11-26**: Archive flag added to `.env` files
- **2025-11-26**: Code updated to respect archive flag
- **2025-11-26**: Archival documentation created

---

**Last Updated**: 2025-11-26  
**Maintained By**: MMTP Development Team

