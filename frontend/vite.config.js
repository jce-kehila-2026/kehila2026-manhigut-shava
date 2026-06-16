import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Allow eval/new Function needed by React dev tools + Vite HMR in development
      'Content-Security-Policy':
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://apis.google.com https://www.googletagmanager.com; " +
        "frame-src https://kehila-manhigut-shava.firebaseapp.com https://accounts.google.com; " +
        "connect-src 'self' ws: wss: https:;",
    },
  },
})
