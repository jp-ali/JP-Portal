import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest, request) => {
            const origin = request.headers.origin;
            if (!origin) return;
            try {
              // The API receives Vite's local Host header. Preserve the API's
              // origin check for requests from other sites while allowing the
              // same-origin frontend at a phone's LAN address.
              if (new URL(origin).host === request.headers.host) {
                proxyRequest.setHeader('origin', `http://${proxyRequest.getHeader('host')}`);
              }
            } catch {
              // Leave malformed origins intact so the API rejects them.
            }
          });
        },
      },
    },
  },
})
