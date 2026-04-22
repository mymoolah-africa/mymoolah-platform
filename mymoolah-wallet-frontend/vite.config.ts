import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Detect GitHub Codespaces so HMR + origin + MIME types work behind the
// HTTPS port-forward proxy. CODESPACE_NAME is set automatically in Codespaces.
// When not in Codespaces (local dev, CI, production build), all values fall
// back to Vite defaults — so this is backward-compatible.
const codespaceName = process.env.CODESPACE_NAME
const codespacesDomain =
  process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'
const codespacesHost = codespaceName
  ? `${codespaceName}-3000.${codespacesDomain}`
  : undefined

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    // Tell Vite that the public origin is the HTTPS Codespaces URL so
    // module script URLs, HMR, and dev-time absolute references are
    // generated against the forwarded HTTPS hostname — this prevents the
    // "MIME type of '' for module script" error seen in Codespaces when
    // the default http://localhost:3000 origin leaks into served HTML.
    origin: codespacesHost ? `https://${codespacesHost}` : undefined,
    // HMR websocket must use WSS via Codespaces' 443 proxy, not the dev port.
    hmr: codespacesHost
      ? { protocol: 'wss', host: codespacesHost, clientPort: 443 }
      : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          utils: ['date-fns', 'clsx', 'class-variance-authority'],
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})