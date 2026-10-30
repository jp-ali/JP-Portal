import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ConfirmDialogHost from './ui/ConfirmDialogHost.jsx'
import { installIosPullToRefresh } from './services/pwaRefresh.js'

// GitHub Pages is a static entry point. Only redirect when a stable live API
// origin has been configured for the Pages build.
const livePortalUrl = import.meta.env.VITE_LIVE_PORTAL_URL
const isStaticPagesHost = window.location.hostname === 'jp-ali.github.io'
if (isStaticPagesHost && livePortalUrl && navigator.onLine) {
  const destination = new URL(livePortalUrl)
  destination.search = window.location.search
  window.location.replace(destination.href)
} else if (isStaticPagesHost) {
  document.getElementById('root').innerHTML = '<main style="max-width:34rem;margin:12vh auto;padding:2rem;font:16px system-ui;color:#3b2329"><h1>Portal server is not available here</h1><p>This GitHub Pages address hosts the frontend only. Open the live portal URL to sign in.</p></main>'
} else {
  installIosPullToRefresh()
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
      <ConfirmDialogHost />
    </React.StrictMode>,
  )
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js${import.meta.env.DEV ? '?dev=1' : ''}`, { updateViaCache: 'none' })
      if (navigator.onLine) registration.update().catch(() => {})
      let lastUpdateCheck = Date.now()
      const checkForUpdate = () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine || Date.now() - lastUpdateCheck < 60000) return
        lastUpdateCheck = Date.now()
        registration.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', checkForUpdate)
      window.addEventListener('pageshow', checkForUpdate)
      if (import.meta.env.DEV) {
        await navigator.serviceWorker.ready
        const urls = [...new Set(performance.getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => {
            const url = new URL(name, location.href)
            return url.origin === location.origin && !url.pathname.startsWith('/api/') && url.pathname !== '/sw.js'
          }))]
        registration.active?.postMessage({ type: 'CACHE_DEV_SHELL', urls })
      }
    } catch (error) { console.warn('Offline app setup failed:', error) }
  })
}
