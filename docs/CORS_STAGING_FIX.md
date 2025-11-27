# CORS Preflight Fix for Staging Environment

## Issue
Staging wallet frontend (`https://stagingwallet.mymoolah.africa`) cannot make API calls to staging backend (`https://staging.mymoolah.africa`) due to CORS preflight (OPTIONS) requests being blocked by Cloud Run IAM.

## Root Cause
1. **Organization Policy**: "Domain restricted sharing" (`iam.allowedPolicyMemberDomains`) is **Active**
2. **Cloud Run IAM**: Cannot add `allUsers` to Cloud Run service due to organization policy
3. **CORS Preflight**: Browser sends OPTIONS request before actual API call, but Cloud Run IAM blocks it with 403

## Banking-Grade Solution

### Option 1: Request Organization Policy Exception (Recommended)

Request an exception to the "Domain restricted sharing" policy that allows `allUsers` for Cloud Run services, but only for OPTIONS requests (CORS preflight).

**Steps:**
1. Go to Google Cloud Console → IAM & Admin → Organization Policies
2. Find "Domain restricted sharing" policy
3. Click "Manage policy"
4. Add exception for project `mymoolah-db`
5. Scope: Cloud Run services only
6. Note: This allows OPTIONS requests (metadata only), actual API calls still require authentication

**Security Note**: OPTIONS requests are metadata-only (no sensitive data). Actual API calls (POST, GET, etc.) still require authentication via JWT tokens.

### Option 2: Use Cloud Endpoints or API Gateway

Configure Cloud Endpoints or API Gateway to handle CORS preflight at the edge before Cloud Run IAM.

**Pros:**
- Handles CORS at edge (before Cloud Run)
- Maintains Cloud Run authentication for actual API calls
- Banking-grade security

**Cons:**
- More complex setup
- Additional cost
- Requires API Gateway configuration

### Option 3: Use Service Account Authentication (Not Recommended)

Configure frontend to authenticate with a service account. **Not recommended** because:
- Service account keys should not be exposed in frontend
- Not suitable for browser-based applications
- Security risk

## Current Status

- ✅ Backend CORS configuration is correct (`config/security.js`)
- ✅ CORS headers configured at load balancer level
- ✅ Backend handles OPTIONS requests properly
- ❌ Cloud Run IAM blocks OPTIONS requests before they reach backend
- ❌ Organization policy prevents adding `allUsers` to Cloud Run

## Next Steps

1. **Immediate**: Request organization policy exception for OPTIONS requests
2. **Alternative**: Implement Cloud Endpoints/API Gateway solution
3. **Testing**: Once fixed, test login flow from `https://stagingwallet.mymoolah.africa`

## Testing

After implementing the fix:

```bash
# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: https://stagingwallet.mymoolah.africa" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -i \
  https://staging.mymoolah.africa/api/v1/auth/login

# Should return: HTTP/2 204 with CORS headers
```

## References

- [Cloud Run IAM Documentation](https://cloud.google.com/run/docs/securing/managing-access)
- [Organization Policy Documentation](https://cloud.google.com/resource-manager/docs/organization-policy/overview)
- [CORS Preflight Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#preflighted_requests)

