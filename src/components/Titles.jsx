import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { daysBetween, formatUniverseDate } from '../utils/dates.js'
import './Titles.css'

function getChampIds(title) {
  if (Array.isArray(title?.champIds) && title.champIds.length > 0) return title.champIds
  return title?.champId ? [title.champId] : []
}

function getTitleType(title) {
  if (title?.type === 'tag' || title?.type === 'trios' || title?.type === 'singles') return title.type
  const lowerName = String(title?.name || '').toLowerCase()
  if (lowerName.includes('trios') || lowerName.includes('trio')) return 'trios'
  if (lowerName.includes('tag')) return 'tag'
  return 'singles'
}

function getRequiredChampionCount(title) {
  const type = getTitleType(title)
  if (type === 'tag') return 2
  if (type === 'trios') return 3
  return 1
}

function getTitleTypeLabel(title) {
  const type = getTitleType(title)
  if (type === 'tag') return 'Tag'
  if (type === 'trios') return 'Trios'
  return 'Singles'
}

function compactReignIds(historyEntry) {
  if (Array.isArray(historyEntry?.champIds) && historyEntry.champIds.length > 0) return historyEntry.champIds
  return historyEntry?.champId ? [historyEntry.champId] : []
}

export default function Titles({ state, addTitle, assignTitle, deleteTitle, removeTitleHistory, showToast }) {
  const { titles, wrestlers, shows, teams = [], currentDate } = state
  const [modal, setModal] = useState(null)
  const [showFilter, setShowFilter] = useState('all')
  const competitiveWrestlers = useMemo(() => wrestlers.filter((w) => (w.role || 'wrestler') === 'wrestler'), [wrestlers])

  const getW = (id) => wrestlers.find((w) => w.id === id)
  const getTeamById = (id) => teams.find((team) => team.id === id)
  const getShowByName = (name) => shows.find((show) => show.name === name)
  const getBrandColor = (showName) => getShowByName(showName)?.color || 'var(--primary)'

  const currentDaysHeld = (champSince) => {
    if (!champSince) return 0
    return Math.max(0, daysBetween(champSince, currentDate))
  }

  const getTeamLabelFromIds = (champIds, title) => {
    const normalizedIds = [...champIds].sort((a, b) => a - b)
    const titleType = getTitleType(title)
    const matchingTeam = teams.find((team) => {
      if (titleType === 'tag' && team.type !== 'tag') return false
      if (titleType === 'trios' && team.type !== 'trio') return false
      const teamIds = [...(team.memberIds || [])].sort((a, b) => a - b)
      return teamIds.length === normalizedIds.length && teamIds.every((id, index) => id === normalizedIds[index])
    })

    if (matchingTeam) return matchingTeam.name
    return normalizedIds.map((id) => getW(id)?.name ?? 'Unknown').join(' / ')
  }

  const getChampionDisplay = (title) => {
    const champIds = getChampIds(title)
    if (champIds.length === 0) return 'Vacant'
    if (getTitleType(title) === 'singles') return getW(champIds[0])?.name ?? 'Unknown'
    return getTeamLabelFromIds(champIds, title)
  }

  const getTitleLineage = (title) => {
    const lineageMap = new Map()

    const addReign = (champIds, days) => {
      const safeDays = Math.max(0, Number(days) || 0)
      champIds.forEach((champId) => {
        if (!lineageMap.has(champId)) {
          lineageMap.set(champId, { champId, reigns: 0, totalDays: 0 })
        }
        const entry = lineageMap.get(champId)
        entry.reigns += 1
        entry.totalDays += safeDays
      })
    }

    title.history.forEach((entry) => addReign(compactReignIds(entry), entry.days))
    if (getChampIds(title).length > 0 && title.champSince) {
      addReign(getChampIds(title), currentDaysHeld(title.champSince))
    }

    return [...lineageMap.values()].sort((a, b) => {
      if (b.totalDays !== a.totalDays) return b.totalDays - a.totalDays
      if (b.reigns !== a.reigns) return b.reigns - a.reigns
      return (getW(a.champId)?.name ?? '').localeCompare(getW(b.champId)?.name ?? '')
    })
  }

  const tagTeams = useMemo(() => teams.filter((team) => team.type === 'tag'), [teams])
  const triosTeams = useMemo(() => teams.filter((team) => team.type === 'trio'), [teams])
  const activeChampionships = useMemo(() => titles.filter((title) => getChampIds(title).length > 0).length, [titles])
  const universeTitles = useMemo(() => titles.filter((title) => (title.show || 'Universe') === 'Universe').length, [titles])
  const activeBrands = useMemo(() => new Set(titles.map((title) => title.show || 'Universe')).size, [titles])
  const filteredTitles = useMemo(() => {
    if (showFilter === 'all') return titles
    return titles.filter((title) => (title.show || 'Universe') === showFilter)
  }, [showFilter, titles])

  const handleAdd = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = fd.get('name').trim()
    const type = fd.get('type')

    if (!name) {
      showToast('Enter a title name')
      return
    }

    addTitle({ name, show: fd.get('show'), type })
    showToast(`${name} created!`)
    setModal(null)
  }

  const handleAssign = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const title = titles.find((item) => item.id === modal.id)
    const titleType = getTitleType(title)
    const reignDays = parseInt(fd.get('reignDays'), 10) || 0

    let nextChampIds = []

    if (titleType === 'singles') {
      const champId = parseInt(fd.get('champ'), 10) || null
      nextChampIds = champId ? [champId] : []
    } else {
      const teamId = parseInt(fd.get('teamId'), 10) || null
      if (teamId) {
        nextChampIds = getTeamById(teamId)?.memberIds || []
      } else {
        nextChampIds = []
        for (let i = 0; i < getRequiredChampionCount(title); i += 1) {
          const champId = parseInt(fd.get(`champ_${i}`), 10)
          if (champId) nextChampIds.push(champId)
        }
      }
      nextChampIds = [...new Set(nextChampIds)]
      if (nextChampIds.length > 0 && nextChampIds.length !== getRequiredChampionCount(title)) {
        showToast(`${getTitleTypeLabel(title)} titles need exactly ${getRequiredChampionCount(title)} champions`)
        return
      }
    }

    assignTitle(modal.id, nextChampIds, reignDays)
    showToast(nextChampIds.length > 0 ? 'New champion crowned!' : 'Title vacated')
    setModal(null)
  }

  const TitleCard = ({ title }) => {
    const championLabel = getChampionDisplay(title)
    const days = getChampIds(title).length > 0 ? currentDaysHeld(title.champSince) : 0
    const lineage = getTitleLineage(title)
    const mostCombinedDays = lineage[0] || null
    const mostReigns = lineage.length > 0
      ? [...lineage].sort((a, b) => {
          if (b.reigns !== a.reigns) return b.reigns - a.reigns
          if (b.totalDays !== a.totalDays) return b.totalDays - a.totalDays
          return (getW(a.champId)?.name ?? '').localeCompare(getW(b.champId)?.name ?? '')
        })[0]
      : null
    const type = getTitleType(title)
    const accent = getBrandColor(title.show)

    return (
      <div className="title-compact-card" onClick={() => setModal({ type: 'detail', id: title.id })}>
        <div className="title-card-accent" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <div className="title-card-header">
          <div className="title-card-header-main">
            <div className="title-card-badges">
              <span className="title-card-badge" style={{ background: `${accent}22`, color: accent, borderColor: `${accent}44` }}>
                {getTitleTypeLabel(title)}
              </span>
              <span
                className="title-card-badge"
                style={{ background: `${accent}18`, color: accent, borderColor: `${accent}33` }}
              >
                {title.show}
              </span>
            </div>
            <h3 className="title-card-name">{title.name}</h3>
          </div>
        </div>

        <div className="title-card-champion-row">
          <div className="title-card-section-label">Current Champion</div>
          <div className={`title-card-champion ${championLabel === 'Vacant' ? 'vacant' : ''}`}>{championLabel}</div>
          <div className="title-card-subtle">{championLabel === 'Vacant' ? 'Awaiting a champion' : `${days} day${days !== 1 ? 's' : ''} in current reign`}</div>
        </div>

        <div className="title-card-reign-strip">
          <div
            className="title-card-reign-fill"
            style={{ width: `${Math.min(100, Math.max(18, days * 1.2 || 18))}%`, background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.08))` }}
          />
        </div>

        {(mostCombinedDays || mostReigns) && (
          <div className="title-card-highlights">
            {mostCombinedDays && (
              <span className="badge badge-gold">
                Most days: {getW(mostCombinedDays.champId)?.name ?? 'Unknown'} ({mostCombinedDays.totalDays}d)
              </span>
            )}
            {mostReigns && (
              <span className="badge badge-gold">
                Most reigns: {getW(mostReigns.champId)?.name ?? 'Unknown'} ({mostReigns.reigns})
              </span>
            )}
          </div>
        )}

        <div className="title-card-footer">
          <div>
            <div className="title-card-stat">{title.history.length}</div>
            <div className="title-card-stat-label">Past Reigns</div>
          </div>
          <div>
            <div className="title-card-stat">{lineage.length}</div>
            <div className="title-card-stat-label">Champions</div>
          </div>
          <div className="title-card-open">View Details</div>
        </div>
      </div>
    )
  }

  return (
    <div className="titles-page">
      <div className="titles-hero card">
        <div className="titles-hero-copy">
          <div className="titles-hero-kicker">Heat Championship Office</div>
          <h1 className="page-title">Championships</h1>
          <p className="titles-hero-subtle">
            Follow every belt across the universe, from current champions and reigning dynasties to full lineage and brand identity.
          </p>
        </div>
        <div className="titles-hero-actions">
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            + Create Title
          </button>
        </div>
      </div>

      <div className="titles-overview-grid">
        <div className="titles-overview-card">
          <div className="titles-overview-label">Total Titles</div>
          <div className="titles-overview-value">{titles.length}</div>
          <div className="titles-overview-meta">All singles, tag, trios, and universe-level championships.</div>
        </div>
        <div className="titles-overview-card">
          <div className="titles-overview-label">Active Champions</div>
          <div className="titles-overview-value">{activeChampionships}</div>
          <div className="titles-overview-meta">Belts currently assigned to a champion or champion team.</div>
        </div>
        <div className="titles-overview-card">
          <div className="titles-overview-label">Universe Titles</div>
          <div className="titles-overview-value">{universeTitles}</div>
          <div className="titles-overview-meta">Championships that sit above one weekly brand.</div>
        </div>
        <div className="titles-overview-card">
          <div className="titles-overview-label">Active Brands</div>
          <div className="titles-overview-value">{activeBrands}</div>
          <div className="titles-overview-meta">Brands represented across the current title landscape.</div>
        </div>
      </div>

      <div className="card title-filter-card">
        <div className="title-filter-row">
          <div className="form-group title-filter-field">
            <label>Show</label>
            <select value={showFilter} onChange={(e) => setShowFilter(e.target.value)}>
              <option value="all">All titles</option>
              <option value="Universe">Universe-wide</option>
              {shows.map((show) => (
                <option key={show.id} value={show.name}>{show.name}</option>
              ))}
            </select>
          </div>
          <div className="title-filter-meta">
            <div className="title-filter-count">{filteredTitles.length} title{filteredTitles.length !== 1 ? 's' : ''} shown</div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowFilter('all')}>
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      <div className="titles-compact-grid">
        {filteredTitles.length === 0 && (
          <div className="empty-state card" style={{ gridColumn: '1 / -1' }}>
            <p>No championships match the selected show.</p>
          </div>
        )}
        {filteredTitles.map((title) => (
          <TitleCard key={title.id} title={title} />
        ))}
      </div>

      {modal?.type === 'detail' &&
        (() => {
          const title = titles.find((item) => item.id === modal.id)
          if (!title) return null

          const championLabel = getChampionDisplay(title)
          const champIds = getChampIds(title)
          const days = champIds.length > 0 ? currentDaysHeld(title.champSince) : 0
          const lineage = getTitleLineage(title)
          const accent = getBrandColor(title.show)

          return (
            <Modal title={title.name} onClose={() => setModal(null)} style={{ maxWidth: '980px' }}>
              <div className="title-detail-shell">
                <div className="title-detail-main">
                  <div className="title-detail-meta-row">
                    <span className="title-card-badge" style={{ background: `${accent}22`, color: accent, borderColor: `${accent}44` }}>
                      {getTitleTypeLabel(title)}
                    </span>
                    <span className="title-card-badge" style={{ background: `${accent}18`, color: accent, borderColor: `${accent}33` }}>
                      {title.show}
                    </span>
                  </div>

                  <div className="title-detail-current">
                    <div className="title-detail-heading">Current Champion</div>
                    <div className={`title-detail-champion ${championLabel === 'Vacant' ? 'vacant' : ''}`}>{championLabel}</div>
                    <div className="title-detail-subtle">
                      {championLabel === 'Vacant' ? 'This title is currently vacant.' : `Current reign: ${days} day${days !== 1 ? 's' : ''}`}
                    </div>
                    <div className="title-detail-reign-strip">
                      <div
                        className="title-detail-reign-fill"
                        style={{ width: `${Math.min(100, Math.max(18, days * 1.2 || 18))}%`, background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.08))` }}
                      />
                    </div>
                  </div>

                  <div className="title-detail-section">
                    <div className="title-detail-heading">Lineage</div>
                    {lineage.length === 0 ? (
                      <div className="title-detail-empty">No completed lineage yet.</div>
                    ) : (
                      <div className="reign-history">
                        <table className="reign-table">
                          <thead>
                            <tr>
                              <th>Champion</th>
                              <th>Reigns</th>
                              <th>Total Days</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lineage.map((entry, index) => (
                              <tr key={index}>
                                <td>{getW(entry.champId)?.name ?? 'Unknown'}</td>
                                <td><span className="badge badge-gold">{entry.reigns}</span></td>
                                <td><span className="badge badge-gold">{entry.totalDays}d</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="title-detail-section">
                    <div className="title-detail-heading">Past Reigns</div>
                    {title.history.length === 0 ? (
                      <div className="title-detail-empty">No previous reigns recorded.</div>
                    ) : (
                      <div className="reign-history">
                        <table className="reign-table">
                          <thead>
                            <tr>
                              <th>Champion</th>
                              <th>Won</th>
                              <th>Lost</th>
                              <th>Days</th>
                              <th>Remove</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...title.history].reverse().map((entry, index) => {
                              const originalIndex = title.history.length - 1 - index
                              const championNames = compactReignIds(entry).map((id) => getW(id)?.name ?? 'Unknown').join(' / ')

                              return (
                                <tr key={index}>
                                  <td>{championNames}</td>
                        <td>{entry.wonDate ? formatUniverseDate(entry.wonDate) : '-'}</td>
                        <td>{entry.lostDate ? formatUniverseDate(entry.lostDate) : '-'}</td>
                                  <td><span className="badge badge-gold">{entry.days}d</span></td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      onClick={() => {
                                        removeTitleHistory(title.id, originalIndex)
                                        showToast('Past reign removed')
                                      }}
                                    >
                                      X
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="title-detail-side">
                  <div className="title-side-card">
                    <div className="title-detail-heading">Title Actions</div>
                    <button className="btn btn-primary" onClick={() => setModal({ type: 'assign', id: title.id })}>
                      Assign Champion
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        deleteTitle(title.id)
                        showToast('Title removed')
                        setModal(null)
                      }}
                    >
                      Delete Title
                    </button>
                  </div>

                  <div className="title-side-card">
                    <div className="title-detail-heading">Quick Facts</div>
                    <div className="title-fact-row">
                      <span>Type</span>
                      <strong>{getTitleTypeLabel(title)}</strong>
                    </div>
                    <div className="title-fact-row">
                      <span>Brand</span>
                      <strong>{title.show}</strong>
                    </div>
                    <div className="title-fact-row">
                      <span>Champion Slots</span>
                      <strong>{getRequiredChampionCount(title)}</strong>
                    </div>
                    <div className="title-fact-row">
                      <span>Recorded Reigns</span>
                      <strong>{title.history.length}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )
        })()}

      {modal === 'add' && (
        <Modal title="Create Championship" onClose={() => setModal(null)}>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Title Name</label>
              <input name="name" placeholder="e.g. World Heavyweight Championship" autoFocus />
            </div>

            <div className="form-group">
              <label>Championship Type</label>
              <select name="type" defaultValue="singles">
                <option value="singles">Singles</option>
                <option value="tag">Tag Team</option>
                <option value="trios">Trios</option>
              </select>
            </div>

            <div className="form-group">
              <label>Brand</label>
              <select name="show" defaultValue="Universe">
                <option value="Universe">Universe-wide</option>
                {shows.map((s) => (
                  <option key={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'assign' &&
        (() => {
          const title = titles.find((item) => item.id === modal.id)
          if (!title) return null

          const titleType = getTitleType(title)
          const requiredCount = getRequiredChampionCount(title)
          const currentChampIds = getChampIds(title)
          const eligibleTeams = titleType === 'tag' ? tagTeams : titleType === 'trios' ? triosTeams : []

          return (
            <Modal title="Assign Champion" onClose={() => setModal(null)}>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                {title.name} ({getTitleTypeLabel(title)})
              </div>

              <form onSubmit={handleAssign}>
                {titleType === 'singles' ? (
                  <div className="form-group">
                    <label>Champion</label>
                    <select name="champ" defaultValue={currentChampIds[0] ?? ''}>
                      <option value="">Vacant</option>
                      {competitiveWrestlers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>{getTitleTypeLabel(title)} Team</label>
                      <select name="teamId" defaultValue="">
                        <option value="">Manual selection</option>
                        {eligibleTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name} ({team.memberIds.map((id) => getW(id)?.name ?? 'Unknown').join(' / ')})
                          </option>
                        ))}
                      </select>
                      <div className="title-form-hint">
                        {eligibleTeams.length > 0
                          ? `Pick an existing ${titleType === 'tag' ? 'tag team' : 'trios team'}, or manually select ${requiredCount} wrestlers below.`
                          : `No saved ${titleType === 'tag' ? 'tag teams' : 'trios teams'} yet. Select ${requiredCount} wrestlers manually.`}
                      </div>
                    </div>

                    <div className="title-manual-grid">
                      {Array.from({ length: requiredCount }).map((_, index) => (
                        <div key={index} className="form-group">
                          <label>Champion {index + 1}</label>
                          <select name={`champ_${index}`} defaultValue={currentChampIds[index] ?? ''}>
                            <option value="">Select wrestler</option>
                            {competitiveWrestlers.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Reign Days</label>
                  <input
                    name="reignDays"
                    type="number"
                    min="0"
                    defaultValue={currentChampIds.length > 0 ? currentDaysHeld(title.champSince) : 0}
                    placeholder="0"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Confirm
                  </button>
                </div>
              </form>
            </Modal>
          )
        })()}
    </div>
  )
}
