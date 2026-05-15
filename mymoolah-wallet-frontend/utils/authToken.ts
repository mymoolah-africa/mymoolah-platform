import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

// Token helpers to isolate auth tokens per browser tab and keep Android tokens
// out of WebView storage. Native builds use Android Keystore-backed storage via
// capacitor-secure-storage-plugin; web builds keep the existing session-first behaviour.

const TOKEN_KEY = 'mymoolah_token';

let nativeTokenCache: string | null = null;
let nativeStorageInitialized = false;

const isDemoToken = (token: string | null): boolean => Boolean(token?.startsWith('demo-token-'));

const shouldUseNativeSecureStorage = (): boolean => (
  typeof window !== 'undefined' && Capacitor.isNativePlatform()
);

const readWebToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const sessionToken = sessionStorage.getItem(TOKEN_KEY);
  if (sessionToken) {
    if (isDemoToken(sessionToken)) {
      return null;
    }
    return sessionToken;
  }

  const localToken = localStorage.getItem(TOKEN_KEY);
  if (localToken) {
    if (isDemoToken(localToken)) {
      return null;
    }

    try {
      sessionStorage.setItem(TOKEN_KEY, localToken);
      localStorage.removeItem(TOKEN_KEY);
    } catch {}

    return localToken;
  }

  return null;
};

export async function initializeTokenStorage(): Promise<void> {
  if (!shouldUseNativeSecureStorage()) {
    nativeStorageInitialized = true;
    return;
  }

  try {
    const result = await SecureStoragePlugin.get({ key: TOKEN_KEY });
    nativeTokenCache = isDemoToken(result.value) ? null : result.value;
  } catch {
    nativeTokenCache = null;
  } finally {
    nativeStorageInitialized = true;
  }
}

export function getToken(): string | null {
  if (shouldUseNativeSecureStorage()) {
    return nativeStorageInitialized ? nativeTokenCache : null;
  }

  return readWebToken();
}

export async function getTokenAsync(): Promise<string | null> {
  if (shouldUseNativeSecureStorage() && !nativeStorageInitialized) {
    await initializeTokenStorage();
  }

  return getToken();
}

export async function setToken(token: string): Promise<void> {
  if (typeof window === 'undefined') return;

  if (shouldUseNativeSecureStorage()) {
    nativeTokenCache = isDemoToken(token) ? null : token;
    nativeStorageInitialized = true;
    await SecureStoragePlugin.set({ key: TOKEN_KEY, value: token });
    return;
  }

  sessionStorage.setItem(TOKEN_KEY, token);
  // Clear any legacy shared token to avoid cross-tab bleed
  localStorage.removeItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (shouldUseNativeSecureStorage()) {
    nativeTokenCache = null;
    nativeStorageInitialized = true;
    try {
      await SecureStoragePlugin.remove({ key: TOKEN_KEY });
    } catch {}
    return;
  }

  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
