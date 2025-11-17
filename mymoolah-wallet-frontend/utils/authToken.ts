// Token helpers for persistent authentication
// Uses localStorage for persistence across tab closes and app minimization (mobile-friendly)
// Includes cross-tab synchronization for logout events

const TOKEN_KEY = 'mymoolah_token';
const LOGOUT_EVENT_KEY = 'mymoolah_logout';

// Listen for cross-tab logout events
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LOGOUT_EVENT_KEY && e.newValue) {
      // Another tab logged out - clear token and reload
      localStorage.removeItem(TOKEN_KEY);
      // Dispatch custom event for AuthContext to handle
      window.dispatchEvent(new CustomEvent('mymoolah_logout'));
    }
  });
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Fallback to sessionStorage if localStorage is unavailable (private browsing)
    return sessionStorage.getItem(TOKEN_KEY);
  }
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    // Also set in sessionStorage as fallback for private browsing mode
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // sessionStorage might be unavailable in some private browsing modes
    }
  } catch (error) {
    // If localStorage fails (e.g., quota exceeded), fallback to sessionStorage
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      console.warn('Failed to store token in both localStorage and sessionStorage');
    }
  }
}

export function removeToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    // Broadcast logout event to other tabs
    localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());
    // Clear the logout event after a short delay
    setTimeout(() => {
      localStorage.removeItem(LOGOUT_EVENT_KEY);
    }, 100);
  } catch {}
}


