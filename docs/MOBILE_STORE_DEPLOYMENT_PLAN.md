# MyMoolah Mobile Store Deployment Plan

**Last Updated**: February 2026  
**Status**: 📋 Documented – to be revisited  
**Purpose**: Deploy MyMoolah wallet to Google Play and Apple App Store as native apps with banking-grade security and FreeData optimization.

---

## 1. Original Implementation Plan (Reference)

### Goal Description

Deploy the MyMoolah application to Android and iOS with a focus on:
- **Banking-grade security**
- **Reliability**
- **Extreme data efficiency** (FreeData/Zero-rated optimization)

### Technical Strategy: Capacitor Shell

Use **Capacitor** to wrap the React/TypeScript application. This allows a single codebase while gaining native access to:
- Security hardware (Biometrics)
- Networking (SSL Pinning)

---

## 2. Environment & Connectivity

### Staging-to-Production Migration

The app will dynamically load configuration based on the build environment, leveraging **Google Cloud Secret Manager** for all sensitive keys (API keys, Firebase configs, encryption salts).

| Environment | Wallet URL | API URL |
|-------------|------------|---------|
| **Staging** | `https://stagingwallet.mymoolah.africa/login` | `https://staging.mymoolah.africa` |
| **Production** | `https://wallet.mymoolah.africa/login` | `https://api-mm.mymoolah.africa` |

### Implementation

- **CI/CD Pipeline Injection**: During build (GitHub Actions / Cloud Build), secrets are fetched from Google Cloud Secret Manager and injected into:
  - Native build config (`google-services.json`, `GoogleService-Info.plist`)
  - Web app build-time variables
- **NO secrets** in codebase or `.env` files
- **Build flavors** (Android) and **schemes** (iOS) per environment

---

## 3. Zero-Rated (FreeData) Optimization

The app must be optimized for "freedata" URLs where data costs are zero-rated by ISPs.

| Strategy | Implementation |
|----------|----------------|
| **Aggressive PWA Caching** | Workbox (Service Workers) to cache 100% of app shell (JS/CSS/Assets) on first visit |
| **Resource Bundling** | Pre-bundle critical icons and fonts into native app binary |
| **Data-Light API** | Brotli/Gzip compression on backend |
| **Data Saver Mode** | Disable non-critical animations, reduce image quality on mobile network |
| **Domain Whitelisting** | Route all dependencies through zero-rated domain |

---

## 4. Banking-Grade Security

| Feature | Implementation |
|---------|----------------|
| **Biometric Auth** | `@capacitor-community/face-id` or `@capacitor-community/biometric-auth` |
| **Secure Token Storage** | Device KeyStore/Keychain (not LocalStorage) |
| **SSL Pinning** | `cordova-plugin-advanced-http` or Capacitor HTTP plugin |
| **Root/Jailbreak Detection** | Alert or disable sensitive features on compromised devices |
| **Secure Storage** | Capacitor Secure Storage for PII and session keys |

---

## 5. Native Features

| Feature | Implementation |
|---------|----------------|
| **Push Notifications** | FCM (Android), APNS (iOS) |
| **Transactional Alerts** | Replace SMS with Push for confirmations and security alerts |

---

## 6. Proposed Code Changes

| File/Action | Change |
|-------------|--------|
| `vite.config.ts` | Add `vite-plugin-pwa` for offline-first caching; optimize chunks |
| `capacitor.config.ts` (NEW) | Set `server.url`, configure Biometrics and Push permissions |

---

## 7. Verification Plan

1. **Security Audit**: Biometric unlock, SSL pinning blocks malicious proxies
2. **Data Optimization**: Second launch shows 0 KB fetched for static assets
3. **Push Notification**: Transaction alerts delivered in background on Android and iOS

---

## 8. MMTP Current State vs Plan

| Aspect | MMTP Today | Plan | Alignment |
|--------|------------|------|-----------|
| **Stack** | React 18 + Vite 4, TypeScript | Capacitor shell over React | ✅ Compatible |
| **PWA** | Basic manifest, no Service Worker | Workbox + offline-first | ⚠️ Add `vite-plugin-pwa` |
| **Auth** | `sessionStorage` + `localStorage` | Keychain/SecureStorage | ⚠️ Must migrate |
| **Config** | `VITE_API_BASE_URL` in `app-config.ts` | Build-time env + Secret Manager | ✅ Aligns |
| **Biometrics** | `enableBiometrics: false` | FaceID/Fingerprint | ⚠️ Needs implementation |
| **Deployment** | Cloud Run (stagingwallet.mymoolah.africa) | Staging → Production | ✅ Matches |

---

## 9. Gaps & Adjustments for MMTP

### 9.1 URL Consistency

- **Plan**: `stagingwallet.mymoolah.africa` (staging), `wallet.mymoolah.africa` (prod)
- **Current**: `referralController.js` uses `app.mymoolah.africa/signup?ref=`
- **Action**: Align referral share URLs with staging/production domains

### 9.2 Auth Token Storage

- **Current**: `utils/authToken.ts` uses `sessionStorage` / `localStorage`
- **Action**: Replace with Capacitor `Preferences` or `@capacitor/preferences` or native secure storage plugin for banking-grade tokens

### 9.3 Config Injection

- **Current**: `config/app-config.ts` reads `VITE_API_BASE_URL` at build time
- **Action**: CI/CD injects `VITE_API_BASE_URL` (and other env vars) from Secret Manager

### 9.4 Manifest

- **Current**: `public/manifest.json` exists; manifest link conditionally loaded (Codespaces CORS workaround)
- **Action**: For Capacitor, manifest link less critical; for PWA ensure correct manifest in production

### 9.5 PWA Plugin

- **Current**: `vite.config.ts` has no `vite-plugin-pwa` or Workbox
- **Action**: Add `vite-plugin-pwa` and configure aggressive caching

---

## 10. Phased Implementation Roadmap

### Phase 1: Foundation (Before Capacitor)

1. Add `vite-plugin-pwa` and Workbox config
2. Define environment config (staging vs production URLs)
3. Create abstraction for token storage (web → Capacitor migration path)

### Phase 2: Capacitor Integration

1. `npm install @capacitor/core @capacitor/cli`
2. `npx cap init` + configure `capacitor.config.ts`
3. `npx cap add android` and `npx cap add ios`
4. Build and sync: `npm run build && npx cap sync`

### Phase 3: Native Features

1. Secure storage (token migration)
2. Biometrics (optional unlock)
3. SSL pinning
4. Push notifications (FCM + APNS)

### Phase 4: Store Readiness

1. **Apple**: Developer account, icons, screenshots, privacy policy, App Store Connect
2. **Google**: Play Console, icons, feature graphic, screenshots, privacy policy, content rating, data safety form
3. **Banking**: Privacy policy, terms, data retention, KYC disclosures

### Phase 5: Zero-Rated / FreeData

1. Service Worker caching
2. Domain whitelist
3. Data Saver mode

---

## 11. Store Requirements Summary

### Apple App Store

- Apple Developer account ($99/year)
- App icons (1024×1024)
- Screenshots for all device sizes
- Privacy policy URL
- App description and metadata

### Google Play

- Google Play Developer account ($25 one-time)
- App icons (512×512)
- Feature graphic (1024×500)
- Screenshots for phones and tablets
- Privacy policy URL
- Content rating questionnaire
- Data safety form (especially for KYC)

### Banking Compliance

- Privacy policy (POPIA, GDPR)
- Terms of service
- Data retention and deletion policy
- KYC/AML disclosures

---

## 12. Relevant MMTP File Paths

| Item | Path |
|------|------|
| Frontend config | `mymoolah-wallet-frontend/config/app-config.ts` |
| Auth token storage | `mymoolah-wallet-frontend/utils/authToken.ts` |
| Vite config | `mymoolah-wallet-frontend/vite.config.ts` |
| Manifest | `mymoolah-wallet-frontend/public/manifest.json` |
| Referral share URL | `controllers/referralController.js` |
| Staging deployment | `scripts/build-push-deploy-staging.sh` |
| Migrations | `./scripts/run-migrations-master.sh [uat\|staging]` |

---

## 13. Global Award-Winning App Compatibility

To match banking apps (e.g. Chase, Capitec):

1. **Security**: TLS, secure storage, biometrics, SSL pinning
2. **Performance**: Offline-first, fast load, minimal data
3. **Reliability**: Error handling, retries, graceful degradation
4. **Compliance**: Privacy policy, terms, data safety, KYC
5. **UX**: Native feel, smooth transitions, offline support

**Non-negotiable for production**: SSL pinning and secure token storage are required for banking-grade deployment.

---

## 14. Next Steps (When Revisiting)

1. Create `capacitor.config.ts` in `mymoolah-wallet-frontend/`
2. Add `vite-plugin-pwa` to `vite.config.ts`
3. Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`
4. Migrate `utils/authToken.ts` to use secure storage abstraction
5. Set up staging/production build flavors in CI/CD
6. Align referral share URLs with deployment domains
7. Implement biometric unlock flow
8. Add SSL pinning and root/jailbreak detection
9. Configure push notifications (FCM + APNS)
10. Prepare store assets and policies

---

*Document created for future implementation. Revisit when ready to proceed with mobile store deployment.*
