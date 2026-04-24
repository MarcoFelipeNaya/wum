export function registerHeatPWA() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return

  let deferredInstallPrompt = null
  let refreshing = false

  const dispatchInstallState = () => {
    window.dispatchEvent(new CustomEvent('heat-pwa-install-available', {
      detail: { available: Boolean(deferredInstallPrompt) },
    }))
  }

  const dispatchUpdateReady = () => {
    window.dispatchEvent(new CustomEvent('heat-pwa-update-ready'))
  }

  const notifyUpdate = (worker) => {
    if (!worker) return
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        dispatchUpdateReady()
      }
    })
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event
    dispatchInstallState()
  })

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
    dispatchInstallState()
  })

  window.addEventListener('heat-pwa-trigger-install', async () => {
    if (!deferredInstallPrompt) return
    deferredInstallPrompt.prompt()
    await deferredInstallPrompt.userChoice.catch(() => null)
    deferredInstallPrompt = null
    dispatchInstallState()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) {
        dispatchUpdateReady()
      }

      notifyUpdate(registration.installing)

      registration.addEventListener('updatefound', () => {
        notifyUpdate(registration.installing)
      })

      registration.update().catch(() => {})

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })

      window.addEventListener('heat-pwa-apply-update', () => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    }).catch(() => {
      // Registration failure should never block the app shell.
    })
  })
}
