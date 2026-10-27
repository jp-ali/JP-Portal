import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ConfirmDialogHost from './ui/ConfirmDialogHost.jsx'

// GitHub Pages serves static files only. Sign-in needs the API behind the live
// portal, so open that origin before rendering the login form.
const livePortalUrl = import.meta.env.VITE_LIVE_PORTAL_URL || 'https://9tn88jsw-5173.inc1.devtunnels.ms/'
const isStaticPagesHost = window.location.hostname === 'jp-ali.github.io'
if (isStaticPagesHost && navigator.onLine) {
  const destination = new URL(livePortalUrl)
  destination.search = window.location.search
  window.location.replace(destination.href)
} else {
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
