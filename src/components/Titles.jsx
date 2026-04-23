import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { daysBetween, formatUniverseDate } from '../utils/dates.js'
import { FiAward, FiStar, FiTrendingUp, FiSettings, FiEdit3, FiTrash2, FiPlus, FiChevronRight, FiUsers, FiClock } from 'react-icons/fi'
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
  const getBrandColor = (showName) => getShowByName(showName)?.color || 'var(--gold)'

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
    const type = getTitleType(title)
    const accent = getBrandColor(title.show)

    return (
      <div className="title-compact-card" onClick={() => setModal({ type: 'detail', id: title.id })}>
        <div className="title-card-accent" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        
        <div className="title-card-badges">
          <span className="title-card-badge" style={{ background: `${accent}22`, color: accent, borderColor: `${accent}44` }}>
            {getTitleTypeLabel(title)}
          </span>
          <span className="title-card-badge" style={{ background: 'var(--bg3)', color: 'var(--text3)', borderColor: 'var(--border2)' }}>
            {title.show}
          </span>
        </div>

        <h3 className="title-card-name">{title.name}</h3>

        <div className="title-card-champion-row">
          <div className="title-card-section-label">Current Champion</div>
          <div className={`title-card-champion ${championLabel === 'Vacant' ? 'vacant' : ''}`}>
            {championLabel}
          </div>
          <div className="title-card-subtle">
            {championLabel === 'Vacant' ? 'Awaiting crown' : `${days} days active`}
          </div>
        </div>

        <div className="title-card-reign-strip">
          <div
            className="title-card-reign-fill"
            style={{ width: `${Math.min(100, Math.max(15, days / 2))}%`, background: `linear-gradient(90deg, ${accent}, transparent)` }}
          />
        </div>

        <div className="title-card-footer">
          <div className="title-card-stat-group">
            <div className="title-card-stat">{title.history.length}</div>
            <div className="title-card-stat-label">Past Reigns</div>
          </div>
          <div className="title-card-stat-group">
            <div className="title-card-stat">{lineage.length}</div>
            <div className="title-card-stat-label">Unique Champs</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: accent, textTransform: 'uppercase' }}>
            Prestige <FiChevronRight />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="titles-page">
      <div className="titles-hero">
        <div className="titles-hero-copy">
          <div className="titles-hero-kicker">Universe Championship Authority</div>
          <h1 className="page-title">Championship Records</h1>
          <p className="titles-hero-subtle">
            Managing the gold across the brands. Track reigns, lineage, and the prestige of your universe's highest honors.
          </p>
        </div>
        <div className="titles-hero-actions">
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <FiPlus /> Create New Belt
          </button>
        </div>
      </div>

      <div className="titles-overview-grid">
        <div className="titles-overview-card">
          <div className="titles-overview-label">Total Honors</div>
          <div className="titles-overview-value">{titles.length}</div>
          <div className="titles-overview-meta">Championships established in current universe.</div>
        </div>
        <div className="titles-overview-card">
          <div className="titles-overview-label">Active Belts</div>
          <div className="titles-overview-value">{activeChampionships}</div>
          <div className="titles-overview-meta">Belts currently held by active talent.</div>
        </div>
        <div className="titles-overview-card">
          <div className="titles-overview-label">Universe-Level</div>
          <div className="titles-overview-value">{universeTitles}</div>
          <div className="titles-overview-meta">Belts that cross brand boundaries.</div>
        </div>
        <div className="titles-overview-card">
          <div className="titles-overview-label">Brand Rep</div>
          <div className="titles-overview-value">{activeBrands}</div>
          <div className="titles-overview-meta">Distinct brands with exclusive honors.</div>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 240 }}>
          <label><FiAward /> Filter by Brand</label>
          <select value={showFilter} onChange={(e) => setShowFilter(e.target.value)}>
            <option value="all">All Brands</option>
            <option value="Universe">Universe-wide</option>
            {shows.map((show) => (
              <option key={show.id} value={show.name}>{show.name}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>
          {filteredTitles.length} TITLES TRACKED
        </div>
      </div>

      <div className="titles-compact-grid">
        {filteredTitles.length === 0 && (
          <div className="empty-state card" style={{ gridColumn: '1 / -1', padding: '60px 0' }}>
            <FiAward style={{ fontSize: 48, opacity: 0.1, marginBottom: 16 }} />
            <p>No championships match the selected criteria.</p>
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
            <Modal title={title.name} onClose={() => setModal(null)} style={{ maxWidth: '1000px' }}>
              <div className="title-detail-shell">
                <div className="title-detail-main">
                  <div className="title-detail-current" style={{ borderTop: `4px solid ${accent}` }}>
                    <div className="title-detail-heading">Current Champion</div>
                    <div className={`title-detail-champion ${championLabel === 'Vacant' ? 'vacant' : ''}`}>
                      {championLabel}
                    </div>
                    <div className="title-detail-subtle">
                      {championLabel === 'Vacant' ? 'No active champion crowned' : `${days} day reign in progress`}
                    </div>
                    <div className="title-card-reign-strip" style={{ marginTop: 16, height: 8 }}>
                      <div
                        className="title-card-reign-fill"
                        style={{ width: `${Math.min(100, Math.max(10, days / 3))}%`, background: `linear-gradient(90deg, ${accent}, transparent)` }}
                      />
                    </div>
                  </div>

                  <div className="title-detail-section">
                    <div className="title-detail-heading">Lineage & Hall of Records</div>
                    {lineage.length === 0 ? (
                      <div className="empty-state">No champions recorded in history.</div>
                    ) : (
                      <table className="reign-table">
                        <thead>
                          <tr>
                            <th>Champion</th>
                            <th>Total Reigns</th>
                            <th>Combined Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineage.map((entry, index) => (
                            <tr key={index}>
                              <td style={{ fontWeight: 800 }}>{getW(entry.champId)?.name ?? 'Unknown'}</td>
                              <td><span className="badge badge-gray">{entry.reigns}</span></td>
                              <td><span className="badge" style={{ background: `${accent}15`, color: accent }}>{entry.totalDays}d</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="title-detail-section">
                    <div className="title-detail-heading">Recent Successions</div>
                    {title.history.length === 0 ? (
                      <div className="empty-state">Belts yet to change hands.</div>
                    ) : (
                      <table className="reign-table">
                        <thead>
                          <tr>
                            <th>Champion</th>
                            <th>Tenure</th>
                            <th>Days</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...title.history].reverse().slice(0, 5).map((entry, index) => {
                            const originalIndex = title.history.length - 1 - index
                            const championNames = compactReignIds(entry).map((id) => getW(id)?.name ?? 'Unknown').join(' / ')

                            return (
                              <tr key={index}>
                                <td style={{ fontSize: 12 }}>{championNames}</td>
                                <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                                  {entry.wonDate ? formatUniverseDate(entry.wonDate) : '-'} to {entry.lostDate ? formatUniverseDate(entry.lostDate) : '-'}
                                </td>
                                <td><span style={{ fontWeight: 700 }}>{entry.days}d</span></td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="btn btn-icon btn-danger btn-sm" onClick={() => removeTitleHistory(title.id, originalIndex)}><FiTrash2 /></button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="title-detail-side">
                  <div className="title-side-card" style={{ borderTop: `4px solid ${accent}` }}>
                    <div className="title-detail-heading">Administration</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button className="btn btn-primary" onClick={() => setModal({ type: 'assign', id: title.id })}>
                        <FiTrendingUp /> Crown Champion
                      </button>
                      <button className="btn btn-secondary" onClick={() => { if(confirm('Delete title?')) { deleteTitle(title.id); setModal(null); showToast('Belt destroyed'); } }}>
                        <FiTrash2 /> Retire Title
                      </button>
                    </div>
                  </div>

                  <div className="title-side-card">
                    <div className="title-detail-heading">Belt Specs</div>
                    <div className="title-fact-row">
                      <span style={{ color: 'var(--text3)' }}>Class</span>
                      <strong>{getTitleTypeLabel(title)}</strong>
                    </div>
                    <div className="title-fact-row">
                      <span style={{ color: 'var(--text3)' }}>Division</span>
                      <strong style={{ color: accent }}>{title.show}</strong>
                    </div>
                    <div className="title-fact-row">
                      <span style={{ color: 'var(--text3)' }}>Active Since</span>
                      <strong>{title.history.length > 0 ? formatUniverseDate(title.history[0].wonDate) : 'Brand Launch'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )
        })()}

      {modal === 'add' && (
        <Modal title="Commission New Championship" onClose={() => setModal(null)}>
          <form onSubmit={handleAdd}>
            <div style={{ minWidth: '400px' }}>
              <div className="form-group">
                <label>Belt Designation</label>
                <input name="name" placeholder="e.g. World Heavyweight Championship" autoFocus />
              </div>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Weight Class / Type</label>
                  <select name="type" defaultValue="singles">
                    <option value="singles">Singles</option>
                    <option value="tag">Tag Team</option>
                    <option value="trios">Trios</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Brand Assignment</label>
                  <select name="show" defaultValue="Universe">
                    <option value="Universe">Universe-wide</option>
                    {shows.map((s) => (
                      <option key={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Establish Honor</button>
              </div>
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
            <Modal title="Crowning Ceremony" onClose={() => setModal(null)}>
              <div style={{ padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 20, borderLeft: `4px solid ${getBrandColor(title.show)}` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Crowning For</div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{title.name}</div>
              </div>

              <form onSubmit={handleAssign} style={{ minWidth: '400px' }}>
                {titleType === 'singles' ? (
                  <div className="form-group">
                    <label>Select Champion</label>
                    <select name="champ" defaultValue={currentChampIds[0] ?? ''}>
                      <option value="">Vacate Championship</option>
                      {competitiveWrestlers.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Team Designation</label>
                      <select name="teamId" defaultValue="">
                        <option value="">Manual Member Selection</option>
                        {eligibleTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {Array.from({ length: requiredCount }).map((_, index) => (
                        <div key={index} className="form-group">
                          <label>Partner {index + 1}</label>
                          <select name={`champ_${index}`} defaultValue={currentChampIds[index] ?? ''}>
                            <option value="">Select Talent</option>
                            {competitiveWrestlers.map((w) => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label><FiClock /> Tenure Adjust (Days Held)</label>
                  <input
                    name="reignDays"
                    type="number"
                    min="0"
                    defaultValue={currentChampIds.length > 0 ? currentDaysHeld(title.champSince) : 0}
                  />
                </div>
                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Crown Champion</button>
                </div>
              </form>
            </Modal>
          )
        })()}
    </div>
  )
}
