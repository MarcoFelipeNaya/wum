import React, { useMemo, useRef, useState } from 'react'
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

export default function Data({ state, exportData, importData, clearDataScope, showToast }) {
  const fileInputRef = useRef(null)
  const [isImporting, setIsImporting] = useState(false)

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
      anchor.download = `wum-backup-${stamp}.json`
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
      importData(text)
      showToast('Backup imported')
    } catch (error) {
      showToast(error?.message || 'Could not import backup')
    } finally {
      setIsImporting(false)
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
          </div>
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
