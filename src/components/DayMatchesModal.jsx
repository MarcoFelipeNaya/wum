import React, { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { DAY_NAMES, MONTHS } from '../utils/dates.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar as faStarSolid, faStarHalfStroke } from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'

const ALLOWED_PARTICIPANT_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30]

const SEGMENT_CATEGORIES = [
  {
    key: 'promos',
    label: 'Promos & Interviews',
    types: ['Promo (In-Ring)', 'Promo (Backstage)', 'Pre-Tape Promo', 'Interview (In-Ring)', 'Interview (Backstage)'],
  },
  {
    key: 'brawls',
    label: 'Brawls & Attacks',
    types: [
      'Brawl / Beatdown',
      'Ambush / Attack',
      'Pull-Apart',
      'Confrontation',
      'Pull-Apart Brawl',
      'In-Ring Brawl',
      'Backstage Brawl',
      'Backstage Attack',
      'In-Ring Attack',
      'Post-Match Attack',
    ],
  },
  {
    key: 'story',
    label: 'Story & Character',
    types: [
      'Character Moment',
      'Storyline Advancement',
      'Alliance / Betrayal',
      'Arrival',
      'Locker Room Segment',
      'Internal Conversation',
      'Team Meeting',
      'Challenge Issued',
      'Stipulation Reveal',
      'Team Formation',
      'Team Breakup',
      'Medical Update',
      'Mystery Angle',
    ],
  },
  {
    key: 'authority',
    label: 'Authority & Management',
    types: [
      'GM Announcement',
      'Contract Signing',
      'Title Ceremony',
      'Authority Announcement',
      'Authority Confrontation',
    ],
  },
  {
    key: 'vignettes',
    label: 'Vignettes & Video',
    types: [
      'Vignette',
      'Video Package',
      'Recap Segment',
      'Taped Vignette',
      'Match Hype Package',
      'Sponsor Segment',
    ],
  },
  {
    key: 'celebrations',
    label: 'Celebrations & Special',
    types: [
      'Championship Celebration',
      'Retirement / Return',
      'Special Appearance',
      'Celebration',
      'Ceremony',
      'Talk Show Segment',
      'In-Ring Ceremony',
    ],
  },
]

function segmentTypeBadgeColor(segmentType) {
  if (!segmentType) return 'var(--text2)'
  const t = segmentType.toLowerCase()
  if (t.includes('promo') || t.includes('interview')) return '#2980b9'
  if (t.includes('brawl') || t.includes('attack') || t.includes('ambush')) return '#c0392b'
  if (t.includes('confrontation') || t.includes('challenge') || t.includes('mystery') || t.includes('arrival') || t.includes('locker') || t.includes('conversation') || t.includes('meeting') || t.includes('formation') || t.includes('breakup') || t.includes('medical') || t.includes('stipulation')) return '#8e44ad'
  if (t.includes('vignette') || t.includes('video') || t.includes('recap')) return '#9b59b6'
  if (t.includes('hype') || t.includes('sponsor')) return '#9b59b6'
  if (t.includes('gm') || t.includes('authority') || t.includes('contract')) return '#d4af37'
  if (t.includes('celebration') || t.includes('retirement') || t.includes('return') || t.includes('talk show') || t.includes('ceremony')) return '#27ae60'
  return 'var(--text2)'
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

function getMatchTypeLabel(count, mode) {
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
  if ([20, 30].includes(count)) return 'Royal Rumble'
  return `${count}-Person Match`
}

function getTeamLayout(count, mode) {
  const safeMode = normalizeMode(count, mode)
  if (safeMode === 'handicap' && count >= 3 && count <= 6) {
    return { isTeamBased: true, teams: [{ label: 'Side A', size: 1 }, { label: 'Side B', size: count - 1 }] }
  }
  if (safeMode === 'tag' && count === 4) {
    return { isTeamBased: true, teams: [{ label: 'Team A', size: 2 }, { label: 'Team B', size: 2 }] }
  }
  if (safeMode === 'trios' && count === 6) {
    return { isTeamBased: true, teams: [{ label: 'Team A', size: 3 }, { label: 'Team B', size: 3 }] }
  }
  if (safeMode === '3tag' && count === 6) {
    return { isTeamBased: true, teams: [{ label: 'Team A', size: 2 }, { label: 'Team B', size: 2 }, { label: 'Team C', size: 2 }] }
  }

  return { isTeamBased: false, teams: [] }
}

function getParticipantIdsFromMatch(match) {
  if (Array.isArray(match?.participantIds) && match.participantIds.length > 0) return match.participantIds
  const fallback = []
  if (match?.w1) fallback.push(match.w1)
  if (match?.w2) fallback.push(match.w2)
  return fallback
}

function getTeamsFromMatch(match) {
  const participantIds = getParticipantIdsFromMatch(match)
  const count = participantIds.length
  const layout = getTeamLayout(count, match.mode || 'free_for_all')
  if (!layout.isTeamBased) return null
  let offset = 0
  return layout.teams.map((team) => {
    const teamIds = participantIds.slice(offset, offset + team.size)
    offset += team.size
    return teamIds
  })
}

function uniqueIds(ids) {
  return [...new Set((ids || []).map((id) => parseInt(id, 10)).filter(Boolean))]
}

function formatRatingValue(rating) {
  if (rating == null) return 'Unrated'
  return Number.isInteger(rating) ? `${rating}.0` : String(rating)
}

function getStarIconForRating(rating, starIndex) {
  if (rating >= starIndex) return faStarSolid
  if (rating >= starIndex - 0.5) return faStarHalfStroke
  return faStarRegular
}

function MatchRatingInput({ rating, disabled, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: 5 }).map((_, index) => {
          const starIndex = index + 1
          return (
            <div key={starIndex} style={{ position: 'relative', width: 22, height: 22 }}>
              <FontAwesomeIcon
                icon={getStarIconForRating(rating || 0, starIndex)}
                style={{ color: '#d4af37', fontSize: 20, position: 'absolute', inset: 0 }}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(starIndex - 0.5)}
                style={{ position: 'absolute', inset: '0 50% 0 0', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer' }}
                aria-label={`Rate ${starIndex - 0.5} out of 5`}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(starIndex)}
                style={{ position: 'absolute', inset: '0 0 0 50%', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer' }}
                aria-label={`Rate ${starIndex} out of 5`}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{formatRatingValue(rating)} / 5</span>
        {!disabled && rating != null && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(null)}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

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

function isTitleCompatibleWithMatch(title, participantCount, mode) {
  const titleType = getTitleType(title)
  const safeMode = normalizeMode(participantCount, mode)
  if (titleType === 'tag') return safeMode === 'tag' || safeMode === '3tag'
  if (titleType === 'trios') return safeMode === 'trios'
  return safeMode !== 'tag' && safeMode !== 'trios' && safeMode !== '3tag'
}

function SectionCard({ title, children }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function DayMatchesModal({
  date,
  titles,
  wrestlers,
  teams = [],
  stories = [],
  showToast,
  dayShows,
  dayMatches,
  daySegments = [],
  isCurrentDay,
  getCustomDow,
  getMonthIndex,
  getYearNum,
  getDayNum,
  getW,
  getT,
  onClose,
  onBookMatch,
  onUpdateMatch,
  onDeleteMatch,
  onSetMatchRating,
  onSetWinner,
  onBookSegment,
  onUpdateSegment,
  onDeleteSegment,
  onMoveDayCardItem,
}) {
  const idx = getCustomDow(date)
  const modalMonthIndex = getMonthIndex(date)
  const modalYear = getYearNum(date)
  const modalDay = getDayNum(date)
  const allDone = dayMatches.length > 0 && dayMatches.every((m) => m.winnerId)
  const showLabel = dayShows.map((s) => s.name).join(' & ')
  const titleStr = `${DAY_NAMES[idx]}, ${MONTHS[modalMonthIndex]} ${modalDay}, ${modalYear}${showLabel ? ' - ' + showLabel : ''}`

  // Match booking state
  const [editingMatchId, setEditingMatchId] = useState(null)
  const [matchFormKey, setMatchFormKey] = useState(0)
  const [expandedNotesId, setExpandedNotesId] = useState(null)
  const [wrestlerFilter, setWrestlerFilter] = useState('current')
  const [titleFilter, setTitleFilter] = useState('current')
  const [participantCount, setParticipantCount] = useState(2)
  const [matchMode, setMatchMode] = useState('singles')
  const [editParticipantCount, setEditParticipantCount] = useState(2)
  const [editMatchMode, setEditMatchMode] = useState('singles')

  // Segment booking state
  const [segTitle, setSegTitle] = useState('')
  const [segDescription, setSegDescription] = useState('')
  const [segCategory, setSegCategory] = useState(null)
  const [segType, setSegType] = useState(null)
  const [segWrestlerSearch, setSegWrestlerSearch] = useState('')
  const [segWrestlerBrand, setSegWrestlerBrand] = useState('all')
  const [segSelectedWrestlers, setSegSelectedWrestlers] = useState([])
  const [segStoryId, setSegStoryId] = useState('')
  const [editingSegmentId, setEditingSegmentId] = useState(null)
  const [editSegTitle, setEditSegTitle] = useState('')
  const [editSegDescription, setEditSegDescription] = useState('')
  const [editSegCategory, setEditSegCategory] = useState(null)
  const [editSegType, setEditSegType] = useState(null)
  const [editSegWrestlerSearch, setEditSegWrestlerSearch] = useState('')
  const [editSegWrestlerBrand, setEditSegWrestlerBrand] = useState('all')
  const [editSegSelectedWrestlers, setEditSegSelectedWrestlers] = useState([])

  const editingMatch = useMemo(() => dayMatches.find((m) => m.id === editingMatchId) || null, [dayMatches, editingMatchId])
  const orderedMatches = useMemo(() => [...dayMatches].reverse(), [dayMatches])
  const tagTeams = useMemo(() => teams.filter((team) => team.type === 'tag'), [teams])
  const triosTeams = useMemo(() => teams.filter((team) => team.type === 'trio'), [teams])
  const dayCardItems = useMemo(() => {
    const matches = dayMatches.map((match, index) => ({
      kind: 'match',
      id: match.id,
      cardOrder: Number(match.cardOrder) || index + 1,
      match,
    }))
    const segments = daySegments.map((segment, index) => ({
      kind: 'segment',
      storyId: segment.storyId,
      segmentIndex: segment.segmentIndex,
      segmentId: segment.id,
      cardOrder: Number(segment.cardOrder) || dayMatches.length + index + 1,
      segment,
    }))
    return [...matches, ...segments].sort((a, b) => a.cardOrder - b.cardOrder)
  }, [dayMatches, daySegments])

  useEffect(() => { setMatchMode((prev) => normalizeMode(participantCount, prev)) }, [participantCount])
  useEffect(() => { setEditMatchMode((prev) => normalizeMode(editParticipantCount, prev)) }, [editParticipantCount])
  useEffect(() => {
    if (!editingMatch) return
    const ids = getParticipantIdsFromMatch(editingMatch)
    setEditParticipantCount(ids.length || 2)
    setEditMatchMode(normalizeMode(ids.length || 2, editingMatch.mode || 'free_for_all'))
  }, [editingMatch])

  const activeShowNames = useMemo(
    () => [...new Set(dayShows.map((show) => show.brandName || show.name))],
    [dayShows]
  )

  const availableShowOptions = useMemo(() => {
    const fromWrestlers = [...new Set(wrestlers.map((w) => w.show).filter(Boolean))]
    const fromTitles = [...new Set(titles.map((t) => t.show).filter(Boolean))]
    return [...new Set([...fromWrestlers, ...fromTitles])].sort()
  }, [wrestlers, titles])

  const filterByBrand = (items, filterValue, showField) => {
    if (filterValue === 'all') return items
    if (filterValue === 'current') {
      if (activeShowNames.length === 0) return items
      return items.filter((item) => activeShowNames.includes(item[showField]) || item[showField] === 'Universe')
    }
    return items.filter((item) => item[showField] === filterValue)
  }

  const getAvailableWrestlers = (extraIds = []) => {
    const competitiveRoster = wrestlers.filter((w) => (w.role || 'wrestler') === 'wrestler')
    const filtered = filterByBrand(competitiveRoster, wrestlerFilter, 'show')
    const merged = [...filtered]
    competitiveRoster.filter((w) => extraIds.includes(w.id)).forEach((w) => {
      if (!merged.some((x) => x.id === w.id)) merged.push(w)
    })
    return merged
  }

  const getAvailableTitles = (participantCount, mode, extraTitleId = null) => {
    const filtered = filterByBrand(titles, titleFilter, 'show')
      .filter((title) => isTitleCompatibleWithMatch(title, participantCount, mode))
    const merged = [...filtered]
    if (extraTitleId) {
      const extraTitle = titles.find((t) => t.id === extraTitleId)
      if (extraTitle && !merged.some((x) => x.id === extraTitle.id)) merged.push(extraTitle)
    }
    return merged
  }

  const bookingWrestlers = getAvailableWrestlers()
  const bookingTitles = getAvailableTitles(participantCount, matchMode)

  const segmentWrestlers = useMemo(() => {
    let list = filterByBrand(wrestlers, segWrestlerBrand === 'all' ? 'all' : segWrestlerBrand, 'show')
    if (segWrestlerSearch.trim()) {
      const q = segWrestlerSearch.trim().toLowerCase()
      list = list.filter((w) => w.name.toLowerCase().includes(q))
    }
    return list
  }, [wrestlers, segWrestlerBrand, segWrestlerSearch, activeShowNames])

  const editSegmentWrestlers = useMemo(() => {
    let list = filterByBrand(wrestlers, editSegWrestlerBrand === 'all' ? 'all' : editSegWrestlerBrand, 'show')
    if (editSegWrestlerSearch.trim()) {
      const q = editSegWrestlerSearch.trim().toLowerCase()
      list = list.filter((w) => w.name.toLowerCase().includes(q))
    }
    return list
  }, [wrestlers, editSegWrestlerBrand, editSegWrestlerSearch, activeShowNames])

  const toggleSegWrestler = (id) => {
    setSegSelectedWrestlers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const toggleEditSegWrestler = (id) => {
    setEditSegSelectedWrestlers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const resetSegForm = () => {
    setSegTitle('')
    setSegDescription('')
    setSegCategory(null)
    setSegType(null)
    setSegWrestlerSearch('')
    setSegSelectedWrestlers([])
    setSegStoryId('')
  }

  const resetMatchForm = () => {
    setParticipantCount(2)
    setMatchMode('singles')
    setMatchFormKey((current) => current + 1)
  }

  const startEditingSegment = (segment) => {
    setEditingSegmentId(segment.id)
    setEditSegTitle(segment.title || '')
    setEditSegDescription(segment.description || '')
    setEditSegType(segment.segmentType || null)
    setEditSegCategory(
      SEGMENT_CATEGORIES.find((category) => category.types.includes(segment.segmentType))?.key ?? null
    )
    setEditSegWrestlerSearch('')
    setEditSegWrestlerBrand('all')
    setEditSegSelectedWrestlers(segment.wrestlerIds || [])
  }

  const resetEditSegmentForm = () => {
    setEditingSegmentId(null)
    setEditSegTitle('')
    setEditSegDescription('')
    setEditSegType(null)
    setEditSegCategory(null)
    setEditSegWrestlerSearch('')
    setEditSegWrestlerBrand('all')
    setEditSegSelectedWrestlers([])
  }

  const handleBookSegment = (e) => {
    e.preventDefault()
    if (!segTitle.trim()) return
    if (onBookSegment) {
      onBookSegment(date, {
        storyId: segStoryId === 'auto' ? 'auto' : (segStoryId ? parseInt(segStoryId, 10) : null),
        title: segTitle.trim(),
        description: segDescription.trim(),
        segmentType: segType || (segCategory ? SEGMENT_CATEGORIES.find(c => c.key === segCategory)?.label : null),
        wrestlerIds: segSelectedWrestlers,
      })
    }
    resetSegForm()
  }

  const handleSaveSegmentEdit = (segment) => {
    if (!editSegTitle.trim()) return
    if (onUpdateSegment) {
      onUpdateSegment(segment.storyId, segment.segmentIndex, segment.id, {
        title: editSegTitle.trim(),
        description: editSegDescription.trim(),
        segmentType: editSegType || (editSegCategory ? SEGMENT_CATEGORIES.find((c) => c.key === editSegCategory)?.label : null),
        wrestlerIds: editSegSelectedWrestlers,
      })
    }
    resetEditSegmentForm()
  }

  const selectStyle = {
    flex: 1, minWidth: 100,
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    color: 'var(--text)', padding: '8px 10px',
    borderRadius: 'var(--radius)', fontSize: 13,
  }

  const smallSelectStyle = {
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    color: 'var(--text)', padding: '8px 10px',
    borderRadius: 'var(--radius)', fontSize: 13, minWidth: 140,
  }

  const canEditMatch = (match) => isCurrentDay && match.winnerId == null

  const startEditingMatch = (match) => {
    const ids = getParticipantIdsFromMatch(match)
    setEditingMatchId(match.id)
    setEditParticipantCount(ids.length || 2)
    setEditMatchMode(normalizeMode(ids.length || 2, match.mode || 'free_for_all'))
  }

  const collectFlatParticipants = (formData, count) => {
    const participantIds = []
    for (let i = 0; i < count; i++) {
      const id = parseInt(formData.get(`participant_${i}`), 10)
      if (id) participantIds.push(id)
    }
    return uniqueIds(participantIds)
  }

  const collectTeamParticipants = (formData, layout) => {
    const participantIds = []
    layout.teams.forEach((team, teamIndex) => {
      for (let i = 0; i < team.size; i++) {
        const id = parseInt(formData.get(`team${teamIndex}_${i}`), 10)
        if (id) participantIds.push(id)
      }
    })
    return uniqueIds(participantIds)
  }

  const getEligibleTeams = (layout) => {
    if (!layout?.isTeamBased) return []
    if (layout.teams.every((team) => team.size === 2)) return tagTeams
    if (layout.teams.every((team) => team.size === 3)) return triosTeams
    return []
  }

  const applySelectedTeamsToForm = (formData, layout) => {
    const eligibleTeams = getEligibleTeams(layout)
    if (eligibleTeams.length === 0) return

    layout.teams.forEach((team, teamIndex) => {
      const savedTeamId = parseInt(formData.get(`team${teamIndex}_saved`), 10) || null
      const savedTeam = eligibleTeams.find((eligibleTeam) => eligibleTeam.id === savedTeamId)
      if (!savedTeam) return
      savedTeam.memberIds.forEach((memberId, memberIndex) => formData.set(`team${teamIndex}_${memberIndex}`, memberId))
    })
  }

  const handleUpdateSubmit = (e, match) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const titleId = parseInt(fd.get('titleId'), 10) || null
    const notes = fd.get('notes') || ''
    const stipulation = fd.get('stipulation') || ''
    const mode = normalizeMode(editParticipantCount, fd.get('mode') || editMatchMode)
    const layout = getTeamLayout(editParticipantCount, mode)
    applySelectedTeamsToForm(fd, layout)
    const participantIds = layout.isTeamBased
      ? collectTeamParticipants(fd, layout)
      : collectFlatParticipants(fd, editParticipantCount)
    onUpdateMatch(match.id, { participantIds, titleId, mode, notes, stipulation })
    setEditingMatchId(null)
  }

  const formatMatchCardText = (match, index = null) => {
    const participantIds = getParticipantIdsFromMatch(match)
    const participants = participantIds.map(getW).filter(Boolean)
    const teamsFromMatch = getTeamsFromMatch(match)
    const titleMatch = match.titleId ? getT(match.titleId) : null
    const lines = []

    lines.push(index != null
      ? `Match ${index + 1}: ${match.matchType || getMatchTypeLabel(participantIds.length, match.mode)}`
      : `Match ${match.matchType || getMatchTypeLabel(participantIds.length, match.mode)}`)

    if (match.stipulation) lines.push(`Stipulation: ${match.stipulation}`)
    if (titleMatch) lines.push(`Title: ${titleMatch.name}`)

    if (teamsFromMatch) {
      teamsFromMatch.forEach((teamIds, teamIndex) => {
        lines.push(`Team ${String.fromCharCode(65 + teamIndex)}: ${teamIds.map((id) => getW(id)?.name ?? 'Unknown').join(' / ')}`)
      })
    } else {
      lines.push(`Participants: ${participants.map((w) => w.name).join(' vs ')}`)
    }

    if (match.winnerId) lines.push(`Winner: ${getW(match.winnerId)?.name ?? 'Unknown'}`)
    if (match.rating != null) lines.push(`Rating: ${formatRatingValue(match.rating)} / 5`)
    if (match.notes?.trim()) lines.push(`Notes: ${match.notes.trim()}`)

    return lines.join('\n')
  }

  const formatSegmentCardText = (segment, index = null) => {
    const lines = []
    const taggedWrestlers = (segment.wrestlerIds || []).map((id) => getW(id)?.name).filter(Boolean)
    lines.push(index != null ? `Segment ${index + 1}: ${segment.title || 'Segment'}` : (segment.title || 'Segment'))
    if (segment.segmentType) lines.push(`Type: ${segment.segmentType}`)
    if (segment.storyName) lines.push(`Story: ${segment.storyName}`)
    if (taggedWrestlers.length > 0) lines.push(`Tagged: ${taggedWrestlers.join(', ')}`)
    if (segment.description?.trim()) lines.push(`Description: ${segment.description.trim()}`)
    return lines.join('\n')
  }

  const handleCopyDayCardText = async () => {
    const lines = [titleStr]

    if (dayCardItems.length > 0) {
      lines.push('', 'Show Card')
      let matchCount = 0
      let segmentCount = 0
      dayCardItems.forEach((item, index) => {
        if (item.kind === 'match') {
          lines.push(formatMatchCardText(item.match, matchCount))
          matchCount += 1
        } else {
          lines.push(formatSegmentCardText(item.segment, segmentCount))
          segmentCount += 1
        }
        if (index < dayCardItems.length - 1) lines.push('')
      })
    }

    if (dayCardItems.length === 0) {
      lines.push('', 'No matches or segments booked yet.')
    }

    const text = lines.join('\n')

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        showToast?.('Day card copied')
        return
      }
    } catch {}

    showToast?.('Clipboard copy unavailable')
  }

  const handleMoveItem = (item, direction) => {
    if (!onMoveDayCardItem) return
    const payload = item.kind === 'match'
      ? { kind: 'match', id: item.id }
      : { kind: 'segment', storyId: item.storyId, segmentIndex: item.segmentIndex, segmentId: item.segmentId }
    onMoveDayCardItem(date, payload, direction)
  }

  const handleBookSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const titleId = parseInt(fd.get('titleId'), 10) || null
    const notes = fd.get('notes') || ''
    const stipulation = fd.get('stipulation') || ''
    const mode = normalizeMode(participantCount, fd.get('mode') || matchMode)
    const layout = getTeamLayout(participantCount, mode)
    applySelectedTeamsToForm(fd, layout)
    const participantIds = layout.isTeamBased
      ? collectTeamParticipants(fd, layout)
      : collectFlatParticipants(fd, participantCount)
    onBookMatch(date, participantIds, titleId, mode, notes, stipulation)
    resetMatchForm()
  }

  const bookingLayout = getTeamLayout(participantCount, matchMode)
  const bookingEligibleTeams = getEligibleTeams(bookingLayout)
  const activeCategoryTypes = segCategory
    ? SEGMENT_CATEGORIES.find((c) => c.key === segCategory)?.types ?? []
    : []

  return (
    <Modal title={titleStr} onClose={onClose} style={{ maxWidth: isCurrentDay ? '1600px' : '800px' }}>
      {isCurrentDay && !allDone && (
        <div className="modal-banner banner-live">Current show - book matches and set all winners to advance</div>
      )}
      {isCurrentDay && allDone && (
        <div className="modal-banner banner-ready">All matches complete - click "Advance Show" to move forward</div>
      )}
      {!isCurrentDay && (
        <div className="modal-banner banner-past">Past show - view only</div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isCurrentDay ? '1fr 1fr 1fr' : '1fr',
        gap: 16,
        alignItems: 'start',
      }}>

        {/* ── COLUMN 1: Book Match ── */}
        {isCurrentDay && (
          <div>
            <SectionCard title="Book Match">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Wrestlers Filter</label>
                  <select value={wrestlerFilter} onChange={(e) => setWrestlerFilter(e.target.value)} style={smallSelectStyle}>
                    <option value="current">Current show</option>
                    <option value="all">All brands</option>
                    {availableShowOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Titles Filter</label>
                  <select value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)} style={smallSelectStyle}>
                    <option value="current">Current show</option>
                    <option value="all">All brands</option>
                    {availableShowOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <form key={matchFormKey} onSubmit={handleBookSubmit}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Participants</label>
                    <select name="participantCount" value={participantCount} onChange={(e) => setParticipantCount(parseInt(e.target.value, 10))} style={smallSelectStyle}>
                      {ALLOWED_PARTICIPANT_COUNTS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {getAllowedModes(participantCount).length > 1 && (
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Match Style</label>
                      <select name="mode" value={matchMode} onChange={(e) => setMatchMode(e.target.value)} style={smallSelectStyle}>
                        {getAllowedModes(participantCount).map((m) => <option key={m} value={m}>{getMatchTypeLabel(participantCount, m)}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                  Match Type: <strong>{getMatchTypeLabel(participantCount, matchMode)}</strong>
                </div>

                {!bookingLayout.isTeamBased && (
                  <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                    {Array.from({ length: participantCount }).map((_, i) => (
                      <select key={i} name={`participant_${i}`} defaultValue="" style={{ ...selectStyle, width: '100%' }}>
                        <option value="">Participant {i + 1}</option>
                        {bookingWrestlers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    ))}
                  </div>
                )}

                {bookingLayout.isTeamBased && (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bookingLayout.teams.length}, minmax(0, 1fr))`, gap: 12, marginBottom: 12 }}>
                    {bookingLayout.teams.map((team, teamIndex) => (
                      <div key={team.label}>
                        {bookingEligibleTeams.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Saved {team.size === 2 ? 'Tag Team' : 'Trios Team'}</div>
                            <select name={`team${teamIndex}_saved`} defaultValue="" style={{ ...selectStyle, width: '100%' }}>
                              <option value="">Manual selection</option>
                              {bookingEligibleTeams.map((eligibleTeam) => <option key={eligibleTeam.id} value={eligibleTeam.id}>{eligibleTeam.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{team.label}</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {Array.from({ length: team.size }).map((_, i) => (
                            <select key={i} name={`team${teamIndex}_${i}`} defaultValue="" style={{ ...selectStyle, width: '100%' }}>
                              <option value="">Select wrestler</option>
                              {bookingWrestlers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <label>Stipulation (optional)</label>
                  <input name="stipulation" defaultValue="" placeholder="e.g. Casket Match, No DQ, Iron Man" style={{ ...selectStyle, width: '100%' }} />
                </div>

                <div className="form-group">
                  <label>Title on the line (optional)</label>
                  <select name="titleId" defaultValue="" style={{ ...selectStyle, flex: 'unset', width: '100%' }}>
                    <option value="">- No title match -</option>
                    {bookingTitles.map((t) => {
                      const champNames = getChampIds(t).map((id) => getW(id)?.name).filter(Boolean)
                      return <option key={t.id} value={t.id}>{t.name} [{getTitleType(t)}] {champNames.length > 0 ? `(C: ${champNames.join(' / ')})` : '(Vacant)'}</option>
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Match Notes</label>
                  <textarea name="notes" defaultValue="" placeholder="What happened in the match?" rows={5} style={{ ...selectStyle, width: '100%', resize: 'vertical' }} />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                  <button type="submit" className="btn btn-primary">Book Match</button>
                </div>
              </form>
            </SectionCard>
          </div>
        )}

        {/* ── COLUMN 2: Show Card (matches + segments for this day) ── */}
        <div>
          <SectionCard title={isCurrentDay ? 'Match Card' : 'Show Card'}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyDayCardText}>
                Copy Day Card
              </button>
            </div>
            {dayCardItems.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>No matches or segments booked yet.</div>
            )}

            {dayCardItems.length > 0 && (
              <div style={{ display: 'grid', gap: 12 }}>
                {dayCardItems.map((item, i) => {
                  if (item.kind === 'segment') {
                    const seg = item.segment
                    const taggedWrestlers = (seg.wrestlerIds || []).map((id) => getW(id)).filter(Boolean)
                    const typeColor = segmentTypeBadgeColor(seg.segmentType)
                    const isEditingThisSegment = editingSegmentId === seg.id
                    const editActiveCategoryTypes = editSegCategory
                      ? SEGMENT_CATEGORIES.find((category) => category.key === editSegCategory)?.types ?? []
                      : []
                    return (
                      <div key={`segment-${seg.storyId}-${seg.segmentIndex}`} style={{
                        padding: '10px 12px', background: 'var(--bg3)',
                        border: '1px solid var(--border2)', borderLeft: '3px solid #9b59b6',
                        borderRadius: 'var(--radius)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className="match-num">Segment {i + 1}</span>
                            {seg.segmentType && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: typeColor + '22', color: typeColor, border: `1px solid ${typeColor}44` }}>
                                {seg.segmentType}
                              </span>
                            )}
                            {seg.storyName && <span style={{ fontSize: 10, color: 'var(--text2)' }}>→ {seg.storyName}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleMoveItem(item, 'up')} disabled={i === 0}>Up</button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleMoveItem(item, 'down')} disabled={i === dayCardItems.length - 1}>Down</button>
                            {isCurrentDay && onUpdateSegment && (
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEditingSegment(seg)}>
                                Edit
                              </button>
                            )}
                            {isCurrentDay && onDeleteSegment && (
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteSegment(seg.storyId, seg.segmentIndex, seg.id)}>Delete</button>
                            )}
                          </div>
                        </div>
                        {!isEditingThisSegment && (
                          <>
                            {seg.title && <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{seg.title}</div>}
                            {seg.description && <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{seg.description}</div>}
                            {taggedWrestlers.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {taggedWrestlers.map((w) => (
                                  <span key={w.id} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius)', background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border2)' }}>
                                    {w.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        {isEditingThisSegment && (
                          <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Segment Title</label>
                              <input value={editSegTitle} onChange={(e) => setEditSegTitle(e.target.value)} placeholder="Segment title" style={{ ...selectStyle, width: '100%' }} />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Segment Description</label>
                              <textarea value={editSegDescription} onChange={(e) => setEditSegDescription(e.target.value.slice(0, 3000))} rows={5} style={{ ...selectStyle, width: '100%', resize: 'vertical' }} />
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Segment Type</label>
                                {(editSegCategory || editSegType) && (
                                  <button type="button" onClick={() => { setEditSegCategory(null); setEditSegType(null) }} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                                    Clear
                                  </button>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                {SEGMENT_CATEGORIES.map((category) => (
                                  <button
                                    key={category.key}
                                    type="button"
                                    onClick={() => { setEditSegCategory(editSegCategory === category.key ? null : category.key); setEditSegType(null) }}
                                    style={{
                                      padding: '5px 10px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                      background: editSegCategory === category.key ? 'var(--red, #c0392b)' : 'var(--bg2)',
                                      borderColor: editSegCategory === category.key ? 'var(--red, #c0392b)' : 'var(--border2)',
                                      color: editSegCategory === category.key ? '#fff' : 'var(--text)',
                                    }}
                                  >
                                    {category.label}
                                  </button>
                                ))}
                              </div>
                              {editSegCategory && editActiveCategoryTypes.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                  {editActiveCategoryTypes.map((type) => (
                                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                                      <input type="radio" name={`editSegType-${seg.id}`} value={type} checked={editSegType === type} onChange={() => setEditSegType(type)} style={{ accentColor: 'var(--red, #c0392b)', cursor: 'pointer' }} />
                                      {type}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Tagged Wrestlers</label>
                              <input value={editSegWrestlerSearch} onChange={(e) => setEditSegWrestlerSearch(e.target.value)} placeholder="Search by name..." style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 10px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                              <select value={editSegWrestlerBrand} onChange={(e) => setEditSegWrestlerBrand(e.target.value)} style={{ ...smallSelectStyle, fontSize: 12, marginBottom: 8 }}>
                                <option value="all">All Brands</option>
                                <option value="current">Current Show</option>
                                {availableShowOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--bg2)' }}>
                                {editSegmentWrestlers.length === 0 && (
                                  <div style={{ padding: 12, fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>No wrestlers found</div>
                                )}
                                {editSegmentWrestlers.map((w) => (
                                  <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: editSegSelectedWrestlers.includes(w.id) ? 'rgba(192,57,43,0.08)' : 'transparent' }}>
                                    <input type="checkbox" checked={editSegSelectedWrestlers.includes(w.id)} onChange={() => toggleEditSegWrestler(w.id)} style={{ accentColor: 'var(--red, #c0392b)', cursor: 'pointer' }} />
                                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{w.name}</span>
                                    {w.show && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 'auto' }}>{w.show}</span>}
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="form-actions" style={{ marginTop: 0 }}>
                              <button type="button" className="btn btn-secondary" onClick={resetEditSegmentForm}>Cancel</button>
                              <button type="button" className="btn btn-primary" onClick={() => handleSaveSegmentEdit(seg)} disabled={!editSegTitle.trim()}>
                                Save Segment
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }

                  const m = item.match
                  const participantIds = getParticipantIdsFromMatch(m)
                  const participants = participantIds.map(getW).filter(Boolean)
                  const teams = getTeamsFromMatch(m)
                  const titleMatch = m.titleId ? getT(m.titleId) : null
                  const isEditingThisMatch = editingMatchId === m.id
                  const editWrestlers = getAvailableWrestlers(participantIds)
                  const editTitles = getAvailableTitles(editParticipantCount, editMatchMode, m.titleId)
                  const editLayout = getTeamLayout(editParticipantCount, editMatchMode)
                  const editEligibleTeams = getEligibleTeams(editLayout)
                  const hasNotes = !!m.notes?.trim()
                  const isNotesExpanded = expandedNotesId === m.id
                  return (
                    <div key={`match-${m.id}`} className="match-card">
                      <div className="match-header-row">
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="match-num">Match {i + 1} - {m.matchType || getMatchTypeLabel(participantIds.length, m.mode)}</span>
                          {i === 0 && <span className="badge badge-gold" style={{ fontSize: 10 }}>Main Event</span>}
                          {m.stipulation && <span className="badge badge-gray" style={{ fontSize: 10 }}>{m.stipulation}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleMoveItem(item, 'up')} disabled={i === 0}>Up</button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleMoveItem(item, 'down')} disabled={i === dayCardItems.length - 1}>Down</button>
                          {titleMatch && <span className="badge badge-gold" style={{ fontSize: 10 }}>[B] {titleMatch.name.split(' ')[0]} Title</span>}
                        </div>
                      </div>
                      {!isEditingThisMatch && (
                        <>
                          {!teams && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                              {participants.map((w) => (
                                <button key={w.id} className={`winner-btn${m.winnerId === w.id ? ' selected' : ''}`} onClick={() => isCurrentDay && onSetWinner(m.id, w.id)} disabled={!isCurrentDay}>{w.name}</button>
                              ))}
                            </div>
                          )}
                          {teams && (
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))`, gap: 12, marginTop: 10, alignItems: 'start' }}>
                              {teams.map((teamIds, teamIndex) => (
                                <div key={`team-${teamIndex}`}>
                                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Team {String.fromCharCode(65 + teamIndex)}</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {teamIds.map((id) => {
                                      const w = getW(id); if (!w) return null
                                      return <button key={id} className={`winner-btn${m.winnerId === id ? ' selected' : ''}`} onClick={() => isCurrentDay && onSetWinner(m.id, id)} disabled={!isCurrentDay}>{w.name}</button>
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {m.winnerId && <div className="match-winner-label">Winner: {getW(m.winnerId)?.name}</div>}
                          <MatchRatingInput
                            rating={m.rating ?? null}
                            disabled={!isCurrentDay || !m.winnerId || !onSetMatchRating}
                            onChange={(rating) => onSetMatchRating?.(m.id, rating)}
                          />
                          {hasNotes && (
                            <div style={{ marginTop: 8 }}>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpandedNotesId(isNotesExpanded ? null : m.id)}>
                                {isNotesExpanded ? 'Hide Notes' : 'Show Notes'}
                              </button>
                              {isNotesExpanded && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, whiteSpace: 'pre-wrap', padding: 10, border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--bg2)' }}>{m.notes}</div>}
                            </div>
                          )}
                          {canEditMatch(m) && (
                            <div className="form-actions" style={{ marginTop: 10 }}>
                              <button type="button" className="btn btn-secondary" onClick={() => startEditingMatch(m)}>Edit Match</button>
                              <button type="button" className="btn btn-danger" onClick={() => onDeleteMatch(m.id)}>Delete Match</button>
                            </div>
                          )}
                        </>
                      )}
                      {isEditingThisMatch && (
                        <form onSubmit={(e) => handleUpdateSubmit(e, m)} style={{ marginTop: 12 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Participants</label>
                              <select name="participantCount" value={editParticipantCount} onChange={(e) => setEditParticipantCount(parseInt(e.target.value, 10))} style={smallSelectStyle}>
                                {ALLOWED_PARTICIPANT_COUNTS.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            {getAllowedModes(editParticipantCount).length > 1 && (
                              <div>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Match Style</label>
                                <select name="mode" value={editMatchMode} onChange={(e) => setEditMatchMode(e.target.value)} style={smallSelectStyle}>
                                  {getAllowedModes(editParticipantCount).map((m2) => <option key={m2} value={m2}>{getMatchTypeLabel(editParticipantCount, m2)}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                            Match Type: <strong>{getMatchTypeLabel(editParticipantCount, editMatchMode)}</strong>
                          </div>
                          {!editLayout.isTeamBased && (
                            <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                              {Array.from({ length: editParticipantCount }).map((_, index) => (
                                <select key={index} name={`participant_${index}`} defaultValue={getParticipantIdsFromMatch(m)[index] ?? ''} style={{ ...selectStyle, width: '100%' }}>
                                  <option value="">Participant {index + 1}</option>
                                  {editWrestlers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                              ))}
                            </div>
                          )}
                          {editLayout.isTeamBased && (
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${editLayout.teams.length}, minmax(0, 1fr))`, gap: 12, marginBottom: 12 }}>
                              {(() => {
                                let participantOffset = 0
                                return editLayout.teams.map((team, teamIndex) => {
                                  const teamStart = participantOffset
                                  participantOffset += team.size
                                  return (
                                    <div key={team.label}>
                                      {editEligibleTeams.length > 0 && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Saved {team.size === 2 ? 'Tag Team' : 'Trios Team'}</div><select name={`team${teamIndex}_saved`} defaultValue="" style={{ ...selectStyle, width: '100%' }}><option value="">Manual selection</option>{editEligibleTeams.map((eligibleTeam) => <option key={eligibleTeam.id} value={eligibleTeam.id}>{eligibleTeam.name}</option>)}</select></div>}
                                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{team.label}</div>
                                      <div style={{ display: 'grid', gap: 8 }}>
                                        {Array.from({ length: team.size }).map((_, index) => (
                                          <select key={index} name={`team${teamIndex}_${index}`} defaultValue={getParticipantIdsFromMatch(m)[teamStart + index] ?? ''} style={{ ...selectStyle, width: '100%' }}>
                                            <option value="">Select wrestler</option>
                                            {editWrestlers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                          </select>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })
                              })()}
                            </div>
                          )}
                          <div className="form-group"><label>Stipulation (optional)</label><input name="stipulation" defaultValue={m.stipulation || ''} placeholder="e.g. Casket Match, No DQ, Iron Man" style={{ ...selectStyle, width: '100%' }} /></div>
                          <div className="form-group"><label>Title on the line (optional)</label><select name="titleId" defaultValue={m.titleId ?? ''} style={{ ...selectStyle, flex: 'unset', width: '100%' }}><option value="">- No title match -</option>{editTitles.map((t) => { const champNames = getChampIds(t).map((id) => getW(id)?.name).filter(Boolean); return <option key={t.id} value={t.id}>{t.name} [{getTitleType(t)}] {champNames.length > 0 ? `(C: ${champNames.join(' / ')})` : '(Vacant)'}</option> })}</select></div>
                          <div className="form-group"><label>Match Notes</label><textarea name="notes" defaultValue={m.notes || ''} placeholder="What happened in the match?" rows={4} style={{ ...selectStyle, width: '100%', resize: 'vertical' }} /></div>
                          <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setEditingMatchId(null)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Match</button>
                          </div>
                        </form>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Matches */}
            {false && orderedMatches.length > 0 && (
              <div style={{ display: 'grid', gap: 12 }}>
                {orderedMatches.map((m, i) => {
                  const participantIds = getParticipantIdsFromMatch(m)
                  const participants = participantIds.map(getW).filter(Boolean)
                  const teams = getTeamsFromMatch(m)
                  const titleMatch = m.titleId ? getT(m.titleId) : null
                  const isEditingThisMatch = editingMatchId === m.id
                  const editWrestlers = getAvailableWrestlers(participantIds)
                  const editTitles = getAvailableTitles(editParticipantCount, editMatchMode, m.titleId)
                  const editLayout = getTeamLayout(editParticipantCount, editMatchMode)
                  const editEligibleTeams = getEligibleTeams(editLayout)
                  const teamAIds = teams ? teams[0] : []
                  const teamBIds = teams ? teams[1] : []
                  const isMainEvent = i === 0
                  const hasNotes = !!m.notes?.trim()
                  const isNotesExpanded = expandedNotesId === m.id

                  return (
                    <div key={m.id} className="match-card">
                      <div className="match-header-row">
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="match-num">Match {i + 1} - {m.matchType || getMatchTypeLabel(participantIds.length, m.mode)}</span>
                          {isMainEvent && <span className="badge badge-gold" style={{ fontSize: 10 }}>Main Event</span>}
                          {m.stipulation && <span className="badge badge-gray" style={{ fontSize: 10 }}>{m.stipulation}</span>}
                        </div>
                        {titleMatch && <span className="badge badge-gold" style={{ fontSize: 10 }}>[B] {titleMatch.name.split(' ')[0]} Title</span>}
                      </div>

                      {!isEditingThisMatch && (
                        <>
                          {!teams && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                              {participants.map((w) => (
                                <button key={w.id} className={`winner-btn${m.winnerId === w.id ? ' selected' : ''}`}
                                  onClick={() => isCurrentDay && onSetWinner(m.id, w.id)} disabled={!isCurrentDay}>
                                  {w.name}
                                </button>
                              ))}
                            </div>
                          )}

                          {teams && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, marginTop: 10, alignItems: 'start' }}>
                              <div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Team A</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {teamAIds.map((id) => {
                                    const w = getW(id); if (!w) return null
                                    return <button key={id} className={`winner-btn${m.winnerId === id ? ' selected' : ''}`}
                                      onClick={() => isCurrentDay && onSetWinner(m.id, id)} disabled={!isCurrentDay}>{w.name}</button>
                                  })}
                                </div>
                              </div>
                              <div style={{ alignSelf: 'center', fontWeight: 700, color: 'var(--text3)' }}>VS</div>
                              <div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Team B</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {teamBIds.map((id) => {
                                    const w = getW(id); if (!w) return null
                                    return <button key={id} className={`winner-btn${m.winnerId === id ? ' selected' : ''}`}
                                      onClick={() => isCurrentDay && onSetWinner(m.id, id)} disabled={!isCurrentDay}>{w.name}</button>
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {m.winnerId && <div className="match-winner-label">Winner: {getW(m.winnerId)?.name}</div>}

                          {hasNotes && (
                            <div style={{ marginTop: 8 }}>
                              <button type="button" className="btn btn-secondary btn-sm"
                                onClick={() => setExpandedNotesId(isNotesExpanded ? null : m.id)}>
                                {isNotesExpanded ? 'Hide Notes' : 'Show Notes'}
                              </button>
                              {isNotesExpanded && (
                                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, whiteSpace: 'pre-wrap', padding: 10, border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--bg2)' }}>
                                  {m.notes}
                                </div>
                              )}
                            </div>
                          )}

                          {canEditMatch(m) && (
                            <div className="form-actions" style={{ marginTop: 10 }}>
                              <button type="button" className="btn btn-secondary" onClick={() => startEditingMatch(m)}>Edit Match</button>
                              <button type="button" className="btn btn-danger" onClick={() => onDeleteMatch(m.id)}>Delete Match</button>
                            </div>
                          )}
                        </>
                      )}

                      {isEditingThisMatch && (
                        <form onSubmit={(e) => handleUpdateSubmit(e, m)} style={{ marginTop: 12 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Participants</label>
                              <select name="participantCount" value={editParticipantCount} onChange={(e) => setEditParticipantCount(parseInt(e.target.value, 10))} style={smallSelectStyle}>
                                {ALLOWED_PARTICIPANT_COUNTS.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            {getAllowedModes(editParticipantCount).length > 1 && (
                              <div>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Match Style</label>
                                <select name="mode" value={editMatchMode} onChange={(e) => setEditMatchMode(e.target.value)} style={smallSelectStyle}>
                                  {getAllowedModes(editParticipantCount).map((m) => <option key={m} value={m}>{getMatchTypeLabel(editParticipantCount, m)}</option>)}
                                </select>
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                            Match Type: <strong>{getMatchTypeLabel(editParticipantCount, editMatchMode)}</strong>
                          </div>

                          {!editLayout.isTeamBased && (
                            <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                              {Array.from({ length: editParticipantCount }).map((_, index) => (
                                <select key={index} name={`participant_${index}`} defaultValue={getParticipantIdsFromMatch(m)[index] ?? ''} style={{ ...selectStyle, width: '100%' }}>
                                  <option value="">Participant {index + 1}</option>
                                  {editWrestlers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                              ))}
                            </div>
                          )}

                          {editLayout.isTeamBased && (
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${editLayout.teams.length}, minmax(0, 1fr))`, gap: 12, marginBottom: 12 }}>
                              {(() => {
                                let participantOffset = 0
                                return editLayout.teams.map((team, teamIndex) => {
                                  const teamStart = participantOffset
                                  participantOffset += team.size
                                  return (
                                    <div key={team.label}>
                                      {editEligibleTeams.length > 0 && (
                                        <div style={{ marginBottom: 8 }}>
                                          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Saved {team.size === 2 ? 'Tag Team' : 'Trios Team'}</div>
                                          <select name={`team${teamIndex}_saved`} defaultValue="" style={{ ...selectStyle, width: '100%' }}>
                                            <option value="">Manual selection</option>
                                            {editEligibleTeams.map((eligibleTeam) => <option key={eligibleTeam.id} value={eligibleTeam.id}>{eligibleTeam.name}</option>)}
                                          </select>
                                        </div>
                                      )}
                                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{team.label}</div>
                                      <div style={{ display: 'grid', gap: 8 }}>
                                        {Array.from({ length: team.size }).map((_, index) => (
                                          <select key={index} name={`team${teamIndex}_${index}`} defaultValue={getParticipantIdsFromMatch(m)[teamStart + index] ?? ''} style={{ ...selectStyle, width: '100%' }}>
                                            <option value="">Select wrestler</option>
                                            {editWrestlers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                          </select>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })
                              })()}
                            </div>
                          )}

                          <div className="form-group">
                            <label>Stipulation (optional)</label>
                            <input name="stipulation" defaultValue={m.stipulation || ''} placeholder="e.g. Casket Match, No DQ, Iron Man" style={{ ...selectStyle, width: '100%' }} />
                          </div>

                          <div className="form-group">
                            <label>Title on the line (optional)</label>
                            <select name="titleId" defaultValue={m.titleId ?? ''} style={{ ...selectStyle, flex: 'unset', width: '100%' }}>
                              <option value="">- No title match -</option>
                              {editTitles.map((t) => {
                                const champNames = getChampIds(t).map((id) => getW(id)?.name).filter(Boolean)
                                return <option key={t.id} value={t.id}>{t.name} [{getTitleType(t)}] {champNames.length > 0 ? `(C: ${champNames.join(' / ')})` : '(Vacant)'}</option>
                              })}
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Match Notes</label>
                            <textarea name="notes" defaultValue={m.notes || ''} placeholder="What happened in the match?" rows={4} style={{ ...selectStyle, width: '100%', resize: 'vertical' }} />
                          </div>

                          <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setEditingMatchId(null)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Match</button>
                          </div>
                        </form>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Segments booked on this day */}
            {false && daySegments.length > 0 && (
              <div style={{ marginTop: orderedMatches.length > 0 ? 16 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                  Segments ({daySegments.length})
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {daySegments.map((seg, i) => {
                    const taggedWrestlers = (seg.wrestlerIds || []).map((id) => getW(id)).filter(Boolean)
                    const typeColor = segmentTypeBadgeColor(seg.segmentType)
                    return (
                      <div key={i} style={{
                        padding: '10px 12px', background: 'var(--bg3)',
                        border: '1px solid var(--border2)', borderLeft: '3px solid #9b59b6',
                        borderRadius: 'var(--radius)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {seg.segmentType && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: typeColor + '22', color: typeColor, border: `1px solid ${typeColor}44` }}>
                                {seg.segmentType}
                              </span>
                            )}
                            {seg.storyName && (
                              <span style={{ fontSize: 10, color: 'var(--text2)' }}>→ {seg.storyName}</span>
                            )}
                          </div>
                          {isCurrentDay && onDeleteSegment && (
                            <button type="button" onClick={() => onDeleteSegment(seg.storyId, seg.segmentIndex)}
                              style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                              title="Remove segment">×</button>
                          )}
                        </div>
                        {seg.title && (
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{seg.title}</div>
                        )}
                        {seg.description && (
                          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{seg.description}</div>
                        )}
                        {taggedWrestlers.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {taggedWrestlers.map((w) => (
                              <span key={w.id} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius)', background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border2)' }}>
                                {w.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── COLUMN 3: Book Segment ── */}
        {isCurrentDay && (
          <div>
            <SectionCard title="Book Segment">
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 0, marginBottom: 14 }}>
                Book a promo, interview, or other non-match segment.
              </p>

              <form onSubmit={handleBookSegment}>
                <div className="form-group">
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Segment Title</label>
                  <input type="text" value={segTitle} onChange={(e) => setSegTitle(e.target.value)}
                    placeholder="e.g., 'The Challenge'"
                    style={{ width: '100%', background: 'var(--bg3)', border: `1px solid ${segTitle ? 'var(--border2)' : 'var(--red, #e74c3c)'}`, color: 'var(--text)', padding: '8px 10px', borderRadius: 'var(--radius)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Story Attachment</label>
                  <select value={segStoryId} onChange={(e) => setSegStoryId(e.target.value)} style={{ ...selectStyle, width: '100%', flex: 'unset' }}>
                    <option value="">No story (standalone segment)</option>
                    <option value="auto">Auto-detect from tagged wrestlers</option>
                    {stories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                    {segStoryId === 'auto'
                      ? 'Auto-attaches based on tagged wrestlers'
                      : segStoryId
                      ? `Saves to "${stories.find(s => s.id === parseInt(segStoryId))?.name}"`
                      : 'Saves as a standalone calendar segment'}
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Segment Description</label>
                  <textarea value={segDescription} onChange={(e) => setSegDescription(e.target.value.slice(0, 3000))}
                    placeholder="e.g., 'The champion addresses the crowd...'"
                    rows={4}
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '8px 10px', borderRadius: 'var(--radius)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'right', marginTop: 3 }}>{segDescription.length}/3000</div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Segment Type (Optional)</label>
                    {(segCategory || segType) && (
                      <button type="button" onClick={() => { setSegCategory(null); setSegType(null) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Clear</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {SEGMENT_CATEGORIES.map((cat) => (
                      <button key={cat.key} type="button"
                        onClick={() => { setSegCategory(segCategory === cat.key ? null : cat.key); setSegType(null) }}
                        style={{
                          padding: '5px 10px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                          background: segCategory === cat.key ? 'var(--red, #c0392b)' : 'var(--bg3)',
                          borderColor: segCategory === cat.key ? 'var(--red, #c0392b)' : 'var(--border2)',
                          color: segCategory === cat.key ? '#fff' : 'var(--text)',
                        }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {segCategory && activeCategoryTypes.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {activeCategoryTypes.map((type) => (
                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                          <input type="radio" name="segType" value={type} checked={segType === type} onChange={() => setSegType(type)} style={{ accentColor: 'var(--red, #c0392b)', cursor: 'pointer' }} />
                          {type}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Tag Wrestlers (Optional)</label>
                  <input type="text" value={segWrestlerSearch} onChange={(e) => setSegWrestlerSearch(e.target.value)}
                    placeholder="Search by name..."
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 10px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
                  />
                  <select value={segWrestlerBrand} onChange={(e) => setSegWrestlerBrand(e.target.value)} style={{ ...smallSelectStyle, fontSize: 12, marginBottom: 8 }}>
                    <option value="all">All Brands</option>
                    <option value="current">Current Show</option>
                    {availableShowOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--bg3)' }}>
                    {segmentWrestlers.length === 0 && (
                      <div style={{ padding: 12, fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>No wrestlers found</div>
                    )}
                    {segmentWrestlers.map((w) => (
                      <label key={w.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)', transition: 'background 0.15s',
                        background: segSelectedWrestlers.includes(w.id) ? 'rgba(192,57,43,0.08)' : 'transparent',
                      }}>
                        <input type="checkbox" checked={segSelectedWrestlers.includes(w.id)} onChange={() => toggleSegWrestler(w.id)} style={{ accentColor: 'var(--red, #c0392b)', cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{w.name}</span>
                        {w.show && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 'auto' }}>{w.show}</span>}
                      </label>
                    ))}
                  </div>
                  {segSelectedWrestlers.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text2)' }}>
                      {segSelectedWrestlers.length} wrestler{segSelectedWrestlers.length > 1 ? 's' : ''} tagged
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                  <button type="submit" className="btn btn-primary" disabled={!segTitle.trim()}>Book Segment</button>
                </div>
              </form>
            </SectionCard>
          </div>
        )}
      </div>
    </Modal>
  )
}
