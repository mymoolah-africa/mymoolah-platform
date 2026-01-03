import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

// Conditionally load manifest.json only when not in Codespaces/github.dev
// GitHub Codespaces intercepts manifest.json requests and redirects them through
// their auth proxy, causing CORS errors. This dynamic loading prevents the error.
if (!window.location.hostname.includes('github.dev') && !window.location.hostname.includes('codespaces')) {
  // Check if manifest link already exists
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)