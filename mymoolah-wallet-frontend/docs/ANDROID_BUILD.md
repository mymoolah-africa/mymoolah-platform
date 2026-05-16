# MyMoolah Android Build Guide

This guide covers the current Codespaces/debug APK path for the banking-grade MyMoolah Android app.

## Current Status

- Package ID: `africa.mymoolah.wallet`
- Frontend bundle: React/Vite via Capacitor Android
- Debug APK output: `android/app/build/outputs/apk/debug/app-debug.apk`
- Production API build target: `https://api-mm.mymoolah.africa`
- Staging API build target: `https://staging.mymoolah.africa`

## One-Time Codespaces Setup

Run these commands in Codespaces. Review and accept Google SDK licenses manually as the authorized user.

```bash
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

mkdir -p "$ANDROID_HOME/cmdline-tools"
cd "$ANDROID_HOME/cmdline-tools"
curl -fsSL -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q cmdline-tools.zip
rm cmdline-tools.zip
mv cmdline-tools latest

sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

For new shell sessions:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

## Build Debug APK

From `mymoolah-wallet-frontend`:

```bash
npm install
npm run cap:telemetry:off
npm run build:android:debug-apk
npm run android:apk:path
```

Equivalent manual commands:

```bash
npm run build:android:production
cd android
./gradlew assembleDebug
ls -lh app/build/outputs/apk/debug/app-debug.apk
```

## Build Release AAB For Play Console

Google Play requires an Android App Bundle (`.aab`), not the debug APK.

Unsigned verification build:

```bash
npm run build:android:release-aab
npm run android:aab:path
```

Expected output:

`android/app/build/outputs/bundle/release/app-release.aab`

If release signing environment variables are not set, Gradle produces an unsigned AAB for build verification only. Do not upload an unsigned AAB to Google Play.

## Release Signing Inputs

No signing keys or passwords may be committed to the repo.

The Android release build reads these environment variables when present:

```bash
export MYMOOLAH_ANDROID_KEYSTORE_PATH="/secure/path/mymoolah-upload-key.jks"
export MYMOOLAH_ANDROID_KEYSTORE_PASSWORD="..."
export MYMOOLAH_ANDROID_KEY_ALIAS="mymoolah-upload"
export MYMOOLAH_ANDROID_KEY_PASSWORD="..."
```

For CI/Secret Manager:

1. Store the upload keystore as a protected secret, ideally base64 encoded.
2. Store passwords and alias as separate protected secrets.
3. Decode the keystore to a temporary file during the CI job.
4. Export the four environment variables above.
5. Run `npm run build:android:release-aab`.
6. Delete the temporary keystore file at the end of the job.

The Play Console should use Google Play App Signing. MyMoolah keeps custody of the upload key and never commits it.

## Download And Install On Phone

In Codespaces, right-click:

`mymoolah-wallet-frontend/android/app/build/outputs/apk/debug/app-debug.apk`

Download it to your computer, then transfer/install it on an Android test phone. This is a debug APK for smoke testing only, not a Play Store release artifact.

## Smoke Test Checklist

- App opens.
- Login screen loads.
- Production API connection works; no localhost API errors.
- Login succeeds with a real test account.
- Session survives close/reopen.
- Logout clears the session.
- Home, Transact, KYC, Support, Vouchers, and Transaction History load.
- Poor network/offline states do not expose stack traces or provider internals.

## Release Notes

Before Google Play release, MyMoolah still needs:

- Signed release Android App Bundle (`.aab`) using a protected upload key.
- CI/Secret Manager signing workflow wired to the release variables above.
- Backup certificate pins and pin rotation.
- Play Integrity/root-risk controls for sensitive flows.
- Final MyMoolah launcher/splash/store assets.
- Data Safety, privacy, financial feature, and account deletion declarations.

## Google Play Visibility Checklist

To make the app visible for users to download:

1. Create the app in Google Play Console with package ID `africa.mymoolah.wallet`.
2. Enrol in Google Play App Signing.
3. Upload the signed release AAB.
4. Complete store listing: app name, short description, full description, screenshots, 512x512 icon, and 1024x500 feature graphic.
5. Add public privacy policy, terms, support, and account deletion URLs.
6. Complete Data Safety, financial features, permissions, and content rating declarations.
7. Run internal testing.
8. Run closed testing if required by the Play account.
9. Submit production release for Google review.
10. After approval, roll out production gradually.
