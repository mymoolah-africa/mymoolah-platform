# MobileMart Fulcrum Integration - OAuth Endpoint Discovery

**Issue:** OAuth token endpoint returns HTTP 405 (Method Not Allowed)
**Current Attempt:** `/oauth/token`
**Response:** "allow: GET, HEAD" - POST not allowed

## Possible OAuth Endpoint Paths (ASP.NET Core Patterns)

Testing these common patterns:

1. `/connect/token` - IdentityServer4/OAuth2.0 pattern
2. `/api/oauth/token` - API-prefixed pattern
3. `/api/v1/auth/token` - Versioned auth pattern
4. `/api/token` - Simple API pattern
5. `/token` - Root-level pattern

## Next Steps

1. **Access Swagger UI** (requires authentication):
   - Visit: `https://uat.fulcrumswitch.com/swagger`
   - Find OAuth/authentication endpoints
   - Check "Authorize" button in Swagger UI

2. **Contact MobileMart Support:**
   - Request exact OAuth endpoint path
   - Ask for Swagger documentation access
   - Request working example curl command

3. **Check Email from MobileMart:**
   - The documentation mentions credentials are provided via email
   - The email may contain the exact endpoint URLs
   - Check for any setup instructions

## Current Status

- ✅ Base URL updated to `fulcrumswitch.com`
- ✅ Product endpoints updated to match documentation
- ✅ Purchase endpoints updated to match documentation
- ❌ OAuth endpoint path needs verification
- ⏸️ Waiting for correct endpoint path from MobileMart


