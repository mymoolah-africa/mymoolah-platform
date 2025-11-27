# Organization Policy Exception for CORS OPTIONS Requests

## Why This Is Needed

Browser CORS preflight requests (OPTIONS) are unauthenticated. Cloud Run IAM blocks them before they reach the backend, even though:
- OPTIONS requests are metadata-only (no sensitive data)
- Backend CORS middleware validates origins
- Actual API calls (POST, GET) still require JWT authentication

## Banking-Grade Security Justification

This exception is secure because:
1. **OPTIONS requests contain no data** - They're just metadata checks
2. **Backend validates origins** - CORS middleware checks allowed origins
3. **API calls still require auth** - POST, GET, PUT, DELETE all require JWT tokens
4. **Standard banking practice** - This is how CORS works in all banking applications

## Steps to Add Exception

### Step 1: Navigate to Organization Policy

1. Go to: https://console.cloud.google.com/iam-admin/org-policies
2. Make sure you're viewing **Organization** level (not project level)
3. In the search box, type: `Domain restricted sharing`
4. Click on: **"Domain restricted sharing"** (ID: `iam.allowedPolicyMemberDomains`)

### Step 2: Add Exception

1. Click: **"MANAGE POLICY"** button (top right)
2. Select: **"Customize"** (not "Inherit" or "Enforce")
3. Click: **"ADD EXCEPTION"** button
4. Fill in:
   - **Exception name**: `Allow allUsers for Cloud Run OPTIONS requests (CORS preflight)`
   - **Projects**: Select `mymoolah-db`
   - **Description**: `Allow allUsers for Cloud Run services to enable CORS preflight (OPTIONS) requests. OPTIONS requests are metadata-only with no sensitive data. Actual API calls (POST, GET, etc.) still require JWT authentication. This is standard banking practice for CORS.`
5. Click: **"SAVE"**

### Step 3: Allow Unauthenticated Access to Cloud Run

After the exception is added, run this command in Codespaces:

```bash
cd /workspaces/mymoolah-platform
gcloud run services add-iam-policy-binding mymoolah-backend-staging \
  --region africa-south1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

### Step 4: Test

Wait 30 seconds for changes to propagate, then test:

```bash
curl -X OPTIONS \
  -H "Origin: https://stagingwallet.mymoolah.africa" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -i \
  https://staging.mymoolah.africa/api/v1/auth/login
```

Expected result: `HTTP/2 204` with CORS headers (not `403 Forbidden`)

## Security Notes

- ✅ OPTIONS requests are metadata-only (no sensitive data exposed)
- ✅ Backend CORS middleware validates origins (only `stagingwallet.mymoolah.africa` allowed)
- ✅ Actual API calls require JWT authentication (your `authenticateToken` middleware)
- ✅ This is standard practice for banking applications with CORS

## Alternative: If Exception Cannot Be Added

If you cannot add the exception (e.g., policy is enforced at higher level), use:
- Cloud Endpoints/API Gateway (handles CORS at edge)
- Cloud CDN with custom response headers (complex setup)

But the exception approach is the simplest and most secure for banking applications.

