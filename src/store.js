import { useState, useCallback, useEffect, useRef } from 'react'
import { fmt, addDays, todayStr, daysBetween } from './utils/dates.js'
import { getCalendarEventsOnDate, getDefaultCalendarEventId, resolveCalendarEventId } from './utils/calendarEvents.js'
import {
  loadPrimaryState,
  savePrimaryState,
  createAutosaveSnapshot,
  listAutosaveSnapshots,
  loadAutosaveSnapshot,
  trimAutosaveSnapshots,
  deleteAutosaveSnapshot,
} from './utils/persistence.js'

const ALLOWED_PARTICIPANT_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30]
const SAVE_KEY = 'wum-state'
const EXPORT_VERSION = 1
const AUTOSAVE_INTERVAL_MS = 2 * 60 * 1000
const SAVE_DEBOUNCE_MS = 250

function findNextShowDay(fromDate, shows, specialShows = []) {
  const start = typeof fromDate === 'string' ? fromDate : fmt(fromDate)
  if (!shows.length && !specialShows.length) return fmt(start)

  for (let i = 0; i < 365; i += 1) {
    const d = addDays(start, i)
    if (hasAnyShowOnDate(d, shows, specialShows)) return fmt(d)
  }

  return fmt(start)
}

function parseDateParts(dateStr) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(fmt(dateStr))
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function normalizeSpecialShow(specialShow, defaultYear = parseDateParts(todayStr()).year) {
  const type = specialShow?.type === 'one_off' ? 'one_off' : 'annual'
  const month = Math.min(12, Math.max(1, parseInt(specialShow?.month, 10) || 1))
  const day = Math.min(28, Math.max(1, parseInt(specialShow?.day, 10) || 1))
  const startYear = Math.max(1, parseInt(specialShow?.startYear, 10) || defaultYear)
  const oneOffDate = specialShow?.oneOffDate ? fmt(specialShow.oneOffDate) : fmt({ year: startYear, month, day })

  return {
    ...specialShow,
    showId: parseInt(specialShow?.showId, 10),
    type,
    month,
    day,
    startYear,
    oneOffDate: type === 'one_off' ? oneOffDate : null,
  }
}

function hasAnyShowOnDate(dateStr, shows, specialShows = []) {
  return getCalendarEventsOnDate(dateStr, shows, specialShows).length > 0
}

function normalizeCurrentDate(currentDate, shows, specialShows = []) {
  const safeDate = currentDate ? fmt(currentDate) : todayStr()
  return findNextShowDay(safeDate, shows || [], specialShows || [])
}

function normalizeParticipantIds(participantIds = []) {
  return [...new Set((participantIds || []).map((id) => parseInt(id, 10)).filter(Boolean))]
}

function normalizeRosterRole(role) {
  return role === 'manager' ? 'manager' : 'wrestler'
}

function normalizeRelationshipType(type) {
  const allowed = [
    'Ally',
    'Rival',
    'Former Partner',
    'Mentor',
    'Student',
    'Family',
    'Respect',
    'Betrayed',
    'Owes Favor',
    'Unfinished Business',
  ]
  return allowed.includes(type) ? type : 'Rival'
}

function normalizeRelationship(relationship, index = 0) {
  const wrestlerIds = Array.isArray(relationship?.wrestlerIds)
    ? [...new Set(relationship.wrestlerIds.map((id) => parseInt(id, 10)).filter(Boolean))].slice(0, 2)
    : []

  return {
    id: parseInt(relationship?.id, 10) || `relationship-${index + 1}`,
    wrestlerIds,
    type: normalizeRelationshipType(relationship?.type),
    intensity: Math.min(5, Math.max(1, parseInt(relationship?.intensity, 10) || 3)),
    note: String(relationship?.note || '').trim().slice(0, 500),
  }
}

function getRelationshipKey(relationship) {
  const directionalTypes = ['Mentor', 'Student', 'Betrayed', 'Owes Favor']
  const ids = directionalTypes.includes(relationship?.type)
    ? [...(relationship?.wrestlerIds || [])].join(':')
    : [...(relationship?.wrestlerIds || [])].sort((a, b) => a - b).join(':')
  return `${ids}:${relationship?.type || 'Rival'}`
}

function isCompetitiveRole(person) {
  return normalizeRosterRole(person?.role) === 'wrestler'
}

function normalizeStatValue(value) {
  return Math.max(0, parseInt(value, 10) || 0)
}

function pruneStoriesByParticipantType(stories = [], removedType) {
  return (stories || [])
    .map((story) => ({
      ...story,
      participants: (story.participants || []).filter((participant) => participant.type !== removedType),
    }))
    .filter((story) => (story.participants || []).length >= 2)
}

function getValidCardOrder(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function getResolvedItemEventId(item, state) {
  return resolveCalendarEventId(item?.eventId, item?.date, state.shows, state.specialShows)
}

function buildEventCardEntries(state, eventId) {
  if (!eventId) return []
  const dayMatches = state.matches
    .filter((match) => getResolvedItemEventId(match, state) === eventId)
    .map((match, index) => ({
      kind: 'match',
      key: `match:${match.id}`,
      id: match.id,
      effectiveOrder: getValidCardOrder(match.cardOrder) ?? index + 1,
    }))

  const dayStorySegments = state.stories.flatMap((story) =>
    (story.segments || [])
      .map((segment, index) => ({
        kind: 'segment',
        key: `segment:${segment.id ?? `${story.id}:${index}`}`,
        storyId: story.id,
        segmentId: segment.id,
        segmentIndex: index,
        eventId: getResolvedItemEventId(segment, state),
        effectiveOrder: getValidCardOrder(segment.cardOrder) ?? dayMatches.length + index + 1,
      }))
      .filter((segment) => segment.eventId === eventId)
  )

  const dayStandaloneSegments = (state.standaloneSegments || [])
    .filter((segment) => getResolvedItemEventId(segment, state) === eventId)
    .map((segment, index) => ({
      kind: 'segment',
      key: `segment:${segment.id ?? `standalone:${index}`}`,
      storyId: null,
      segmentId: segment.id,
      segmentIndex: index,
      effectiveOrder: getValidCardOrder(segment.cardOrder) ?? dayMatches.length + dayStorySegments.length + index + 1,
    }))

  return [...dayMatches, ...dayStorySegments, ...dayStandaloneSegments]
    .sort((a, b) => a.effectiveOrder - b.effectiveOrder)
}

function applyEventCardOrder(state, eventId, orderedEntries) {
  if (!eventId) return
  const nextOrderMap = new Map(
    orderedEntries.map((entry, index) => [entry.key, index + 1])
  )

  state.matches = state.matches.map((match) => {
    if (getResolvedItemEventId(match, state) !== eventId) return match
    const nextOrder = nextOrderMap.get(`match:${match.id}`)
    return nextOrder ? { ...match, eventId, cardOrder: nextOrder } : match
  })

  state.stories = state.stories.map((story) => ({
    ...story,
    segments: (story.segments || []).map((segment, index) => {
      if (getResolvedItemEventId(segment, state) !== eventId) return segment
      const nextOrder = nextOrderMap.get(`segment:${segment.id ?? `${story.id}:${index}`}`)
      return nextOrder ? { ...segment, eventId, cardOrder: nextOrder } : segment
    }),
  }))

  state.standaloneSegments = (state.standaloneSegments || []).map((segment, index) => {
    if (getResolvedItemEventId(segment, state) !== eventId) return segment
    const nextOrder = nextOrderMap.get(`segment:${segment.id ?? `standalone:${index}`}`)
    return nextOrder ? { ...segment, eventId, cardOrder: nextOrder } : segment
  })
}

function prependEventCardEntry(state, eventId, entryKey) {
  const existingEntries = buildEventCardEntries(state, eventId).filter((entry) => entry.key !== entryKey)
  applyEventCardOrder(state, eventId, [{ key: entryKey }, ...existingEntries])
}

function getParticipantIds(match) {
  if (Array.isArray(match.participantIds) && match.participantIds.length > 0) {
    return normalizeParticipantIds(match.participantIds)
  }

  const fallback = []
  if (match.w1) fallback.push(match.w1)
  if (match.w2) fallback.push(match.w2)
  return normalizeParticipantIds(fallback)
}

function getAllowedModes(count) {
  if (count === 2) return ['singles']
  if (count === 3) return ['free_for_all', 'handicap']
  if (count === 4) return ['free_for_all', 'handicap', 'tag']
  if (count === 5) return ['free_for_all', 'handicap']
  if (count === 6) return ['free_for_all', 'handicap', 'trios', '3tag']
  if ([7, 8, 9, 10].includes(count)) return ['free_for_all']
  if ([20, 30].includes(count)) return ['royal_rumble']
  return ['free_for_all']
}

function normalizeMode(count, mode) {
  const allowed = getAllowedModes(count)
  return allowed.includes(mode) ? mode : allowed[0]
}

function getMatchType(participantIds = [], mode = 'free_for_all') {
  const count = participantIds.length
  const safeMode = normalizeMode(count, mode)

  if (count === 2) return 'Singles'
  if (count === 3) return safeMode === 'handicap' ? 'Handicap 2-on-1' : 'Triple Threat'
  if (count === 4) {
    if (safeMode === 'handicap') return 'Handicap 3-on-1'
    if (safeMode === 'tag') return 'Tag Team'
    return 'Fatal 4-Way'
  }
  if (count === 5) return safeMode === 'handicap' ? 'Handicap 4-on-1' : 'Fatal 5-Way'
  if (count === 6) {
    if (safeMode === 'handicap') return 'Handicap 5-on-1'
    if (safeMode === 'trios') return 'Six-Man Tag'
    if (safeMode === '3tag') return 'Triple Threat Tag'
    return '6-Pack Challenge'
  }
  if (count === 7) return '7-Person Match'
  if (count === 8) return '8-Person Match'
  if (count === 9) return '9-Person Match'
  if (count === 10) return '10-Person Match'
  if (count === 20) return 'Royal Rumble'
  if (count === 30) return 'Royal Rumble'
  return `${count}-Person Match`
}

function getTeamsFromMatch(match) {
  const participantIds = getParticipantIds(match)
  const count = participantIds.length
  const mode = normalizeMode(count, match.mode || 'free_for_all')

  if (mode === 'handicap' && count >= 3 && count <= 6) {
    return [participantIds.slice(0, 1), participantIds.slice(1)]
  }

  if (mode === 'tag' && count === 4) {
    return [participantIds.slice(0, 2), participantIds.slice(2, 4)]
  }

  if (mode === 'trios' && count === 6) {
    return [participantIds.slice(0, 3), participantIds.slice(3, 6)]
  }

  if (mode === '3tag' && count === 6) {
    return [participantIds.slice(0, 2), participantIds.slice(2, 4), participantIds.slice(4, 6)]
  }

  return null
}

function getWinningIds(match, winnerId) {
  const teams = getTeamsFromMatch(match)
  const participantIds = getParticipantIds(match)

  if (!winnerId) return []

  if (teams) {
    const winningTeam = teams.find((team) => team.includes(winnerId))
    return winningTeam || [winnerId]
  }

  if (participantIds.includes(winnerId)) return [winnerId]
  return []
}

function getParticipantResult(match, wrestlerId, winnerId = match?.winnerId, finishType = match?.finishType) {
  const participantIds = getParticipantIds(match)
  if (!participantIds.includes(wrestlerId)) return 'pending'
  if (String(finishType || '').trim().toLowerCase() === 'no contest') return 'draw'

  const winningIds = getWinningIds(match, winnerId)
  if (winningIds.length === 0) return 'pending'
  return winningIds.includes(wrestlerId) ? 'win' : 'loss'
}

function calculateWrestlerStreak(matches = [], wrestlerId) {
  const relevantMatches = [...(matches || [])]
    .filter((match) => {
      const result = getParticipantResult(match, wrestlerId)
      return result !== 'pending'
    })
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))

  let streak = 0
  for (let i = relevantMatches.length - 1; i >= 0; i -= 1) {
    const result = getParticipantResult(relevantMatches[i], wrestlerId)
    if (result === 'draw') return 0
    if (result === 'win') {
      if (streak < 0) break
      streak += 1
      continue
    }
    if (result === 'loss') {
      if (streak > 0) break
      streak -= 1
    }
  }
  return streak
}

function getTitleChampIds(title) {
  if (Array.isArray(title?.champIds) && title.champIds.length > 0) {
    return normalizeParticipantIds(title.champIds)
  }
  return title?.champId ? [title.champId] : []
}

function normalizeTitleType(type, name = '') {
  if (type === 'tag' || type === 'trios' || type === 'singles') return type
  const lowerName = String(name).toLowerCase()
  if (lowerName.includes('trios') || lowerName.includes('trio')) return 'trios'
  if (lowerName.includes('tag')) return 'tag'
  return 'singles'
}

function normalizeTournamentFormat(format) {
  return format === 'round_robin' ? 'round_robin' : 'single_elimination'
}

function normalizeTournamentMatchType(matchType) {
  if (matchType === 'tag' || matchType === 'trios' || matchType === 'singles') return matchType
  return 'singles'
}

function getTournamentMode(matchType) {
  if (matchType === 'tag') return 'tag'
  if (matchType === 'trios') return 'trios'
  return 'singles'
}

function getBracketRoundLabel(roundIndex, totalRounds) {
  const roundsRemaining = totalRounds - roundIndex
  if (roundsRemaining === 1) return 'Final'
  if (roundsRemaining === 2) return 'Semi-Finals'
  if (roundsRemaining === 3) return 'Quarterfinals'
  return `Round ${roundIndex + 1}`
}

function normalizeTournamentEntries(entries = []) {
  return (entries || []).map((entry, index) => ({
    id: entry?.id || `entry-${index + 1}`,
    sourceId: parseInt(entry?.sourceId, 10) || null,
    label: entry?.label || 'Unknown',
    participantIds: normalizeParticipantIds(entry?.participantIds || []),
    show: entry?.show || 'Universe',
  }))
}

function buildSingleEliminationRounds(entries = []) {
  const totalRounds = Math.max(1, Math.ceil(Math.log2(Math.max(2, entries.length))))
  const rounds = []

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const matchCount = Math.max(1, entries.length / (2 ** (roundIndex + 1)))
    rounds.push({
      label: getBracketRoundLabel(roundIndex, totalRounds),
      matches: Array.from({ length: matchCount }, (_, matchIndex) => ({
        id: `r${roundIndex + 1}m${matchIndex + 1}`,
        sideAEntryId: roundIndex === 0 ? entries[matchIndex * 2]?.id ?? null : null,
        sideBEntryId: roundIndex === 0 ? entries[(matchIndex * 2) + 1]?.id ?? null : null,
        winnerEntryId: null,
        bookedMatchId: null,
        bookedDate: null,
      })),
    })
  }

  return rounds
}

function recalculateTournamentBracket(tournament) {
  const rounds = []
  const totalRounds = (tournament.rounds || []).length

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const originalRound = tournament.rounds[roundIndex]
    const prevRound = rounds[roundIndex - 1]

    const matches = (originalRound.matches || []).map((match, matchIndex) => {
      let sideAEntryId = match.sideAEntryId ?? null
      let sideBEntryId = match.sideBEntryId ?? null

      if (roundIndex > 0) {
        const prevA = prevRound?.matches?.[matchIndex * 2]?.winnerEntryId ?? null
        const prevB = prevRound?.matches?.[(matchIndex * 2) + 1]?.winnerEntryId ?? null
        sideAEntryId = prevA
        sideBEntryId = prevB
      }

      const participantsChanged = sideAEntryId !== match.sideAEntryId || sideBEntryId !== match.sideBEntryId
      let winnerEntryId = match.winnerEntryId ?? null
      if (!winnerEntryId || ![sideAEntryId, sideBEntryId].includes(winnerEntryId)) {
        winnerEntryId = null
      }

      return {
        ...match,
        sideAEntryId,
        sideBEntryId,
        winnerEntryId,
        bookedMatchId: participantsChanged ? null : (match.bookedMatchId ?? null),
        bookedDate: participantsChanged ? null : (match.bookedDate ? fmt(match.bookedDate) : null),
      }
    })

    rounds.push({
      ...originalRound,
      label: getBracketRoundLabel(roundIndex, totalRounds),
      matches,
    })
  }

  const championEntryId = rounds[rounds.length - 1]?.matches?.[0]?.winnerEntryId ?? null

  return {
    ...tournament,
    format: normalizeTournamentFormat(tournament.format),
    matchType: normalizeTournamentMatchType(tournament.matchType),
    scope: tournament.scope || 'universe',
    entries: normalizeTournamentEntries(tournament.entries),
    rounds,
    championEntryId,
    status: championEntryId ? 'complete' : (tournament.status === 'archived' ? 'archived' : 'active'),
  }
}

function getTitleChampionCount(title) {
  const type = normalizeTitleType(title?.type, title?.name)
  if (type === 'tag') return 2
  if (type === 'trios') return 3
  return 1
}

const today = todayStr()

const INITIAL_SHOWS = [
  { id: 101, name: 'Inferno', color: '#ff5a36', day: 'Monday' },
  { id: 102, name: 'Skyline', color: '#3aa7ff', day: 'Wednesday' },
  { id: 103, name: 'Riot Hour', color: '#ff9a2f', day: 'Friday' },
]

const INITIAL_STATE = {
  wrestlers: [
    { id: 1, name: 'Ash Calder', show: 'Inferno', align: 'Face', gender: 'Male', status: 'Active', role: 'wrestler', wins: 19, losses: 6, draws: 0, streak: 2 },
    { id: 2, name: 'Nova Vale', show: 'Inferno', align: 'Face', gender: 'Female', status: 'Active', role: 'wrestler', wins: 15, losses: 7, draws: 0, streak: 1 },
    { id: 3, name: 'Orion Rush', show: 'Skyline', align: 'Face', gender: 'Male', status: 'Active', role: 'wrestler', wins: 23, losses: 5, draws: 0, streak: 4 },
    { id: 4, name: 'Selene Riot', show: 'Skyline', align: 'Face', gender: 'Female', status: 'Active', role: 'wrestler', wins: 20, losses: 6, draws: 0, streak: 2 },
    { id: 5, name: 'Talia Prism', show: 'Riot Hour', align: 'Face', gender: 'Female', status: 'Active', role: 'wrestler', wins: 22, losses: 8, draws: 0, streak: 5 },
    { id: 6, name: 'Knox Torrent', show: 'Riot Hour', align: 'Heel', gender: 'Male', status: 'Active', role: 'wrestler', wins: 17, losses: 10, draws: 0, streak: 2 },
  ],
  shows: INITIAL_SHOWS,
  titles: [
    { id: 501, name: 'Heat World Championship', show: 'Universe', type: 'singles', champId: 3, champIds: [3], champSince: today, history: [] },
    { id: 502, name: 'Inferno Crown Championship', show: 'Inferno', type: 'singles', champId: 1, champIds: [1], champSince: today, history: [] },
    { id: 503, name: 'Skyline Signal Championship', show: 'Skyline', type: 'singles', champId: 4, champIds: [4], champSince: today, history: [] },
    { id: 504, name: 'Riot Hour Grand Championship', show: 'Riot Hour', type: 'singles', champId: 5, champIds: [5], champSince: today, history: [] },
  ],
  factions: [],
  teams: [],
  relationships: [],
  specialShows: [],
  matches: [],
  stories: [],
  standaloneSegments: [],
  tournaments: [],
  nextId: 600,
  currentDate: normalizeCurrentDate(today, INITIAL_SHOWS, []),
}

async function loadDemoInitialState() {
  try {
    const response = await fetch('/demo-universe.json', { cache: 'no-store' })
    if (!response.ok) throw new Error('Could not load demo universe')
    const parsed = await response.json()
    const incomingState = ['wum', 'heat'].includes(parsed?.app) && parsed?.state ? parsed.state : parsed
    return normalizeStoredState(incomingState)
  } catch {
    return INITIAL_STATE
  }
}

function normalizeStoredState(rawState) {
  const parsed = rawState && typeof rawState === 'object' ? { ...rawState } : {}

  parsed.shows = parsed.shows || INITIAL_SHOWS
  parsed.wrestlers = (parsed.wrestlers || INITIAL_STATE.wrestlers).map((wrestler) => ({
    ...wrestler,
    role: normalizeRosterRole(wrestler.role),
    wins: normalizeStatValue(wrestler.wins),
    losses: normalizeStatValue(wrestler.losses),
    draws: normalizeStatValue(wrestler.draws),
    streak: parseInt(wrestler.streak, 10) || 0,
  }))
  parsed.titles = parsed.titles || INITIAL_STATE.titles
  parsed.factions = parsed.factions || []
  parsed.teams = parsed.teams || []
  parsed.relationships = (parsed.relationships || [])
    .map((relationship, index) => normalizeRelationship(relationship, index))
    .filter((relationship) => {
      if (relationship.wrestlerIds.length !== 2) return false
      return relationship.wrestlerIds.every((id) => parsed.wrestlers.some((wrestler) => wrestler.id === id))
    })
  parsed.specialShows = (parsed.specialShows || []).map((specialShow) => normalizeSpecialShow(specialShow))
  parsed.matches = parsed.matches || []
  parsed.stories = parsed.stories || []
  parsed.standaloneSegments = parsed.standaloneSegments || []
  parsed.tournaments = parsed.tournaments || []
  parsed.nextId = parsed.nextId || INITIAL_STATE.nextId

  parsed.currentDate = normalizeCurrentDate(parsed.currentDate, parsed.shows, parsed.specialShows)

  parsed.matches = parsed.matches.map((m) => {
    const safeDate = fmt(m.date)
    const participantIds = getParticipantIds(m)
    const mode = normalizeMode(participantIds.length, m.mode || 'free_for_all')

    return {
      ...m,
      date: safeDate,
      eventId: resolveCalendarEventId(m.eventId, safeDate, parsed.shows, parsed.specialShows),
      participantIds,
      mode,
      matchType: m.matchType || getMatchType(participantIds, mode),
      notes: m.notes || '',
      stipulation: m.stipulation || '',
      finishType: m.finishType || '',
      storyId: parseInt(m.storyId, 10) || null,
      rating: m.rating == null ? null : Math.max(0.5, Math.min(5, Math.round(Number(m.rating) * 2) / 2)),
      cardOrder: Number(m.cardOrder) || 0,
      tournamentId: parseInt(m.tournamentId, 10) || null,
      tournamentRoundIndex: Number.isInteger(m.tournamentRoundIndex) ? m.tournamentRoundIndex : parseInt(m.tournamentRoundIndex, 10) || null,
      tournamentMatchId: m.tournamentMatchId || null,
    }
  })

  parsed.titles = parsed.titles.map((t) => ({
    ...t,
    type: normalizeTitleType(t.type, t.name),
    champId: t.champId ?? null,
    champIds: getTitleChampIds(t),
    champSince: t.champSince ? fmt(t.champSince) : null,
    history: (t.history || []).map((h) => ({
      ...h,
      champIds: Array.isArray(h.champIds) ? normalizeParticipantIds(h.champIds) : (h.champId ? [h.champId] : []),
      wonDate: fmt(h.wonDate),
      lostDate: fmt(h.lostDate),
    })),
  }))

  parsed.stories = (parsed.stories || []).map((story) => ({
    ...story,
    segments: (story.segments || []).map((seg, index) => ({
      ...seg,
      id: seg.id ?? `legacy-seg-${story.id}-${index}`,
      title: seg.title || seg.type || 'Segment',
      date: fmt(seg.date),
      eventId: resolveCalendarEventId(seg.eventId, fmt(seg.date), parsed.shows, parsed.specialShows),
      segmentType: seg.segmentType || seg.type || null,
      wrestlerIds: seg.wrestlerIds || [],
      cardOrder: Number(seg.cardOrder) || 0,
    })),
  }))

  parsed.standaloneSegments = (parsed.standaloneSegments || []).map((seg, index) => ({
    ...seg,
    id: seg.id ?? `standalone-seg-${index}`,
    title: seg.title || seg.type || 'Segment',
    date: fmt(seg.date),
    eventId: resolveCalendarEventId(seg.eventId, fmt(seg.date), parsed.shows, parsed.specialShows),
    segmentType: seg.segmentType || seg.type || null,
    wrestlerIds: seg.wrestlerIds || [],
    cardOrder: Number(seg.cardOrder) || 0,
  }))

  parsed.tournaments = (parsed.tournaments || []).map((tournament) => recalculateTournamentBracket({
    ...tournament,
    format: normalizeTournamentFormat(tournament.format),
    matchType: normalizeTournamentMatchType(tournament.matchType),
    entries: normalizeTournamentEntries(tournament.entries),
    rounds: (tournament.rounds || buildSingleEliminationRounds(normalizeTournamentEntries(tournament.entries))).map((round, roundIndex) => ({
      label: round.label || getBracketRoundLabel(roundIndex, (tournament.rounds || []).length || 1),
      matches: (round.matches || []).map((match, matchIndex) => ({
        id: match.id || `r${roundIndex + 1}m${matchIndex + 1}`,
        sideAEntryId: match.sideAEntryId ?? null,
        sideBEntryId: match.sideBEntryId ?? null,
        winnerEntryId: match.winnerEntryId ?? null,
        bookedMatchId: parseInt(match.bookedMatchId, 10) || null,
        bookedDate: match.bookedDate ? fmt(match.bookedDate) : null,
      })),
    })),
  }))

  return parsed
}

function buildAutosaveSummary(state, label = 'Autosave') {
  return {
    id: `autosave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    createdAt: new Date().toISOString(),
    state,
    counts: {
      roster: state.wrestlers?.length || 0,
      shows: state.shows?.length || 0,
      titles: state.titles?.length || 0,
      tournaments: state.tournaments?.length || 0,
      teams: state.teams?.length || 0,
      factions: state.factions?.length || 0,
      relationships: state.relationships?.length || 0,
      stories: state.stories?.length || 0,
      matches: state.matches?.length || 0,
    },
    currentDate: state.currentDate || null,
  }
}

export function useStore() {
  const [state, setState] = useState(INITIAL_STATE)
  const [isHydrated, setIsHydrated] = useState(false)
  const [autosaveSnapshots, setAutosaveSnapshots] = useState([])
  const [persistenceError, setPersistenceError] = useState(null)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const persistTimeoutRef = useRef(null)
  const pendingPersistRef = useRef(null)
  const lastAutosaveRef = useRef(Date.now())

  const refreshAutosaveSnapshots = useCallback(async () => {
    try {
      const snapshots = await listAutosaveSnapshots()
      setAutosaveSnapshots(snapshots)
    } catch (error) {
      setPersistenceError(error?.message || 'Could not read autosaves')
    }
  }, [])

  const persistState = useCallback((nextState, options = {}) => {
    pendingPersistRef.current = {
      state: nextState,
      forceSnapshot: Boolean(options.forceSnapshot),
      snapshotLabel: options.snapshotLabel || 'Autosave',
    }

    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current)
    }

    persistTimeoutRef.current = setTimeout(async () => {
      const pending = pendingPersistRef.current
      if (!pending) return

      try {
        const savedAt = new Date().toISOString()
        await savePrimaryState(pending.state, {
          updatedAt: savedAt,
          version: EXPORT_VERSION,
        })

        const shouldSnapshot =
          pending.forceSnapshot || (Date.now() - lastAutosaveRef.current >= AUTOSAVE_INTERVAL_MS)

        if (shouldSnapshot) {
          await createAutosaveSnapshot(buildAutosaveSummary(pending.state, pending.snapshotLabel))
          await trimAutosaveSnapshots()
          lastAutosaveRef.current = Date.now()
          await refreshAutosaveSnapshots()
        }

        try {
          localStorage.removeItem(SAVE_KEY)
        } catch {}

        setLastSavedAt(savedAt)
        setPersistenceError(null)
      } catch (error) {
        setPersistenceError(error?.message || 'Could not save universe data')
      }
    }, SAVE_DEBOUNCE_MS)
  }, [refreshAutosaveSnapshots])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const persisted = await loadPrimaryState()
        let normalized = null
        let migratedFromLocalStorage = false

        if (persisted?.state) {
          normalized = normalizeStoredState(persisted.state)
          if (persisted.updatedAt) setLastSavedAt(persisted.updatedAt)
        } else {
          try {
            const legacySaved = localStorage.getItem(SAVE_KEY)
            if (legacySaved) {
              normalized = normalizeStoredState(JSON.parse(legacySaved))
              migratedFromLocalStorage = true
            }
          } catch {}

          if (!normalized) {
            normalized = await loadDemoInitialState()
          }
        }

        const safeState = normalized || INITIAL_STATE
        const snapshots = await listAutosaveSnapshots()

        if (cancelled) return

        setState(safeState)
        setAutosaveSnapshots(snapshots)
        setIsHydrated(true)
        lastAutosaveRef.current = Date.now()

        if (migratedFromLocalStorage) {
          const migratedAt = new Date().toISOString()
          await savePrimaryState(safeState, {
            updatedAt: migratedAt,
            version: EXPORT_VERSION,
          })
          await createAutosaveSnapshot(buildAutosaveSummary(safeState, 'Migration backup'))
          await trimAutosaveSnapshots()
          await refreshAutosaveSnapshots()
          setLastSavedAt(migratedAt)
          try {
            localStorage.removeItem(SAVE_KEY)
          } catch {}
        }
      } catch (error) {
        if (cancelled) return
        setPersistenceError(error?.message || 'Could not load saved universe')
        setIsHydrated(true)
      }
    }

    hydrate()

    return () => {
      cancelled = true
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
    }
  }, [refreshAutosaveSnapshots])

  const update = useCallback((fn, persistOptions = {}) => setState((s) => {
    const next = { ...fn({ ...s }) }
    if (isHydrated) {
      persistState(next, persistOptions)
    }
    return next
  }), [isHydrated, persistState])

  const genId = (s) => {
    s.nextId += 1
    return s.nextId
  }

  const createMatchRecord = (s, date, participantIds, titleId = null, mode = 'free_for_all', notes = '', stipulation = '', extra = {}) => {
    const safeDate = fmt(date)
    const safeMode = normalizeMode(participantIds.length, mode)
    const id = genId(s)
    const eventId = resolveCalendarEventId(extra.eventId, safeDate, s.shows, s.specialShows)

    return {
      id,
      date: safeDate,
      eventId,
      participantIds,
      winnerId: null,
      titleId,
      mode: safeMode,
      matchType: getMatchType(participantIds, safeMode),
      notes: (notes || '').trim(),
      stipulation: (stipulation || '').trim(),
      finishType: '',
      storyId: extra.storyId ?? null,
      rating: extra.rating == null ? null : Math.max(0.5, Math.min(5, Math.round(Number(extra.rating) * 2) / 2)),
      cardOrder: 1,
      tournamentId: extra.tournamentId ?? null,
      tournamentRoundIndex: Number.isInteger(extra.tournamentRoundIndex) ? extra.tournamentRoundIndex : null,
      tournamentMatchId: extra.tournamentMatchId ?? null,
    }
  }

  const getTournamentEntry = (tournament, entryId) => (tournament.entries || []).find((entry) => entry.id === entryId) || null

  const getTournamentFixture = (tournament, roundIndex, matchId) => {
    const round = tournament.rounds?.[roundIndex]
    if (!round) return null
    return round.matches.find((match) => match.id === matchId) || null
  }

  const addWrestler = (data) => update((s) => {
    s.wrestlers = [...s.wrestlers, { id: genId(s), wins: 0, losses: 0, draws: 0, streak: 0, role: normalizeRosterRole(data.role), ...data }]
    return s
  })

  const editWrestler = (id, data) => update((s) => {
    s.wrestlers = s.wrestlers.map((w) => {
      if (w.id !== id) return w
      const nextRole = normalizeRosterRole(data.role ?? w.role)
      return {
        ...w,
        ...data,
        role: nextRole,
        wins: nextRole === 'wrestler' ? normalizeStatValue(data.wins ?? w.wins) : 0,
        losses: nextRole === 'wrestler' ? normalizeStatValue(data.losses ?? w.losses) : 0,
        draws: nextRole === 'wrestler' ? normalizeStatValue(data.draws ?? w.draws) : 0,
        streak: nextRole === 'wrestler' ? parseInt(data.streak ?? w.streak, 10) || 0 : 0,
      }
    })
    return s
  })

  const deleteWrestler = (id) => update((s) => {
    s.wrestlers = s.wrestlers.filter((w) => w.id !== id)
    s.titles = s.titles.map((t) => {
      const nextChampIds = getTitleChampIds(t).filter((champId) => champId !== id)
      if (nextChampIds.length === getTitleChampIds(t).length) return t
      return {
        ...t,
        champId: nextChampIds[0] ?? null,
        champIds: nextChampIds,
        champSince: nextChampIds.length > 0 ? t.champSince : null,
      }
    })
    s.relationships = (s.relationships || []).filter((relationship) => !(relationship.wrestlerIds || []).includes(id))
    return s
  })

  const addShow = (data) => update((s) => {
    s.shows = [...s.shows, { id: genId(s), ...data }]
    s.currentDate = normalizeCurrentDate(s.currentDate, s.shows, s.specialShows)
    return s
  })

  const editShow = (id, data) => update((s) => {
    s.shows = s.shows.map((sh) => (sh.id === id ? { ...sh, ...data } : sh))
    s.currentDate = normalizeCurrentDate(s.currentDate, s.shows, s.specialShows)
    return s
  })

  const deleteShow = (id) => update((s) => {
    s.shows = s.shows.filter((sh) => sh.id !== id)
    s.specialShows = s.specialShows.filter((specialShow) => specialShow.showId !== id)
    s.currentDate = normalizeCurrentDate(s.currentDate, s.shows, s.specialShows)
    return s
  })

  const setStartDate = (year, month) => update((s) => {
    const startDate = fmt({ year, month, day: 1 })
    s.currentDate = normalizeCurrentDate(startDate, s.shows, s.specialShows)
    return s
  })

  const addTitle = (data) => update((s) => {
    s.titles = [
      ...s.titles,
      { id: genId(s), champId: null, champIds: [], champSince: null, history: [], type: normalizeTitleType(data.type, data.name), ...data },
    ]
    return s
  })

  const assignTitle = (id, nextChampSelection, daysHeld = 0) => update((s) => {
    s.titles = s.titles.map((t) => {
      if (t.id !== id) return t

      let history = [...t.history]
      const eligibleChampionIds = new Set(s.wrestlers.filter(isCompetitiveRole).map((w) => w.id))
      const currentChampIds = getTitleChampIds(t)
      const nextChampIds = Array.isArray(nextChampSelection)
        ? normalizeParticipantIds(nextChampSelection)
        : (nextChampSelection ? [parseInt(nextChampSelection, 10)] : []).filter(Boolean)
      const limitedChampIds = nextChampIds.filter((champId) => eligibleChampionIds.has(champId)).slice(0, getTitleChampionCount(t))
      const nextPrimaryChampId = limitedChampIds[0] ?? null

      if (
        currentChampIds.length > 0 &&
        (
          currentChampIds.length !== limitedChampIds.length ||
          currentChampIds.some((champId) => !limitedChampIds.includes(champId))
        ) &&
        t.champSince
      ) {
        const days = daysBetween(t.champSince, s.currentDate)
        history = [
          ...history,
          {
            champId: t.champId,
            champIds: currentChampIds,
            wonDate: t.champSince,
            lostDate: s.currentDate,
            days,
          },
        ]
      }

      const safeDaysHeld = Math.max(0, parseInt(daysHeld, 10) || 0)

      let champSince = null
      if (limitedChampIds.length > 0) {
        champSince = s.currentDate
        for (let i = 0; i < safeDaysHeld; i += 1) {
          champSince = addDays(champSince, -1)
        }
        champSince = fmt(champSince)
      }

      return {
        ...t,
        champId: nextPrimaryChampId,
        champIds: limitedChampIds,
        champSince,
        history,
      }
    })

    return s
  })

  const removeTitleHistory = (titleId, historyIndex) => update((s) => {
    s.titles = s.titles.map((t) => {
      if (t.id !== titleId) return t
      return {
        ...t,
        history: t.history.filter((_, i) => i !== historyIndex),
      }
    })
    return s
  })

  const deleteTitle = (id) => update((s) => {
    s.titles = s.titles.filter((t) => t.id !== id)
    return s
  })

  const addTournament = (data) => update((s) => {
    const matchType = normalizeTournamentMatchType(data.matchType)
    const scope = data.scope === 'show' ? 'show' : 'universe'
    const selectedIds = normalizeParticipantIds(data.participantSourceIds || [])
    const selectedSet = new Set(selectedIds)
    const validWrestlers = new Set(s.wrestlers.filter(isCompetitiveRole).map((w) => w.id))
    const validTeams = (s.teams || []).filter((team) =>
      (matchType === 'tag' && team.type === 'tag') || (matchType === 'trios' && team.type === 'trio')
    )

    let entries = []

    if (matchType === 'singles') {
      entries = s.wrestlers
        .filter((wrestler) => selectedSet.has(wrestler.id) && validWrestlers.has(wrestler.id))
        .map((wrestler, index) => ({
          id: `entry-${index + 1}`,
          sourceId: wrestler.id,
          label: wrestler.name,
          participantIds: [wrestler.id],
          show: wrestler.show || 'Universe',
        }))
    } else {
      entries = validTeams
        .filter((team) => selectedSet.has(team.id))
        .map((team, index) => ({
          id: `entry-${index + 1}`,
          sourceId: team.id,
          label: team.name,
          participantIds: normalizeParticipantIds(team.memberIds || []),
          show: team.show || 'Universe',
        }))
    }

    const participantCount = entries.length
    if (participantCount < 4 || (participantCount & (participantCount - 1)) !== 0) return s

    const tournament = recalculateTournamentBracket({
      id: genId(s),
      name: data.name?.trim() || 'Tournament',
      description: data.description?.trim() || '',
      scope,
      scopeShow: scope === 'show' ? (data.scopeShow || 'Universe') : 'Universe',
      format: normalizeTournamentFormat(data.format),
      matchType,
      prizeTitleId: parseInt(data.prizeTitleId, 10) || null,
      entries,
      rounds: buildSingleEliminationRounds(entries),
      championEntryId: null,
      status: 'active',
      createdAt: s.currentDate,
    })

    s.tournaments = [...(s.tournaments || []), tournament]
    return s
  })

  const deleteTournament = (id) => update((s) => {
    const tournament = (s.tournaments || []).find((item) => item.id === id)
    if (!tournament) return s

    const bookedMatchIds = new Set(
      (tournament.rounds || []).flatMap((round) => (round.matches || []).map((match) => match.bookedMatchId).filter(Boolean))
    )

    s.matches = s.matches
      .filter((match) => !(bookedMatchIds.has(match.id) && match.winnerId == null))
      .map((match) => (
        bookedMatchIds.has(match.id)
          ? { ...match, tournamentId: null, tournamentRoundIndex: null, tournamentMatchId: null }
          : match
      ))

    s.tournaments = (s.tournaments || []).filter((item) => item.id !== id)
    return s
  })

  const bookMatch = (date, participantIds, titleId = null, mode = 'free_for_all', notes = '', stipulation = '', extra = {}) => update((s) => {
    const eligibleCompetitors = new Set(s.wrestlers.filter(isCompetitiveRole).map((w) => w.id))
    const safeParticipants = normalizeParticipantIds(participantIds).filter((id) => eligibleCompetitors.has(id))

    if (!ALLOWED_PARTICIPANT_COUNTS.includes(safeParticipants.length)) return s

    const matchRecord = createMatchRecord(s, date, safeParticipants, titleId, mode, notes, stipulation, extra)
    s.matches = [...s.matches, matchRecord]
    prependEventCardEntry(s, matchRecord.eventId, `match:${matchRecord.id}`)
    return s
  })

  const bookTournamentMatch = (tournamentId, roundIndex, matchId, date, eventId = null) => update((s) => {
    const tournament = (s.tournaments || []).find((item) => item.id === tournamentId)
    if (!tournament) return s

    const round = tournament.rounds?.[roundIndex]
    const fixture = round?.matches?.find((match) => match.id === matchId)
    if (!round || !fixture) return s
    if (!fixture.sideAEntryId || !fixture.sideBEntryId || fixture.winnerEntryId || fixture.bookedMatchId) return s

    const sideA = getTournamentEntry(tournament, fixture.sideAEntryId)
    const sideB = getTournamentEntry(tournament, fixture.sideBEntryId)
    if (!sideA || !sideB) return s

    const participantIds = [...sideA.participantIds, ...sideB.participantIds]
    const mode = getTournamentMode(tournament.matchType)
    const notes = `${tournament.name} - ${round.label}, Match ${round.matches.findIndex((match) => match.id === matchId) + 1}`
    const matchRecord = createMatchRecord(
      s,
      date,
      participantIds,
      null,
      mode,
      notes,
      '',
      { tournamentId, tournamentRoundIndex: roundIndex, tournamentMatchId: matchId, eventId }
    )

    s.matches = [...s.matches, matchRecord]
    prependEventCardEntry(s, matchRecord.eventId, `match:${matchRecord.id}`)
    s.tournaments = (s.tournaments || []).map((item) => (
      item.id !== tournamentId
        ? item
        : {
            ...item,
            rounds: item.rounds.map((tRound, tRoundIndex) => (
              tRoundIndex !== roundIndex
                ? tRound
                : {
                    ...tRound,
                    matches: tRound.matches.map((tMatch) => (
                      tMatch.id !== matchId ? tMatch : { ...tMatch, bookedMatchId: matchRecord.id, bookedDate: fmt(date) }
                    )),
                  }
            )),
          }
    ))
    return s
  })

  const updateMatch = (matchId, data) => update((s) => {
    const match = s.matches.find((m) => m.id === matchId)
    if (!match) return s
    if (match.winnerId != null) return s

    if (match.tournamentId) {
      s.matches = s.matches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              notes: (data.notes ?? m.notes ?? '').trim(),
              stipulation: (data.stipulation ?? m.stipulation ?? '').trim(),
              storyId: data.storyId ?? m.storyId ?? null,
              eventId: resolveCalendarEventId(data.eventId ?? m.eventId, m.date, s.shows, s.specialShows),
            }
          : m
      )
      return s
    }

    const eligibleCompetitors = new Set(s.wrestlers.filter(isCompetitiveRole).map((w) => w.id))
    const safeParticipants = normalizeParticipantIds(data.participantIds).filter((id) => eligibleCompetitors.has(id))
    if (!ALLOWED_PARTICIPANT_COUNTS.includes(safeParticipants.length)) return s

    const safeMode = normalizeMode(safeParticipants.length, data.mode || match.mode || 'free_for_all')

    s.matches = s.matches.map((m) =>
      m.id === matchId
        ? {
            ...m,
            participantIds: safeParticipants,
            titleId: data.titleId ?? null,
            mode: safeMode,
            matchType: getMatchType(safeParticipants, safeMode),
            notes: (data.notes ?? m.notes ?? '').trim(),
            stipulation: (data.stipulation ?? m.stipulation ?? '').trim(),
            storyId: data.storyId ?? m.storyId ?? null,
            eventId: resolveCalendarEventId(data.eventId ?? m.eventId, m.date, s.shows, s.specialShows),
          }
        : m
    )

    return s
  })

  const deleteMatch = (matchId) => update((s) => {
    const match = s.matches.find((m) => m.id === matchId)
    if (!match) return s
    if (match.winnerId != null) return s

    s.matches = s.matches.filter((m) => m.id !== matchId)
    if (match.tournamentId && match.tournamentMatchId != null && Number.isInteger(match.tournamentRoundIndex)) {
      s.tournaments = (s.tournaments || []).map((tournament) => (
        tournament.id !== match.tournamentId
          ? tournament
          : {
              ...tournament,
              rounds: tournament.rounds.map((round, roundIndex) => (
                roundIndex !== match.tournamentRoundIndex
                  ? round
                  : {
                      ...round,
                      matches: round.matches.map((fixture) => (
                        fixture.id !== match.tournamentMatchId
                          ? fixture
                          : { ...fixture, bookedMatchId: null, bookedDate: null }
                      )),
                    }
              )),
            }
      ))
    }
    return s
  })

  const setMatchRating = (matchId, rating) => update((s) => {
    const safeRating = rating == null ? null : Math.max(0.5, Math.min(5, Math.round(Number(rating) * 2) / 2))
    s.matches = s.matches.map((match) => (
      match.id === matchId ? { ...match, rating: safeRating } : match
    ))
    return s
  })

  const setWinner = (matchId, winnerId, finishType = '') => update((s) => {
    const match = s.matches.find((m) => m.id === matchId)
    if (!match) return s
    const safeFinishType = String(finishType || '').trim()
    if (!safeFinishType) return s

    const participantIds = getParticipantIds(match)
    const isNoContest = safeFinishType.toLowerCase() === 'no contest'
    const newWinnerIds = isNoContest ? [] : getWinningIds(match, winnerId)
    const nextMatches = s.matches.map((m) => (m.id === matchId ? { ...m, winnerId, finishType: safeFinishType } : m))
    s.matches = nextMatches

    s.wrestlers = s.wrestlers.map((w) => {
      let wins = normalizeStatValue(w.wins)
      let losses = normalizeStatValue(w.losses)
      let draws = normalizeStatValue(w.draws)

      const previousResult = getParticipantResult(match, w.id, match.winnerId, match.finishType)
      if (previousResult === 'win') wins = Math.max(0, wins - 1)
      if (previousResult === 'loss') losses = Math.max(0, losses - 1)
      if (previousResult === 'draw') draws = Math.max(0, draws - 1)

      const nextResult = getParticipantResult({ ...match, winnerId, finishType: safeFinishType }, w.id, winnerId, safeFinishType)
      if (nextResult === 'win') wins += 1
      if (nextResult === 'loss') losses += 1
      if (nextResult === 'draw') draws += 1

      return {
        ...w,
        wins,
        losses,
        draws,
        streak: calculateWrestlerStreak(nextMatches, w.id),
      }
    })

    if (match.titleId && !isNoContest) {
      s.titles = s.titles.map((t) => {
        if (t.id !== match.titleId) return t

        const currentChamp = t.champId
        const currentChampIds = getTitleChampIds(t)
        const expectedWinnerCount = getTitleChampionCount(t)
        if (newWinnerIds.length !== expectedWinnerCount) return t
        if (
          currentChampIds.length === newWinnerIds.length &&
          currentChampIds.every((id) => newWinnerIds.includes(id))
        ) {
          return t
        }

        let history = [...t.history]
        if (currentChamp && t.champSince) {
          const days = daysBetween(t.champSince, match.date)
          history = history.filter(
            (h) => !(h.champId === currentChamp && h.wonDate === t.champSince && h.lostDate === match.date)
          )
          history = [
            ...history,
            {
              champId: currentChamp,
              champIds: currentChampIds,
              wonDate: t.champSince,
              lostDate: match.date,
              days,
            },
          ]
        }

        return {
          ...t,
          champId: newWinnerIds[0] ?? winnerId,
          champIds: newWinnerIds,
          champSince: match.date,
          history,
        }
      })
    }

    if (match.tournamentId && match.tournamentMatchId != null && Number.isInteger(match.tournamentRoundIndex)) {
      s.tournaments = (s.tournaments || []).map((tournament) => {
        if (tournament.id !== match.tournamentId) return tournament

        const fixture = getTournamentFixture(tournament, match.tournamentRoundIndex, match.tournamentMatchId)
        if (!fixture) return tournament

        const sideA = getTournamentEntry(tournament, fixture.sideAEntryId)
        const sideB = getTournamentEntry(tournament, fixture.sideBEntryId)
        const winnerEntryId = isNoContest
          ? null
          : ([sideA, sideB].find((entry) => entry?.participantIds?.includes(winnerId))?.id ?? null)

        const nextTournament = {
          ...tournament,
          rounds: tournament.rounds.map((round, roundIndex) => (
            roundIndex !== match.tournamentRoundIndex
              ? round
              : {
                  ...round,
                  matches: round.matches.map((roundMatch) => (
                    roundMatch.id !== match.tournamentMatchId
                      ? roundMatch
                      : {
                          ...roundMatch,
                          bookedMatchId: match.id,
                          bookedDate: match.date,
                          winnerEntryId,
                        }
                  )),
                }
          )),
        }

        return recalculateTournamentBracket(nextTournament)
      })
    }

    return s
  })

  const advanceDay = () => update((s) => {
    s.currentDate = findNextShowDay(addDays(s.currentDate, 1), s.shows, s.specialShows)
    return s
  })

  const addFaction = (data) => update((s) => {
    s.factions = [...s.factions, { id: genId(s), ...data }]
    return s
  })

  const editFaction = (id, data) => update((s) => {
    s.factions = s.factions.map((f) => (f.id === id ? { ...f, ...data } : f))
    return s
  })

  const deleteFaction = (id) => update((s) => {
    s.factions = s.factions.filter((f) => f.id !== id)
    s.teams = s.teams.map((t) => (t.factionId === id ? { ...t, factionId: null } : t))
    return s
  })

  const addTeam = (data) => update((s) => {
    s.teams = [...s.teams, { id: genId(s), ...data }]
    return s
  })

  const editTeam = (id, data) => update((s) => {
    s.teams = s.teams.map((t) => (t.id === id ? { ...t, ...data } : t))
    return s
  })

  const deleteTeam = (id) => update((s) => {
    s.teams = s.teams.filter((t) => t.id !== id)
    return s
  })

  const addRelationship = (data) => update((s) => {
    const normalized = normalizeRelationship({ id: genId(s), ...data })
    if (normalized.wrestlerIds.length !== 2 || normalized.wrestlerIds[0] === normalized.wrestlerIds[1]) return s
    if ((s.relationships || []).some((relationship) => getRelationshipKey(relationship) === getRelationshipKey(normalized))) return s
    s.relationships = [...(s.relationships || []), normalized]
    return s
  })

  const editRelationship = (id, data) => update((s) => {
    const normalized = normalizeRelationship({ id, ...data })
    if (normalized.wrestlerIds.length !== 2 || normalized.wrestlerIds[0] === normalized.wrestlerIds[1]) return s
    if ((s.relationships || []).some((relationship) => relationship.id !== id && getRelationshipKey(relationship) === getRelationshipKey(normalized))) return s
    s.relationships = (s.relationships || []).map((relationship) => (
      relationship.id === id ? normalized : relationship
    ))
    return s
  })

  const deleteRelationship = (id) => update((s) => {
    s.relationships = (s.relationships || []).filter((relationship) => relationship.id !== id)
    return s
  })

  const addSpecialShow = (data) => update((s) => {
    const normalized = normalizeSpecialShow({ id: genId(s), ...data })
    s.specialShows = [...s.specialShows, normalized]
    s.currentDate = normalizeCurrentDate(s.currentDate, s.shows, s.specialShows)
    return s
  })

  const editSpecialShow = (id, data) => update((s) => {
    s.specialShows = s.specialShows.map((specialShow) =>
      specialShow.id === id ? normalizeSpecialShow({ ...specialShow, ...data }) : specialShow
    )
    s.currentDate = normalizeCurrentDate(s.currentDate, s.shows, s.specialShows)
    return s
  })

  const deleteSpecialShow = (id) => update((s) => {
    s.specialShows = s.specialShows.filter((specialShow) => specialShow.id !== id)
    s.currentDate = normalizeCurrentDate(s.currentDate, s.shows, s.specialShows)
    return s
  })

  const addStory = (data) => update((s) => {
    s.stories = [...s.stories, { id: genId(s), segments: [], ...data }]
    return s
  })

  const editStory = (id, data) => update((s) => {
    s.stories = s.stories.map((story) => (story.id === id ? { ...story, ...data } : story))
    return s
  })

  const deleteStory = (id) => update((s) => {
    s.stories = s.stories.filter((story) => story.id !== id)
    s.matches = s.matches.map((match) => (match.storyId === id ? { ...match, storyId: null } : match))
    return s
  })

  /**
   * addSegment — called from both Stories page and Calendar modal.
   *
   * Segment shape (all fields optional except description or title):
   * {
   *   date: string          — ISO date, defaults to currentDate
   *   title: string         — short name shown in timeline header
   *   description: string   — body text
   *   segmentType: string   — e.g. 'Promo (In-Ring)', 'Brawl / Beatdown'
   *   wrestlerIds: number[] — wrestlers tagged in this segment
   *   matchId: string|null  — optional related match id (Stories page flow)
   * }
   */
  const addSegment = (storyId, segment) => update((s) => {
    const segmentDate = segment.date || s.currentDate
    const normalized = {
      id: genId(s),
      date: segmentDate,
      eventId: resolveCalendarEventId(segment.eventId, segmentDate, s.shows, s.specialShows),
      title: segment.title || segment.type || 'Segment',
      description: segment.description || '',
      segmentType: segment.segmentType || segment.type || null,
      wrestlerIds: normalizeParticipantIds(segment.wrestlerIds || []),
      matchId: segment.matchId || null,
      cardOrder: 1,
    }

    if (!storyId) {
      s.standaloneSegments = [...(s.standaloneSegments || []), normalized]
      prependEventCardEntry(s, normalized.eventId, `segment:${normalized.id}`)
      return s
    }

    s.stories = s.stories.map((story) => {
      if (story.id !== storyId) return story
      return {
        ...story,
        segments: [...(story.segments || []), normalized],
      }
    })
    prependEventCardEntry(s, normalized.eventId, `segment:${normalized.id}`)
    return s
  })

  const updateSegment = (storyId, segmentIndex, segmentId = null, data = {}) => update((s) => {
    const applySegmentUpdate = (segment) => ({
      ...segment,
      eventId: resolveCalendarEventId(data.eventId ?? segment.eventId, data.date ?? segment.date, s.shows, s.specialShows),
      title: (data.title ?? segment.title ?? segment.type ?? 'Segment').trim(),
      description: (data.description ?? segment.description ?? '').trim(),
      segmentType: data.segmentType ?? segment.segmentType ?? segment.type ?? null,
      wrestlerIds: data.wrestlerIds ? normalizeParticipantIds(data.wrestlerIds) : normalizeParticipantIds(segment.wrestlerIds || []),
    })

    if (!storyId) {
      s.standaloneSegments = (s.standaloneSegments || []).map((segment, index) => {
        const matchesSegment = segmentId != null ? segment.id === segmentId : index === segmentIndex
        return matchesSegment ? applySegmentUpdate(segment) : segment
      })
      return s
    }

    s.stories = s.stories.map((story) => {
      if (story.id !== storyId) return story
      return {
        ...story,
        segments: (story.segments || []).map((segment, index) => {
          const matchesSegment = segmentId != null ? segment.id === segmentId : index === segmentIndex
          return matchesSegment ? applySegmentUpdate(segment) : segment
        }),
      }
    })
    return s
  })

  const deleteSegment = (storyId, segmentIndex, segmentId = null) => update((s) => {
    if (!storyId) {
      s.standaloneSegments = (s.standaloneSegments || []).filter((segment, index) => {
        if (segmentId != null) return segment.id !== segmentId
        return index !== segmentIndex
      })
      return s
    }
    s.stories = s.stories.map((story) => {
      if (story.id !== storyId) return story
      return {
        ...story,
        segments: story.segments.filter((_, i) => i !== segmentIndex),
      }
    })
    return s
  })

  const moveDayCardItem = (eventId, item, direction) => update((s) => {
    const ordered = buildEventCardEntries(s, eventId)

    const currentIndex = ordered.findIndex((entry) =>
      item.kind === 'match'
        ? entry.kind === 'match' && entry.id === item.id
        : entry.kind === 'segment' && (
          (item.segmentId != null && entry.segmentId === item.segmentId)
          || (entry.storyId === item.storyId && entry.segmentIndex === item.segmentIndex)
        )
    )
    if (currentIndex === -1) return s

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= ordered.length) return s

    const reordered = [...ordered]
    const [movedItem] = reordered.splice(currentIndex, 1)
    reordered.splice(swapIndex, 0, movedItem)
    applyEventCardOrder(s, eventId, reordered)
    return s
  })

  const reorderDayCardItem = (eventId, draggedItem, targetItem) => update((s) => {
    const ordered = buildEventCardEntries(s, eventId)

    const matchesEntry = (entry, item) => (
      item.kind === 'match'
        ? entry.kind === 'match' && entry.id === item.id
        : entry.kind === 'segment' && (
          (item.segmentId != null && entry.segmentId === item.segmentId)
          || (entry.storyId === item.storyId && entry.segmentIndex === item.segmentIndex)
        )
    )

    const fromIndex = ordered.findIndex((entry) => matchesEntry(entry, draggedItem))
    const toIndex = ordered.findIndex((entry) => matchesEntry(entry, targetItem))
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return s

    const reordered = [...ordered]
    const [movedItem] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, movedItem)
    applyEventCardOrder(s, eventId, reordered)
    return s
  })

  const exportData = useCallback(() => ({
    app: 'heat',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  }), [state])

  const importData = useCallback(async (rawInput) => {
    let parsed
    try {
      parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput
    } catch {
      throw new Error('The selected file is not valid JSON.')
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('The selected file does not contain a valid save.')
    }

    const incomingState = ['wum', 'heat'].includes(parsed.app) && parsed.state ? parsed.state : parsed
    const normalized = normalizeStoredState(incomingState)

    setState(normalized)
    persistState(normalized, { forceSnapshot: true, snapshotLabel: 'Imported backup' })
    return normalized
  }, [persistState])

  const createManualSnapshot = useCallback(async (label = 'Manual snapshot') => {
    const safeLabel = String(label || 'Manual snapshot').trim() || 'Manual snapshot'
    await createAutosaveSnapshot(buildAutosaveSummary(state, safeLabel))
    await trimAutosaveSnapshots()
    await refreshAutosaveSnapshots()
    return true
  }, [state, refreshAutosaveSnapshots])

  const restoreAutosave = useCallback(async (snapshotId) => {
    const snapshot = await loadAutosaveSnapshot(snapshotId)
    if (!snapshot?.state) {
      throw new Error('That autosave snapshot could not be loaded.')
    }

    const normalized = normalizeStoredState(snapshot.state)
    setState(normalized)
    persistState(normalized, { forceSnapshot: true, snapshotLabel: 'Restored autosave' })
    return normalized
  }, [persistState])

  const deleteAutosave = useCallback(async (snapshotId) => {
    await deleteAutosaveSnapshot(snapshotId)
    await refreshAutosaveSnapshots()
  }, [refreshAutosaveSnapshots])

  const clearDataScope = useCallback((scope) => {
    setState((current) => {
      const next = { ...current }

      if (scope === 'matches') {
        next.matches = []
        next.wrestlers = next.wrestlers.map((wrestler) => ({
          ...wrestler,
          wins: 0,
          losses: 0,
          draws: 0,
          streak: 0,
        }))
        next.tournaments = (next.tournaments || []).map((tournament) => recalculateTournamentBracket({
          ...tournament,
          rounds: tournament.rounds.map((round) => ({
            ...round,
            matches: round.matches.map((match) => ({
              ...match,
              winnerEntryId: null,
              bookedMatchId: null,
              bookedDate: null,
            })),
          })),
        }))
      } else if (scope === 'stories') {
        next.stories = []
        next.standaloneSegments = []
        next.matches = next.matches.map((match) => ({ ...match, storyId: null }))
      } else if (scope === 'teams') {
        next.teams = []
        next.stories = pruneStoriesByParticipantType(next.stories, 'team')
        next.tournaments = (next.tournaments || []).filter((tournament) => tournament.matchType === 'singles')
      } else if (scope === 'factions') {
        next.factions = []
        next.teams = next.teams.map((team) => ({ ...team, factionId: null }))
        next.stories = pruneStoriesByParticipantType(next.stories, 'faction')
      } else if (scope === 'titles') {
        next.titles = []
      } else if (scope === 'tournaments') {
        next.matches = next.matches
          .filter((match) => !(match.tournamentId && match.winnerId == null))
          .map((match) => (
            match.tournamentId
              ? { ...match, tournamentId: null, tournamentRoundIndex: null, tournamentMatchId: null }
              : match
          ))
        next.tournaments = []
      } else if (scope === 'shows') {
        next.shows = []
        next.specialShows = []
        next.tournaments = (next.tournaments || []).map((tournament) => ({ ...tournament, scope: 'universe', scopeShow: 'Universe' }))
        next.currentDate = normalizeCurrentDate(todayStr(), next.shows, next.specialShows)
      } else if (scope === 'roster') {
        next.wrestlers = []
        next.relationships = []
        next.matches = []
        next.stories = []
        next.standaloneSegments = []
        next.factions = []
        next.teams = []
        next.tournaments = []
        next.titles = next.titles.map((title) => ({
          ...title,
          champId: null,
          champIds: [],
          champSince: null,
          history: [],
        }))
      } else if (scope === 'specialShows') {
        next.specialShows = []
        next.currentDate = normalizeCurrentDate(next.currentDate, next.shows, next.specialShows)
      } else if (scope === 'all') {
        const reset = normalizeStoredState({
          wrestlers: [],
          shows: [],
          titles: [],
          factions: [],
          teams: [],
          relationships: [],
          specialShows: [],
          matches: [],
          stories: [],
          standaloneSegments: [],
          tournaments: [],
          nextId: INITIAL_STATE.nextId,
          currentDate: todayStr(),
        })
        if (isHydrated) {
          persistState(reset, { forceSnapshot: true, snapshotLabel: 'Fresh universe reset' })
        }
        return reset
      }

      if (isHydrated) {
        persistState(next, { forceSnapshot: true, snapshotLabel: `Cleared ${scope}` })
      }
      return next
    })
  }, [isHydrated, persistState])

  return {
    state,
    isHydrated,
    persistenceError,
    lastSavedAt,
    autosaveSnapshots,
    addWrestler,
    editWrestler,
    deleteWrestler,
    addShow,
    editShow,
    deleteShow,
    setStartDate,
    addTitle,
    assignTitle,
    deleteTitle,
    removeTitleHistory,
    addTournament,
    deleteTournament,
    bookMatch,
    bookTournamentMatch,
    updateMatch,
    deleteMatch,
    setMatchRating,
    setWinner,
    advanceDay,
    addFaction,
    editFaction,
    deleteFaction,
    addTeam,
    editTeam,
    deleteTeam,
    addRelationship,
    editRelationship,
    deleteRelationship,
    addSpecialShow,
    editSpecialShow,
    deleteSpecialShow,
    daysBetween,
    addStory,
    editStory,
    deleteStory,
    addSegment,
    updateSegment,
    deleteSegment,
    moveDayCardItem,
    reorderDayCardItem,
    exportData,
    importData,
    createManualSnapshot,
    restoreAutosave,
    deleteAutosave,
    clearDataScope,
  }
}
