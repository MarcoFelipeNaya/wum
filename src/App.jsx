import React, { useEffect, useState } from 'react'
import Nav from './components/Nav.jsx'
import Dashboard from './components/Dashboard.jsx'
import Roster from './components/Roster.jsx'
import Factions from './components/Factions.jsx'
import Shows from './components/Shows.jsx'
import Rankings from './components/Rankings.jsx'
import Records from './components/Records.jsx'
import Calendar from './components/Calendar.jsx'
import Titles from './components/Titles.jsx'
import Stories from './components/Stories.jsx'
import Data from './components/Data.jsx'
import Tournaments from './components/Tournaments.jsx'
import { useStore } from './store.js'
import { useToast } from './hooks/useToast.js'
import './App.css'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [pwaInstallAvailable, setPwaInstallAvailable] = useState(false)
  const [pwaUpdateAvailable, setPwaUpdateAvailable] = useState(false)
  const { toast, showToast } = useToast()
  const store = useStore()
  const { state } = store

  const pageProps = { state, showToast, ...store }

  useEffect(() => {
    const handleInstallAvailable = (event) => {
      setPwaInstallAvailable(Boolean(event.detail?.available))
    }
    const handleUpdateAvailable = () => {
      setPwaUpdateAvailable(true)
    }

    window.addEventListener('heat-pwa-install-available', handleInstallAvailable)
    window.addEventListener('heat-pwa-update-ready', handleUpdateAvailable)

    return () => {
      window.removeEventListener('heat-pwa-install-available', handleInstallAvailable)
      window.removeEventListener('heat-pwa-update-ready', handleUpdateAvailable)
    }
  }, [])

  if (!store.isHydrated) {
    return (
      <div className="app">
        <main className="app-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="card" style={{ maxWidth: 480, textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--primary-light)', marginBottom: 10 }}>
              Heat: Wrestling Booker
            </div>
            <h1 className="page-title" style={{ marginBottom: 8 }}>Loading The Show</h1>
            <p style={{ color: 'var(--text2)', margin: 0 }}>
              Restoring your saved data and autosaves from local storage and IndexedDB.
            </p>
            <p style={{ color: 'var(--text3)', margin: '10px 0 0', fontSize: 12 }}>
              Run the show. Build the legacy.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <Nav current={page} onNavigate={setPage} />

      {(pwaInstallAvailable || pwaUpdateAvailable) && (
        <div className="pwa-banner-shell">
          {pwaInstallAvailable && !pwaUpdateAvailable && (
            <div className="pwa-banner">
              <div>
                <div className="pwa-banner-title">Install Heat</div>
                <div className="pwa-banner-copy">Add Heat to your desktop so it launches like its own app.</div>
              </div>
              <div className="pwa-banner-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPwaInstallAvailable(false)}
                >
                  Later
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('heat-pwa-trigger-install'))}
                >
                  Install
                </button>
              </div>
            </div>
          )}

          {pwaUpdateAvailable && (
            <div className="pwa-banner">
              <div>
                <div className="pwa-banner-title">Heat Update Ready</div>
                <div className="pwa-banner-copy">A newer local app shell is ready. Refresh once to switch over.</div>
              </div>
              <div className="pwa-banner-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPwaUpdateAvailable(false)}
                >
                  Later
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('heat-pwa-apply-update'))}
                >
                  Refresh App
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="app-main">
        {page === 'dashboard' && <Dashboard {...pageProps} />}
        {page === 'roster'    && <Roster    {...pageProps} />}
        {page === 'factions'  && <Factions  {...pageProps} />}
        {page === 'shows'     && <Shows     {...pageProps} />}
        {page === 'rankings'  && <Rankings  {...pageProps} />}
        {page === 'records'   && <Records   {...pageProps} />}
        {page === 'calendar'  && <Calendar  {...pageProps} advanceDay={store.advanceDay} />}
        {page === 'tournaments' && <Tournaments {...pageProps} />}
        {page === 'titles'    && <Titles    {...pageProps} />}
        {page === 'stories'   && <Stories   {...pageProps} />}
        {page === 'data'      && <Data      {...pageProps} />}
      </main>

      <div className={`toast${toast.show ? ' show' : ''}`}>{toast.msg}</div>
    </div>
  )
}
