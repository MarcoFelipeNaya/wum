import React, { useMemo, useState } from 'react'
import { buildRankings } from '../utils/rankings.js'
import './Rankings.css'

export default function Rankings({ state }) {
  const { wrestlers = [], titles = [], matches = [], shows = [] } = state || {}
  const [filters, setFilters] = useState({
    search: '',
    show: 'all',
    align: 'all',
    gender: 'all',
    status: 'all',
  })

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
      .map((row, index) => ({ ...row, filteredRank: index + 1 }))
  }, [filters, rankedRows, wrestlers])

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))
  const resetFilters = () => setFilters({ search: '', show: 'all', align: 'all', gender: 'all', status: 'all' })

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
                <th>PRS</th>
                <th>Win %</th>
                <th>Record</th>
                <th>Matches</th>
                <th>Streak</th>
                <th>Titles</th>
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
                  <td>{row.winPct}%</td>
                  <td>{row.record}</td>
                  <td>{row.matches}</td>
                  <td>{row.streak}</td>
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
