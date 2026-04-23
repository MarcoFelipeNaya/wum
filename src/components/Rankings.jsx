import React, { useMemo, useState } from 'react'
import { buildRankings } from '../utils/rankings.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFire, faSnowflake } from '@fortawesome/free-solid-svg-icons'
import './Rankings.css'

function getWinPctClass(winPct) {
  if (winPct >= 75) return 'rankings-stat rankings-stat-elite'
  if (winPct >= 60) return 'rankings-stat rankings-stat-strong'
  if (winPct >= 45) return 'rankings-stat rankings-stat-steady'
  if (winPct >= 30) return 'rankings-stat rankings-stat-cold'
  return 'rankings-stat rankings-stat-danger'
}

function getStreakClass(streak) {
  if (streak >= 4) return 'rankings-stat rankings-stat-fire'
  if (streak >= 3) return 'rankings-stat rankings-stat-elite'
  if (streak > 0) return 'rankings-stat rankings-stat-strong'
  if (streak <= -4) return 'rankings-stat rankings-stat-cold'
  if (streak < 0) return 'rankings-stat rankings-stat-danger'
  return 'rankings-stat rankings-stat-neutral'
}

export default function Rankings({ state }) {
  const { wrestlers = [], titles = [], matches = [], shows = [] } = state || {}
  const [filters, setFilters] = useState({
    search: '',
    show: 'all',
    align: 'all',
    gender: 'all',
    status: 'all',
  })
  const [sortBy, setSortBy] = useState('prs')
  const [sortDirection, setSortDirection] = useState('desc')

  const rankedRows = buildRankings(wrestlers, matches, titles)
  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return rankedRows
      .filter((row) => {
        const wrestler = wrestlers.find((item) => item.id === row.id)
        if (!wrestler) return false
        if (search && !wrestler.name.toLowerCase().includes(search)) return false
        if (filters.show !== 'all' && (wrestler.show || '') !== filters.show) return false
        if (filters.align !== 'all' && (wrestler.align || '') !== filters.align) return false
        if (filters.gender !== 'all' && (wrestler.gender || '') !== filters.gender) return false
        if (filters.status !== 'all' && (wrestler.status || '') !== filters.status) return false
        return true
      })
      .sort((a, b) => {
        const direction = sortDirection === 'asc' ? 1 : -1

        if (sortBy === 'winPct') {
          if (a.winPct !== b.winPct) return (a.winPct - b.winPct) * direction
          if (a.prs !== b.prs) return (a.prs - b.prs) * direction
          return a.name.localeCompare(b.name)
        }

        if (sortBy === 'matches') {
          if (a.matches !== b.matches) return (a.matches - b.matches) * direction
          if (a.prs !== b.prs) return (a.prs - b.prs) * direction
          return a.name.localeCompare(b.name)
        }

        if (sortBy === 'streak') {
          if (a.streak !== b.streak) return (a.streak - b.streak) * direction
          if (a.prs !== b.prs) return (a.prs - b.prs) * direction
          return a.name.localeCompare(b.name)
        }

        if (sortBy === 'titles') {
          if (a.titles !== b.titles) return (a.titles - b.titles) * direction
          if (a.prs !== b.prs) return (a.prs - b.prs) * direction
          return a.name.localeCompare(b.name)
        }

        if (a.prs !== b.prs) return (a.prs - b.prs) * direction
        if (a.winPct !== b.winPct) return (a.winPct - b.winPct) * direction
        return a.name.localeCompare(b.name)
      })
      .map((row, index) => ({ ...row, filteredRank: index + 1 }))
  }, [filters, rankedRows, wrestlers, sortBy, sortDirection])

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))
  const resetFilters = () => setFilters({ search: '', show: 'all', align: 'all', gender: 'all', status: 'all' })
  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
      return
    }
    setSortBy(key)
    setSortDirection('desc')
  }
  const getSortLabel = (key) => {
    if (sortBy !== key) return ''
    return sortDirection === 'desc' ? ' ↓' : ' ↑'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 className="page-title">Rankings</h1>
      </div>

      <div className="card rankings-filters-card">
        <div className="rankings-filters-grid">
          <div className="form-group">
            <label>Search</label>
            <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Search wrestler" />
          </div>
          <div className="form-group">
            <label>Show</label>
            <select value={filters.show} onChange={(e) => updateFilter('show', e.target.value)}>
              <option value="all">All shows</option>
              <option value="">No show</option>
              {shows.map((show) => (
                <option key={show.id} value={show.name}>{show.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Alignment</label>
            <select value={filters.align} onChange={(e) => updateFilter('align', e.target.value)}>
              <option value="all">All alignments</option>
              <option value="Face">Face</option>
              <option value="Heel">Heel</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select value={filters.gender} onChange={(e) => updateFilter('gender', e.target.value)}>
              <option value="all">All genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Injured">Injured</option>
              <option value="Deceased">Deceased</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
        </div>
        <div className="rankings-filters-footer">
          <div className="rankings-filters-count">{filteredRows.length} wrestler{filteredRows.length !== 1 ? 's' : ''} shown</div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Wrestler</th>
                <th>
                  <button type="button" className={`rankings-sort-btn${sortBy === 'prs' ? ' active' : ''}`} onClick={() => toggleSort('prs')}>
                    PRS{getSortLabel('prs')}
                  </button>
                </th>
                <th>
                  <button type="button" className={`rankings-sort-btn${sortBy === 'winPct' ? ' active' : ''}`} onClick={() => toggleSort('winPct')}>
                    Win %{getSortLabel('winPct')}
                  </button>
                </th>
                <th>Record</th>
                <th>
                  <button type="button" className={`rankings-sort-btn${sortBy === 'matches' ? ' active' : ''}`} onClick={() => toggleSort('matches')}>
                    Matches{getSortLabel('matches')}
                  </button>
                </th>
                <th>
                  <button type="button" className={`rankings-sort-btn${sortBy === 'streak' ? ' active' : ''}`} onClick={() => toggleSort('streak')}>
                    Streak{getSortLabel('streak')}
                  </button>
                </th>
                <th>
                  <button type="button" className={`rankings-sort-btn${sortBy === 'titles' ? ' active' : ''}`} onClick={() => toggleSort('titles')}>
                    Titles{getSortLabel('titles')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state">
                    No wrestlers match the current filters.
                  </td>
                </tr>
              )}

              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.filteredRank}</td>
                  <td>{row.name}</td>
                  <td>{row.prs.toFixed(2)}</td>
                  <td>
                    <span className={getWinPctClass(row.winPct)}>{row.winPct}%</span>
                  </td>
                  <td>{row.record}</td>
                  <td>{row.matches}</td>
                  <td>
                    <span className={getStreakClass(row.streak)}>
                      {row.streak >= 4 && <FontAwesomeIcon icon={faFire} className="rankings-stat-icon" />}
                      {row.streak <= -4 && <FontAwesomeIcon icon={faSnowflake} className="rankings-stat-icon" />}
                      {row.streak > 0 ? `+${row.streak}` : row.streak}
                    </span>
                  </td>
                  <td>{row.titles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
