import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

function offlinePrecache() {
  let runtimeShell = []
  return {
    name: 'offline-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const collected = new Set()
      const visit = name => {
        if (collected.has(name) || !bundle[name]) return
        collected.add(name)
        const chunk = bundle[name]
        if (chunk.type === 'chunk') {
          chunk.imports.forEach(visit)
          for (const css of chunk.viteMetadata?.importedCss || []) collected.add(css)
        }
      }
      // App is loaded after company branding resolves. Its static dependencies
      // contain both offline visit portals and must exist on the first offline launch.
      Object.values(bundle).filter(chunk => chunk.type === 'chunk' && (chunk.isEntry || chunk.name === 'App')).forEach(chunk => visit(chunk.fileName))
      runtimeShell = [...collected]
    },
    async closeBundle() {
      const dist = join(process.cwd(), 'dist')
      const assets = await readdir(join(dist, 'assets'))
      const html = await readFile(join(dist, 'index.html'), 'utf8')
      const entry = html.match(/<script\b[^>]*\bsrc="[^"]*\/assets\/(index-[\w-]+\.js)"/)?.[1]
      if (!entry) throw new Error('Missing PWA entry bundle')
      // Offline Add Visit lives in the entry bundle. Keep installation small;
      // other portal chunks are cached when opened online.
      const base = process.env.GITHUB_PAGES === 'true' ? '/JP-Portal/' : '/'
      const files = [...new Set(['', 'index.html', 'manifest.webmanifest', 'icons/app-icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', ...runtimeShell, ...assets.filter((file) => /^(index-[\w-]+\.(js|css)|heic2any-[\w-]+\.js|login-reference-panel-[\w-]+\.webp|dashboard-books-mobile-[\w-]+\.webp)$/.test(file)).map((file) => `assets/${file}`)])].map((file) => `${base}${file}`)
      const swPath = join(dist, 'sw.js')
      const sw = await readFile(swPath, 'utf8')
      await writeFile(swPath, sw.replace('self.__PRECACHE__ ||', `${JSON.stringify(files)} ||`).replace('jp-portal-pwa-v1', `jp-portal-pwa-${entry}`))
    }
  }
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/JP-Portal/' : '/',
  plugins: [react(), offlinePrecache()],
  server: {
    host: true,
    strictPort: true,
    allowedHosts: ['.devtunnels.ms'],
    proxy: {
      '/api': {
        target: process.env.DEV_API_TARGET || 'http://localhost:3001',
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest, request) => {
            const origin = request.headers.origin;
            if (!origin) return;
            try {
              // A forwarded phone URL can arrive at Vite with a localhost Host.
              // Keep the API's origin check while passing same-origin requests
              // from that URL through the local proxy.
              const originHost = new URL(origin).host;
              const forwardedHost = String(request.headers['x-forwarded-host'] || '').split(',')[0].trim();
              const sameOriginRequest = request.headers['sec-fetch-site'] === 'same-origin';
              if (originHost === request.headers.host || originHost === forwardedHost || sameOriginRequest) {
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
