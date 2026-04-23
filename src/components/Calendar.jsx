import React, { useEffect, useMemo, useState } from 'react'
import DayMatchesModal from './DayMatchesModal.jsx'
import { DAY_SHORT, MONTHS, MONTHS_FULL, fmt, todayStr, formatUniverseDate } from '../utils/dates.js'
import { getCalendarEventsOnDate, resolveCalendarEventId } from '../utils/calendarEvents.js'
import './Calendar.css'

const DAYS_PER_MONTH = 28
const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: 4,
}

function parseParts(dateStr) {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateStr || '')
  if (!m) {
    const fallback = todayStr()
    const f = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(fallback)
    return {
      year: Number(f[1]),
      monthIndex: Number(f[2]) - 1,
      day: Math.min(DAYS_PER_MONTH, Number(f[3])),
    }
  }
  return {
    year: Number(m[1]),
    monthIndex: Number(m[2]) - 1,
    day: Math.min(DAYS_PER_MONTH, Number(m[3])),
  }
}

function makeDateStr(year, monthIndex, day) {
  return fmt({ year, month: monthIndex + 1, day })
}

function getDayNum(dateStr) {
  return parseParts(dateStr).day
}

function getMonthIndex(dateStr) {
  return parseParts(dateStr).monthIndex
}

function getYearNum(dateStr) {
  return parseParts(dateStr).year
}

function getCustomDow(dateStr) {
  return (getDayNum(dateStr) - 1) % 7
}

export default function Calendar({
  state,
  bookMatch,
  updateMatch,
  deleteMatch,
  setMatchRating,
  setWinner,
  advanceDay,
  setStartDate,
  moveDayCardItem,
  reorderDayCardItem,
  addSegment,      // ← new: from useStore
  deleteSegment,   // ← new: from useStore
  showToast,
}) {
  const updateSegmentFn = arguments[0].updateSegment
  const { shows, wrestlers, matches, titles, stories = [], standaloneSegments = [], currentDate, specialShows = [], teams = [], factions = [] } = state

  const safeCurrentDate =
    currentDate && currentDate.match(/^\d{4}-\d{2}-\d{2}$/) ? currentDate : todayStr()

  const currentParts = parseParts(safeCurrentDate)

  const [viewYear, setViewYear] = useState(currentParts.year)
  const [viewMonth, setViewMonth] = useState(currentParts.monthIndex)
  const [dayModal, setDayModal] = useState(null)

  const [showStartPicker, setShowStartPicker] = useState(false)
  const [startMonth, setStartMonth] = useState(currentParts.monthIndex)
  const [startYear, setStartYear] = useState(currentParts.year)

  useEffect(() => {
    const parts = parseParts(safeCurrentDate)
    setViewYear(parts.year)
    setViewMonth(parts.monthIndex)
    setStartYear(parts.year)
    setStartMonth(parts.monthIndex)
  }, [safeCurrentDate])

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const jumpToCurrentMonth = () => {
    const parts = parseParts(safeCurrentDate)
    setViewYear(parts.year)
    setViewMonth(parts.monthIndex)
  }

  const cells = useMemo(
    () => Array.from({ length: DAYS_PER_MONTH }, (_, i) => makeDateStr(viewYear, viewMonth, i + 1)),
    [viewYear, viewMonth]
  )

  const getW = (id) => wrestlers.find((w) => w.id === id)
  const getT = (id) => titles.find((t) => t.id === id)
  const getWinnerNames = (match, winnerId) => {
    if (!winnerId) return []
    const participantIds = Array.isArray(match?.participantIds) && match.participantIds.length > 0
      ? match.participantIds
      : [match?.w1, match?.w2].filter(Boolean)

    const buildTeams = () => {
      if (match.mode === 'tag' && participantIds.length === 4) return [participantIds.slice(0, 2), participantIds.slice(2, 4)]
      if (match.mode === 'trios' && participantIds.length === 6) return [participantIds.slice(0, 3), participantIds.slice(3, 6)]
      if (match.mode === '3tag' && participantIds.length === 6) return [participantIds.slice(0, 2), participantIds.slice(2, 4), participantIds.slice(4, 6)]
      if (match.mode === 'handicap' && participantIds.length >= 3 && participantIds.length <= 6) return [participantIds.slice(0, 1), participantIds.slice(1)]
      return null
    }

    const teams = buildTeams()
    if (teams) {
      const winningTeam = teams.find((team) => team.includes(winnerId))
      if (winningTeam) return winningTeam.map((id) => getW(id)?.name || 'Unknown')
    }
    return [getW(winnerId)?.name || '?']
  }

  const getEventsOnDate = (dateStr) => getCalendarEventsOnDate(dateStr, shows, specialShows)

  const isCurrentShowDay = (dateStr) => dateStr === safeCurrentDate && getEventsOnDate(dateStr).length > 0

  const isLocked = (dateStr) => {
    if (dateStr > safeCurrentDate) return true
    if (getEventsOnDate(dateStr).length === 0) return true
    return false
  }

  const getSegmentsOnDate = (dateStr, eventId = null) => {
    const result = []
    for (const story of stories) {
      for (let i = 0; i < (story.segments || []).length; i++) {
        const seg = story.segments[i]
        const resolvedEventId = resolveCalendarEventId(seg.eventId, seg.date, shows, specialShows)
        if (seg.date === dateStr && (!eventId || resolvedEventId === eventId)) {
          result.push({ ...seg, storyId: story.id, storyName: story.name, segmentIndex: i })
        }
      }
    }
    for (let i = 0; i < standaloneSegments.length; i += 1) {
      const seg = standaloneSegments[i]
      const resolvedEventId = resolveCalendarEventId(seg.eventId, seg.date, shows, specialShows)
      if (seg.date === dateStr && (!eventId || resolvedEventId === eventId)) {
        result.push({ ...seg, storyId: null, storyName: null, segmentIndex: i, standalone: true })
      }
    }
    return result
  }

  const currentShowMatches = matches.filter((m) => m.date === safeCurrentDate)
  const currentShowSegments = useMemo(() => getSegmentsOnDate(safeCurrentDate), [stories, standaloneSegments, safeCurrentDate, shows, specialShows])
  const visibleMonthStats = useMemo(() => {
      const monthDates = Array.from({ length: DAYS_PER_MONTH }, (_, i) => makeDateStr(viewYear, viewMonth, i + 1))
      return monthDates.reduce((acc, dateStr) => {
      const dayShows = getEventsOnDate(dateStr)
      const dayMatches = matches.filter((match) => match.date === dateStr)
      const daySegments = getSegmentsOnDate(dateStr)
      acc.showDays += dayShows.length > 0 ? 1 : 0
      acc.matches += dayMatches.length
      acc.segments += daySegments.length
      acc.specials += dayShows.filter((show) => show.kind === 'special').length
      return acc
    }, { showDays: 0, matches: 0, segments: 0, specials: 0 })
  }, [viewYear, viewMonth, matches, shows, specialShows, stories, standaloneSegments])
  const currentDayShows = getEventsOnDate(safeCurrentDate)
  const canAdvance =
    currentDayShows.length > 0 &&
    currentShowMatches.length > 0 &&
    currentShowMatches.every((m) => m.winnerId != null)

  const handleOpenDay = (dateStr) => {
    const dayEvents = getEventsOnDate(dateStr)
    if (!dateStr || dateStr > safeCurrentDate || dayEvents.length === 0) return
    setDayModal({ date: dateStr, eventId: dayEvents[0].id })
  }

  const handleBookMatch = (eventId, date, participantIds, titleId, mode, notes, stipulation, extra = {}) => {
    const competitiveIds = new Set(wrestlers.filter((w) => (w.role || 'wrestler') === 'wrestler').map((w) => w.id))
    const safeParticipants = [...new Set((participantIds || []).filter((id) => competitiveIds.has(id)))]
    if (![2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30].includes(safeParticipants.length)) {
      showToast('Participants must be 2 to 10, or 20 / 30 for Royal Rumble')
      return
    }
    bookMatch(date, safeParticipants, titleId, mode, notes, stipulation, { ...extra, eventId })
    showToast('Match booked!')
  }

  const handleUpdateMatch = (matchId, data) => {
    const competitiveIds = new Set(wrestlers.filter((w) => (w.role || 'wrestler') === 'wrestler').map((w) => w.id))
    const safeParticipants = [...new Set((data.participantIds || []).filter((id) => competitiveIds.has(id)))]
    if (![2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30].includes(safeParticipants.length)) {
      showToast('Participants must be 2 to 10, or 20 / 30 for Royal Rumble')
      return
    }
    updateMatch(matchId, data)
    showToast('Match updated!')
  }

  const handleDeleteMatch = (matchId) => {
    deleteMatch(matchId)
    showToast('Match deleted')
  }

  const handleSetWinner = (matchId, winnerId, finishType) => {
    const match = matches.find((m) => m.id === matchId)
    setWinner(matchId, winnerId, finishType)
    showToast(`${match ? getWinnerNames(match, winnerId).join(' / ') : (getW(winnerId)?.name ?? '?')} wins!`)
  }

  const handleSetMatchRating = (matchId, rating) => {
    if (setMatchRating) setMatchRating(matchId, rating)
    showToast(rating ? `Match rated ${rating}/5` : 'Match rating cleared')
  }

  const handleAdvance = () => {
    advanceDay()
    setDayModal(null)
    showToast('Show complete! Advanced to next show day.')
  }

  const handleApplyStartDate = () => {
    setStartDate(startYear, startMonth + 1)
    setViewYear(startYear)
    setViewMonth(startMonth)
    setShowStartPicker(false)
    setDayModal(null)
    showToast(`Calendar start set to ${MONTHS_FULL[startMonth]} ${startYear}`)
  }

  /**
   * Called from DayMatchesModal when the user books a segment.
   * { title, description, segmentType, wrestlerIds } come from the form.
   * We need to know which story to attach it to — we pick stories whose
   * participants include any of the tagged wrestlers, falling back to a
   * "storyId" the modal can optionally pass.
   */
  const handleBookSegment = (eventId, date, segmentData) => {
    if (!addSegment) {
      showToast('Segment saving not available')
      return
    }

    const { storyId, title, description, segmentType, wrestlerIds = [] } = segmentData

    // If a specific story was chosen in the modal, use it
    if (storyId && storyId !== 'auto') {
      addSegment(storyId, { date, eventId, title, description, segmentType, wrestlerIds })
      showToast('Segment booked!')
      return
    }

    if (!storyId) {
      addSegment(null, { date, eventId, title, description, segmentType, wrestlerIds })
      showToast('Standalone segment booked!')
      return
    }

    // Otherwise auto-attach to every story whose participants overlap the tagged wrestlers
    const matched = stories.filter((story) => {
      if (!wrestlerIds.length) return false
      const storyWrestlerIds = story.participants.flatMap((p) => {
        if (p.type === 'wrestler') return [p.id]
        if (p.type === 'team') {
          return state.teams?.find((team) => team.id === p.id)?.memberIds || []
        }
        if (p.type === 'faction') {
          return state.factions?.find((faction) => faction.id === p.id)?.memberIds || []
        }
        return []
      })
      return wrestlerIds.some((id) => storyWrestlerIds.includes(id))
    })

    if (matched.length === 0) {
      // No matching story — save as a standalone note on the first active story,
      // or just toast a warning if there are no stories yet
      addSegment(null, { date, eventId, title, description, segmentType, wrestlerIds })
      showToast('Segment booked as standalone')
      return
    }

    matched.forEach((story) => {
      addSegment(story.id, { date, eventId, title, description, segmentType, wrestlerIds })
    })

    const names = matched.map((s) => s.name).join(', ')
    showToast(`Segment booked! Added to: ${names}`)
  }

  const handleDeleteSegment = (storyId, segmentIndex, segmentId = null) => {
    if (deleteSegment) deleteSegment(storyId, segmentIndex, segmentId)
    showToast('Segment removed')
  }

  const handleUpdateSegment = (storyId, segmentIndex, segmentId = null, data = {}) => {
    if (updateSegmentFn) updateSegmentFn(storyId, segmentIndex, segmentId, data)
    showToast('Segment updated')
  }

  const handleMoveDayCardItem = (eventId, item, direction) => {
    if (moveDayCardItem) moveDayCardItem(eventId, item, direction)
  }

  const handleReorderDayCardItem = (eventId, draggedItem, targetItem) => {
    if (reorderDayCardItem) reorderDayCardItem(eventId, draggedItem, targetItem)
  }

  const monthLabel = `${(MONTHS_FULL || MONTHS)[viewMonth]} ${viewYear}`

  return (
    <div className="calendar-page">
      <div className="calendar-hero">
        <div className="calendar-hero-copy">
          <h1 className="page-title">Calendar</h1>
          <div className="calendar-hero-date">
            Current show day: <span>{formatUniverseDate(safeCurrentDate)}</span>
          </div>
          <div className="calendar-live-row">
            {currentDayShows.length > 0 ? currentDayShows.map((show) => (
              <span key={`${show.kind}-${show.id}`} className="calendar-live-chip" style={{ borderColor: `${show.color}55`, color: show.color, background: `${show.color}18` }}>
                {show.kind === 'special' ? `${show.name} Special` : show.name}
              </span>
            )) : (
              <span className="calendar-live-empty">No active show on this date yet</span>
            )}
          </div>
        </div>

        <div className="calendar-hero-actions">
          <button className="btn btn-secondary" type="button" onClick={() => setShowStartPicker((v) => !v)}>
            Set Start Date
          </button>
          <button className="btn btn-secondary" type="button" onClick={jumpToCurrentMonth}>
            Jump To Current
          </button>
          <button
            className={`btn btn-primary advance-btn${canAdvance ? ' ready' : ''}`}
            onClick={handleAdvance}
            disabled={!canAdvance}
            title={!canAdvance ? 'Book at least 1 match and set all winners first' : 'Advance to next show'}
          >
            Advance Show &gt;
          </button>
        </div>
      </div>

      <div className="calendar-overview">
        <div className="calendar-overview-card">
          <div className="calendar-overview-label">This Month</div>
          <div className="calendar-overview-value">{monthLabel}</div>
          <div className="calendar-overview-meta">{visibleMonthStats.showDays} show days scheduled</div>
        </div>
        <div className="calendar-overview-card">
          <div className="calendar-overview-label">Booked Matches</div>
          <div className="calendar-overview-value">{visibleMonthStats.matches}</div>
          <div className="calendar-overview-meta">{visibleMonthStats.segments} segments in the month</div>
        </div>
        <div className="calendar-overview-card">
          <div className="calendar-overview-label">Current Card</div>
          <div className="calendar-overview-value">{currentShowMatches.length + currentShowSegments.length}</div>
          <div className="calendar-overview-meta">{currentShowMatches.length} matches, {currentShowSegments.length} segments</div>
        </div>
        <div className="calendar-overview-card">
          <div className="calendar-overview-label">Special Events</div>
          <div className="calendar-overview-value">{visibleMonthStats.specials}</div>
          <div className="calendar-overview-meta">Across the visible month</div>
        </div>
      </div>

      <div className="calendar-legend">
        <span className="calendar-legend-title">Legend</span>
        <span className="calendar-legend-pill legend-live">Live</span>
        <span className="calendar-legend-pill legend-done">Completed</span>
        <span className="calendar-legend-pill legend-special">Special Event</span>
        <span className="calendar-legend-pill legend-chip">M / S / T chips = Matches / Segments / Title Matches</span>
      </div>

      {showStartPicker && (
        <div className="calendar-start-picker">
          <select
            value={startMonth}
            onChange={(e) => setStartMonth(parseInt(e.target.value, 10))}
            className="calendar-start-select"
          >
            {MONTHS_FULL.map((monthName, index) => (
              <option key={monthName} value={index}>{monthName}</option>
            ))}
          </select>

          <input
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(parseInt(e.target.value || '2026', 10))}
            className="calendar-start-year"
          />

          <button className="btn btn-primary" type="button" onClick={handleApplyStartDate}>Apply</button>
          <button className="btn btn-secondary" type="button" onClick={() => setShowStartPicker(false)}>Cancel</button>
        </div>
      )}

      <div className="cal-nav-shell">
      <div className="cal-nav">
        <button className="btn btn-secondary btn-sm" onClick={goToPrevMonth}>Previous Month</button>
        <div className="cal-range">{monthLabel}</div>
        <button className="btn btn-secondary btn-sm" onClick={goToNextMonth}>Next Month</button>
      </div>
      </div>

      <div className="calendar-grid-shell">
      <div className="day-headers">
        {DAY_SHORT.map((d) => (
          <div key={d} className="day-header">{d}</div>
        ))}
      </div>

      <div className="cal-month-grid" style={GRID_STYLE}>
        {cells.map((dateStr, i) => {
          const dayShows = getEventsOnDate(dateStr)
          const dayMatches = matches.filter((m) => m.date === dateStr)
          const daySegs = getSegmentsOnDate(dateStr)
          const titleMatchCount = dayMatches.filter((m) => m.titleId).length
          const specialCount = dayShows.filter((show) => show.kind === 'special').length
          const locked = isLocked(dateStr)
          const isCurrent = isCurrentShowDay(dateStr)
          const isDone =
            dateStr < safeCurrentDate &&
            dayShows.length > 0 &&
            dayMatches.length > 0 &&
            dayMatches.every((m) => m.winnerId)
          const hasShow = dayShows.length > 0
          const dayNum = getDayNum(dateStr)

          let cls = 'cal-day'
          if (locked && !isCurrent) cls += ' locked'
          if (isCurrent) cls += ' current-show'
          if (isDone) cls += ' done'
          if (!hasShow) cls += ' no-show'

          return (
            <div key={i} className={cls} onClick={() => handleOpenDay(dateStr)}>
              <div className="cal-day-num">{dayNum}</div>

              {dayShows.map((s) => (
                <span key={s.id} className="cal-show-chip" style={{ background: s.color + '28', color: s.color }}>
                  {s.name}
                </span>
              ))}

              {isDone && <div className="cal-done-tag">Done</div>}
              {isCurrent && <div className="cal-live-tag">LIVE</div>}

              {!isCurrent && !locked && (dayMatches.length > 0 || daySegs.length > 0) && (
                <div className="cal-match-count">
                  {dayMatches.length > 0 && `${dayMatches.length} match${dayMatches.length > 1 ? 'es' : ''}`}
                  {dayMatches.length > 0 && daySegs.length > 0 && ' · '}
                  {daySegs.length > 0 && `${daySegs.length} seg${daySegs.length > 1 ? 's' : ''}`}
                </div>
              )}
              {(dayMatches.length > 0 || daySegs.length > 0 || titleMatchCount > 0 || specialCount > 0) && (
                <div className="cal-summary-chips">
                  {dayMatches.length > 0 && <span className="cal-summary-chip">{dayMatches.length}M</span>}
                  {daySegs.length > 0 && <span className="cal-summary-chip">{daySegs.length}S</span>}
                  {titleMatchCount > 0 && <span className="cal-summary-chip cal-summary-chip-gold">{titleMatchCount}T</span>}
                  {specialCount > 0 && <span className="cal-summary-chip cal-summary-chip-special">Event</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>

      {dayModal && (
        <DayMatchesModal
          date={dayModal.date}
          titles={titles}
          wrestlers={wrestlers}
          stories={stories}
          teams={teams}
          factions={factions}
          showToast={showToast}
          dayEvents={getEventsOnDate(dayModal.date)}
          selectedEventId={dayModal.eventId}
          onSelectEvent={(eventId) => setDayModal((current) => current ? { ...current, eventId } : current)}
          dayMatches={matches.filter((m) => m.date === dayModal.date && resolveCalendarEventId(m.eventId, m.date, shows, specialShows) === dayModal.eventId)}
          daySegments={getSegmentsOnDate(dayModal.date, dayModal.eventId)}
          isCurrentDay={dayModal.date === safeCurrentDate}
          getCustomDow={getCustomDow}
          getMonthIndex={getMonthIndex}
          getYearNum={getYearNum}
          getDayNum={getDayNum}
          getW={getW}
          getT={getT}
          onClose={() => setDayModal(null)}
          onBookMatch={handleBookMatch}
          onUpdateMatch={handleUpdateMatch}
          onDeleteMatch={handleDeleteMatch}
          onSetMatchRating={handleSetMatchRating}
          onSetWinner={handleSetWinner}
          onBookSegment={handleBookSegment}
          onUpdateSegment={handleUpdateSegment}
          onDeleteSegment={handleDeleteSegment}
          onMoveDayCardItem={handleMoveDayCardItem}
          onReorderDayCardItem={handleReorderDayCardItem}
        />
      )}
    </div>
  )
}
