import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ConfirmDialogHost from './ui/ConfirmDialogHost.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <ConfirmDialogHost />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js${import.meta.env.DEV ? '?dev=1' : ''}`)
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
