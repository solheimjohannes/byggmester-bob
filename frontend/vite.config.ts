import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 so the Codespaces port-forwarding proxy can reach the
    // dev server (default localhost/127.0.0.1 is unreachable from outside).
    host: true,
    proxy: {
      // Route /api and /health to the backend so the browser stays on a single
      // origin. This avoids cross-site cookie issues with sameSite: 'lax' when
      // running in Codespaces where each forwarded port gets its own hostname.
      '/api': { target: 'http://localhost:3001', changeOrigin: false },
      '/health': { target: 'http://localhost:3001', changeOrigin: false },
    },
  },
})
