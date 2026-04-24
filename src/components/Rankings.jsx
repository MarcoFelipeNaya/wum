import React, { useMemo, useState } from 'react'
import { buildRankings } from '../utils/rankings.js'
import { FiSearch, FiFilter, FiTrendingUp, FiTrendingDown, FiActivity, FiAward, FiZap, FiTarget, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import { FaFire, FaSnowflake } from 'react-icons/fa6'
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

  const SortIcon = ({ keyId }) => {
    if (sortBy !== keyId) return null
    return sortDirection === 'desc' ? <FiArrowDown /> : <FiArrowUp />
  }

  return (
    <div className="rankings-page">
      <div className="page-header">
        <h1 className="page-title">Power Rankings</h1>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiActivity style={{ color: 'var(--primary)' }} /> REAL-TIME ANALYTICS
        </div>
      </div>

      <div className="rankings-filters-card">
        <div className="rankings-filters-grid">
          <div className="form-group">
            <label><FiSearch /> Search</label>
            <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Filter talent..." />
          </div>
          <div className="form-group">
            <label>Brand</label>
            <select value={filters.show} onChange={(e) => updateFilter('show', e.target.value)}>
              <option value="all">All Brands</option>
              {shows.map((show) => (
                <option key={show.id} value={show.name}>{show.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Alignment</label>
            <select value={filters.align} onChange={(e) => updateFilter('align', e.target.value)}>
              <option value="all">All Side</option>
              <option value="Face">Face</option>
              <option value="Heel">Heel</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="all">Any Status</option>
              <option value="Active">Active</option>
              <option value="Injured">Injured</option>
            </select>
          </div>
        </div>
        <div className="rankings-filters-footer">
          <div className="rankings-filters-count">{filteredRows.length} ATHLETES RANKED</div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      <div className="rankings-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Wrestler</th>
                <th>
                  <button type="button" className={`rankings-sort-btn ${sortBy === 'prs' ? 'active' : ''}`} onClick={() => toggleSort('prs')}>
                    PRS <SortIcon keyId="prs" />
                  </button>
                </th>
                <th>
                  <button type="button" className={`rankings-sort-btn ${sortBy === 'winPct' ? 'active' : ''}`} onClick={() => toggleSort('winPct')}>
                    Win % <SortIcon keyId="winPct" />
                  </button>
                </th>
                <th>Record</th>
                <th>
                  <button type="button" className={`rankings-sort-btn ${sortBy === 'matches' ? 'active' : ''}`} onClick={() => toggleSort('matches')}>
                    Matches <SortIcon keyId="matches" />
                  </button>
                </th>
                <th>
                  <button type="button" className={`rankings-sort-btn ${sortBy === 'streak' ? 'active' : ''}`} onClick={() => toggleSort('streak')}>
                    Streak <SortIcon keyId="streak" />
                  </button>
                </th>
                <th>
                  <button type="button" className={`rankings-sort-btn ${sortBy === 'titles' ? 'active' : ''}`} onClick={() => toggleSort('titles')}>
                    Titles <SortIcon keyId="titles" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state" style={{ padding: '60px 0' }}>
                    No results for this search criteria.
                  </td>
                </tr>
              )}

              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className={`rank-pill ${row.filteredRank <= 3 ? `rank-pill-${row.filteredRank}` : ''}`}>
                      {row.filteredRank}
                    </div>
                  </td>
                  <td style={{ fontWeight: 800, fontSize: 14 }}>{row.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                    {row.prs.toFixed(2)}
                  </td>
                  <td>
                    <span className={getWinPctClass(row.winPct)}>{row.winPct}%</span>
                  </td>
                  <td style={{ fontSize: 12, fontWeight: 700 }}>{row.record}</td>
                  <td>{row.matches}</td>
                    <td>
                      <span className={getStreakClass(row.streak)}>
                        {row.streak >= 4 && <FaFire style={{ fontSize: 10 }} />}
                        {row.streak <= -4 && <FaSnowflake style={{ fontSize: 10 }} />}
                        {row.streak > 0 ? `+${row.streak}` : row.streak}
                      </span>
                    </td>
                  <td>
                    {row.titles > 0 ? (
                      <span style={{ color: 'var(--gold)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiAward /> {row.titles}
                      </span>
                    ) : <span style={{ opacity: 0.1 }}>0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
