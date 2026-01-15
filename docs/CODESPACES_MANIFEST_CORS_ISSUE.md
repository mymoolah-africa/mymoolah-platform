# Codespaces Manifest.json CORS Issue

**Date**: January 15, 2026  
**Status**: ⚠️ **KNOWN ISSUE - NO ACTION REQUIRED**  
**Impact**: Console warning only - does not affect functionality

---

## 🔍 **Issue Description**

When running the frontend in GitHub Codespaces, you may see CORS errors in the browser console related to `manifest.json`:

```
Access to manifest at 'https://github.dev/pf-signin?...' (redirected from 'https://bug-free-doodle-pj66r7q7q5pw39pjv-3000.app.github.dev/manifest.json') from origin 'https://bug-free-doodle-pj66r7q7q5pw39pjv-3000.app.github.dev' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 **Root Cause**

This is a **GitHub Codespaces infrastructure issue**, not a code issue:

1. **Browser requests** `/manifest.json` from the Codespaces frontend URL
2. **GitHub Codespaces tunnel** requires authentication for certain resources
3. **Request is redirected** to GitHub sign-in page (`github.dev/pf-signin`)
4. **Browser blocks redirect** due to CORS policy (cross-origin redirect)

## ✅ **Impact Assessment**

- **Functionality**: ✅ **NO IMPACT** - The app works perfectly without the manifest
- **PWA Features**: ⚠️ **MINOR** - Some PWA features (install prompt, offline support) may not work in Codespaces
- **Production**: ✅ **NO IMPACT** - This only affects Codespaces development environment
- **User Experience**: ✅ **NO IMPACT** - Users don't see this error, only developers in Codespaces

## 🎯 **Why This Happens**

The `manifest.json` file is used for Progressive Web App (PWA) features:
- App installation prompts
- Offline support
- App icons and theme colors
- Standalone display mode

In Codespaces, GitHub's authentication system intercepts the request and redirects it, causing the CORS error.

## ✅ **Solution**

**No action required** - This is a known GitHub Codespaces limitation:

1. **The error is harmless** - It's just a console warning
2. **App functionality is unaffected** - The wallet app works perfectly
3. **Production is unaffected** - This only happens in Codespaces
4. **PWA features are optional** - The app works without them

## 🔧 **Workarounds (Optional)**

If you want to suppress the console error (optional):

### Option 1: Ignore the Error
- Simply ignore the console warning - it doesn't affect functionality

### Option 2: Remove Manifest Link (Not Recommended)
- Remove `<link rel="manifest" href="/manifest.json" />` from `index.html`
- **Note**: This disables PWA features, which may be needed in production

### Option 3: Use Local Development
- Test PWA features in local development environment
- Codespaces is primarily for backend testing

## 📋 **Verification**

To verify the app works correctly despite the error:

1. ✅ **Login works** - User authentication functions normally
2. ✅ **API calls work** - Backend communication is unaffected
3. ✅ **UI loads** - All pages and components render correctly
4. ✅ **Transactions work** - All wallet features function normally

## 🎯 **Conclusion**

This is a **known GitHub Codespaces limitation** that does not affect app functionality. The CORS error is a console warning only and can be safely ignored. The app works perfectly in Codespaces for development and testing purposes.

**Status**: ⚠️ **KNOWN ISSUE - NO ACTION REQUIRED**

---

**Related Documentation**:
- `docs/CODESPACES_TESTING_REQUIREMENT.md` - Codespaces testing guide
- `docs/CORS_STAGING_FIX.md` - CORS configuration for staging/production
