import React, { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { addDays, DAY_NAMES, fmt, getCustomDow, MONTHS_FULL, parseDate, formatUniverseDate } from '../utils/dates.js'
import { getCalendarEventById, getCalendarEventsOnDate, specialShowOccursOnDate } from '../utils/calendarEvents.js'
import './Tournaments.css'

const PARTICIPANT_OPTIONS = [4, 8, 16, 32, 64]
const DEFAULT_FORM = {
  name: '',
  description: '',
  scope: 'universe',
  scopeShow: '',
  format: 'single_elimination',
  matchType: 'singles',
  participantCount: 8,
  prizeTitleId: '',
  selectedIds: [],
  search: '',
  brandFilter: 'all',
}

function getTournamentTypeLabel(matchType) {
  if (matchType === 'tag') return 'Tag Teams'
  if (matchType === 'trios') return 'Trios'
  return 'Singles'
}

function getEntryShow(entry) {
  return entry.show || 'Universe'
}

function formatTournamentBookingLabel(dateStr, showNames) {
  return `${formatUniverseDate(dateStr, { includeYear: false })} - ${showNames.join(' / ')}`
}

function getTournamentBookingOptionLabel(option) {
  if (!option?.date) return option?.label || ''
  const rawLabel = String(option.label || '')
  const showLabel = rawLabel
    .replace(`${option.date} â€¢ `, '')
    .replace(`${option.date} • `, '')
    .replace(`${option.date} - `, '')
    .trim()

  if (!showLabel) return rawLabel
  return formatTournamentBookingLabel(option.date, showLabel.split(' / ').map((name) => name.trim()).filter(Boolean))
}

export default function Tournaments({
  state,
  addTournament,
  deleteTournament,
  bookTournamentMatch,
  showToast,
}) {
  const { tournaments = [], wrestlers = [], teams = [], titles = [], shows = [], specialShows = [], matches = [], currentDate } = state
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [booking, setBooking] = useState(null)

  const wrestlerMap = useMemo(() => new Map(wrestlers.map((wrestler) => [wrestler.id, wrestler])), [wrestlers])
  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const availableShows = useMemo(() => [...new Set(shows.map((show) => show.name))].sort(), [shows])

  const resetForm = () => setForm({
    ...DEFAULT_FORM,
    scopeShow: shows[0]?.name || '',
  })

  useEffect(() => {
    if (modal === 'add') {
      resetForm()
    }
  }, [modal, shows])

  const getTeamMembersLabel = (team) => (team.memberIds || []).map((id) => wrestlerMap.get(id)?.name || 'Unknown').join(' / ')
  const getTeamShow = (team) => team.show || wrestlerMap.get(team.memberIds?.[0])?.show || 'Universe'

  const eligibleEntries = useMemo(() => {
    const scopeShow = form.scope === 'show' ? form.scopeShow : null
    const search = form.search.trim().toLowerCase()

    if (form.matchType === 'singles') {
      return wrestlers
        .filter((wrestler) => (wrestler.role || 'wrestler') === 'wrestler')
        .filter((wrestler) => !scopeShow || wrestler.show === scopeShow)
        .filter((wrestler) => form.brandFilter === 'all' || wrestler.show === form.brandFilter)
        .filter((wrestler) => !search || wrestler.name.toLowerCase().includes(search))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((wrestler) => ({
          id: wrestler.id,
          label: wrestler.name,
          show: wrestler.show || 'Universe',
          meta: `${wrestler.align || 'Neutral'} • ${wrestler.show || 'Universe'}`,
        }))
    }

    const neededType = form.matchType === 'tag' ? 'tag' : 'trio'
    return teams
      .filter((team) => team.type === neededType)
      .filter((team) => !scopeShow || getTeamShow(team) === scopeShow)
      .filter((team) => form.brandFilter === 'all' || getTeamShow(team) === form.brandFilter)
      .filter((team) => !search || team.name.toLowerCase().includes(search) || getTeamMembersLabel(team).toLowerCase().includes(search))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((team) => ({
        id: team.id,
        label: team.name,
        show: getTeamShow(team),
        meta: getTeamMembersLabel(team),
      }))
  }, [form, wrestlers, teams, wrestlerMap])

  const getEntryLabel = (tournament, entryId) => tournament.entries.find((entry) => entry.id === entryId)?.label || 'TBD'

  const bookingOptions = useMemo(() => {
    if (!booking) return []
    const tournament = tournaments.find((item) => item.id === booking.tournamentId)
    if (!tournament) return []

    const relevantShows = tournament.scope === 'show'
      ? shows.filter((show) => show.name === tournament.scopeShow)
      : shows

    const dates = []
    for (let i = 0; i < 140; i += 1) {
      const date = fmt(addDays(currentDate, i))
      const weekly = relevantShows.filter((show) => show.day === DAY_NAMES[getCustomDow(date)])
      const events = specialShows.filter((specialShow) => {
        if (!specialShowOccursOnDate(specialShow, date)) return false
        return relevantShows.some((show) => show.id === specialShow.showId)
      })
      const labels = [
        ...weekly.map((show) => show.name),
        ...events.map((specialShow) => specialShow.name),
      ]
      if (labels.length > 0) {
        dates.push({ date, label: `${date} • ${labels.join(' / ')}` })
      }
    }
    return dates
  }, [booking, currentDate, shows, specialShows, tournaments])

  const handleToggleEntry = (entryId) => {
    setForm((current) => {
      const isSelected = current.selectedIds.includes(entryId)
      if (isSelected) {
        return { ...current, selectedIds: current.selectedIds.filter((id) => id !== entryId) }
      }
      if (current.selectedIds.length >= current.participantCount) {
        showToast(`This bracket already has ${current.participantCount} entries selected`)
        return current
      }
      return { ...current, selectedIds: [...current.selectedIds, entryId] }
    })
  }

  const handleCreateTournament = () => {
    if (!form.name.trim()) {
      showToast('Enter a tournament name')
      return
    }
    if (form.scope === 'show' && !form.scopeShow) {
      showToast('Choose a show for this tournament')
      return
    }
    if (form.selectedIds.length !== form.participantCount) {
      showToast(`Select exactly ${form.participantCount} participants`)
      return
    }

    addTournament({
      name: form.name,
      description: form.description,
      scope: form.scope,
      scopeShow: form.scopeShow || 'Universe',
      format: form.format,
      matchType: form.matchType,
      prizeTitleId: form.prizeTitleId || null,
      participantSourceIds: form.selectedIds,
    })
    showToast(`${form.name.trim()} created`)
    setModal(null)
  }

  const openBookingModal = (tournamentId, roundIndex, matchId) => {
    setBooking({
      tournamentId,
      roundIndex,
      matchId,
      date: currentDate,
      eventId: '',
    })
  }

  useEffect(() => {
    if (!booking || bookingOptions.length === 0) return
    setBooking((current) => {
      if (!current) return current
      if (bookingOptions.some((option) => option.date === current.date)) return current
      return { ...current, date: bookingOptions[0].date }
    })
  }, [bookingOptions, booking])

  const handleConfirmBooking = () => {
    if (!booking?.date) {
      showToast('Choose a calendar date')
      return
    }
    if (!booking?.eventId) {
      showToast('Choose which event card should host this tournament match')
      return
    }
    bookTournamentMatch(booking.tournamentId, booking.roundIndex, booking.matchId, booking.date, booking.eventId)
    showToast('Tournament match booked to the calendar')
    setBooking(null)
  }

  const bookingEventOptions = useMemo(() => {
    if (!booking?.date) return []
    const tournament = tournaments.find((item) => item.id === booking.tournamentId)
    if (!tournament) return []

    const relevantShows = tournament.scope === 'show'
      ? shows.filter((show) => show.name === tournament.scopeShow)
      : shows
    const relevantShowIds = new Set(relevantShows.map((show) => show.id))
    const relevantSpecialShows = specialShows.filter((specialShow) => relevantShowIds.has(specialShow.showId))

    return getCalendarEventsOnDate(booking.date, relevantShows, relevantSpecialShows)
  }, [booking, tournaments, shows, specialShows])

  useEffect(() => {
    if (!booking) return
    if (bookingEventOptions.length === 0) return
    setBooking((current) => {
      if (!current) return current
      if (bookingEventOptions.some((option) => option.id === current.eventId)) return current
      return { ...current, eventId: bookingEventOptions[0].id }
    })
  }, [booking, bookingEventOptions])

  const TournamentCard = ({ tournament }) => {
    const champion = tournament.entries.find((entry) => entry.id === tournament.championEntryId) || null
    const bookedCount = tournament.rounds.flatMap((round) => round.matches).filter((match) => match.bookedMatchId).length
    const resolvedCount = tournament.rounds.flatMap((round) => round.matches).filter((match) => match.winnerEntryId).length
    const accent = tournament.scope === 'show'
      ? shows.find((show) => show.name === tournament.scopeShow)?.color || 'var(--primary)'
      : 'var(--primary)'

    return (
      <div className="tournament-card" onClick={() => setModal({ type: 'detail', id: tournament.id })}>
        <div className="tournament-card-accent" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <div className="tournament-card-badges">
          <span className="tournament-card-badge" style={{ background: `${accent}22`, color: accent, borderColor: `${accent}44` }}>
            {getTournamentTypeLabel(tournament.matchType)}
          </span>
          <span className="tournament-card-badge tournament-card-badge-muted">
            {tournament.scope === 'show' ? tournament.scopeShow : 'Universe-wide'}
          </span>
        </div>
        <h3 className="tournament-card-name">{tournament.name}</h3>
        <div className="tournament-card-copy">
          {tournament.description || `${tournament.entries.length} entries fighting through ${tournament.rounds.length} round${tournament.rounds.length !== 1 ? 's' : ''}.`}
        </div>
        <div className="tournament-card-highlights">
          <span className="badge badge-gray">Entries: {tournament.entries.length}</span>
          <span className="badge badge-gray">Booked: {bookedCount}</span>
          <span className="badge badge-gray">Decided: {resolvedCount}</span>
        </div>
        <div className="tournament-card-footer">
          <div>
            <div className="tournament-card-stat">{tournament.rounds.length}</div>
            <div className="tournament-card-stat-label">Rounds</div>
          </div>
          <div>
            <div className="tournament-card-stat">{champion ? champion.label : 'TBD'}</div>
            <div className="tournament-card-stat-label">Winner</div>
          </div>
          <div className="tournament-card-open" style={{ color: accent }}>View Bracket</div>
        </div>
      </div>
    )
  }

  return (
    <div className="tournaments-page">
      <div className="page-header">
        <h1 className="page-title">Tournaments</h1>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          + Create Tournament
        </button>
      </div>

      <div className="tournaments-grid">
        {tournaments.length === 0 && (
          <div className="card tournament-empty-state">
            <div className="tournament-section-label">No tournaments yet</div>
            <p>Create a bracket, then book each tournament match straight from its bracket card to the calendar.</p>
          </div>
        )}
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>

      {modal === 'add' && (
        <Modal title="Create Tournament" onClose={() => setModal(null)} style={{ maxWidth: '1080px' }}>
          <div className="tournament-modal-shell">
            <div className="tournament-modal-main">
              <div className="tournament-form-grid">
                <div className="form-group">
                  <label>Tournament Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value.slice(0, 60) }))}
                    placeholder="e.g. King of the Ring"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((current) => ({ ...current, description: e.target.value.slice(0, 500) }))}
                    placeholder="Annual battle for supremacy..."
                  />
                </div>
              </div>

              <div className="tournament-modal-card">
                <div className="tournament-section-label">Setup</div>
                <div className="tournament-form-grid tournament-form-grid-compact">
                  <div className="form-group">
                    <label>Tournament Scope</label>
                    <select
                      value={form.scope}
                      onChange={(e) => setForm((current) => ({ ...current, scope: e.target.value, selectedIds: [] }))}
                    >
                      <option value="universe">Universe-wide</option>
                      <option value="show">Specific Show</option>
                    </select>
                  </div>

                  {form.scope === 'show' && (
                    <div className="form-group">
                      <label>Show</label>
                      <select
                        value={form.scopeShow}
                        onChange={(e) => setForm((current) => ({ ...current, scopeShow: e.target.value, selectedIds: [] }))}
                      >
                        <option value="">Choose a show</option>
                        {shows.map((show) => (
                          <option key={show.id} value={show.name}>{show.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Format</label>
                    <input value="Single Elimination" disabled />
                  </div>

                  <div className="form-group">
                    <label>Prize (Optional)</label>
                    <select
                      value={form.prizeTitleId}
                      onChange={(e) => setForm((current) => ({ ...current, prizeTitleId: e.target.value }))}
                    >
                      <option value="">None</option>
                      {titles.map((title) => (
                        <option key={title.id} value={title.id}>{title.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="tournament-inline-group">
                  <div className="tournament-inline-label">Match Type</div>
                  <div className="tournament-pill-row">
                    {[
                      { value: 'singles', label: 'Singles' },
                      { value: 'tag', label: 'Tag Teams' },
                      { value: 'trios', label: 'Trios' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`tournament-pill${form.matchType === option.value ? ' active' : ''}`}
                        onClick={() => setForm((current) => ({ ...current, matchType: option.value, selectedIds: [] }))}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tournament-inline-group">
                  <div className="tournament-inline-label">Number of Participants</div>
                  <div className="tournament-pill-row">
                    {PARTICIPANT_OPTIONS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={`tournament-pill${form.participantCount === count ? ' active' : ''}`}
                        onClick={() => setForm((current) => ({ ...current, participantCount: count, selectedIds: current.selectedIds.slice(0, count) }))}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tournament-modal-card">
                <div className="tournament-card-head">
                  <div>
                    <div className="tournament-section-label">Select Participants</div>
                    <div className="tournament-helper-copy">{form.selectedIds.length}/{form.participantCount} selected</div>
                  </div>
                </div>

                <div className="tournament-form-grid tournament-form-grid-compact">
                  <div className="form-group">
                    <label>Search</label>
                    <input
                      value={form.search}
                      onChange={(e) => setForm((current) => ({ ...current, search: e.target.value }))}
                      placeholder={form.matchType === 'singles' ? 'Search wrestlers...' : 'Search teams...'}
                    />
                  </div>
                  <div className="form-group">
                    <label>Brand Filter</label>
                    <select
                      value={form.brandFilter}
                      onChange={(e) => setForm((current) => ({ ...current, brandFilter: e.target.value }))}
                    >
                      <option value="all">All Brands</option>
                      {availableShows.map((showName) => (
                        <option key={showName} value={showName}>{showName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="tournament-entry-grid">
                  {eligibleEntries.length === 0 && (
                    <div className="tournament-empty-picker">
                      No eligible {form.matchType === 'singles' ? 'wrestlers' : 'teams'} match this setup yet.
                    </div>
                  )}
                  {eligibleEntries.map((entry) => {
                    const selected = form.selectedIds.includes(entry.id)
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className={`tournament-entry-card${selected ? ' selected' : ''}`}
                        onClick={() => handleToggleEntry(entry.id)}
                      >
                        <div className="tournament-entry-main">
                          <div className="tournament-entry-name">{entry.label}</div>
                          <div className="tournament-entry-meta">{entry.meta}</div>
                        </div>
                        <span className="tournament-entry-show">{getEntryShow(entry)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="tournament-modal-side">
              <div className="tournament-modal-card">
                <div className="tournament-section-label">Bracket Snapshot</div>
                <div className="tournament-fact-row"><span>Format</span><strong>Single Elimination</strong></div>
                <div className="tournament-fact-row"><span>Type</span><strong>{getTournamentTypeLabel(form.matchType)}</strong></div>
                <div className="tournament-fact-row"><span>Entries</span><strong>{form.participantCount}</strong></div>
                <div className="tournament-fact-row"><span>Scope</span><strong>{form.scope === 'show' ? (form.scopeShow || 'Pick a show') : 'Universe-wide'}</strong></div>
              </div>

              <div className="tournament-modal-card">
                <div className="tournament-section-label">Selected</div>
                {form.selectedIds.length === 0 ? (
                  <div className="tournament-helper-copy">Nothing selected yet.</div>
                ) : (
                  <div className="tournament-chip-list">
                    {form.selectedIds.map((selectedId) => {
                      const entry = eligibleEntries.find((item) => item.id === selectedId)
                        || (form.matchType === 'singles'
                          ? wrestlers.find((wrestler) => wrestler.id === selectedId) && {
                              id: selectedId,
                              label: wrestlers.find((wrestler) => wrestler.id === selectedId)?.name,
                            }
                          : teams.find((team) => team.id === selectedId) && {
                              id: selectedId,
                              label: teams.find((team) => team.id === selectedId)?.name,
                            })
                      return (
                        <span key={selectedId} className="tournament-chip">
                          {entry?.label || 'Unknown'}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreateTournament}>
              Create Tournament
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === 'detail' &&
        (() => {
          const tournament = tournaments.find((item) => item.id === modal.id)
          if (!tournament) return null

          const accent = tournament.scope === 'show'
            ? shows.find((show) => show.name === tournament.scopeShow)?.color || 'var(--primary)'
            : 'var(--primary)'
          const champion = tournament.entries.find((entry) => entry.id === tournament.championEntryId) || null

          return (
            <Modal title={tournament.name} onClose={() => setModal(null)} style={{ maxWidth: '1200px' }}>
              <div className="tournament-detail-shell">
                <div className="tournament-detail-main">
                  <div className="tournament-detail-hero">
                    <div className="tournament-card-badges">
                      <span className="tournament-card-badge" style={{ background: `${accent}22`, color: accent, borderColor: `${accent}44` }}>
                        {getTournamentTypeLabel(tournament.matchType)}
                      </span>
                      <span className="tournament-card-badge tournament-card-badge-muted">
                        {tournament.scope === 'show' ? tournament.scopeShow : 'Universe-wide'}
                      </span>
                    </div>
                    <div className="tournament-detail-copy">
                      {tournament.description || 'Book bracket matches directly to the calendar and let results advance the field automatically.'}
                    </div>
                  </div>

                  <div className="tournament-detail-stats">
                    {[
                      { label: 'Entries', value: tournament.entries.length },
                      { label: 'Rounds', value: tournament.rounds.length },
                      { label: 'Booked Matches', value: tournament.rounds.flatMap((round) => round.matches).filter((match) => match.bookedMatchId).length },
                      { label: 'Resolved Matches', value: tournament.rounds.flatMap((round) => round.matches).filter((match) => match.winnerEntryId).length },
                    ].map((item) => (
                      <div key={item.label} className="tournament-detail-stat-card">
                        <div className="tournament-detail-stat-value" style={{ color: accent }}>{item.value}</div>
                        <div className="tournament-detail-stat-label">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="tournament-bracket-scroll">
                    <div className="tournament-bracket-grid">
                      {tournament.rounds.map((round, roundIndex) => (
                        <div key={round.label + roundIndex} className="tournament-round-column">
                          <div className="tournament-round-title">{round.label}</div>
                          <div className="tournament-round-stack">
                            {round.matches.map((match, matchIndex) => {
                              const sideALabel = getEntryLabel(tournament, match.sideAEntryId)
                              const sideBLabel = getEntryLabel(tournament, match.sideBEntryId)
                              const winnerLabel = match.winnerEntryId ? getEntryLabel(tournament, match.winnerEntryId) : null
                              const bookedMatch = matches.find((calendarMatch) => calendarMatch.id === match.bookedMatchId) || null
                              const bookedEvent = bookedMatch
                                ? getCalendarEventById(bookedMatch.date, bookedMatch.eventId, shows, specialShows)
                                : null
                              const canBook = Boolean(match.sideAEntryId && match.sideBEntryId && !match.winnerEntryId && !match.bookedMatchId)

                              return (
                                <div key={match.id} className="tournament-bracket-card">
                                  <div className="tournament-bracket-meta">Match {matchIndex + 1}</div>
                                  <div className={`tournament-entrant${match.winnerEntryId === match.sideAEntryId ? ' winner' : ''}`}>{sideALabel}</div>
                                  <div className="tournament-versus">vs</div>
                                  <div className={`tournament-entrant${match.winnerEntryId === match.sideBEntryId ? ' winner' : ''}`}>{sideBLabel}</div>

                                  {winnerLabel && (
                                    <div className="tournament-result-line">Winner: {winnerLabel}</div>
                                  )}

                                  {bookedMatch && !winnerLabel && (
                                    <div className="tournament-booked-block">
                                      <div className="tournament-booked-badge">Booked To Calendar</div>
                                      <div className="tournament-result-subtle">
                                        {bookedEvent ? `${bookedEvent.name} - ${formatUniverseDate(bookedMatch.date)}` : `Booked for ${formatUniverseDate(bookedMatch.date)}`}
                                      </div>
                                    </div>
                                  )}

                                  {!bookedMatch && !winnerLabel && !canBook && (
                                    <div className="tournament-result-subtle">Waiting for the previous round</div>
                                  )}

                                  {canBook && (
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      onClick={() => openBookingModal(tournament.id, roundIndex, match.id)}
                                    >
                                      Book To Calendar
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="tournament-detail-side">
                  <div className="tournament-modal-card">
                    <div className="tournament-section-label">Tournament Actions</div>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        deleteTournament(tournament.id)
                        showToast('Tournament deleted')
                        setModal(null)
                      }}
                    >
                      Delete Tournament
                    </button>
                  </div>

                  <div className="tournament-modal-card">
                    <div className="tournament-section-label">Quick Facts</div>
                    <div className="tournament-fact-row"><span>Winner</span><strong>{champion?.label || 'TBD'}</strong></div>
                    <div className="tournament-fact-row"><span>Prize</span><strong>{titles.find((title) => title.id === tournament.prizeTitleId)?.name || 'None'}</strong></div>
                    <div className="tournament-fact-row"><span>Created</span><strong>{formatUniverseDate(tournament.createdAt)}</strong></div>
                    <div className="tournament-fact-row"><span>Status</span><strong>{tournament.status === 'complete' ? 'Complete' : 'Active'}</strong></div>
                  </div>
                </div>
              </div>
            </Modal>
          )
        })()}

      {booking && (
        <Modal title="Book Tournament Match" onClose={() => setBooking(null)}>
          <div className="form-group">
            <label>Calendar Date</label>
            <select value={booking.date} onChange={(e) => setBooking((current) => ({ ...current, date: e.target.value }))}>
              {bookingOptions.map((option) => (
                <option key={option.date} value={option.date}>{getTournamentBookingOptionLabel(option)}</option>
              ))}
            </select>
          </div>

          {bookingOptions.length > 0 && (
            <div className="form-group">
              <label>Event Card</label>
              <select value={booking.eventId || ''} onChange={(e) => setBooking((current) => ({ ...current, eventId: e.target.value }))}>
                <option value="">Choose an event card</option>
                {bookingEventOptions.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.kind === 'special' ? `${event.name} Event (${event.brandName})` : event.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {bookingOptions.length === 0 && (
            <div className="tournament-helper-copy" style={{ marginBottom: 16 }}>
              No eligible show dates were found yet for this tournament scope.
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setBooking(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirmBooking} disabled={bookingOptions.length === 0}>
              Book Match
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
