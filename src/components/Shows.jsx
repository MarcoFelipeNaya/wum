import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { MONTHS_FULL } from '../utils/dates.js'
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
  return `Every ${MONTHS_FULL[specialShow.month - 1]} ${specialShow.day} from ${specialShow.startYear}`
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
    const annualEvents = brandSpecialShows.filter((specialShow) => specialShow.type === 'annual')
    const oneOffEvents = brandSpecialShows.filter((specialShow) => specialShow.type === 'one_off')

    return {
      roster,
      brandTitles,
      crownedTitles,
      bookedMatches,
      completedMatches,
      relatedStories,
      brandSpecialShows,
      annualEvents,
      oneOffEvents,
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

        <div className="show-card-header">
          <div className="show-card-header-main">
            <div className="show-card-badges">
              <span className="show-card-badge" style={{ background: `${show.color}22`, color: show.color, borderColor: `${show.color}44` }}>
                {show.day}
              </span>
              <span className="show-card-badge show-card-badge-muted">Brand</span>
            </div>
            <h3 className="show-card-name" style={{ color: show.color }}>{show.name}</h3>
          </div>
        </div>

        <div className="show-card-summary">
          <div className="show-card-section-label">At A Glance</div>
          <div className="show-card-subtle">
            {stats.roster.length} wrestlers, {stats.brandTitles.length} title{stats.brandTitles.length !== 1 ? 's' : ''}, {stats.brandSpecialShows.length} special event{stats.brandSpecialShows.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="show-card-highlights">
          <span className="badge" style={{ background: `${show.color}1f`, color: show.color, border: `1px solid ${show.color}55`, boxShadow: 'none' }}>
            Roster: {stats.roster.length}
          </span>
          <span className="badge badge-gray">Titles: {stats.brandTitles.length}</span>
          <span className="badge badge-gray">Events: {stats.brandSpecialShows.length}</span>
        </div>

        <div className="show-card-footer">
          <div>
            <div className="show-card-stat">{stats.completedMatches.length}</div>
            <div className="show-card-stat-label">Completed</div>
          </div>
          <div>
            <div className="show-card-stat">{stats.crownedTitles.length}</div>
            <div className="show-card-stat-label">Champions</div>
          </div>
          <div className="show-card-open" style={{ color: show.color }}>View Details</div>
        </div>
      </div>
    )
  }

  return (
    <div className="shows-page">
      <div className="page-header">
        <h1 className="page-title">Shows & Brands</h1>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          + Add Show
        </button>
      </div>

      <div className="shows-compact-grid">
        {shows.length === 0 && (
          <div className="empty-state card" style={{ gridColumn: '1 / -1' }}>
            <p>No shows yet. Create your first brand!</p>
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
            <Modal title={show.name} onClose={closeModal} style={{ maxWidth: '980px' }}>
              <div className="show-detail-shell">
                <div className="show-detail-main">
                  <div className="show-detail-meta-row">
                    <span className="show-card-badge" style={{ background: `${show.color}22`, color: show.color, borderColor: `${show.color}44` }}>
                      {show.day}
                    </span>
                    <span className="show-card-badge show-card-badge-muted">Brand</span>
                  </div>

                  <div className="show-detail-current">
                    <div className="show-detail-heading">Show Snapshot</div>
                    <div className="show-detail-brand" style={{ color: show.color }}>{show.name}</div>
                    <div className="show-detail-subtle">
                      Runs every {show.day} with {stats.roster.length} assigned wrestlers, {stats.brandTitles.length} brand title{stats.brandTitles.length !== 1 ? 's' : ''}, and {stats.brandSpecialShows.length} special event{stats.brandSpecialShows.length !== 1 ? 's' : ''}.
                    </div>
                  </div>

                  <div className="show-detail-stats-grid">
                    {[
                      { label: 'Roster Size', value: stats.roster.length },
                      { label: 'Brand Titles', value: stats.brandTitles.length },
                      { label: 'Crowned Champions', value: stats.crownedTitles.length },
                      { label: 'Annual Specials', value: stats.annualEvents.length },
                      { label: 'One-Off Specials', value: stats.oneOffEvents.length },
                      { label: 'Related Stories', value: stats.relatedStories.length },
                    ].map((item) => (
                      <div key={item.label} className="show-detail-stat-card">
                        <div className="show-detail-stat-value" style={{ color: show.color }}>{item.value}</div>
                        <div className="show-detail-stat-label">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="show-detail-section">
                    <div className="show-detail-section-head">
                      <div className="show-detail-heading">Special Events</div>
                      <button className="btn btn-primary btn-sm" onClick={() => openSpecialModal(show)}>
                        + Add Special Show
                      </button>
                    </div>
                    {stats.brandSpecialShows.length === 0 ? (
                      <div className="show-detail-empty">No special events tied to this brand yet.</div>
                    ) : (
                      <div className="show-detail-list">
                        {stats.brandSpecialShows.map((specialShow) => (
                          <div key={specialShow.id} className="show-detail-list-row">
                            <div>
                              <div className="show-detail-list-title">{specialShow.name}</div>
                              <div className="show-detail-list-subtle">{formatSpecialSchedule(specialShow)}</div>
                            </div>
                            <div className="show-detail-inline-actions">
                              <span className="badge" style={{ background: `${show.color}1f`, color: show.color, border: `1px solid ${show.color}55`, boxShadow: 'none' }}>
                                {specialShow.type === 'annual' ? 'Annual' : 'One-Off'}
                              </span>
                              <button className="btn btn-secondary btn-sm" onClick={() => openSpecialModal(show, specialShow)}>
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                  deleteSpecialShow(specialShow.id)
                                  showToast('Special show removed')
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="show-detail-section">
                    <div className="show-detail-heading">Championships</div>
                    {stats.brandTitles.length === 0 ? (
                      <div className="show-detail-empty">No championships assigned to this show.</div>
                    ) : (
                      <div className="show-detail-list">
                        {stats.brandTitles.map((title) => (
                          <div key={title.id} className="show-detail-list-row">
                            <div>
                              <div className="show-detail-list-title">{title.name}</div>
                              <div className="show-detail-list-subtle">
                                {getChampIds(title).length > 0
                                  ? getChampIds(title).map((id) => getWrestler(id)?.name ?? 'Unknown').join(' / ')
                                  : 'Vacant'}
                              </div>
                            </div>
                            <span className="badge" style={{ background: `${show.color}1f`, color: show.color, border: `1px solid ${show.color}55`, boxShadow: 'none' }}>
                              {title.type || 'singles'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="show-detail-side">
                  <div className="show-side-card">
                    <div className="show-detail-heading">Show Actions</div>
                    <button className="btn btn-primary" onClick={() => openShowEdit(show)}>
                      Edit Show
                    </button>
                    <button className="btn btn-secondary" onClick={() => openSpecialModal(show)}>
                      Add Special Show
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        deleteShow(show.id)
                        showToast('Show removed')
                        closeModal()
                      }}
                    >
                      Delete Show
                    </button>
                  </div>

                  <div className="show-side-card">
                    <div className="show-detail-heading">Quick Facts</div>
                    <div className="show-fact-row">
                      <span>Weekly Day</span>
                      <strong>{show.day}</strong>
                    </div>
                    <div className="show-fact-row">
                      <span>Roster</span>
                      <strong>{stats.roster.length}</strong>
                    </div>
                    <div className="show-fact-row">
                      <span>Booked Matches</span>
                      <strong>{stats.bookedMatches.length}</strong>
                    </div>
                    <div className="show-fact-row">
                      <span>Special Events</span>
                      <strong>{stats.brandSpecialShows.length}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )
        })()}

      {modal && modal !== 'add' && !modal.type && (
        <Modal title="Edit Show" onClose={closeModal}>
          <form onSubmit={handleSaveShow}>
            {(() => {
              const show = shows.find((item) => item.id === modal.id)

              return (
                <>
                  <div className="form-group">
                    <label>Show Name</label>
                    <input name="name" defaultValue={show?.name ?? ''} placeholder="e.g. Raw, SmackDown" autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Day</label>
                    <select name="day" defaultValue={show?.day ?? 'Monday'}>
                      {DAY_NAMES.map((dayName) => (
                        <option key={dayName}>{dayName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Brand Color</label>
                    <input name="color" type="color" defaultValue={show?.color ?? '#c0392b'} />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save
                    </button>
                  </div>
                </>
              )
            })()}
          </form>
        </Modal>
      )}

      {modal === 'add' && (
        <Modal title="Add Show" onClose={closeModal}>
          <form onSubmit={handleSaveShow}>
            <div className="form-group">
              <label>Show Name</label>
              <input name="name" placeholder="e.g. Raw, SmackDown" autoFocus />
            </div>
            <div className="form-group">
              <label>Day</label>
              <select name="day" defaultValue="Monday">
                {DAY_NAMES.map((dayName) => (
                  <option key={dayName}>{dayName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Brand Color</label>
              <input name="color" type="color" defaultValue="#c0392b" />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'special' &&
        (() => {
          const show = shows.find((item) => item.id === modal.showId)
          const specialShow = specialShows.find((item) => item.id === modal.specialShowId)
          if (!show) return null

          return (
            <Modal title={specialShow ? 'Edit Special Show' : 'Add Special Show'} onClose={closeModal}>
              <form onSubmit={handleSaveSpecialShow}>
                <input type="hidden" name="showId" value={show.id} />

                <div className="form-group">
                  <label>Parent Show</label>
                  <input value={show.name} disabled />
                </div>

                <div className="form-group">
                  <label>Event Name</label>
                  <input name="name" defaultValue={specialShow?.name ?? ''} placeholder="e.g. Wrestle Kingdom" autoFocus />
                </div>

                <div className="form-group">
                  <label>Event Type</label>
                  <select name="type" defaultValue={specialShow?.type ?? 'annual'}>
                    <option value="annual">Annual</option>
                    <option value="one_off">One-Off</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Annual Event Start Year</label>
                  <input name="startYear" type="number" defaultValue={specialShow?.startYear ?? parseCurrentYear()} min="1" />
                </div>

                <div className="show-special-date-grid">
                  <div className="form-group">
                    <label>Month</label>
                    <select name="month" defaultValue={specialShow?.month ?? 1}>
                      {MONTHS_FULL.map((monthName, index) => (
                        <option key={monthName} value={index + 1}>{monthName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Day</label>
                    <input name="day" type="number" min="1" max="28" defaultValue={specialShow?.day ?? 1} />
                  </div>
                </div>

                <div className="form-group">
                  <label>One-Off Date</label>
                  <input name="oneOffDate" type="date" defaultValue={specialShow?.oneOffDate ?? ''} />
                  <div className="show-special-help">
                    Fill this for one-off events. Annual events use month/day every year from the chosen start year onward.
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {specialShow ? 'Save' : 'Create'}
                  </button>
                </div>
              </form>
            </Modal>
          )
        })()}
    </div>
  )
}
