import React, { useEffect, useMemo, useState } from 'react'
import DayMatchesModal from './DayMatchesModal.jsx'
import { DAY_NAMES, DAY_SHORT, MONTHS, MONTHS_FULL, fmt, todayStr } from '../utils/dates.js'
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

function specialShowOccursOnDate(specialShow, dateStr) {
  const parts = parseParts(dateStr)
  if (specialShow.type === 'one_off') return specialShow.oneOffDate === dateStr
  return parts.year >= specialShow.startYear && parts.monthIndex + 1 === specialShow.month && parts.day === specialShow.day
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
  addSegment,      // ← new: from useStore
  deleteSegment,   // ← new: from useStore
  showToast,
}) {
  const updateSegmentFn = arguments[0].updateSegment
  const { shows, wrestlers, matches, titles, stories = [], standaloneSegments = [], currentDate, specialShows = [], teams = [] } = state

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

  const cells = useMemo(
    () => Array.from({ length: DAYS_PER_MONTH }, (_, i) => makeDateStr(viewYear, viewMonth, i + 1)),
    [viewYear, viewMonth]
  )

  const getW = (id) => wrestlers.find((w) => w.id === id)
  const getT = (id) => titles.find((t) => t.id === id)

  const showsOnDate = (dateStr) => {
    const dow = getCustomDow(dateStr)
    const weeklyShows = shows
      .filter((show) => show.day === DAY_NAMES[dow])
      .map((show) => ({ ...show, kind: 'weekly', brandName: show.name }))
    const eventShows = specialShows
      .filter((specialShow) => specialShowOccursOnDate(specialShow, dateStr))
      .map((specialShow) => {
        const parentShow = shows.find((show) => show.id === specialShow.showId)
        if (!parentShow) return null
        return {
          id: specialShow.id,
          name: specialShow.name,
          color: parentShow.color,
          day: parentShow.day,
          kind: 'special',
          brandName: parentShow.name,
          eventType: specialShow.type,
        }
      })
      .filter(Boolean)
    return [...weeklyShows, ...eventShows]
  }

  const isCurrentShowDay = (dateStr) => dateStr === safeCurrentDate && showsOnDate(dateStr).length > 0

  const isLocked = (dateStr) => {
    if (dateStr > safeCurrentDate) return true
    if (showsOnDate(dateStr).length === 0) return true
    return false
  }

  const currentShowMatches = matches.filter((m) => m.date === safeCurrentDate)
  const canAdvance =
    showsOnDate(safeCurrentDate).length > 0 &&
    currentShowMatches.length > 0 &&
    currentShowMatches.every((m) => m.winnerId != null)

  const handleOpenDay = (dateStr) => {
    if (!dateStr || dateStr > safeCurrentDate || showsOnDate(dateStr).length === 0) return
    setDayModal(dateStr)
  }

  const handleBookMatch = (date, participantIds, titleId, mode, notes, stipulation) => {
    const competitiveIds = new Set(wrestlers.filter((w) => (w.role || 'wrestler') === 'wrestler').map((w) => w.id))
    const safeParticipants = [...new Set((participantIds || []).filter((id) => competitiveIds.has(id)))]
    if (![2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30].includes(safeParticipants.length)) {
      showToast('Participants must be 2 to 10, or 20 / 30 for Royal Rumble')
      return
    }
    bookMatch(date, safeParticipants, titleId, mode, notes, stipulation)
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

  const handleSetWinner = (matchId, winnerId) => {
    setWinner(matchId, winnerId)
    showToast(`${getW(winnerId)?.name ?? '?'} wins!`)
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
   * Collect all segments across all stories that are dated on a given day.
   * Each segment gets storyId + storyName attached so we can delete it later.
   */
  const getSegmentsOnDate = (dateStr) => {
    const result = []
    for (const story of stories) {
      for (let i = 0; i < (story.segments || []).length; i++) {
        const seg = story.segments[i]
        if (seg.date === dateStr) {
          result.push({ ...seg, storyId: story.id, storyName: story.name, segmentIndex: i })
        }
      }
    }
    for (let i = 0; i < standaloneSegments.length; i += 1) {
      const seg = standaloneSegments[i]
      if (seg.date === dateStr) {
        result.push({ ...seg, storyId: null, storyName: null, segmentIndex: i, standalone: true })
      }
    }
    return result
  }

  /**
   * Called from DayMatchesModal when the user books a segment.
   * { title, description, segmentType, wrestlerIds } come from the form.
   * We need to know which story to attach it to — we pick stories whose
   * participants include any of the tagged wrestlers, falling back to a
   * "storyId" the modal can optionally pass.
   */
  const handleBookSegment = (date, segmentData) => {
    if (!addSegment) {
      showToast('Segment saving not available')
      return
    }

    const { storyId, title, description, segmentType, wrestlerIds = [] } = segmentData

    // If a specific story was chosen in the modal, use it
    if (storyId && storyId !== 'auto') {
      addSegment(storyId, { date, title, description, segmentType, wrestlerIds })
      showToast('Segment booked!')
      return
    }

    if (!storyId) {
      addSegment(null, { date, title, description, segmentType, wrestlerIds })
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
      addSegment(null, { date, title, description, segmentType, wrestlerIds })
      showToast('Segment booked as standalone')
      return
    }

    matched.forEach((story) => {
      addSegment(story.id, { date, title, description, segmentType, wrestlerIds })
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

  const handleMoveDayCardItem = (date, item, direction) => {
    if (moveDayCardItem) moveDayCardItem(date, item, direction)
  }

  const monthLabel = `${(MONTHS_FULL || MONTHS)[viewMonth]} ${viewYear}`

  return (
    <div className="calendar-page">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 className="page-title">Calendar</h1>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
            Current show: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{safeCurrentDate}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" type="button" onClick={() => setShowStartPicker((v) => !v)}>
            Set Start Date
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

      {showStartPicker && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 16,
            padding: 12,
            background: 'var(--bg2)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--radius)',
          }}
        >
          <select
            value={startMonth}
            onChange={(e) => setStartMonth(parseInt(e.target.value, 10))}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              color: 'var(--text)',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              fontSize: 13,
              minWidth: 160,
            }}
          >
            {MONTHS_FULL.map((monthName, index) => (
              <option key={monthName} value={index}>{monthName}</option>
            ))}
          </select>

          <input
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(parseInt(e.target.value || '2026', 10))}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              color: 'var(--text)',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              fontSize: 13,
              width: 120,
            }}
          />

          <button className="btn btn-primary" type="button" onClick={handleApplyStartDate}>Apply</button>
          <button className="btn btn-secondary" type="button" onClick={() => setShowStartPicker(false)}>Cancel</button>
        </div>
      )}

      <div className="cal-nav">
        <button className="btn btn-secondary btn-sm" onClick={goToPrevMonth}>Previous Month</button>
        <div className="cal-range">{monthLabel}</div>
        <button className="btn btn-secondary btn-sm" onClick={goToNextMonth}>Next Month</button>
      </div>

      <div className="day-headers">
        {DAY_SHORT.map((d) => (
          <div key={d} className="day-header">{d}</div>
        ))}
      </div>

      <div className="cal-month-grid" style={GRID_STYLE}>
        {cells.map((dateStr, i) => {
          const dayShows = showsOnDate(dateStr)
          const dayMatches = matches.filter((m) => m.date === dateStr)
          const daySegs = getSegmentsOnDate(dateStr)
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
            </div>
          )
        })}
      </div>

      {dayModal && (
        <DayMatchesModal
          date={dayModal}
          titles={titles}
          wrestlers={wrestlers}
          stories={stories}
          teams={teams}
          showToast={showToast}
          dayShows={showsOnDate(dayModal)}
          dayMatches={matches.filter((m) => m.date === dayModal)}
          daySegments={getSegmentsOnDate(dayModal)}
          isCurrentDay={dayModal === safeCurrentDate}
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
        />
      )}
    </div>
  )
}
