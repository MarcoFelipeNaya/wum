import React, { useEffect, useMemo, useRef, useState } from 'react'
import { formatUniverseDate } from '../utils/dates.js'
import './Data.css'

const RESET_ACTIONS = [
  { key: 'matches', label: 'Matches', countKey: 'matches', description: 'Clears booked and completed match history from the calendar.' },
  { key: 'stories', label: 'Stories', countKey: 'stories', description: 'Removes stories, rivalries, and their attached segments.' },
  { key: 'teams', label: 'Teams', countKey: 'teams', description: 'Deletes saved tag teams and trios, and removes team story references.' },
  { key: 'factions', label: 'Factions', countKey: 'factions', description: 'Deletes factions, unlinks teams from factions, and removes faction story references.' },
  { key: 'titles', label: 'Titles', countKey: 'titles', description: 'Deletes championship definitions and lineage data.' },
  { key: 'tournaments', label: 'Tournaments', countKey: 'tournaments', description: 'Deletes tournament brackets and unplayed tournament bookings.' },
  { key: 'shows', label: 'Shows', countKey: 'shows', description: 'Deletes shows and special events, and recalculates the calendar start point.' },
  { key: 'roster', label: 'Roster', countKey: 'roster', description: 'Clears roster entries and wipes dependent competitive data for a fresh rebuild.' },
]

function formatSnapshotDate(dateStr) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr || 'Unknown'
  return date.toLocaleString()
}

export default function Data({
  state,
  exportData,
  importData,
  createManualSnapshot,
  restoreAutosave,
  deleteAutosave,
  autosaveSnapshots = [],
  clearDataScope,
  persistenceError,
  lastSavedAt,
  showToast,
}) {
  const fileInputRef = useRef(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [restoringSnapshotId, setRestoringSnapshotId] = useState(null)
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false)
  const [pwaStatus, setPwaStatus] = useState({
    supported: false,
    registered: false,
    installAvailable: false,
    updateAvailable: false,
    installed: false,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
  })

  const summary = useMemo(() => ({
    roster: state.wrestlers?.length || 0,
    shows: state.shows?.length || 0,
    titles: state.titles?.length || 0,
    tournaments: state.tournaments?.length || 0,
    teams: state.teams?.length || 0,
    factions: state.factions?.length || 0,
    stories: state.stories?.length || 0,
    matches: state.matches?.length || 0,
  }), [state])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
    const supported = 'serviceWorker' in navigator

    setPwaStatus((current) => ({
      ...current,
      supported,
      installed: Boolean(standalone),
      online: navigator.onLine,
    }))

    let cancelled = false
    if (supported) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (cancelled) return
        setPwaStatus((current) => ({
          ...current,
          registered: Boolean(registration),
          updateAvailable: current.updateAvailable || Boolean(registration?.waiting),
        }))
      }).catch(() => {})
    }

    const handleInstallAvailable = (event) => {
      setPwaStatus((current) => ({
        ...current,
        installAvailable: Boolean(event.detail?.available),
      }))
    }
    const handleUpdateAvailable = () => {
      setPwaStatus((current) => ({ ...current, updateAvailable: true }))
    }
    const handleInstalled = () => {
      setPwaStatus((current) => ({
        ...current,
        installed: true,
        installAvailable: false,
      }))
    }
    const handleOnline = () => setPwaStatus((current) => ({ ...current, online: true }))
    const handleOffline = () => setPwaStatus((current) => ({ ...current, online: false }))

    window.addEventListener('heat-pwa-install-available', handleInstallAvailable)
    window.addEventListener('heat-pwa-update-ready', handleUpdateAvailable)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      cancelled = true
      window.removeEventListener('heat-pwa-install-available', handleInstallAvailable)
      window.removeEventListener('heat-pwa-update-ready', handleUpdateAvailable)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleExport = () => {
    try {
      const payload = exportData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      anchor.href = url
      anchor.download = `heat-backup-${stamp}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      showToast('Backup exported')
    } catch {
      showToast('Could not export backup')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      setIsImporting(true)
      const text = await file.text()
      await importData(text)
      showToast('Backup imported')
    } catch (error) {
      showToast(error?.message || 'Could not import backup')
    } finally {
      setIsImporting(false)
    }
  }

  const handleLoadDemoUniverse = async () => {
    const confirmed = window.confirm('Load the Heat demo universe? This will replace the current local save unless you export a backup first.')
    if (!confirmed) return

    try {
      setIsLoadingDemo(true)
      const response = await fetch('/demo-universe.json', { cache: 'no-store' })
      if (!response.ok) throw new Error('Could not load demo universe')
      const text = await response.text()
      await importData(text)
      showToast('Demo universe loaded')
    } catch (error) {
      showToast(error?.message || 'Could not load demo universe')
    } finally {
      setIsLoadingDemo(false)
    }
  }

  const handleRestoreAutosave = async (snapshotId) => {
    const confirmed = window.confirm('Restore this autosave snapshot? Your current universe will be replaced, but the current state will still remain in recent autosaves.')
    if (!confirmed) return

    try {
      setRestoringSnapshotId(snapshotId)
      await restoreAutosave(snapshotId)
      showToast('Autosave restored')
    } catch (error) {
      showToast(error?.message || 'Could not restore autosave')
    } finally {
      setRestoringSnapshotId(null)
    }
  }

  const handleDeleteAutosave = async (snapshotId) => {
    const confirmed = window.confirm('Delete this autosave snapshot?')
    if (!confirmed) return

    try {
      await deleteAutosave(snapshotId)
      showToast('Autosave deleted')
    } catch (error) {
      showToast(error?.message || 'Could not delete autosave')
    }
  }

  const handleCreateSnapshot = async () => {
    const label = window.prompt('Name this snapshot (optional):', 'Manual snapshot')
    if (label === null) return

    try {
      setIsCreatingSnapshot(true)
      await createManualSnapshot(label)
      showToast('Snapshot created')
    } catch (error) {
      showToast(error?.message || 'Could not create snapshot')
    } finally {
      setIsCreatingSnapshot(false)
    }
  }

  const handleClearScope = (scope, label) => {
    const confirmed = window.confirm(`Delete ${label.toLowerCase()} data from this universe? This cannot be undone unless you have a backup.`)
    if (!confirmed) return
    clearDataScope(scope)
    showToast(`${label} cleared`)
  }

  const handleFreshUniverse = () => {
    const confirmed = window.confirm('Start a fresh universe? This will clear all saved data in this browser unless you export a backup first.')
    if (!confirmed) return
    clearDataScope('all')
    showToast('Fresh universe ready')
  }

  return (
    <div className="data-page">
      <div className="page-header">
        <h1 className="page-title">Data & Backups</h1>
      </div>

      <div className="data-shell">
        <section className="data-card">
          <div className="data-card-header">
            <div className="data-card-heading">Universe Snapshot</div>
            <div className="data-card-subtle">What your current save includes</div>
          </div>

          <div className="data-status-row">
            <div className="data-status-card">
              <span>Primary Save</span>
              <strong>{lastSavedAt ? `Saved ${formatSnapshotDate(lastSavedAt)}` : 'Waiting for first save'}</strong>
            </div>
            <div className="data-status-card">
              <span>Recovery Snapshots</span>
              <strong>{autosaveSnapshots.length} available</strong>
            </div>
          </div>

          <div className="data-stats-grid">
            <div className="data-stat-card"><strong>{summary.roster}</strong><span>Roster Entries</span></div>
            <div className="data-stat-card"><strong>{summary.shows}</strong><span>Shows</span></div>
            <div className="data-stat-card"><strong>{summary.titles}</strong><span>Titles</span></div>
            <div className="data-stat-card"><strong>{summary.tournaments}</strong><span>Tournaments</span></div>
            <div className="data-stat-card"><strong>{summary.teams}</strong><span>Teams</span></div>
            <div className="data-stat-card"><strong>{summary.factions}</strong><span>Factions</span></div>
            <div className="data-stat-card"><strong>{summary.stories}</strong><span>Stories</span></div>
            <div className="data-stat-card"><strong>{summary.matches}</strong><span>Matches</span></div>
          </div>
        </section>

        <section className="data-card">
          <div className="data-card-header">
            <div className="data-card-heading">Backup Tools</div>
            <div className="data-card-subtle">Export your full universe or restore it from a backup file</div>
          </div>

          {persistenceError && (
            <div className="data-alert">
              {persistenceError}
            </div>
          )}

          <div className="data-action-grid">
            <div className="data-action-card">
              <div className="data-action-title">Export Backup</div>
              <div className="data-action-copy">
                Downloads your full save as a JSON backup file, including roster, shows, titles, tournaments, calendar, stories, factions, and teams.
              </div>
              <button type="button" className="btn btn-primary" onClick={handleExport}>
                Export Data
              </button>
            </div>

            <div className="data-action-card">
              <div className="data-action-title">Import Backup</div>
              <div className="data-action-copy">
                Restores a previously exported backup and replaces the current local save after migration checks.
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleImportClick} disabled={isImporting}>
                {isImporting ? 'Importing...' : 'Import Data'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                hidden
              />
            </div>

            <div className="data-action-card data-action-card--demo">
              <div className="data-action-title">Load Demo Universe</div>
              <div className="data-action-copy">
                Imports a curated fictional Heat universe with active shows, titles, stories, special events, teams, factions, and tournaments so you can test real import behavior safely.
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLoadDemoUniverse}
                disabled={isLoadingDemo}
              >
                {isLoadingDemo ? 'Loading Demo...' : 'Load Demo Data'}
              </button>
            </div>
          </div>
        </section>

        <section className="data-card">
          <div className="data-card-header">
            <div className="data-card-heading">Offline & App Status</div>
            <div className="data-card-subtle">Track whether Heat is ready for install, offline use, and app-shell updates.</div>
          </div>

          <div className="data-status-grid">
            <div className="data-status-tile">
              <span>Network</span>
              <strong>{pwaStatus.online ? 'Online' : 'Offline'}</strong>
            </div>
            <div className="data-status-tile">
              <span>Service Worker</span>
              <strong>{pwaStatus.registered ? 'Registered' : (pwaStatus.supported ? 'Not registered yet' : 'Unsupported')}</strong>
            </div>
            <div className="data-status-tile">
              <span>Install Prompt</span>
              <strong>{pwaStatus.installAvailable ? 'Available' : 'Not available'}</strong>
            </div>
            <div className="data-status-tile">
              <span>App Mode</span>
              <strong>{pwaStatus.installed ? 'Installed / Standalone' : 'Browser tab'}</strong>
            </div>
          </div>

          <div className="data-note-list">
            {!import.meta.env.PROD && (
              <div className="data-note-row">
                PWA install and offline behavior only activate on the production build. Use <code>npm run build</code> and <code>npm run preview</code> for local testing.
              </div>
            )}
            {import.meta.env.PROD && !pwaStatus.registered && (
              <div className="data-note-row">
                The service worker has not taken control yet. Refresh once after the first production load if install/offline features do not appear immediately.
              </div>
            )}
            {pwaStatus.registered && !pwaStatus.installAvailable && !pwaStatus.installed && (
              <div className="data-note-row">
                The browser is not offering install right now. Chrome may require a refresh, a little usage time, or may suppress the prompt if it was dismissed recently.
              </div>
            )}
            {pwaStatus.updateAvailable && (
              <div className="data-note-row">
                A newer app shell is waiting. Use the update banner at the top of the app to refresh into the latest version.
              </div>
            )}
            <div className="data-note-row data-note-row--shell">
              <span className="data-note-label">PWA shell test marker:</span>
              <span className="data-note-value">Heat local app shell v4.</span>
            </div>
          </div>
        </section>

        <section className="data-card">
          <div className="data-card-header">
            <div className="data-card-heading">Autosave Recovery</div>
            <div className="data-card-subtle">Rolling local snapshots stored in IndexedDB for safer recovery</div>
          </div>

          <div className="data-autosave-toolbar">
            <button
              type="button"
              className="btn btn-primary"
              disabled={isCreatingSnapshot}
              onClick={handleCreateSnapshot}
            >
              {isCreatingSnapshot ? 'Creating...' : 'Create Snapshot Now'}
            </button>
          </div>

          {autosaveSnapshots.length === 0 ? (
            <div className="data-note-row">No autosave snapshots are available yet. Once you keep working in the app, Heat will build a rolling recovery history automatically.</div>
          ) : (
            <div className="data-autosave-list">
              {autosaveSnapshots.map((snapshot) => (
                <div key={snapshot.id} className="data-autosave-row">
                  <div className="data-autosave-main">
                    <div className="data-action-title">{snapshot.label || 'Autosave'}</div>
                    <div className="data-action-copy">
                      {formatSnapshotDate(snapshot.createdAt)}
                      {snapshot.currentDate ? ` • Universe date ${formatUniverseDate(snapshot.currentDate)}` : ''}
                    </div>
                    <div className="data-chip-row">
                      <span className="data-chip">Roster {snapshot.counts?.roster ?? 0}</span>
                      <span className="data-chip">Shows {snapshot.counts?.shows ?? 0}</span>
                      <span className="data-chip">Titles {snapshot.counts?.titles ?? 0}</span>
                      <span className="data-chip">Stories {snapshot.counts?.stories ?? 0}</span>
                      <span className="data-chip">Matches {snapshot.counts?.matches ?? 0}</span>
                    </div>
                  </div>
                  <div className="data-autosave-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={restoringSnapshotId === snapshot.id}
                      onClick={() => handleRestoreAutosave(snapshot.id)}
                    >
                      {restoringSnapshotId === snapshot.id ? 'Restoring...' : 'Restore'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDeleteAutosave(snapshot.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="data-card">
          <div className="data-card-header">
            <div className="data-card-heading">Reset Tools</div>
            <div className="data-card-subtle">Clear specific parts of a universe without manually deleting records one by one</div>
          </div>

          <div className="data-reset-grid">
            {RESET_ACTIONS.map((action) => (
              <div key={action.key} className="data-action-card">
                <div className="data-action-title">{action.label}</div>
                <div className="data-action-copy">{action.description}</div>
                <div className="data-reset-meta">
                  <span>Current count</span>
                  <strong>{summary[action.countKey] ?? 0}</strong>
                </div>
                <button type="button" className="btn btn-danger" onClick={() => handleClearScope(action.key, action.label)}>
                  Clear {action.label}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="data-card">
          <div className="data-card-header">
            <div className="data-card-heading">Best Practice</div>
          </div>

          <div className="data-note-list">
            <div className="data-note-row">Export a fresh backup before large imports or major editing sessions.</div>
            <div className="data-note-row">Keep a few dated backups so you can roll back if needed.</div>
            <div className="data-note-row">Imports use the app&apos;s normalization and migration logic, so older backups stay usable.</div>
          </div>
          <div className="data-fresh-action">
            <button type="button" className="btn btn-danger" onClick={handleFreshUniverse}>
              Start Fresh Universe
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
