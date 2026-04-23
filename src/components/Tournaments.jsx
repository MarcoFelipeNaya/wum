import React, { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { addDays, DAY_NAMES, fmt, getCustomDow, formatUniverseDate } from '../utils/dates.js'
import { getCalendarEventById, getCalendarEventsOnDate, specialShowOccursOnDate } from '../utils/calendarEvents.js'
import { FiAward, FiUsers, FiLayers, FiActivity, FiSearch, FiPlus, FiCalendar, FiTarget, FiStar, FiChevronRight, FiEdit3, FiTrash2 } from 'react-icons/fi'
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
        showToast(`Limit reached: ${current.participantCount} entries`)
        return current
      }
      return { ...current, selectedIds: [...current.selectedIds, entryId] }
    })
  }

  const handleCreateTournament = () => {
    if (!form.name.trim()) { showToast('Enter name'); return; }
    if (form.scope === 'show' && !form.scopeShow) { showToast('Choose brand'); return; }
    if (form.selectedIds.length !== form.participantCount) { showToast(`Select ${form.participantCount} entries`); return; }

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
    showToast(`${form.name.trim()} initialized`)
    setModal(null)
  }

  const openBookingModal = (tournamentId, roundIndex, matchId) => {
    setBooking({ tournamentId, roundIndex, matchId, date: currentDate, eventId: '' })
  }

  const handleConfirmBooking = () => {
    if (!booking?.date || !booking?.eventId) { showToast('Incomplete booking info'); return; }
    bookTournamentMatch(booking.tournamentId, booking.roundIndex, booking.matchId, booking.date, booking.eventId)
    showToast('Match scheduled')
    setBooking(null)
  }

  const bookingEventOptions = useMemo(() => {
    if (!booking?.date) return []
    const tournament = tournaments.find((item) => item.id === booking.tournamentId)
    if (!tournament) return []
    const relevantShows = tournament.scope === 'show' ? shows.filter((s) => s.name === tournament.scopeShow) : shows
    const relevantShowIds = new Set(relevantShows.map((s) => s.id))
    const relevantSpecialShows = specialShows.filter((s) => relevantShowIds.has(s.showId))
    return getCalendarEventsOnDate(booking.date, relevantShows, relevantSpecialShows)
  }, [booking, tournaments, shows, specialShows])

  const TournamentCard = ({ tournament }) => {
    const champion = tournament.entries.find((entry) => entry.id === tournament.championEntryId) || null
    const bookedCount = tournament.rounds.flatMap((round) => round.matches).filter((match) => match.bookedMatchId).length
    const resolvedCount = tournament.rounds.flatMap((round) => round.matches).filter((match) => match.winnerEntryId).length
    const accent = tournament.scope === 'show' ? shows.find((s) => s.name === tournament.scopeShow)?.color || 'var(--primary)' : 'var(--primary)'

    return (
      <div className="tournament-card" onClick={() => setModal({ type: 'detail', id: tournament.id })}>
        <div className="tournament-card-accent" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <div className="tournament-card-badges">
          <span className="tournament-card-badge" style={{ background: `${accent}15`, color: accent }}>{getTournamentTypeLabel(tournament.matchType)}</span>
          <span className="tournament-card-badge" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>{tournament.scope === 'show' ? tournament.scopeShow : 'Universe'}</span>
        </div>
        <h3 className="tournament-card-name">{tournament.name}</h3>
        <p className="tournament-card-copy">{tournament.description || 'Tournament Bracket'}</p>
        
        <div className="tournament-card-footer">
          <div className="tournament-card-stat-group">
            <div className="tournament-card-stat">{tournament.entries.length}</div>
            <div className="tournament-card-stat-label">Field</div>
          </div>
          <div className="tournament-card-stat-group">
            <div className="tournament-card-stat">{resolvedCount}/{tournament.rounds.flatMap(r => r.matches).length}</div>
            <div className="tournament-card-stat-label">Progress</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: accent, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
            Bracket <FiChevronRight />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tournaments-page">
      <div className="page-header">
        <h1 className="page-title">Tournament Central</h1>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <FiPlus /> New Bracket
        </button>
      </div>

      <div className="tournaments-grid">
        {tournaments.length === 0 && (
          <div className="card tournament-empty-state" style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center' }}>
            <FiAward style={{ fontSize: 48, opacity: 0.1, marginBottom: 16 }} />
            <p>No active brackets. Commision a new tournament to start the hunt for gold.</p>
          </div>
        )}
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>

      {modal === 'add' && (
        <Modal title="Establish Tournament Bracket" onClose={() => setModal(null)} style={{ maxWidth: '1100px' }}>
          <div className="tournament-modal-shell">
            <div className="tournament-modal-main">
              <div className="form-group">
                <label>Bracket Name</label>
                <input value={form.name} onChange={(e) => setForm(c => ({ ...c, name: e.target.value }))} placeholder="e.g. G1 Climax, King of the Ring" autoFocus />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label>Governing Brand</label>
                  <select value={form.scope} onChange={(e) => setForm(c => ({ ...c, scope: e.target.value, selectedIds: [] }))}>
                    <option value="universe">Universe-wide</option>
                    <option value="show">Brand Exclusive</option>
                  </select>
                </div>
                {form.scope === 'show' && (
                  <div className="form-group">
                    <label>Select Brand</label>
                    <select value={form.scopeShow} onChange={(e) => setForm(c => ({ ...c, scopeShow: e.target.value, selectedIds: [] }))}>
                      {shows.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label>Talent Class</label>
                  <div className="tournament-pill-row">
                    {['singles', 'tag', 'trios'].map(t => (
                      <button key={t} className={`tournament-pill ${form.matchType === t ? 'active' : ''}`} onClick={() => setForm(c => ({ ...c, matchType: t, selectedIds: [] }))}>
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Field Size</label>
                  <div className="tournament-pill-row">
                    {PARTICIPANT_OPTIONS.map(n => (
                      <button key={n} className={`tournament-pill ${form.participantCount === n ? 'active' : ''}`} onClick={() => setForm(c => ({ ...c, participantCount: n, selectedIds: [] }))}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tournament-modal-card">
                <div className="tournament-section-label">Field Selection ({form.selectedIds.length}/{form.participantCount})</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <input value={form.search} onChange={e => setForm(c => ({ ...c, search: e.target.value }))} placeholder="Search talent..." />
                  <select value={form.brandFilter} onChange={e => setForm(c => ({ ...c, brandFilter: e.target.value }))}>
                    <option value="all">All Brands</option>
                    {availableShows.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="tournament-entry-grid">
                  {eligibleEntries.map(entry => (
                    <div key={entry.id} className={`tournament-entry-card ${form.selectedIds.includes(entry.id) ? 'selected' : ''}`} onClick={() => handleToggleEntry(entry.id)}>
                      <span className="tournament-entry-name">{entry.label}</span>
                      <span className="tournament-entry-meta">{entry.show}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="tournament-modal-side">
              <div className="tournament-modal-card">
                <div className="tournament-section-label">Selected Field</div>
                <div className="tournament-chip-list">
                  {form.selectedIds.map(id => (
                    <span key={id} className="tournament-chip">{eligibleEntries.find(e => e.id === id)?.label || '...'}</span>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleCreateTournament} style={{ height: 50, fontSize: 14 }}>
                Initialize Bracket
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'detail' &&
        (() => {
          const tournament = tournaments.find(t => t.id === modal.id)
          if (!tournament) return null
          const accent = tournament.scope === 'show' ? shows.find(s => s.name === tournament.scopeShow)?.color || 'var(--primary)' : 'var(--primary)'
          const champion = tournament.entries.find(e => e.id === tournament.championEntryId)

          return (
            <Modal title={tournament.name} onClose={() => setModal(null)} style={{ maxWidth: '1200px' }}>
              <div className="tournament-detail-shell">
                <div className="tournament-detail-main">
                  <div className="tournament-bracket-scroll">
                    <div className="tournament-bracket-grid">
                      {tournament.rounds.map((round, rIndex) => (
                        <div key={rIndex} className="tournament-round-column">
                          <div className="tournament-round-title">{round.label}</div>
                          <div className="tournament-round-stack">
                            {round.matches.map(match => {
                              const sideA = getEntryLabel(tournament, match.sideAEntryId)
                              const sideB = getEntryLabel(tournament, match.sideBEntryId)
                              const winnerId = match.winnerEntryId
                              const canBook = match.sideAEntryId && match.sideBEntryId && !match.winnerEntryId && !match.bookedMatchId

                              return (
                                <div key={match.id} className="tournament-bracket-card">
                                  <div className={`tournament-entrant ${winnerId === match.sideAEntryId ? 'winner' : ''}`}>{sideA}</div>
                                  <div className="tournament-versus">VS</div>
                                  <div className={`tournament-entrant ${winnerId === match.sideBEntryId ? 'winner' : ''}`}>{sideB}</div>
                                  
                                  {canBook && (
                                    <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 12 }} onClick={() => openBookingModal(tournament.id, rIndex, match.id)}>
                                      Book Match
                                    </button>
                                  )}
                                  {match.bookedMatchId && !winnerId && <div className="tournament-booked-badge">Scheduled</div>}
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
                  <div className="tournament-modal-card" style={{ borderTop: `4px solid ${accent}` }}>
                    <div className="tournament-section-label">Hall of Records</div>
                    <div className="tournament-fact-row"><span>Champion</span><strong>{champion?.label || 'TBD'}</strong></div>
                    <div className="tournament-fact-row"><span>Scope</span><strong>{tournament.scope === 'show' ? tournament.scopeShow : 'Universe'}</strong></div>
                    <div className="tournament-fact-row"><span>Match Class</span><strong>{getTournamentTypeLabel(tournament.matchType)}</strong></div>
                  </div>
                  <button className="btn btn-danger" onClick={() => { if(confirm('Delete tournament?')) { deleteTournament(tournament.id); setModal(null); showToast('Bracket destroyed'); } }}>
                    <FiTrash2 /> Retire Tournament
                  </button>
                </div>
              </div>
            </Modal>
          )
        })()}

      {booking && (
        <Modal title="Schedule Bracket Match" onClose={() => setBooking(null)}>
          <div className="form-group">
            <label>Available Date</label>
            <select value={booking.date} onChange={e => setBooking(c => ({ ...c, date: e.target.value }))}>
              {bookingOptions.map(o => <option key={o.date} value={o.date}>{getTournamentBookingOptionLabel(o)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Event Card</label>
            <select value={booking.eventId} onChange={e => setBooking(c => ({ ...c, eventId: e.target.value }))}>
              <option value="">Select Event</option>
              {bookingEventOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="form-actions" style={{ marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => setBooking(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleConfirmBooking}>Confirm Schedule</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
