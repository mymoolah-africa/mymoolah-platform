# MyMoolah Mobile Store Deployment Plan

**Last Updated**: 2026-05-15  
**Status**: Banking-grade Android deployment design approved for planning; implementation not started  
**Purpose**: Deploy the MyMoolah wallet to Google Play as a banking-grade Android application with uncompromised security, high-tier performance, POPIA-safe caching, and Play compliance. Apple App Store work remains a later parallel track.

---

## 0. Banking-Grade Android Deployment Design

### 0.1 Executive Decision

The production Google Play release must be treated as a **mobile banking release**, not a web packaging task.

**Recommended production architecture**: Capacitor Android shell over the existing React/Vite wallet, with native security, networking, storage, device-risk, signing, and release controls.

**Rejected as production target**: Trusted Web Activity or simple WebView-only wrapper. These may be used only for internal proof-of-concept or temporary closed testing because they do not provide the native security control depth required for MyMoolah's banking-grade standard.

### 0.2 Non-Negotiable Release Principles

1. **Security first**: no production Android release may store access tokens in browser `localStorage` or `sessionStorage`.
2. **Performance tiering**: the app must be fast on low-end Android devices common in South Africa while preserving premium behaviour on mid/high-tier devices.
3. **POPIA-safe caching**: cache static app shell assets aggressively, but never cache personal financial, KYC, balance, transaction, notification, support, or PII responses.
4. **No duplicate architecture**: reuse the existing wallet codebase, deployment domains, API contracts, policy corpus, and mobile plan rather than creating a second mobile platform.
5. **Real environments only**: staging and production builds must use real URLs and Secret Manager-backed configuration. No demo credentials or fake financial flows may ship in a store build.
6. **Measurable gates**: every release phase must have objective security, performance, compliance, and QA exit criteria.

### 0.3 Existing Assets To Reuse

| Area | Current asset |
|------|---------------|
| Wallet frontend | `mymoolah-wallet-frontend/` React 18 + Vite app |
| API config | `mymoolah-wallet-frontend/config/app-config.ts` with `VITE_API_BASE_URL` |
| Web manifest | `mymoolah-wallet-frontend/public/manifest.json` |
| Manifest injection | `mymoolah-wallet-frontend/main.tsx` |
| Auth helper needing migration | `mymoolah-wallet-frontend/utils/authToken.ts` |
| Production wallet domain | `https://wallet.mymoolah.africa/login` |
| Production API domain | `https://api-mm.mymoolah.africa` |
| Staging wallet domain | `https://stagingwallet.mymoolah.africa/login` |
| Staging API domain | `https://staging.mymoolah.africa` |
| Compliance corpus | `docs/policies/`, `docs/TERMS_AND_CONDITIONS.md`, `docs/SECURITY.md` |
| Existing mobile roadmap | This document |

### 0.4 Current Gaps Confirmed Before Implementation

The current repo is compatible with a mobile release, but it is not yet Android-store ready:

- No `android/` project exists.
- No `capacitor.config.*` exists.
- No Capacitor packages are installed.
- No `vite-plugin-pwa`, Workbox, service worker, or offline app-shell cache exists.
- No `assetlinks.json` exists for a TWA or Android App Links path.
- The web manifest has only one SVG icon and needs Android/Play raster assets.
- `utils/authToken.ts` uses `sessionStorage` first and a `localStorage` fallback; this must be replaced for Android.
- `FEATURES.enableBiometrics` is currently false.
- Store listing assets, Play Data Safety answers, content rating, release signing, and Android package metadata are not present.
- JWT signing policy must be reconciled before Android release: project rules require HS512 with short expiry, while mobile release planning must verify the actual auth code path enforces that standard.

### 0.5 Target Android Architecture

```
Google Play App Bundle
  -> Capacitor Android shell
    -> bundled React/Vite wallet app shell
    -> native secure storage bridge
    -> native HTTP/network trust bridge where required
    -> native biometric/device-risk/push modules
      -> MyMoolah API over HTTPS only
        -> api-mm.mymoolah.africa / staging.mymoolah.africa
```

The Android app must run the same wallet product surface but with mobile-specific hardening:

- Android package ID: final value to be confirmed before implementation, e.g. `africa.mymoolah.wallet`.
- Distribution: Android App Bundle (`.aab`) via Google Play App Signing.
- Build flavours: `staging` and `production`.
- Configuration injection: build-time variables from CI and Google Cloud Secret Manager. No secrets committed to repo.
- Static app shell: bundled in the native app and optionally cached for faster updates.
- Dynamic API data: fetched only from approved API domains and not persisted in WebView caches.

### 0.6 Security Architecture

#### Token And Session Storage

Android builds must not use browser storage for active tokens.

Required target:

- Store access/refresh/session material in Android Keystore-backed storage via an approved Capacitor secure-storage bridge.
- Keep access tokens short-lived.
- Use refresh-token rotation where backend support is available.
- Clear tokens on logout, app lockout, device-risk failure, and account compromise events.
- Do not expose tokens to console logs, crash logs, analytics, clipboard, screenshots, or WebView devtools in release builds.
- Keep web fallback behaviour only for browser builds, behind an explicit platform storage abstraction.

Implementation implication:

- Replace direct token access in `utils/authToken.ts` with a platform-aware storage abstraction.
- Keep current web behaviour available for local/Codespaces/browser testing.
- Enforce secure native storage in Android production builds.

#### Authentication And JWT Release Gate

Before Play release, verify the production auth path complies with MyMoolah rules:

- JWT algorithm is explicitly HS512.
- Access token expiry is short and environment appropriate.
- Refresh-token behaviour is documented and tested.
- Token revocation/logout behaviour is tested.
- Login, OTP, reset, KYC, wallet, VAS, and payout flows all handle expiry safely.

This is a release gate because mobile secure storage does not compensate for weak token issuance.

#### WebView Hardening

Capacitor WebView must be locked down for a financial app:

- HTTPS only.
- Disable arbitrary external navigation.
- Allow navigation only to MyMoolah-approved domains and explicitly approved partner/deep-link schemes.
- Disable file URL access unless required by Capacitor and proven safe.
- Disable mixed content.
- Disable debugging in release builds.
- Apply screenshot/recents protection on sensitive screens where feasible.
- Sanitize all external links through an approved open-in-browser path.
- Do not show provider internals, SQL, stack traces, raw IDs, or secrets in UI errors.

#### Network Trust

Required production controls:

- TLS 1.3 at the edge where supported.
- Android network security config for release vs debug.
- Certificate/public-key pinning design for `api-mm.mymoolah.africa` and staging.
- Safe pin rotation strategy to avoid bricking apps during certificate renewal.
- Explicit debug/proxy bypass only in non-production builds.
- Verify backend CORS and CSP allow the final Capacitor origin and production API domain without widening to unsafe origins.

#### Device Risk

The first banking-grade Android release should include risk detection with configurable policy:

- Root/jailbreak detection.
- Emulator/debugger/tamper signals.
- Screen overlay risk check where practical.
- App integrity verification using Play Integrity API where feasible.
- Risk-based response levels: warn, restrict sensitive flows, or block.

Sensitive flows include login, KYC upload, PIN reveal, voucher reveal/copy, send money, cash-out, top-up, and profile/security changes.

#### Biometrics

Biometrics should be used as a convenience unlock layer, not as the only authentication factor.

Required behaviour:

- First login still requires server-backed auth.
- Biometric unlock may release a locally stored session only when device integrity and token validity are acceptable.
- User can opt out.
- Failed biometric attempts fall back to secure login.
- Device biometric changes invalidate local biometric unlock.

#### Push Notifications

Push should use FCM for Android, subject to consent and POPIA rules:

- Transaction/security alerts are separate from marketing notifications.
- Notification body must not expose sensitive amounts, full names, full mobile numbers, ID numbers, voucher PINs, or provider secrets unless explicitly approved.
- Tapping a notification must re-authenticate or unlock before showing sensitive detail.

### 0.7 Performance Architecture

#### Performance Tiers

The app must deliberately support at least three Android performance classes:

| Tier | Target device profile | Behaviour |
|------|-----------------------|-----------|
| Low-end | 2-3 GB RAM, older Android/WebView, poor network | reduced motion, aggressive static asset cache, small payloads, skeleton states, no heavy charts by default |
| Standard | common mid-range Android | full wallet experience, optimized bundle loading, normal animation |
| Premium | high-end Android | full experience with richer motion only where it does not delay financial action |

#### Startup And Runtime Targets

Targets for Android release validation:

- Cold start to first meaningful wallet shell: under 2.5s on mid-range device, under 4s on low-end device after install.
- Warm start: under 1.5s on mid-range device.
- Login interaction response: visible feedback under 150ms.
- Financial confirmation screens: no layout jank on low-end devices.
- API read paths: respect existing backend targets and avoid excessive polling.
- App bundle size: measured and budgeted before release.
- JavaScript main thread long tasks: measured on low-end Android and kept below release threshold.

#### Static Asset Caching

Use a PWA/static app-shell strategy only for non-sensitive assets:

Cacheable:

- Built JS/CSS chunks.
- Fonts.
- Brand icons and static images.
- Non-sensitive help/static copy if explicitly approved.

Never cache:

- Auth responses.
- Balances.
- Transactions.
- KYC documents or metadata.
- Notifications.
- Profile data.
- Voucher PINs/codes.
- Payment, payout, top-up, cash-out, or support-chat personal responses.

Service worker or Workbox rules must be reviewed as a security artifact before release.

#### API And Polling Discipline

Android-specific polling must not overwhelm shared-IP mobile networks:

- Prefer server-driven refresh, explicit pull-to-refresh, or push-triggered refresh over tight polling.
- Avoid duplicate balance/notification calls on app foreground.
- Ensure 429 handling is safe and user-friendly.
- Validate behaviour behind carrier-grade NAT where many users share one IP.

### 0.8 Google Play Compliance Design

Before submission, create a Play Console workbook mapping app behaviour to store declarations.

Required fields/workbooks:

- App name, short description, full description.
- 512x512 app icon.
- 1024x500 feature graphic.
- Phone screenshots.
- Tablet decision: support or explicitly exclude.
- Privacy policy URL.
- Terms URL.
- Support email and support URL.
- Content rating questionnaire.
- Financial features declaration.
- Data Safety form.
- Account creation and account deletion disclosure.
- Permissions justification.
- Closed testing plan and tester list.

Data Safety must be based on actual code behaviour, including:

- Phone number/MSISDN.
- Account number/user identifiers.
- KYC identity data.
- Images/files uploaded for KYC.
- Transaction history.
- Wallet balance.
- Device identifiers/integrity signals.
- Crash logs and diagnostics, if enabled.
- Push notification tokens.

### 0.9 Implementation Work Packages

#### Work Package 1: Architecture And Release Design

Output:

- Final Android architecture decision.
- Package ID.
- Build flavours.
- Store release gates.
- Security threat model.
- Performance targets.
- Compliance workbook structure.

Exit criteria:

- André approves Capacitor production path.
- Security, performance, and compliance gates are accepted before code implementation.

#### Work Package 2: Capacitor Android Foundation

Tasks:

- Add Capacitor dependencies to `mymoolah-wallet-frontend`.
- Add `capacitor.config.ts`.
- Add Android project.
- Configure app ID, app name, icons, splash screen, and staging/production flavours.
- Ensure `npm run build` and Capacitor sync work reproducibly.
- Document local and CI build commands.

Exit criteria:

- Debug Android build installs on a physical device.
- Staging build points only to staging wallet/API.
- Production build points only to production wallet/API.
- No secrets exist in repo.

#### Work Package 3: Secure Storage And Auth Migration

Tasks:

- Introduce platform-aware token storage abstraction.
- Keep web browser storage only for web builds.
- Use native secure storage for Android.
- Add logout/token-clear tests.
- Add expiry/re-auth handling.
- Reconcile JWT signing and expiry against HS512 project rule.

Exit criteria:

- Android production build does not persist tokens in WebView `localStorage` or `sessionStorage`.
- Token expiry and logout are verified.
- Auth tests cover web and Android storage modes.

#### Work Package 4: Network And WebView Hardening

Tasks:

- Configure Android network security config.
- Implement pinning strategy with rotation plan.
- Lock navigation allowlist.
- Disable debug WebView in release.
- Validate CORS/CSP for Capacitor origins and production API domains.
- Add external-link handling.

Exit criteria:

- Release app refuses non-approved network destinations.
- MITM proxy test fails safely in release.
- Debug build remains testable without weakening production.

#### Work Package 5: Performance And POPIA-Safe Caching

Tasks:

- Add `vite-plugin-pwa`/Workbox only if cache rules are explicitly reviewed.
- Cache static app shell assets only.
- Add low-data/performance mode flags where needed.
- Review route splitting and heavy UI imports.
- Measure startup, bundle size, and low-end device runtime.

Exit criteria:

- Static app shell launches quickly on second run.
- No sensitive API response is cached.
- Low-end Android device passes startup and interaction targets.

#### Work Package 6: Native Features

Tasks:

- Biometric unlock.
- Device-risk/root detection.
- FCM push notifications.
- Deep links/App Links.
- Screenshot/recents protection for sensitive flows where feasible.

Exit criteria:

- Biometrics cannot bypass server auth.
- Root/tamper policy is tested.
- Push notifications respect POPIA-safe copy.
- Deep links do not reveal sensitive screens without unlock.

#### Work Package 7: Store Readiness

Tasks:

- Create Play listing assets.
- Complete Play Data Safety workbook.
- Complete financial/content declarations.
- Prepare privacy/terms/support public URLs.
- Configure Play App Signing and upload key process.
- Run internal and closed testing.

Exit criteria:

- Closed testing build approved by André.
- Play Console fields match actual app behaviour.
- Release notes and rollback plan exist.

### 0.10 QA And Release Gates

No production Play rollout without all gates passing:

| Gate | Requirement |
|------|-------------|
| Security | secure storage, pinning, release WebView hardening, no token leakage |
| Auth | HS512/expiry policy verified, expiry/logout/re-auth tested |
| POPIA | no sensitive caching, Data Safety matches behaviour |
| Performance | low-end and mid-range device matrix passed |
| Financial UX | send money, top-up, cash-out, VAS, KYC, transaction history tested |
| Resilience | offline, timeout, retry, 429, app background/foreground tested |
| Store | Play App Signing, listing, privacy, terms, content rating complete |
| Operations | incident response, forced update, crash monitoring, rollback plan documented |

### 0.11 Minimum Device Test Matrix

Physical-device testing must include:

- Low-end Android 10/11 device with 2-3 GB RAM.
- Mid-range Android 12/13 device.
- Recent Android 14/15 device.
- Poor network simulation.
- App background/foreground cycles.
- Device biometric enabled/disabled.
- Camera/file picker for KYC and QR flows.
- Shared mobile network/NAT scenario where possible.

### 0.12 Timeline Estimate

For a production banking-grade Android release:

| Phase | Estimate |
|-------|----------|
| Architecture, threat model, and compliance workbook | 3-5 days |
| Capacitor Android foundation | 1 week |
| Secure storage and auth migration | 1 week |
| WebView/network hardening and pinning | 1-2 weeks |
| Performance/cache/low-data tiering | 1 week |
| Biometrics, device risk, push, deep links | 1-2 weeks |
| Store assets, closed testing, Play submission pack | 1-2 weeks |

Expected total: **6-10 weeks**, depending on certificate pinning, push, Play Integrity, and compliance review depth.

### 0.13 Questions To Resolve Before Coding

1. Confirm final Android package ID.
2. Confirm whether first release must include biometrics or whether secure login plus native secure storage is sufficient for v1.
3. Confirm whether FCM push notifications are required for first Play submission.
4. Confirm whether rooted devices are blocked entirely or only blocked from sensitive financial actions.
5. Confirm public privacy policy, terms, support, and account deletion URLs.
6. Confirm whether tablet support is included in v1.
7. Confirm final Play Console owner account and signing-key custody process.

### 0.14 Implementation Status - 2026-05-15

Initial Android implementation has started.

Completed first slice:

- Added Capacitor Android foundation under `mymoolah-wallet-frontend/android/`.
- Set Android package/application ID to `africa.mymoolah.wallet`.
- Added `capacitor.config.ts` with HTTPS scheme, cleartext disabled, mixed content disabled, and release WebView debugging disabled.
- Added Android build scripts:
  - `npm run build:android:staging`
  - `npm run build:android:production`
  - `npm run build:android:debug-apk`
  - `npm run build:android:release-aab`
  - `npm run android:apk:path`
  - `npm run android:aab:path`
  - `npm run cap:sync:android`
  - `npm run cap:open:android`
- Added `mymoolah-wallet-frontend/docs/ANDROID_BUILD.md` with Codespaces setup, debug APK build, download/install, and smoke-test instructions.
- Added release AAB build path and environment-based signing hook. Signing keys are not committed; release builds read `MYMOOLAH_ANDROID_KEYSTORE_PATH`, `MYMOOLAH_ANDROID_KEYSTORE_PASSWORD`, `MYMOOLAH_ANDROID_KEY_ALIAS`, and `MYMOOLAH_ANDROID_KEY_PASSWORD` when supplied by CI/Secret Manager.
- Added Capacitor dependencies aligned to the current Node 18 local/Codespaces runtime:
  - `@capacitor/core@6.2.1`
  - `@capacitor/android@6.2.1`
  - `@capacitor/cli@6.2.1`
  - `capacitor-secure-storage-plugin@0.10.0`
- Introduced Android secure-token storage through `mymoolah-wallet-frontend/utils/authToken.ts`.
- Updated `AuthContext.tsx` registration/login/refresh/startup flows to use the canonical token helper instead of direct token localStorage writes.
- Replaced older `localStorage.getItem('token')` feedback/KYC access with the canonical token helper.
- Hardened Android manifest:
  - `android:allowBackup="false"`
  - `android:usesCleartextTraffic="false"`
  - `android:networkSecurityConfig="@xml/network_security_config"`
  - backup and device-transfer extraction rules exclude app data.
- Added initial Android network security config with current production/staging API SPKI pins:
  - `api-mm.mymoolah.africa`
  - `staging.mymoolah.africa`
- Production Android web bundle sync passes with `npm run build:android:production`.

Validation status:

- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `npm run build:android:production` passed and synced Android assets.
- `npx cap add android` and `npx cap sync android` passed.
- Codespaces `./gradlew assembleDebug` passed after installing JDK 17 and Android SDK packages (`platform-tools`, `platforms;android-34`, `build-tools;34.0.0`).
- Local Mac `./gradlew assembleDebug` remains blocked until the local shell uses a supported Android JDK, typically JDK 17, instead of Java 24.
- Release AAB script is available via `npm run build:android:release-aab`; it produces a Play Console artifact only when release signing env vars are supplied.
- 2026-05-16 local release AAB verification: wallet build and KB freshness guard passed, but `npm run build:android:release-aab` failed at Gradle with Java 24 (`Unsupported class file major version 68`). Retry in Codespaces or a JDK 17 shell before confirming the AAB artifact path.

Remaining release blockers:

- Add backup pins and a documented pin-rotation process before Play release. The first slice uses live current SPKI pins and must not be treated as final release pin governance.
- Wire CI/Secret Manager signing workflow to the Android release signing env vars.
- Add Play Integrity/root-risk implementation.
- Decide whether biometrics and FCM are v1 or v1.1.
- Replace generated launcher/splash assets with final MyMoolah store assets.
- Download and install the Codespaces debug APK on a physical Android device for smoke testing.

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
