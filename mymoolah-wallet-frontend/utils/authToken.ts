// Token helpers to isolate auth tokens per browser tab
// Uses sessionStorage only - tokens cleared when tab closes

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Only use sessionStorage - no localStorage fallback to avoid demo tokens
  return sessionStorage.getItem('mymoolah_token');
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
