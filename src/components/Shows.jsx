import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { MONTHS_FULL } from '../utils/dates.js'
import { FiTv, FiStar, FiCalendar, FiUsers, FiAward, FiEdit3, FiTrash2, FiPlus, FiChevronRight, FiActivity } from 'react-icons/fi'
import './Shows.css'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getChampIds(title) {
  if (Array.isArray(title?.champIds) && title.champIds.length > 0) return title.champIds
  return title?.champId ? [title.champId] : []
}

function getParticipantIds(match) {
  if (Array.isArray(match?.participantIds) && match.participantIds.length > 0) return match.participantIds
  const fallback = []
  if (match?.w1) fallback.push(match.w1)
  if (match?.w2) fallback.push(match.w2)
  return fallback
}

function formatSpecialSchedule(specialShow) {
  if (specialShow.type === 'one_off') {
    const [year, month, day] = String(specialShow.oneOffDate || '').split('-')
    return `${MONTHS_FULL[Math.max(0, Number(month) - 1)]} ${Number(day)}, ${year}`
  }
  return `Every ${MONTHS_FULL[specialShow.month - 1]} Day ${specialShow.day} (since ${specialShow.startYear})`
}

export default function Shows({
  state,
  addShow,
  editShow,
  deleteShow,
  addSpecialShow,
  editSpecialShow,
  deleteSpecialShow,
  showToast,
}) {
  const { shows, wrestlers, titles = [], matches = [], stories = [], factions = [], teams = [], specialShows = [], currentDate } = state
  const [modal, setModal] = useState(null)

  const getWrestler = (id) => wrestlers.find((w) => w.id === id)
  const getFaction = (id) => factions.find((f) => f.id === id)
  const getTeam = (id) => teams.find((t) => t.id === id)

  const getStoryParticipantIds = (participant) => {
    if (participant.type === 'wrestler') return [participant.id]
    if (participant.type === 'faction') return getFaction(participant.id)?.memberIds || []
    if (participant.type === 'team') return getTeam(participant.id)?.memberIds || []
    return []
  }

  const parseCurrentYear = () => Number(String(currentDate || '').slice(0, 4)) || new Date().getFullYear()

  const getShowStats = (show) => {
    const roster = wrestlers.filter((w) => w.show === show.name)
    const rosterIds = roster.map((w) => w.id)
    const brandTitles = titles.filter((t) => t.show === show.name)
    const crownedTitles = brandTitles.filter((t) => getChampIds(t).length > 0)
    const bookedMatches = matches.filter((match) => getParticipantIds(match).some((id) => rosterIds.includes(id)))
    const completedMatches = bookedMatches.filter((match) => match.winnerId != null)
    const relatedStories = stories.filter((story) =>
      (story.participants || []).some((participant) =>
        getStoryParticipantIds(participant).some((id) => rosterIds.includes(id))
      )
    )
    const brandSpecialShows = specialShows.filter((specialShow) => specialShow.showId === show.id)
    
    return {
      roster,
      brandTitles,
      crownedTitles,
      bookedMatches,
      completedMatches,
      relatedStories,
      brandSpecialShows,
    }
  }

  const statsByShowId = useMemo(
    () => Object.fromEntries(shows.map((show) => [show.id, getShowStats(show)])),
    [shows, wrestlers, titles, matches, stories, factions, teams, specialShows]
  )

  const closeModal = () => setModal(null)

  const handleSaveShow = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = { name: fd.get('name').trim(), day: fd.get('day'), color: fd.get('color') }

    if (!data.name) {
      showToast('Enter a show name')
      return
    }

    if (modal === 'add') {
      addShow(data)
      showToast(`${data.name} created!`)
    } else {
      editShow(modal.id, data)
      showToast('Show updated!')
    }

    closeModal()
  }

  const handleSaveSpecialShow = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const type = fd.get('type')
    const showId = parseInt(fd.get('showId'), 10)
    const data = {
      showId,
      name: fd.get('name').trim(),
      type,
      month: parseInt(fd.get('month'), 10),
      day: parseInt(fd.get('day'), 10),
      startYear: parseInt(fd.get('startYear'), 10) || parseCurrentYear(),
      oneOffDate: fd.get('oneOffDate') || null,
    }

    if (!data.name) {
      showToast('Enter an event name')
      return
    }

    if (!showId) {
      showToast('Choose a parent show')
      return
    }

    if (type === 'one_off' && !data.oneOffDate) {
      showToast('Choose the one-off event date')
      return
    }

    if (modal?.specialShowId) {
      editSpecialShow(modal.specialShowId, data)
      showToast('Special show updated!')
    } else {
      addSpecialShow(data)
      showToast(`${data.name} added!`)
    }

    closeModal()
  }

  const openShowEdit = (show) => setModal({ id: show.id })
  const openSpecialModal = (show, specialShow = null) => {
    setModal({
      type: 'special',
      showId: show.id,
      specialShowId: specialShow?.id ?? null,
    })
  }

  const ShowCard = ({ show }) => {
    const stats = statsByShowId[show.id]

    return (
      <div className="show-compact-card" onClick={() => setModal({ type: 'detail', id: show.id })}>
        <div className="show-card-accent" style={{ background: `linear-gradient(90deg, ${show.color}, transparent)` }} />

        <div className="show-card-badges">
          <span className="show-card-badge" style={{ background: `${show.color}22`, color: show.color, borderColor: `${show.color}44` }}>
            {show.day}
          </span>
          <span className="show-card-badge" style={{ background: 'var(--bg3)', color: 'var(--text3)', borderColor: 'var(--border2)' }}>Brand</span>
        </div>

        <h3 className="show-card-name" style={{ color: show.color }}>{show.name}</h3>

        <div className="show-card-highlights">
          <span className="badge" style={{ background: `${show.color}15`, color: show.color, border: `1px solid ${show.color}33`, boxShadow: 'none' }}>
            <FiUsers style={{ marginRight: 4 }} /> {stats.roster.length} Talent
          </span>
          <span className="badge badge-gray"><FiAward style={{ marginRight: 4 }} /> {stats.brandTitles.length} Titles</span>
          <span className="badge badge-gray"><FiStar style={{ marginRight: 4 }} /> {stats.brandSpecialShows.length} Specials</span>
        </div>

        <div className="show-card-footer">
          <div className="show-card-stat-group">
            <div className="show-card-stat">{stats.completedMatches.length}</div>
            <div className="show-card-stat-label">Matches</div>
          </div>
          <div className="show-card-stat-group">
            <div className="show-card-stat">{stats.crownedTitles.length}</div>
            <div className="show-card-stat-label">Champs</div>
          </div>
          <div className="show-card-open" style={{ color: show.color }}>
            Details <FiChevronRight />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shows-page">
      <div className="page-header">
        <h1 className="page-title">Shows & Brands</h1>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <FiPlus /> New Brand
        </button>
      </div>

      <div className="shows-compact-grid">
        {shows.length === 0 && (
          <div className="empty-state card" style={{ gridColumn: '1 / -1', padding: '60px 0' }}>
            <FiTv style={{ fontSize: 48, opacity: 0.1, marginBottom: 16 }} />
            <p>No brands established. Start your legacy by creating a show.</p>
          </div>
        )}
        {shows.map((show) => (
          <ShowCard key={show.id} show={show} />
        ))}
      </div>

      {modal?.type === 'detail' &&
        (() => {
          const show = shows.find((item) => item.id === modal.id)
          if (!show) return null
          const stats = statsByShowId[show.id]

          return (
            <Modal title={show.name} onClose={closeModal} style={{ maxWidth: '1000px' }}>
              <div className="show-detail-shell">
                <div className="show-detail-main">
                  <div className="show-detail-stats-grid">
                    {[
                      { label: 'Roster Size', value: stats.roster.length, icon: <FiUsers /> },
                      { label: 'Brand Titles', value: stats.brandTitles.length, icon: <FiAward /> },
                      { label: 'Matches Run', value: stats.completedMatches.length, icon: <FiActivity /> },
                      { label: 'Special Events', value: stats.brandSpecialShows.length, icon: <FiStar /> },
                    ].map((item) => (
                      <div key={item.label} className="show-detail-stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div className="show-detail-stat-value" style={{ color: show.color }}>{item.value}</div>
                          <div style={{ fontSize: 18, color: 'var(--text3)' }}>{item.icon}</div>
                        </div>
                        <div className="show-detail-stat-label">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="show-detail-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div className="show-detail-heading" style={{ margin: 0 }}>Special Events & Pay-Per-Views</div>
                      <button className="btn btn-primary btn-sm" onClick={() => openSpecialModal(show)}>
                        <FiPlus /> Add Event
                      </button>
                    </div>
                    {stats.brandSpecialShows.length === 0 ? (
                      <div className="empty-state" style={{ padding: '20px 0' }}>No special events scheduled for this brand.</div>
                    ) : (
                      <div className="show-detail-list">
                        {stats.brandSpecialShows.map((specialShow) => (
                          <div key={specialShow.id} className="show-detail-list-row">
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: show.color, border: '1px solid var(--border2)' }}>
                                <FiStar />
                              </div>
                              <div>
                                <div className="show-detail-list-title">{specialShow.name}</div>
                                <div className="show-detail-list-subtle"><FiCalendar style={{ marginRight: 4 }} /> {formatSpecialSchedule(specialShow)}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span className="badge" style={{ background: 'var(--bg2)', color: 'var(--text3)', border: '1px solid var(--border2)' }}>
                                {specialShow.type === 'annual' ? 'Annual' : 'One-Off'}
                              </span>
                              <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openSpecialModal(show, specialShow)}><FiEdit3 /></button>
                              <button className="btn btn-icon btn-danger btn-sm" onClick={() => { deleteSpecialShow(specialShow.id); showToast('Event removed') }}><FiTrash2 /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="show-detail-section">
                    <div className="show-detail-heading">Active Championships</div>
                    {stats.brandTitles.length === 0 ? (
                      <div className="empty-state" style={{ padding: '20px 0' }}>No championships assigned to this brand.</div>
                    ) : (
                      <div className="show-detail-list">
                        {stats.brandTitles.map((title) => (
                          <div key={title.id} className="show-detail-list-row">
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', border: '1px solid var(--border2)' }}>
                                <FiAward />
                              </div>
                              <div>
                                <div className="show-detail-list-title">{title.name}</div>
                                <div className="show-detail-list-subtle">
                                  Champion: <strong style={{ color: 'var(--text)' }}>
                                    {getChampIds(title).length > 0
                                      ? getChampIds(title).map((id) => getWrestler(id)?.name ?? 'Unknown').join(' / ')
                                      : 'Vacant'}
                                  </strong>
                                </div>
                              </div>
                            </div>
                            <span className="badge" style={{ background: `${show.color}15`, color: show.color, border: `1px solid ${show.color}33` }}>
                              {title.type || 'singles'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="show-detail-side">
                  <div className="show-side-card" style={{ borderTop: `4px solid ${show.color}` }}>
                    <div className="show-detail-heading">Brand Management</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button className="btn btn-secondary" onClick={() => openShowEdit(show)}>
                        <FiEdit3 /> Edit Show Details
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${show.name}?`)) {
                            deleteShow(show.id)
                            showToast('Brand deleted')
                            closeModal()
                          }
                        }}
                      >
                        <FiTrash2 /> Delete Brand
                      </button>
                    </div>
                  </div>

                  <div className="show-side-card">
                    <div className="show-detail-heading">Brand Logistics</div>
                    <div className="show-fact-row">
                      <span style={{ color: 'var(--text3)' }}>Weekly Day</span>
                      <strong style={{ color: show.color }}>{show.day}</strong>
                    </div>
                    <div className="show-fact-row">
                      <span style={{ color: 'var(--text3)' }}>Primary Color</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 6, background: show.color }} />
                        <strong>{show.color.toUpperCase()}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )
        })()}

      {(modal === 'add' || (modal && !modal.type)) && (
        <Modal title={modal === 'add' ? 'Establish New Brand' : 'Modify Brand Details'} onClose={closeModal}>
          <form onSubmit={handleSaveShow}>
            {(() => {
              const show = modal !== 'add' ? shows.find((item) => item.id === modal.id) : null

              return (
                <div style={{ minWidth: '400px' }}>
                  <div className="form-group">
                    <label>Show Name</label>
                    <input name="name" defaultValue={show?.name ?? ''} placeholder="e.g. Raw, Dynamite, NJPW Strong" autoFocus />
                  </div>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>Weekly Broadcast Day</label>
                      <select name="day" defaultValue={show?.day ?? 'Monday'}>
                        {DAY_NAMES.map((dayName) => (
                          <option key={dayName}>{dayName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Brand Identity Color</label>
                      <input name="color" type="color" defaultValue={show?.color ?? '#ff4d00'} style={{ padding: 4, height: 40 }} />
                    </div>
                  </div>
                  <div className="form-actions" style={{ marginTop: 24 }}>
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{modal === 'add' ? 'Establish Brand' : 'Save Changes'}</button>
                  </div>
                </div>
              )
            })()}
          </form>
        </Modal>
      )}

      {modal?.type === 'special' &&
        (() => {
          const show = shows.find((item) => item.id === modal.showId)
          const specialShow = specialShows.find((item) => item.id === modal.specialShowId)
          if (!show) return null

          return (
            <Modal title={specialShow ? 'Edit Special Event' : 'Schedule Special Event'} onClose={closeModal}>
              <form onSubmit={handleSaveSpecialShow}>
                <input type="hidden" name="showId" value={show.id} />

                <div className="form-group">
                  <label>Parent Brand</label>
                  <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, color: show.color, fontWeight: 800 }}>{show.name}</div>
                </div>

                <div className="form-group">
                  <label>Event Name</label>
                  <input name="name" defaultValue={specialShow?.name ?? ''} placeholder="e.g. Wrestle Kingdom, SummerSlam" autoFocus />
                </div>

                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>Recurrence Type</label>
                    <select name="type" defaultValue={specialShow?.type ?? 'annual'}>
                      <option value="annual">Annual Tradition</option>
                      <option value="one_off">One-Off Event</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Inception Year</label>
                    <input name="startYear" type="number" defaultValue={specialShow?.startYear ?? parseCurrentYear()} min="1" />
                  </div>
                </div>

                <div className="show-special-date-grid">
                  <div className="form-group">
                    <label>Scheduled Month</label>
                    <select name="month" defaultValue={specialShow?.month ?? 1}>
                      {MONTHS_FULL.map((monthName, index) => (
                        <option key={monthName} value={index + 1}>{monthName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Scheduled Day</label>
                    <input name="day" type="number" min="1" max="28" defaultValue={specialShow?.day ?? 1} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Fixed Date (One-Offs Only)</label>
                  <input name="oneOffDate" type="date" defaultValue={specialShow?.oneOffDate ?? ''} />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, fontStyle: 'italic' }}>
                    Annual events recurrence is calculated automatically based on Month/Day.
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{specialShow ? 'Save Changes' : 'Schedule Event'}</button>
                </div>
              </form>
            </Modal>
          )
        })()}
    </div>
  )
}
