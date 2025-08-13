// Token helpers to isolate auth tokens per browser tab
// Prefer sessionStorage (tab-scoped). Fallback to localStorage for legacy tokens.

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const sessionToken = sessionStorage.getItem('mymoolah_token');
  if (sessionToken) return sessionToken;
  const legacy = localStorage.getItem('mymoolah_token');
  return legacy;
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('mymoolah_token', token);
    // Clear any legacy shared token to avoid cross-tab bleed
    localStorage.removeItem('mymoolah_token');
  } catch {}
}

export function removeToken() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('mymoolah_token');
    localStorage.removeItem('mymoolah_token');
  } catch {}
}


