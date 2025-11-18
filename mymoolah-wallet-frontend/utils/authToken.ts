// Token helpers to isolate auth tokens per browser tab
// Uses sessionStorage primarily - tokens cleared when tab closes
// Temporary localStorage fallback for transition (filters out demo tokens)

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // First check sessionStorage (primary)
  const sessionToken = sessionStorage.getItem('mymoolah_token');
  if (sessionToken) {
    // Filter out demo tokens even from sessionStorage
    if (sessionToken.startsWith('demo-token-')) {
      return null;
    }
    return sessionToken;
  }
  
  // Fallback to localStorage for transition (but filter demo tokens)
  const localToken = localStorage.getItem('mymoolah_token');
  if (localToken) {
    // Filter out demo tokens - they should never be used
    if (localToken.startsWith('demo-token-')) {
      return null;
    }
    // Migrate to sessionStorage for future use
    try {
      sessionStorage.setItem('mymoolah_token', localToken);
    } catch {}
    return localToken;
  }
  
  return null;
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
