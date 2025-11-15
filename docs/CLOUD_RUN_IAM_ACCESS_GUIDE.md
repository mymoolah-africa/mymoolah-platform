# Cloud Run IAM Access Configuration Guide

## Issue: 403 Forbidden Error

When accessing Cloud Run services, you may encounter `403 Forbidden` errors. This is typically due to IAM (Identity and Access Management) restrictions.

## Common Causes

1. **Organization Policy**: Your Google Cloud organization may have policies that prevent public access to Cloud Run services
2. **Missing IAM Binding**: The service may not have the `roles/run.invoker` role granted to `allUsers`
3. **Service Account Restrictions**: The service may require authenticated access only

## Solutions

### Option 1: Configure Organization Policy (Recommended for Production)

If you have organization admin access:

1. Go to **Google Cloud Console** → **IAM & Admin** → **Organization Policies**
2. Find the policy: **Restrict public IP access on Cloud Run**
3. Modify the policy to allow public access for your project
4. Or create an exception for your specific Cloud Run services

### Option 2: Use Authenticated Access (For Testing)

For testing purposes, you can use authenticated access:

1. **Get an access token**:
   ```bash
   gcloud auth print-identity-token
   ```

2. **Access the service with the token**:
   ```bash
   curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     https://mymoolah-wallet-staging-xxx.a.run.app
   ```

3. **Or use a browser extension** that adds the token to requests

### Option 3: Use Firebase Hosting (Recommended for Static Sites)

For static frontend applications (like the wallet), Firebase Hosting is better suited:

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase**:
   ```bash
   cd mymoolah-wallet-frontend
   firebase init hosting
   ```

3. **Deploy**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

Firebase Hosting automatically provides public HTTPS access without IAM restrictions.

### Option 4: Use Cloud Storage + Load Balancer

For production static sites, you can:
1. Upload static files to Cloud Storage
2. Configure a Cloud Load Balancer
3. Set up proper IAM for public access

## Current Status

### Staging Backend
- **Service**: `mymoolah-backend-staging`
- **Status**: Deployed with `--allow-unauthenticated` flag
- **Access**: Blocked by organization policy (403 Forbidden)
- **Workaround**: Use authenticated access or configure organization policy

### Staging Wallet
- **Service**: `mymoolah-wallet-staging`
- **Status**: Deployed with `--allow-unauthenticated` flag
- **Access**: Blocked by organization policy (403 Forbidden)
- **Workaround**: Use authenticated access, Firebase Hosting, or configure organization policy

## Testing with Authenticated Access

### Using curl:
```bash
# Get access token
TOKEN=$(gcloud auth print-identity-token)

# Test wallet
curl -H "Authorization: Bearer $TOKEN" \
  https://mymoolah-wallet-staging-xxx.a.run.app

# Test backend
curl -H "Authorization: Bearer $TOKEN" \
  https://mymoolah-backend-staging-xxx.a.run.app/health
```

### Using Browser:
1. Install a browser extension that adds Google Cloud auth tokens
2. Or use the Google Cloud Console's "Test" feature for Cloud Run services

## Next Steps

1. **For Development**: Use the Codespaces wallet (no IAM restrictions)
2. **For Staging Testing**: Configure organization policy or use authenticated access
3. **For Production**: Consider Firebase Hosting for the wallet frontend

## References

- [Cloud Run IAM Documentation](https://cloud.google.com/run/docs/securing/managing-access)
- [Organization Policy Documentation](https://cloud.google.com/resource-manager/docs/organization-policy/overview)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)

