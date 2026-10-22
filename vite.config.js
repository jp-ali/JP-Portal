import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

function offlinePrecache() {
  return {
    name: 'offline-precache',
    apply: 'build',
    async closeBundle() {
      const dist = join(process.cwd(), 'dist')
      const assets = await readdir(join(dist, 'assets'))
      const entry = assets.find((file) => /^index-[\w-]+\.js$/.test(file))
      if (!entry) throw new Error('Missing PWA entry bundle')
      // Offline Add Visit lives in the entry bundle. Keep installation small;
      // other portal chunks are cached when opened online.
      const files = ['/', '/index.html', '/manifest.webmanifest', '/icons/app-icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', ...assets.filter((file) => /^index-[\w-]+\.(js|css)$/.test(file)).map((file) => `/assets/${file}`)]
      const swPath = join(dist, 'sw.js')
      const sw = await readFile(swPath, 'utf8')
      await writeFile(swPath, sw.replace('self.__PRECACHE__ ||', `${JSON.stringify(files)} ||`).replace('jp-portal-pwa-v1', `jp-portal-pwa-${entry}`))
    }
  }
}

export default defineConfig({
  plugins: [react(), offlinePrecache()],
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
