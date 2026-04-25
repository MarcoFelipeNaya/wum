import React, { useEffect, useMemo, useRef, useState } from 'react'
import { formatUniverseDate } from '../utils/dates.js'
import { FiDatabase, FiDownload, FiUpload, FiRefreshCw, FiTrash2, FiSave, FiAlertTriangle, FiCheckCircle, FiGlobe, FiCpu, FiArchive, FiPlus } from 'react-icons/fi'
import './Data.css'

const RESET_ACTIONS = [
  { key: 'matches', label: 'Match History', countKey: 'matches', description: 'Clears all booked and completed matches.' },
  { key: 'stories', label: 'Stories & Rivalries', countKey: 'stories', description: 'Removes all story arcs and segments.' },
  { key: 'teams', label: 'Tag Teams', countKey: 'teams', description: 'Deletes saved tag teams and trios.' },
  { key: 'factions', label: 'Factions', countKey: 'factions', description: 'Deletes all faction definitions.' },
  { key: 'titles', label: 'Championships', countKey: 'titles', description: 'Wipes belts and historical lineage.' },
  { key: 'roster', label: 'Active Roster', countKey: 'roster', description: 'Clears all talent entries.' },
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

  const handleExport = () => {
    try {
      const payload = exportData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      anchor.href = url
      anchor.download = `heat-universe-${stamp}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      showToast('Universe backup exported')
    } catch {
      showToast('Export failed')
    }
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setIsImporting(true)
      const text = await file.text()
      await importData(text)
      showToast('Universe restored successfully')
    } catch (error) {
      showToast('Import failed: Corrupt data')
    } finally {
      setIsImporting(false)
    }
  }

  const handleLoadDemo = async () => {
    const confirmed = confirm('Load demo universe? Current data will be replaced.')
    if (!confirmed) return

    try {
      setIsLoadingDemo(true)
      const response = await fetch(`/demo-universe.json?starter=${Date.now()}`, { cache: 'reload' })
      if (!response.ok) throw new Error('Could not load demo universe')
      const text = await response.text()
      await importData(text)
      showToast('Demo universe loaded')
    } catch (error) {
      showToast('Demo load failed')
    } finally {
      setIsLoadingDemo(false)
    }
  }

  return (
    <div className="data-page">
      <div className="page-header">
        <h1 className="page-title">Mission Control</h1>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiCpu style={{ color: 'var(--primary)' }} /> SYSTEM CORE
        </div>
      </div>

      <div className="data-shell">
        <section className="data-card">
          <div className="data-card-header">
            <div className="data-card-heading">Universe Integrity Snapshot</div>
            <div className="data-card-subtle">Current local database health and entity counts</div>
          </div>

          <div className="data-status-row">
            <div className="data-status-card">
              <span><FiSave /> Last Sync</span>
              <strong>{lastSavedAt ? formatSnapshotDate(lastSavedAt) : 'No sync recorded'}</strong>
            </div>
            <div className="data-status-card">
              <span><FiDatabase /> Recovery Points</span>
              <strong>{autosaveSnapshots.length} Snapshots Stored</strong>
            </div>
          </div>

          <div className="data-stats-grid">
            <div className="data-stat-card"><strong>{summary.roster}</strong><span>Roster</span></div>
            <div className="data-stat-card"><strong>{summary.shows}</strong><span>Brands</span></div>
            <div className="data-stat-card"><strong>{summary.titles}</strong><span>Belts</span></div>
            <div className="data-stat-card"><strong>{summary.matches}</strong><span>Records</span></div>
          </div>
        </section>

        <section className="data-card">
          <div className="data-card-header">
            <div className="data-card-heading">Backup & Transmission</div>
            <div className="data-card-subtle">Manage external universe files</div>
          </div>

          <div className="data-action-grid">
            <div className="data-action-card">
              <FiDownload style={{ fontSize: 24, color: 'var(--primary)' }} />
              <div className="data-action-title">External Backup</div>
              <div className="data-action-copy">Generate a portable JSON file containing your entire universe state.</div>
              <button className="btn btn-primary" onClick={handleExport}><FiDownload /> Export JSON</button>
            </div>

            <div className="data-action-card">
              <FiUpload style={{ fontSize: 24, color: 'var(--text3)' }} />
              <div className="data-action-title">Restore Point</div>
              <div className="data-action-copy">Upload a backup file to overwrite current local storage.</div>
              <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                <FiUpload /> {isImporting ? 'Restoring...' : 'Import JSON'}
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} hidden />
            </div>

            <div className="data-action-card" style={{ background: 'linear-gradient(135deg, var(--bg3), #1a1a1a)', borderColor: 'var(--primary-dim)' }}>
              <FiGlobe style={{ fontSize: 24, color: 'var(--gold)' }} />
              <div className="data-action-title">Starter Universe</div>
              <div className="data-action-copy">Load a curated demo with shows, titles, events, stories, teams, and HeatSpark relationships.</div>
              <button className="btn btn-secondary" onClick={handleLoadDemo} disabled={isLoadingDemo}>
                {isLoadingDemo ? 'Loading Universe...' : 'Load Starter Universe'}
              </button>
            </div>
          </div>
        </section>

        <section className="data-card">
          <div className="data-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div className="data-card-heading">Rolling Recovery</div>
              <div className="data-card-subtle">Incremental snapshots stored in browser IndexedDB</div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={isCreatingSnapshot} onClick={() => { setIsCreatingSnapshot(true); createManualSnapshot('Manual Point').then(() => { setIsCreatingSnapshot(false); showToast('Point created'); }); }}>
              <FiPlus /> New Snapshot
            </button>
          </div>

          <div className="data-autosave-list">
            {autosaveSnapshots.length === 0 ? (
              <div className="empty-state">No recovery points found.</div>
            ) : (
              autosaveSnapshots.map((s) => (
                <div key={s.id} className="data-autosave-row">
                  <div className="data-autosave-main">
                    <div className="data-action-title">{s.label || 'Autosave Point'}</div>
                    <div className="data-action-copy">{formatSnapshotDate(s.createdAt)}</div>
                    <div className="data-chip-row">
                      <span className="data-chip">R:{s.counts?.roster || 0}</span>
                      <span className="data-chip">S:{s.counts?.shows || 0}</span>
                      <span className="data-chip">T:{s.counts?.titles || 0}</span>
                      <span className="data-chip">M:{s.counts?.matches || 0}</span>
                    </div>
                  </div>
                  <div className="data-autosave-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => { if(confirm('Restore?')) restoreAutosave(s.id); }}>Restore</button>
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteAutosave(s.id)}><FiTrash2 /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="data-card">
          <div className="data-card-header">
            <div className="data-card-heading">Database Purge</div>
            <div className="data-card-subtle">Carefully prune specific modules of your universe</div>
          </div>

          <div className="data-reset-grid">
            {RESET_ACTIONS.map((action) => (
              <div key={action.key} className="data-reset-card">
                <div className="data-reset-card-header">
                  <span>{action.label}</span>
                  <strong>{summary[action.countKey]} Total</strong>
                </div>
                <div className="data-reset-copy">{action.description}</div>
                <button className="btn btn-danger btn-sm" onClick={() => { if(confirm(`Purge ${action.label}?`)) clearDataScope(action.key); }}>
                  Purge Data
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
