/**
 * Browser Support Detection Utility
 * Helps identify browser compatibility for voice input features
 */

export interface BrowserSupport {
  isSupported: boolean;
  browser: string;
  version: string;
  supportsSpeechRecognition: boolean;
  supportsMediaDevices: boolean;
  supportsPermissions: boolean;
  requiresHTTPS: boolean;
  isHTTPS: boolean;
  isLocalhost: boolean;
  recommendations: string[];
}

export function detectBrowserSupport(): BrowserSupport {
  const userAgent = navigator.userAgent;
  const isHTTPS = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  let browser = 'Unknown';
  let version = 'Unknown';
  let isSupported = false;
  
  // Detect browser and version
  // IMPORTANT: Check Opera Mini FIRST (before Chrome) as Opera Mini user agent contains "Chrome"
  if (userAgent.includes('Opera Mini') || userAgent.includes('Opera/9.80')) {
    browser = 'Opera Mini';
    const match = userAgent.match(/Opera Mini\/(\d+)/) || userAgent.match(/Version\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = false; // Opera Mini doesn't support getUserMedia due to proxy architecture
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
    browser = 'Opera';
    const match = userAgent.match(/OPR\/(\d+)/) || userAgent.match(/Version\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = parseInt(version) >= 75;
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = parseInt(version) >= 88;
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
    const match = userAgent.match(/Edge\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = parseInt(version) >= 88;
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = parseFloat(version) >= 14.1;
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = parseInt(version) >= 75;
  }
  
  // Check feature support
  const supportsSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  const supportsMediaDevices = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
  const supportsPermissions = 'permissions' in navigator && 'query' in navigator.permissions;
  
  // Determine if HTTPS is required
  const requiresHTTPS = !isLocalhost;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (!isSupported) {
    if (browser === 'Opera Mini') {
      recommendations.push('Opera Mini does not support camera access. Please use the "Upload QR Code" option instead, or switch to Chrome, Safari, or Opera browser.');
    } else if (browser === 'Opera') {
      recommendations.push('Update Opera to version 75 or higher, or use Chrome, Edge, or Safari for full functionality.');
    } else if (browser === 'Chrome') {
      recommendations.push('Update Chrome to version 88 or higher');
    } else if (browser === 'Edge') {
      recommendations.push('Update Edge to version 88 or higher');
    } else if (browser === 'Safari') {
      recommendations.push('Update Safari to version 14.1 or higher');
    } else if (browser === 'Firefox') {
      recommendations.push('Firefox has limited voice input support. Consider using Chrome, Edge, or Safari for full functionality.');
    } else {
      recommendations.push('Use Chrome 88+, Edge 88+, or Safari 14.1+ for best voice input experience');
    }
  }
  
  if (!supportsSpeechRecognition) {
    recommendations.push('Your browser does not support speech recognition');
  }
  
  if (!supportsMediaDevices) {
    recommendations.push('Your browser does not support microphone access');
  }
  
  if (requiresHTTPS && !isHTTPS) {
    recommendations.push('Voice input requires HTTPS. Please use a secure connection.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Your browser is fully compatible with voice input features!');
  }
  
  return {
    isSupported,
    browser,
    version,
    supportsSpeechRecognition,
    supportsMediaDevices,
    supportsPermissions,
    requiresHTTPS,
    isHTTPS,
    isLocalhost,
    recommendations
  };
}

export function getBrowserSupportMessage(): string {
  const support = detectBrowserSupport();
  
  if (support.isSupported && support.supportsSpeechRecognition && support.supportsMediaDevices) {
    if (support.requiresHTTPS && !support.isHTTPS) {
      return 'Voice input requires HTTPS. Please use a secure connection.';
    }
    return 'Your browser supports voice input features.';
  }
  
  return `Voice input is not fully supported in ${support.browser} ${support.version}. ${support.recommendations[0]}`;
}

export function isVoiceInputSupported(): boolean {
  const support = detectBrowserSupport();
  return support.isSupported && 
         support.supportsSpeechRecognition && 
         support.supportsMediaDevices && 
         (support.isHTTPS || support.isLocalhost);
}

/**
 * Detect if user is using Opera Mini browser
 * Opera Mini uses a proxy server and doesn't support getUserMedia/camera API
 */
export function isOperaMini(): boolean {
  const userAgent = navigator.userAgent;
  return userAgent.includes('Opera Mini') || userAgent.includes('Opera/9.80');
}

/**
 * Check if camera API is supported (getUserMedia)
 * Returns false ONLY for Opera Mini which doesn't support camera access
 * For other browsers, returns true even if getUserMedia isn't immediately available
 * (iOS Safari may not expose it until actually accessed)
 */
export function isCameraSupported(): boolean {
  // Opera Mini doesn't support getUserMedia - definitely not supported
  if (isOperaMini()) {
    return false;
  }
  
  // Check if navigator.mediaDevices exists (iOS Safari on HTTP doesn't expose this)
  if (!navigator.mediaDevices) {
    return false;
  }
  
  // Check if getUserMedia method exists
  if (typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return false;
  }
  
  // For Safari/iOS: Even if getUserMedia isn't immediately available,
  // we should allow the user to try (it might work on HTTPS or when accessed)
  const userAgent = navigator.userAgent;
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  // iOS Safari: Allow camera access attempt even if getUserMedia isn't immediately visible
  // (it may require HTTPS or user interaction)
  if (isSafari || isIOS) {
    return true; // Allow iOS Safari users to try camera access
  }
  
  // For other browsers: Check if getUserMedia is available
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
