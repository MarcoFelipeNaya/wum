import React, { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiRefreshCw, FiZap } from 'react-icons/fi'
import Modal from './Modal.jsx'
import { addDays, DAY_NAMES, fmt, getCustomDow, formatUniverseDate, daysBetween } from '../utils/dates.js'
import { getCalendarEventsOnDate, specialShowOccursOnDate } from '../utils/calendarEvents.js'
import { RIVALRY_STORY_TEMPLATES } from '../utils/heatSparkTemplates.js'
import { buildRankings } from '../utils/rankings.js'
import './Creative.css'

const MATCH_GOALS = [
  { value: 'any', label: 'Any Spark' },
  { value: 'contender', label: 'Contender Match' },
  { value: 'champion_showcase', label: 'Champion Showcase' },
  { value: 'underused', label: 'Underused Talent' },
  { value: 'rivalry', label: 'Rivalry Escalation' },
  { value: 'faction_warfare', label: 'Faction Warfare' },
]

const MATCH_FORMATS = [
  { value: 'auto', label: 'Auto' },
  { value: 'singles', label: 'Singles' },
  { value: 'tag', label: 'Tag' },
  { value: 'trios', label: 'Trios' },
  { value: 'title', label: 'Title' },
]

const RELATIONSHIP_STORY_MODE_TYPES = [
  'Rival',
  'Ally',
  'Respect',
  'Former Partner',
  'Betrayed',
  'Unfinished Business',
  'Mentor',
  'Student',
  'Owes Favor',
]

const getRelationshipStoryModeValue = (type) => `relationship:${type}`

const STORY_MODES = [
  { value: 'auto', label: 'Auto' },
  { value: 'relationship_arc', label: 'Relationship Arc' },
  ...RELATIONSHIP_STORY_MODE_TYPES.map((type) => ({
    value: getRelationshipStoryModeValue(type),
    label: type,
  })),
  { value: 'title_chase', label: 'Title Chase' },
  { value: 'rivalry', label: 'Rivalry' },
  { value: 'faction_war', label: 'Faction War' },
  { value: 'comeback', label: 'Comeback Arc' },
  { value: 'underdog', label: 'Underdog Push' },
]

const RIVALRY_RELATIONSHIP_TYPES = ['Rival', 'Former Partner', 'Betrayed', 'Unfinished Business', 'Respect']

const SEGMENT_TYPE_OPTIONS = [
  'Random',
  'Promo',
  'Brawl / Beatdown',
  'Backstage Interview',
  'Contract Signing',
  'Video Package',
  'Celebration',
  'Return / Surprise',
]
const SEGMENT_TYPES = SEGMENT_TYPE_OPTIONS.filter((type) => type !== 'Random')
const SEGMENT_TEMPLATES = {
  Promo: [
    { title: 'Last Word', beat: 'cuts a direct callout and forces the next confrontation into the open', outcome: 'verbal momentum shifts before the bell' },
    { title: 'Open Challenge', beat: 'throws out a challenge and dares the locker room to answer', outcome: 'a new matchup is put on the board' },
    { title: 'Line In The Ash', beat: 'draws a hard boundary and makes the feud personal', outcome: 'the crowd gets a clear side to choose' },
  ],
  'Brawl / Beatdown': [
    { title: 'Ambush Point', beat: 'turns a tense exchange into a sudden attack', outcome: 'officials are forced to separate everyone' },
    { title: 'Pull-Apart Warning', beat: 'erupts into a pull-apart brawl before the match can happen', outcome: 'the next meeting feels more dangerous' },
    { title: 'Numbers Game', beat: 'uses backup to overwhelm the opposition', outcome: 'revenge becomes the obvious next beat' },
  ],
  'Backstage Interview': [
    { title: 'Camera Catches Fire', beat: 'uses an interview to reveal intent, frustration, or a hidden agenda', outcome: 'the interviewer leaves with a headline quote' },
    { title: 'Interrupted Answer', beat: 'starts as a calm interview before another name steps into frame', outcome: 'a challenge or accusation lands cleanly' },
    { title: 'Pressure Question', beat: 'answers a hard question about recent momentum', outcome: 'the segment reframes the talent for the next card' },
  ],
  'Contract Signing': [
    { title: 'Ink And Impact', beat: 'turns the contract table into a final warning shot', outcome: 'the match feels official and unstable' },
    { title: 'No Handshake', beat: 'refuses the expected handshake and escalates the tension', outcome: 'the signed match gains a sharper edge' },
    { title: 'Fine Print', beat: 'adds one final condition before the signatures are locked in', outcome: 'the stakes become harder to ignore' },
  ],
  'Video Package': [
    { title: 'Receipts Reel', beat: 'recaps the damage, insults, and turning points that led here', outcome: 'the audience gets a clean reason to care' },
    { title: 'Road To The Fight', beat: 'frames the matchup as a career checkpoint', outcome: 'the next match feels bigger than a random booking' },
    { title: 'History Lesson', beat: 'uses archival moments to show how deep the issue runs', outcome: 'the feud gains context without using ring time' },
  ],
  Celebration: [
    { title: 'Victory Lap', beat: 'celebrates recent success just long enough for tension to enter the room', outcome: 'the celebration becomes a target' },
    { title: 'Toast Cut Short', beat: 'turns a feel-good moment into a challenge from the next threat', outcome: 'a new direction emerges naturally' },
    { title: 'Gold Standard', beat: 'uses the celebration to remind everyone who controls the division', outcome: 'the champion or winner looks important' },
  ],
  'Return / Surprise': [
    { title: 'Unannounced Arrival', beat: 'brings someone back into the universe at the worst possible moment', outcome: 'the power balance changes instantly' },
    { title: 'Music Hits', beat: 'interrupts the segment with a surprise entrance', outcome: 'the crowd gets a clear shock moment' },
    { title: 'Hidden Card', beat: 'reveals an unexpected ally, rival, or challenger', outcome: 'the next card has a new problem to solve' },
  ],
}

function getParticipantIds(match) {
  if (Array.isArray(match?.participantIds) && match.participantIds.length > 0) return match.participantIds
  return [match?.w1, match?.w2].filter(Boolean)
}

function getChampIds(title) {
  if (Array.isArray(title?.champIds) && title.champIds.length > 0) return title.champIds
  return title?.champId ? [title.champId] : []
}

function getPersonName(wrestlers, id) {
  return wrestlers.find((wrestler) => wrestler.id === id)?.name || 'Unknown'
}

function joinReasons(reasons) {
  const clean = reasons.filter(Boolean)
  if (clean.length === 0) return 'They fit the selected filters and give the card a fresh direction.'
  if (clean.length === 1) return clean[0]
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`
}

function getBookingOptionLabel(option) {
  if (!option?.date) return option?.label || ''
  const showLabel = String(option.label || '').replace(`${option.date} - `, '').trim()
  return `${formatUniverseDate(option.date, { includeYear: false })} - ${showLabel}`
}

function getMatchSlotLabel(mode, index) {
  if (mode === 'tag') return index < 2 ? `Team A ${index + 1}` : `Team B ${index - 1}`
  if (mode === 'trios') return index < 3 ? `Team A ${index + 1}` : `Team B ${index - 2}`
  return index === 0 ? 'Side A' : 'Side B'
}

function getMatchHeadline(wrestlers, participantIds, mode) {
  const names = participantIds.map((id) => getPersonName(wrestlers, id))
  if (mode === 'tag') return `${names.slice(0, 2).join(' / ')} vs ${names.slice(2).join(' / ')}`
  if (mode === 'trios') return `${names.slice(0, 3).join(' / ')} vs ${names.slice(3).join(' / ')}`
  return names.join(' vs ')
}

function getTeamShow(team, wrestlers) {
  if (team?.show) return team.show
  const firstMember = wrestlers.find((wrestler) => wrestler.id === team?.memberIds?.[0])
  return firstMember?.show || 'Universe'
}

function getTeamMembersLabel(team, wrestlers) {
  return (team?.memberIds || []).map((id) => getPersonName(wrestlers, id)).join(' / ')
}

function pickWeighted(items, seed = 0) {
  if (!items.length) return null
  const total = items.reduce((sum, item) => sum + Math.max(1, item.weight || 1), 0)
  const hashed = Math.abs(Math.sin((seed + 1) * 99991) * 1000000)
  let cursor = (Math.floor(hashed) % total) + 1
  for (const item of items) {
    cursor -= Math.max(1, item.weight || 1)
    if (cursor <= 0) return item
  }
  return items[0]
}

function rotateBySeed(items, seed = 0) {
  if (!items.length) return items
  const offset = Math.floor(Math.abs(Math.sin((seed + 13) * 104729) * 1000000)) % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

function indexFromSeed(items, seed = 0) {
  if (!items.length) return -1
  return ((seed % items.length) + items.length) % items.length
}

function getStoryParticipantIds(story, teams, factions) {
  return (story?.participants || []).flatMap((participant) => {
    if (participant.type === 'wrestler') return [participant.id]
    if (participant.type === 'team') return teams.find((team) => team.id === participant.id)?.memberIds || []
    if (participant.type === 'faction') return factions.find((faction) => faction.id === participant.id)?.memberIds || []
    return []
  })
}

export default function Creative({
  state,
  bookMatch,
  addSegment,
  addStory,
  showToast,
}) {
  const {
    wrestlers = [],
    shows = [],
    titles = [],
    matches = [],
    stories = [],
    teams = [],
    factions = [],
    relationships = [],
    specialShows = [],
    standaloneSegments = [],
    currentDate,
  } = state
  const [matchForm, setMatchForm] = useState({ show: 'all', goal: 'any', format: 'auto', activeOnly: true, avoidRematches: true })
  const [segmentForm, setSegmentForm] = useState({ show: 'all', type: 'Random', storyId: 'auto' })
  const [storyForm, setStoryForm] = useState({ show: 'all', mode: 'auto', activeOnly: true })
  const [matchSeed, setMatchSeed] = useState(1)
  const [segmentSeed, setSegmentSeed] = useState(1)
  const [storySeed, setStorySeed] = useState(1)
  const [booking, setBooking] = useState(null)

  const activeStories = stories.filter((story) => story.status !== 'Concluded')
  const competitiveRoster = wrestlers.filter((wrestler) => (wrestler.role || 'wrestler') === 'wrestler')
  const rankings = useMemo(() => buildRankings(wrestlers, matches, titles), [wrestlers, matches, titles])
  const rankMap = useMemo(() => new Map(rankings.map((row) => [row.id, row])), [rankings])
  const showOptions = useMemo(() => shows.map((show) => show.name), [shows])

  const getRecentMatchKey = (ids) => [...ids].sort((a, b) => a - b).join(':')
  const recentMatchKeys = useMemo(
    () => new Set(matches.slice(-16).map((match) => getRecentMatchKey(getParticipantIds(match)))),
    [matches]
  )

  const getTalentPickReason = (wrestlerId) => {
    const wrestler = wrestlers.find((item) => item.id === wrestlerId)
    if (!wrestler) return null
    const ranking = rankMap.get(wrestler.id)
    const lastMatch = [...matches].reverse().find((match) => getParticipantIds(match).includes(wrestler.id))
    const idleDays = lastMatch ? daysBetween(lastMatch.date, currentDate) : null
    const titleCount = titles.filter((title) => getChampIds(title).includes(wrestler.id)).length
    const activeStoryCount = activeStories.filter((story) => getStoryParticipantIds(story, teams, factions).includes(wrestler.id)).length
    const reasons = []

    if (ranking?.rank && ranking.rank <= 5) reasons.push(`ranked #${ranking.rank}`)
    if ((wrestler.streak || 0) > 0) reasons.push(`${wrestler.streak}-match win streak`)
    if ((wrestler.streak || 0) < 0) reasons.push(`${Math.abs(wrestler.streak)}-match skid`)
    if (idleDays == null) reasons.push('no completed matches yet')
    else if (idleDays > 28) reasons.push(`${idleDays} days idle`)
    if (titleCount > 0) reasons.push(`${titleCount} title${titleCount !== 1 ? 's' : ''}`)
    if (activeStoryCount > 0) reasons.push(`${activeStoryCount} active stor${activeStoryCount === 1 ? 'y' : 'ies'}`)
    if (reasons.length === 0 && wrestler.show) reasons.push(`${wrestler.show} roster fit`)

    return `${wrestler.name}: ${joinReasons(reasons)}`
  }

  const getTeamPickReason = (team) => {
    const memberReasons = (team.memberIds || [])
      .map((id) => {
        const wrestler = wrestlers.find((item) => item.id === id)
        const ranking = rankMap.get(id)
        const pieces = []
        if (ranking?.rank && ranking.rank <= 8) pieces.push(`#${ranking.rank}`)
        if ((wrestler?.streak || 0) > 0) pieces.push(`${wrestler.streak}-win streak`)
        return pieces.length ? `${wrestler?.name || 'Unknown'} ${pieces.join(', ')}` : null
      })
      .filter(Boolean)
    const faction = factions.find((item) => item.id === team.factionId)
    const teamTitles = titles.filter((title) => {
      const champIds = getChampIds(title)
      return champIds.length === (team.memberIds || []).length && champIds.every((id) => (team.memberIds || []).includes(id))
    })
    const reasons = []

    if (teamTitles.length > 0) reasons.push(`${teamTitles.length} team title${teamTitles.length !== 1 ? 's' : ''}`)
    if (faction) reasons.push(`${faction.name} faction tie`)
    if (memberReasons.length > 0) reasons.push(memberReasons.slice(0, 2).join('; '))
    if (reasons.length === 0) reasons.push(`${getTeamShow(team, wrestlers)} established team`)

    return `${team.name}: ${joinReasons(reasons)}`
  }

  const getStoryParticipantName = (participant) => {
    if (participant.type === 'wrestler') return getPersonName(wrestlers, participant.id)
    if (participant.type === 'team') return teams.find((team) => team.id === participant.id)?.name || 'Unknown Team'
    if (participant.type === 'faction') return factions.find((faction) => faction.id === participant.id)?.name || 'Unknown Faction'
    return 'Unknown'
  }

  const getRelationshipReason = (relationship) => {
    const [firstId, secondId] = relationship.wrestlerIds || []
    const note = relationship.note ? ` Note: ${relationship.note}` : ''
    return `${getPersonName(wrestlers, firstId)} and ${getPersonName(wrestlers, secondId)} have a ${relationship.type.toLowerCase()} relationship at intensity ${relationship.intensity}/5.${note}`
  }

  const getRelationshipBetween = (ids = []) => {
    const wanted = [...new Set(ids)].filter(Boolean)
    if (wanted.length < 2) return null
    return relationships.find((relationship) => {
      const relationshipIds = relationship.wrestlerIds || []
      return wanted.every((id) => relationshipIds.includes(id))
    }) || null
  }

  const getRelationshipBoost = (ids = []) => {
    const relationship = getRelationshipBetween(ids)
    if (!relationship) return 0
    return 8 + (relationship.intensity || 3) * 4
  }

  const getRelationshipLine = (ids = []) => {
    const relationship = getRelationshipBetween(ids)
    return relationship ? `Relationship hook: ${getRelationshipReason(relationship)}` : null
  }

  const getIdleDays = (wrestlerId) => {
    const lastMatch = [...matches].reverse().find((match) => getParticipantIds(match).includes(wrestlerId))
    return lastMatch ? daysBetween(lastMatch.date, currentDate) : 99
  }

  const isChampion = (wrestlerId) => titles.some((title) => getChampIds(title).includes(wrestlerId))

  const talentPool = useMemo(() => {
    return competitiveRoster
      .filter((wrestler) => matchForm.show === 'all' || wrestler.show === matchForm.show)
      .filter((wrestler) => !matchForm.activeOnly || wrestler.status === 'Active')
  }, [competitiveRoster, matchForm.show, matchForm.activeOnly])

  const matchIdea = useMemo(() => {
    const seed = matchSeed + matches.length + stories.length
    const availableTitles = titles.filter((title) => {
      const champIds = getChampIds(title)
      if (champIds.length === 0) return false
      if (matchForm.show === 'all') return true
      return (title.show || 'Universe') === matchForm.show || title.show === 'Universe'
    })
    const autoFormats = ['singles', 'tag', 'trios']
    const requestedFormat = matchForm.format === 'auto'
      ? autoFormats[Math.floor(Math.abs(Math.sin((seed + 5) * 65537) * 1000000)) % autoFormats.length]
      : matchForm.format
    const mode = requestedFormat === 'title' && availableTitles.length === 0 ? 'singles' : requestedFormat

    const buildSinglesIdea = (participants, reason, notes, extra = {}) => ({
      kind: 'match',
      mode: 'singles',
      titleId: extra.titleId || null,
      storyId: extra.storyId || null,
      participantIds: participants,
      headline: participants.map((id) => getPersonName(wrestlers, id)).join(' vs '),
      reason,
      notes,
      stipulation: extra.stipulation || '',
      goalLabel: extra.goalLabel || null,
    })

    if (matchForm.goal === 'contender') {
      const contenders = rankings
        .map((row) => wrestlers.find((wrestler) => wrestler.id === row.id))
        .filter(Boolean)
        .filter((wrestler) => talentPool.some((talent) => talent.id === wrestler.id))
        .filter((wrestler) => !isChampion(wrestler.id))
        .slice(0, 8)
      const relationshipContender = pickWeighted(
        relationships
          .filter((relationship) => ['Rival', 'Respect', 'Unfinished Business', 'Former Partner'].includes(relationship.type))
          .filter((relationship) => (relationship.wrestlerIds || []).every((id) => contenders.some((wrestler) => wrestler.id === id)))
          .map((relationship, index) => ({ relationship, weight: (relationship.intensity || 3) * 5 + index })),
        seed + 41
      )?.relationship
      const rotated = rotateBySeed(contenders, seed)
      if (relationshipContender || rotated.length >= 2) {
        const participants = relationshipContender?.wrestlerIds || [rotated[0].id, rotated[1].id]
        return buildSinglesIdea(
          participants,
          `Contender match built from the upper rankings. ${[getRelationshipLine(participants), ...participants.map(getTalentPickReason).filter(Boolean)].filter(Boolean).join(' | ')}`,
          'Creative Spark - contender match',
          { stipulation: 'Contender Match', goalLabel: 'Contender Match' }
        )
      }
    }

    if (matchForm.goal === 'underused') {
      const underused = [...talentPool].sort((a, b) => getIdleDays(b.id) - getIdleDays(a.id))
      const featured = underused[0]
      const opponent = pickWeighted(
        talentPool
          .filter((wrestler) => wrestler.id !== featured?.id)
          .map((wrestler) => ({ wrestler, weight: 8 + Math.max(0, 10 - (rankMap.get(wrestler.id)?.rank || 10)) + getRelationshipBoost([featured?.id, wrestler.id]) })),
        seed + 17
      )?.wrestler
      if (featured && opponent) {
        const participants = [featured.id, opponent.id]
        return buildSinglesIdea(
          participants,
          `Underused spotlight for ${featured.name}, who has ${getIdleDays(featured.id)} days since their last completed match. ${[getRelationshipLine(participants), ...participants.map(getTalentPickReason).filter(Boolean)].filter(Boolean).join(' | ')}`,
          'Creative Spark - underused talent spotlight',
          { goalLabel: 'Underused Talent' }
        )
      }
    }

    if (matchForm.goal === 'champion_showcase') {
      const championTitles = availableTitles.filter((title) => getChampIds(title).length === 1)
      const title = pickWeighted(championTitles.map((item, index) => ({ ...item, weight: index + 3 })), seed)
      const champId = getChampIds(title)[0]
      const champ = wrestlers.find((wrestler) => wrestler.id === champId)
      const opponent = pickWeighted(
        talentPool
          .filter((wrestler) => wrestler.id !== champId)
          .map((wrestler) => ({ wrestler, weight: 10 + (wrestler.show === champ?.show ? 5 : 0) + Math.max(0, getIdleDays(wrestler.id) / 7) + getRelationshipBoost([champId, wrestler.id]) })),
        seed + 23
      )?.wrestler
      if (champ && opponent) {
        const participants = [champ.id, opponent.id]
        return buildSinglesIdea(
          participants,
          `Champion showcase for ${champ.name} without forcing a title change. ${[getRelationshipLine(participants), ...participants.map(getTalentPickReason).filter(Boolean)].filter(Boolean).join(' | ')}`,
          `Creative Spark - ${title.name} champion showcase`,
          { stipulation: 'Non-Title Showcase', goalLabel: 'Champion Showcase' }
        )
      }
    }

    if (matchForm.goal === 'rivalry') {
      const eligibleIds = new Set(talentPool.map((wrestler) => wrestler.id))
      const relationshipRivalry = pickWeighted(
        relationships
          .filter((relationship) => ['Rival', 'Former Partner', 'Betrayed', 'Unfinished Business', 'Respect'].includes(relationship.type))
          .filter((relationship) => (relationship.wrestlerIds || []).every((id) => eligibleIds.has(id)))
          .map((relationship, index) => ({ relationship, weight: (relationship.intensity || 3) * 6 + index })),
        seed + 37
      )?.relationship
      if (relationshipRivalry) {
        const participants = relationshipRivalry.wrestlerIds
        return buildSinglesIdea(
          participants,
          `Rivalry escalation built from relationship history. ${[getRelationshipLine(participants), ...participants.map(getTalentPickReason).filter(Boolean)].filter(Boolean).join(' | ')}`,
          `Creative Spark - ${relationshipRivalry.type} escalation`,
          { stipulation: 'Rivalry Escalation', goalLabel: 'Rivalry Escalation' }
        )
      }

      const storyOptions = activeStories
        .map((story, index) => {
          const ids = getStoryParticipantIds(story, teams, factions)
            .filter((id) => talentPool.some((wrestler) => wrestler.id === id))
          return { story, ids, weight: ids.length + index + 1 }
        })
        .filter((option) => option.ids.length >= 2)
      const picked = pickWeighted(storyOptions, seed)
      if (picked) {
        const participants = rotateBySeed(picked.ids, seed).slice(0, 2)
        return buildSinglesIdea(
          participants,
          `Rivalry escalation from ${picked.story.name}. ${participants.map(getTalentPickReason).filter(Boolean).join(' | ')}`,
          `Creative Spark - ${picked.story.name} escalation`,
          { storyId: picked.story.id, stipulation: 'Rivalry Escalation', goalLabel: 'Rivalry Escalation' }
        )
      }
    }

    const shouldForceFactionWarfare = matchForm.goal === 'faction_warfare'
    const forcedFactionMode = shouldForceFactionWarfare && matchForm.format === 'auto'
      ? (teams.filter((team) => team.type === 'trio').length >= 2 ? 'trios' : 'tag')
      : mode
    const effectiveMode = shouldForceFactionWarfare ? forcedFactionMode : mode

    if (mode === 'title') {
      const title = pickWeighted(availableTitles.map((item, index) => ({ ...item, weight: index + 2 })), seed)
      const champIds = getChampIds(title)
      const champShow = wrestlers.find((wrestler) => wrestler.id === champIds[0])?.show
      const challengers = talentPool
        .filter((wrestler) => !champIds.includes(wrestler.id))
        .map((wrestler) => ({
          wrestler,
          weight: Math.max(1, 20 - (rankMap.get(wrestler.id)?.rank || 20)) + (wrestler.show === champShow ? 5 : 0),
        }))
      const challenger = pickWeighted(challengers, seed + 7)?.wrestler
      if (title && challenger) {
        const participantIds = [...champIds, challenger.id]
        return {
          kind: 'match',
          mode: champIds.length === 3 ? 'trios' : champIds.length === 2 ? 'tag' : 'singles',
          titleId: title.id,
          storyId: null,
          participantIds,
          headline: `${champIds.map((id) => getPersonName(wrestlers, id)).join(' / ')} vs ${challenger.name}`,
          reason: `${challenger.name} is the strongest available challenger for ${title.name}. ${[getRelationshipLine(participantIds), ...participantIds.map(getTalentPickReason).filter(Boolean)].filter(Boolean).join(' | ')}`,
          notes: `Creative Spark - ${title.name} title match`,
          stipulation: 'Championship Match',
        }
      }
    }

    if (effectiveMode === 'tag' || effectiveMode === 'trios') {
      const teamType = effectiveMode === 'trios' ? 'trio' : 'tag'
      const expectedSize = effectiveMode === 'trios' ? 3 : 2
      const activeIds = new Set(talentPool.map((wrestler) => wrestler.id))
      const eligibleTeams = teams
        .filter((team) => team.type === teamType)
        .filter((team) => (team.memberIds || []).length === expectedSize)
        .filter((team) => matchForm.show === 'all' || getTeamShow(team, wrestlers) === matchForm.show)
        .filter((team) => (team.memberIds || []).every((id) => activeIds.has(id)))
        .map((team, index) => {
          const memberRankBoost = (team.memberIds || []).reduce((total, id) => total + Math.max(0, 10 - (rankMap.get(id)?.rank || 10)), 0)
          const titleBoost = titles.some((title) => {
            const champIds = getChampIds(title)
            return champIds.length === expectedSize && champIds.every((id) => (team.memberIds || []).includes(id))
          }) ? 8 : 0
          return {
            team,
            weight: 10 + memberRankBoost + titleBoost + index,
          }
        })

      if (eligibleTeams.length >= 2) {
        const teamA = pickWeighted(eligibleTeams, seed)?.team
        const teamB = pickWeighted(
          eligibleTeams.filter((entry) => {
            if (entry.team.id === teamA?.id) return false
            return !(entry.team.memberIds || []).some((id) => (teamA?.memberIds || []).includes(id))
          }),
          seed + 29
        )?.team

        if (teamA && teamB) {
          const picked = [...teamA.memberIds, ...teamB.memberIds]
          const isRecentRematch = matchForm.avoidRematches && recentMatchKeys.has(getRecentMatchKey(picked))
          return {
            kind: 'match',
            mode: effectiveMode,
            titleId: null,
            storyId: null,
            participantIds: picked,
            teamNames: [teamA.name, teamB.name],
            headline: `${teamA.name} vs ${teamB.name}`,
            reason: isRecentRematch
              ? 'Strong team matchup, but it was booked recently. Refresh for a cleaner option.'
              : `${matchForm.goal === 'faction_warfare' ? 'Faction warfare built from saved teams. ' : ''}${getTeamPickReason(teamA)} | ${getTeamPickReason(teamB)}`,
            notes: `Creative Spark suggestion - ${teamA.name} vs ${teamB.name}`,
            stipulation: matchForm.goal === 'faction_warfare' ? 'Faction Warfare' : '',
            goalLabel: matchForm.goal === 'faction_warfare' ? 'Faction Warfare' : null,
          }
        }
      }
    }

    const needed = effectiveMode === 'trios' ? 6 : effectiveMode === 'tag' ? 4 : 2
    const getWeightedTalent = (selectedIds = []) => talentPool.map((wrestler) => {
      const ranking = rankMap.get(wrestler.id)
      const lastMatch = [...matches].reverse().find((match) => getParticipantIds(match).includes(wrestler.id))
      const idleBoost = lastMatch ? Math.max(0, daysBetween(lastMatch.date, currentDate)) : 20
      return {
        wrestler,
        weight: 8 + Math.min(18, idleBoost) + Math.max(0, 10 - (ranking?.rank || 10)) + Math.max(0, wrestler.streak || 0) + getRelationshipBoost([...selectedIds, wrestler.id]),
      }
    })

    const picked = []
    let guard = 0
    while (picked.length < needed && guard < 60) {
      const next = pickWeighted(
        getWeightedTalent(picked).filter((item) => !picked.includes(item.wrestler.id)),
        seed + guard * 11
      )?.wrestler
      if (next) picked.push(next.id)
      guard += 1
    }

    if (picked.length < needed) return null
    const isRecentRematch = matchForm.avoidRematches && recentMatchKeys.has(getRecentMatchKey(picked))
    const names = picked.map((id) => getPersonName(wrestlers, id))
    const label = effectiveMode === 'tag'
      ? `${names.slice(0, 2).join(' / ')} vs ${names.slice(2).join(' / ')}`
      : effectiveMode === 'trios'
      ? `${names.slice(0, 3).join(' / ')} vs ${names.slice(3).join(' / ')}`
      : names.join(' vs ')

    const pickReasons = picked.map(getTalentPickReason).filter(Boolean)
    const relationshipLine = getRelationshipLine(picked)

    return {
      kind: 'match',
      mode: effectiveMode,
      titleId: null,
      storyId: null,
      participantIds: picked,
      headline: label,
      reason: isRecentRematch
        ? 'Strong matchup, but it was booked recently. Refresh for a cleaner option.'
        : `${effectiveMode === 'tag' || effectiveMode === 'trios' ? 'No eligible saved teams were available, so HeatSpark built a one-night lineup. ' : ''}${[relationshipLine, ...pickReasons].filter(Boolean).join(' | ')}`,
      notes: effectiveMode === 'tag' || effectiveMode === 'trios' ? 'Creative Spark suggestion - one-night team lineup' : 'Creative Spark suggestion',
      stipulation: matchForm.goal === 'faction_warfare' ? 'Faction Warfare' : '',
      goalLabel: matchForm.goal === 'faction_warfare' ? 'Faction Warfare' : null,
    }
  }, [matchSeed, matchForm, talentPool, titles, matches, stories, activeStories, teams, factions, relationships, rankMap, wrestlers, currentDate, recentMatchKeys])

  const segmentIdea = useMemo(() => {
    const seed = segmentSeed + standaloneSegments.length + stories.length
    const storyPool = activeStories
      .filter((story) => {
        if (segmentForm.storyId !== 'auto') return String(story.id) === String(segmentForm.storyId)
        if (segmentForm.show === 'all') return true
        return getStoryParticipantIds(story, teams, factions).some((id) => wrestlers.find((w) => w.id === id)?.show === segmentForm.show)
      })
      .map((story, index) => ({ story, weight: (story.segments?.length || 0) + index + 3 }))

    const story = pickWeighted(storyPool, seed)?.story || null
    const relationshipSegment = !story && segmentForm.storyId === 'auto'
      ? pickWeighted(
        relationships
          .filter((relationship) => {
            const relationshipWrestlers = (relationship.wrestlerIds || []).map((id) => wrestlers.find((wrestler) => wrestler.id === id)).filter(Boolean)
            if (relationshipWrestlers.length !== 2) return false
            return segmentForm.show === 'all' || relationshipWrestlers.some((wrestler) => wrestler.show === segmentForm.show)
          })
          .map((relationship, index) => ({ relationship, weight: (relationship.intensity || 3) * 5 + index })),
        seed + 59
      )?.relationship
      : null
    const storyIds = story ? getStoryParticipantIds(story, teams, factions) : (relationshipSegment?.wrestlerIds || [])
    const pool = (storyIds.length ? storyIds : competitiveRoster.map((wrestler) => wrestler.id))
      .map((id) => wrestlers.find((wrestler) => wrestler.id === id))
      .filter(Boolean)
      .filter((wrestler) => segmentForm.show === 'all' || wrestler.show === segmentForm.show)
    const featured = rotateBySeed(pool, seed).slice(0, Math.min(3, Math.max(1, pool.length))).map((wrestler) => wrestler.id)
    const titleNouns = ['Warning Shot', 'Pressure Point', 'Line Crossed', 'Last Word', 'Open Challenge', 'Power Play']
    const segmentType = segmentForm.type === 'Random'
      ? SEGMENT_TYPES[Math.floor(Math.abs(Math.sin((seed + 31) * 8191) * 1000000)) % SEGMENT_TYPES.length]
      : segmentForm.type
    const templates = SEGMENT_TEMPLATES[segmentType] || []
    const template = templates.length
      ? templates[Math.floor(Math.abs(Math.sin((seed + 47) * 32749) * 1000000)) % templates.length]
      : { title: titleNouns[seed % titleNouns.length], beat: 'pushes the next story beat forward', outcome: 'the card gains a clearer direction' }
    const featuredNames = featured.map((id) => getPersonName(wrestlers, id)).join(', ') || 'Featured talent'
    const title = `${story?.name || relationshipSegment?.type || 'Locker Room'}: ${template.title}`

    return {
      kind: 'segment',
      storyId: story?.id || null,
      wrestlerIds: featured,
      title,
      segmentType,
      headline: title,
      reason: story
        ? `Built to advance ${story.name}. Suggested outcome: ${template.outcome}.`
        : relationshipSegment
        ? `${getRelationshipReason(relationshipSegment)} Suggested outcome: ${template.outcome}.`
        : `Built as a standalone card beat. Suggested outcome: ${template.outcome}.`,
      description: relationshipSegment
        ? `${featuredNames} ${template.beat}, leaning on their ${relationshipSegment.type.toLowerCase()} history.`
        : `${featuredNames} ${template.beat}.`,
    }
  }, [segmentSeed, segmentForm, activeStories, teams, factions, wrestlers, competitiveRoster, stories, standaloneSegments, relationships])

  const storyIdea = useMemo(() => {
    const seed = storySeed + stories.length + matches.length
    const refreshIndex = Math.max(0, Math.floor((storySeed - 1) / 17))
    const storyTalentPool = competitiveRoster
      .filter((wrestler) => storyForm.show === 'all' || wrestler.show === storyForm.show)
      .filter((wrestler) => !storyForm.activeOnly || wrestler.status === 'Active')
    const storyTitles = titles.filter((title) => {
      const champIds = getChampIds(title)
      if (champIds.length !== 1) return false
      if (storyForm.show === 'all') return true
      return (title.show || 'Universe') === storyForm.show || title.show === 'Universe'
    })
    const mode = storyForm.mode === 'auto'
      ? ['relationship_arc', 'title_chase', 'rivalry', 'comeback', 'underdog', 'faction_war'][seed % 6]
      : storyForm.mode
    const selectedRelationshipType = mode.startsWith('relationship:') ? mode.slice('relationship:'.length) : null
    const makeIdea = ({ name, templateKey = null, arcType = 'story', arcLabel = arcType === 'rivalry' ? 'Rivalry Arc' : 'Story Arc', participants, hook, why, openingSegment, openingMatch, payoff }) => ({
      name,
      templateKey,
      arcType,
      arcLabel,
      participants,
      hook,
      why,
      openingSegment,
      openingMatch,
      payoff,
      description: `${hook}\n\nWhy it works: ${why}\n\nOpening beat: ${openingSegment}\nOpening match: ${openingMatch}\nPayoff: ${payoff}`,
    })

    if (mode === 'faction_war') {
      const eligibleFactions = factions
        .filter((faction) => (faction.memberIds || []).some((id) => storyTalentPool.some((wrestler) => wrestler.id === id)))
        .map((faction, index) => ({ faction, weight: (faction.memberIds?.length || 0) + index + 2 }))
      const factionA = pickWeighted(eligibleFactions, seed)?.faction
      const factionB = pickWeighted(eligibleFactions.filter((entry) => entry.faction.id !== factionA?.id), seed + 19)?.faction
      if (factionA && factionB) {
        return makeIdea({
          name: `${factionA.name} vs ${factionB.name}: Control Point`,
          arcType: 'story',
          participants: [{ type: 'faction', id: factionA.id }, { type: 'faction', id: factionB.id }],
          hook: `${factionA.name} and ${factionB.name} start fighting over influence, numbers, and brand control.`,
          why: `${factionA.name} has ${factionA.memberIds?.length || 0} members, while ${factionB.name} has ${factionB.memberIds?.length || 0}; both can feed tags, trios, and singles matches.`,
          openingSegment: 'A faction confrontation breaks down before a match can begin.',
          openingMatch: `${factionA.name} representative vs ${factionB.name} representative`,
          payoff: 'A multi-person blowoff at a special event decides which group owns the next chapter.',
        })
      }
    }

    if (mode === 'title_chase') {
      const title = pickWeighted(storyTitles.map((item, index) => ({ ...item, weight: index + 2 })), seed)
      const champId = getChampIds(title)[0]
      const challenger = pickWeighted(
        storyTalentPool
          .filter((wrestler) => wrestler.id !== champId)
          .map((wrestler) => ({ wrestler, weight: 12 + Math.max(0, 12 - (rankMap.get(wrestler.id)?.rank || 12)) + Math.max(0, getIdleDays(wrestler.id) / 7) + getRelationshipBoost([champId, wrestler.id]) })),
        seed + 11
      )?.wrestler
      const champ = wrestlers.find((wrestler) => wrestler.id === champId)
      if (title && champ && challenger) {
        return makeIdea({
          name: `${challenger.name}: Chase For ${title.name}`,
          arcType: 'rivalry',
          participants: [{ type: 'wrestler', id: champ.id }, { type: 'wrestler', id: challenger.id }],
          hook: `${challenger.name} has a clear path toward ${champ.name}, but the champion refuses to treat the threat as real.`,
          why: `${[getRelationshipLine([champ.id, challenger.id]), getTalentPickReason(champ.id), getTalentPickReason(challenger.id)].filter(Boolean).join(' | ')}`,
          openingSegment: `${challenger.name} interrupts ${champ.name} and asks for a proving match.`,
          openingMatch: `${challenger.name} vs a hand-picked obstacle`,
          payoff: `${challenger.name} earns a title match for ${title.name}.`,
        })
      }
    }

    if (mode === 'comeback') {
      const comeback = [...storyTalentPool].sort((a, b) => {
        const streakDiff = (a.streak || 0) - (b.streak || 0)
        if (streakDiff !== 0) return streakDiff
        return getIdleDays(b.id) - getIdleDays(a.id)
      })[0]
      const obstacle = pickWeighted(storyTalentPool.filter((wrestler) => wrestler.id !== comeback?.id).map((wrestler) => ({ wrestler, weight: 8 + Math.max(0, 10 - (rankMap.get(wrestler.id)?.rank || 10)) + getRelationshipBoost([comeback?.id, wrestler.id]) })), seed + 7)?.wrestler
      if (comeback && obstacle) {
        return makeIdea({
          name: `${comeback.name}: No More Waiting`,
          arcType: 'story',
          participants: [{ type: 'wrestler', id: comeback.id }, { type: 'wrestler', id: obstacle.id }],
          hook: `${comeback.name} is done being treated like a background name and targets ${obstacle.name} to restart their momentum.`,
          why: `${[getRelationshipLine([comeback.id, obstacle.id]), getTalentPickReason(comeback.id), getTalentPickReason(obstacle.id)].filter(Boolean).join(' | ')}`,
          openingSegment: `${comeback.name} admits the slump and names ${obstacle.name} as the first step back.`,
          openingMatch: `${comeback.name} vs ${obstacle.name}`,
          payoff: `${comeback.name} either completes the reset or falls into a deeper crisis.`,
        })
      }
    }

    if (mode === 'relationship_arc' || mode === 'rivalry' || selectedRelationshipType) {
      const eligibleIds = new Set(storyTalentPool.map((wrestler) => wrestler.id))
      const allowedRelationshipTypes = selectedRelationshipType
        ? [selectedRelationshipType]
        : mode === 'rivalry'
        ? RIVALRY_RELATIONSHIP_TYPES
        : null
      const templatePool = RIVALRY_STORY_TEMPLATES.filter((template) => (
        !allowedRelationshipTypes || template.relationshipTypes.some((type) => allowedRelationshipTypes.includes(type))
      ))
      const savedRelationshipTemplateOptions = relationships
        .filter((relationship) => !allowedRelationshipTypes || allowedRelationshipTypes.includes(relationship.type))
        .filter((relationship) => (relationship.wrestlerIds || []).every((id) => eligibleIds.has(id)))
        .flatMap((relationship) => (
          templatePool
            .filter((template) => template.relationshipTypes.includes(relationship.type))
            .map((template) => ({ relationship, template }))
        ))
      const inferableTypes = allowedRelationshipTypes || RELATIONSHIP_STORY_MODE_TYPES
      const inferencePool = rotateBySeed(
        [...storyTalentPool]
          .sort((a, b) => {
            const rankDiff = (rankMap.get(a.id)?.rank || 99) - (rankMap.get(b.id)?.rank || 99)
            if (rankDiff !== 0) return rankDiff
            return getIdleDays(b.id) - getIdleDays(a.id)
          })
          .slice(0, 24),
        refreshIndex
      )
      const inferredRelationshipTemplateOptions = []
      for (let firstIndex = 0; firstIndex < inferencePool.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < inferencePool.length; secondIndex += 1) {
          inferableTypes.forEach((type) => {
            templatePool
              .filter((template) => template.relationshipTypes.includes(type))
              .forEach((template) => {
                inferredRelationshipTemplateOptions.push({
                  relationship: {
                    id: `inferred-${type}-${inferencePool[firstIndex].id}-${inferencePool[secondIndex].id}`,
                    wrestlerIds: [inferencePool[firstIndex].id, inferencePool[secondIndex].id],
                    type,
                    intensity: 3,
                    note: '',
                    inferred: true,
                  },
                  template,
                })
              })
          })
        }
      }
      const relationshipTemplateOptions = savedRelationshipTemplateOptions.length > 0
        ? savedRelationshipTemplateOptions
        : inferredRelationshipTemplateOptions
      const pickedTemplateOption = relationshipTemplateOptions[indexFromSeed(relationshipTemplateOptions, refreshIndex)]
      if (pickedTemplateOption) {
        const { relationship: pickedRelationship, template } = pickedTemplateOption
        const [firstId, secondId] = pickedRelationship.wrestlerIds
        const first = wrestlers.find((wrestler) => wrestler.id === firstId)
        const second = wrestlers.find((wrestler) => wrestler.id === secondId)
        if (!first || !second) return null
        const templateContext = { first, second, relationship: pickedRelationship }
        return makeIdea({
          name: template.name(templateContext),
          templateKey: template.key,
          arcType: ['Ally', 'Owes Favor'].includes(pickedRelationship.type) ? 'story' : 'rivalry',
          arcLabel: selectedRelationshipType ? `${selectedRelationshipType} Arc` : mode === 'relationship_arc' ? 'Relationship Arc' : 'Rivalry Arc',
          participants: [{ type: 'wrestler', id: first.id }, { type: 'wrestler', id: second.id }],
          hook: template.hook(templateContext),
          why: `${pickedRelationship.inferred ? `HeatSpark inferred a ${pickedRelationship.type.toLowerCase()} arc from the selected story mode.` : getRelationshipReason(pickedRelationship)} ${getTalentPickReason(first.id)} | ${getTalentPickReason(second.id)}`,
          openingSegment: template.openingSegment(templateContext),
          openingMatch: template.openingMatch(templateContext),
          payoff: template.payoff(templateContext),
        })
      }
      return null
    }

    const rankedTalent = rankings
      .map((row) => wrestlers.find((wrestler) => wrestler.id === row.id))
      .filter(Boolean)
      .filter((wrestler) => storyTalentPool.some((talent) => talent.id === wrestler.id))
    const topName = rotateBySeed(rankedTalent, seed)[0]
    const foil = pickWeighted(
      storyTalentPool
        .filter((wrestler) => wrestler.id !== topName?.id)
        .map((wrestler) => ({
          wrestler,
          weight: mode === 'underdog'
            ? 8 + getIdleDays(wrestler.id) + getRelationshipBoost([topName?.id, wrestler.id])
            : 8 + (wrestler.align && topName?.align && wrestler.align !== topName.align ? 8 : 0) + getRelationshipBoost([topName?.id, wrestler.id]),
        })),
      seed + 13
    )?.wrestler

    if (!topName || !foil) return null

    if (mode === 'underdog') {
      return makeIdea({
        name: `${foil.name}: Against The Board`,
        arcType: 'story',
        participants: [{ type: 'wrestler', id: foil.id }, { type: 'wrestler', id: topName.id }],
        hook: `${foil.name} tries to force the universe to notice them by targeting ${topName.name}.`,
        why: `${[getRelationshipLine([foil.id, topName.id]), getTalentPickReason(foil.id), getTalentPickReason(topName.id)].filter(Boolean).join(' | ')}`,
        openingSegment: `${foil.name} challenges the idea that rankings tell the whole story.`,
        openingMatch: `${foil.name} vs ${topName.name}`,
        payoff: `${foil.name} can become a made name by surviving the test.`,
      })
    }

    return makeIdea({
      name: `${topName.name} vs ${foil.name}: Breaking Point`,
      arcType: 'rivalry',
      participants: [{ type: 'wrestler', id: topName.id }, { type: 'wrestler', id: foil.id }],
      hook: `${topName.name} and ${foil.name} clash over momentum, attitude, and position on the card.`,
      why: `${[getRelationshipLine([topName.id, foil.id]), getTalentPickReason(topName.id), getTalentPickReason(foil.id)].filter(Boolean).join(' | ')}`,
      openingSegment: `${foil.name} interrupts ${topName.name} and turns a rankings argument personal.`,
      openingMatch: `${topName.name} vs ${foil.name}`,
      payoff: 'The winner leaves with a clear claim to the next major opportunity.',
    })
  }, [storySeed, storyForm, competitiveRoster, stories, matches, titles, activeStories, teams, factions, relationships, rankings, wrestlers, rankMap, currentDate])

  const assistantCues = useMemo(() => {
    const cues = []
    const uncrownedTitles = titles.filter((title) => getChampIds(title).length === 0)
    const quietStories = activeStories.filter((story) => (story.segments || []).length === 0).slice(0, 2)
    const idleTalent = competitiveRoster
      .map((wrestler) => {
        const lastMatch = [...matches].reverse().find((match) => getParticipantIds(match).includes(wrestler.id))
        return { wrestler, daysIdle: lastMatch ? daysBetween(lastMatch.date, currentDate) : 99 }
      })
      .filter((row) => row.daysIdle > 28)
      .sort((a, b) => b.daysIdle - a.daysIdle)
      .slice(0, 3)

    uncrownedTitles.slice(0, 2).forEach((title) => cues.push({ title: `${title.name} is vacant`, detail: 'Generate a title match or tournament hook.' }))
    relationships
      .filter((relationship) => (relationship.intensity || 0) >= 4)
      .slice(0, 2)
      .forEach((relationship) => cues.push({
        title: `${getPersonName(wrestlers, relationship.wrestlerIds?.[0])} / ${getPersonName(wrestlers, relationship.wrestlerIds?.[1])}`,
        detail: `${relationship.type} relationship at intensity ${relationship.intensity}/5 is ready for HeatSpark.`,
      }))
    quietStories.forEach((story) => cues.push({ title: `${story.name} needs a beat`, detail: 'Generate a promo, brawl, or backstage segment.' }))
    idleTalent.forEach(({ wrestler, daysIdle }) => cues.push({ title: `${wrestler.name} is underused`, detail: `${daysIdle} days since their last completed match.` }))
    if (cues.length === 0) cues.push({ title: 'Universe is balanced', detail: 'Use the generator to find a fresh matchup or escalation.' })
    return cues.slice(0, 5)
  }, [titles, activeStories, competitiveRoster, matches, currentDate, relationships, wrestlers])

  const bookingOptions = useMemo(() => {
    if (!booking) return []
    const relevantShows = booking.show && booking.show !== 'all'
      ? shows.filter((show) => show.name === booking.show)
      : shows
    const dates = []
    for (let i = 0; i < 140; i += 1) {
      const date = fmt(addDays(currentDate, i))
      const weekly = relevantShows.filter((show) => show.day === DAY_NAMES[getCustomDow(date)])
      const events = specialShows.filter((specialShow) => {
        if (!specialShowOccursOnDate(specialShow, date)) return false
        return relevantShows.some((show) => show.id === specialShow.showId)
      })
      const labels = [...weekly.map((show) => show.name), ...events.map((event) => event.name)]
      if (labels.length > 0) dates.push({ date, label: `${date} - ${labels.join(' / ')}` })
    }
    return dates
  }, [booking, currentDate, shows, specialShows])

  const bookingEventOptions = useMemo(() => {
    if (!booking?.date) return []
    const relevantShows = booking.show && booking.show !== 'all'
      ? shows.filter((show) => show.name === booking.show)
      : shows
    const relevantShowIds = new Set(relevantShows.map((show) => show.id))
    const relevantSpecialShows = specialShows.filter((specialShow) => relevantShowIds.has(specialShow.showId))
    return getCalendarEventsOnDate(booking.date, relevantShows, relevantSpecialShows)
  }, [booking, shows, specialShows])

  useEffect(() => {
    if (!booking || bookingOptions.length === 0) return
    if (bookingOptions.some((option) => option.date === booking.date)) return
    setBooking((current) => current ? { ...current, date: bookingOptions[0].date, eventId: '' } : current)
  }, [booking, bookingOptions])

  const startBooking = (idea) => {
    if (!idea) return
    setBooking({ idea, draft: { ...idea }, date: currentDate, eventId: '', show: matchForm.show })
  }

  const handleConfirmBooking = () => {
    if (!booking?.date || !booking?.eventId) {
      showToast('Choose a date and event card')
      return
    }
    const draft = booking.draft || booking.idea
    if (draft.kind === 'match') {
      const uniqueParticipants = [...new Set(draft.participantIds || [])].filter(Boolean)
      if (uniqueParticipants.length !== (draft.participantIds || []).length) {
        showToast('Choose different wrestlers for each match slot')
        return
      }
      bookMatch(
        booking.date,
        uniqueParticipants,
        draft.titleId,
        draft.mode,
        draft.notes,
        draft.stipulation,
        { storyId: draft.storyId, eventId: booking.eventId }
      )
      showToast('Creative Spark match booked')
    } else {
      const wrestlerIds = [...new Set(draft.wrestlerIds || [])].filter(Boolean)
      addSegment(draft.storyId,
      {
        date: booking.date,
        eventId: booking.eventId,
        title: draft.title,
        description: draft.description,
        segmentType: draft.segmentType,
        wrestlerIds,
      })
      showToast('Creative Spark segment booked')
    }
    setBooking(null)
  }

  const updateBookingDraft = (patch) => {
    setBooking((current) => current ? { ...current, draft: { ...current.draft, ...patch } } : current)
  }

  const updateDraftParticipant = (index, wrestlerId) => {
    setBooking((current) => {
      if (!current?.draft) return current
      const participantIds = [...(current.draft.participantIds || [])]
      participantIds[index] = parseInt(wrestlerId, 10)
      return { ...current, draft: { ...current.draft, participantIds } }
    })
  }

  const updateDraftSegmentWrestler = (index, wrestlerId) => {
    setBooking((current) => {
      if (!current?.draft) return current
      const wrestlerIds = [...(current.draft.wrestlerIds || [])]
      wrestlerIds[index] = parseInt(wrestlerId, 10)
      return { ...current, draft: { ...current.draft, wrestlerIds } }
    })
  }

  const handleCreateStory = () => {
    if (!storyIdea || !addStory) {
      showToast('Story creation is not available')
      return
    }
    addStory({
      name: storyIdea.name,
      heatSparkTemplateKey: storyIdea.templateKey,
      type: storyIdea.arcType,
      status: 'Building',
      participants: storyIdea.participants,
      description: storyIdea.description,
      segments: [],
    })
    showToast(`${storyIdea.name} created`)
  }

  return (
    <div className="creative-page">
      <div className="creative-header">
        <div>
          <div className="creative-kicker">Creative Desk</div>
          <h1 className="page-title">Heat Spark</h1>
          <p className="creative-subtitle">Generate matchups, story beats, and booking prompts from the universe you already built.</p>
        </div>
      </div>

      <div className="creative-grid">
        <div className="creative-main-stack">
          <section className="creative-panel creative-panel-match glass">
            <div className="creative-panel-header">
              <div>
                <h2>Match Generator</h2>
                <p>Pick a booking goal, choose a format, then let HeatSpark build a purposeful card idea.</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setMatchSeed((seed) => seed + 17)}>
                <FiRefreshCw /> Refresh
              </button>
            </div>

            <div className="creative-controls">
              <label>
                Brand
                <select value={matchForm.show} onChange={(e) => setMatchForm((form) => ({ ...form, show: e.target.value }))}>
                  <option value="all">All Brands</option>
                  {showOptions.map((showName) => <option key={showName} value={showName}>{showName}</option>)}
                </select>
              </label>
              <label>
                Goal
                <select value={matchForm.goal} onChange={(e) => setMatchForm((form) => ({ ...form, goal: e.target.value }))}>
                  {MATCH_GOALS.map((goal) => <option key={goal.value} value={goal.value}>{goal.label}</option>)}
                </select>
              </label>
              <label>
                Format
                <select value={matchForm.format} onChange={(e) => setMatchForm((form) => ({ ...form, format: e.target.value }))}>
                  {MATCH_FORMATS.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
                </select>
              </label>
              <label className="creative-check">
                <input type="checkbox" checked={matchForm.activeOnly} onChange={(e) => setMatchForm((form) => ({ ...form, activeOnly: e.target.checked }))} />
                Active only
              </label>
              <label className="creative-check">
                <input type="checkbox" checked={matchForm.avoidRematches} onChange={(e) => setMatchForm((form) => ({ ...form, avoidRematches: e.target.checked }))} />
                Flag recent rematches
              </label>
            </div>

            {matchIdea ? (
              <div className="creative-suggestion-card">
                {/* icon + text grouped so button sits below, not to the right */}
                <div className="creative-suggestion-card-top">
                  <div className="creative-suggestion-icon"><FiZap /></div>
                  <div>
                    <div className="creative-suggestion-label">{matchIdea.goalLabel || (matchIdea.titleId ? 'Title Match' : 'Match Spark')}</div>
                    <h3>{matchIdea.headline}</h3>
                    <p>{matchIdea.reason}</p>
                    <div className="creative-chip-row">
                      <span>{matchIdea.mode}</span>
                      {matchIdea.titleId && <span>championship</span>}
                      {matchIdea.storyId && <span>story linked</span>}
                    </div>
                  </div>
                </div>
                <button className="btn btn-primary" type="button" onClick={() => startBooking(matchIdea)}>
                  <FiCalendar /> Book Match
                </button>
              </div>
            ) : (
              <div className="creative-empty">Not enough eligible talent for this match type.</div>
            )}

          </section>

          <section className="creative-panel creative-story-panel glass">
            <div className="creative-panel-header">
              <div>
                <h2>Story Generator</h2>
                <p>Build a full arc from rankings, titles, factions, momentum, alignment, and inactivity.</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setStorySeed((seed) => seed + 17)}>
                <FiRefreshCw /> Refresh
              </button>
            </div>

            <div className="creative-controls">
              <label>
                Brand
                <select value={storyForm.show} onChange={(e) => setStoryForm((form) => ({ ...form, show: e.target.value }))}>
                  <option value="all">All Brands</option>
                  {showOptions.map((showName) => <option key={showName} value={showName}>{showName}</option>)}
                </select>
              </label>
              <label>
                Story Mode
                <select value={storyForm.mode} onChange={(e) => setStoryForm((form) => ({ ...form, mode: e.target.value }))}>
                  {STORY_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                </select>
              </label>
              <label className="creative-check">
                <input type="checkbox" checked={storyForm.activeOnly} onChange={(e) => setStoryForm((form) => ({ ...form, activeOnly: e.target.checked }))} />
                Active only
              </label>
            </div>

            {storyIdea ? (
              <div className="creative-story-card">
                <div className="creative-story-main">
                  <div className="creative-suggestion-label">{storyIdea.arcLabel}</div>
                  <h3>{storyIdea.name}</h3>
                  <p>{storyIdea.hook}</p>
                  <div className="creative-chip-row">
                    {storyIdea.participants.map((participant) => (
                      <span key={`${participant.type}-${participant.id}`}>{getStoryParticipantName(participant)}</span>
                    ))}
                  </div>
                </div>
                <div className="creative-story-outline">
                  <div><span>Why</span><strong>{storyIdea.why}</strong></div>
                  <div><span>Opening Segment</span><strong>{storyIdea.openingSegment}</strong></div>
                  <div><span>Opening Match</span><strong>{storyIdea.openingMatch}</strong></div>
                  <div><span>Payoff</span><strong>{storyIdea.payoff}</strong></div>
                </div>
                <button className="btn btn-primary" type="button" onClick={handleCreateStory}>
                  <FiZap /> Create Story
                </button>
              </div>
            ) : (
              <div className="creative-empty">Not enough eligible data to generate a story arc.</div>
            )}
          </section>
        </div>

        <div className="creative-side-stack">
          <section className="creative-panel creative-panel-segment glass">
            <div className="creative-panel-header">
              <div>
                <h2>Segment Generator</h2>
                <p>Turn active stories into promos, attacks, interviews, and card beats.</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setSegmentSeed((seed) => seed + 17)}>
                <FiRefreshCw /> Refresh
              </button>
            </div>

            <div className="creative-controls creative-controls-stack">
              <label>
                Brand
                <select value={segmentForm.show} onChange={(e) => setSegmentForm((form) => ({ ...form, show: e.target.value }))}>
                  <option value="all">All Brands</option>
                  {showOptions.map((showName) => <option key={showName} value={showName}>{showName}</option>)}
                </select>
              </label>
              <label>
                Segment Type
                <select value={segmentForm.type} onChange={(e) => setSegmentForm((form) => ({ ...form, type: e.target.value }))}>
                  {SEGMENT_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label>
                Story
                <select value={segmentForm.storyId} onChange={(e) => setSegmentForm((form) => ({ ...form, storyId: e.target.value }))}>
                  <option value="auto">Auto Pick</option>
                  {activeStories.map((story) => <option key={story.id} value={story.id}>{story.name}</option>)}
                </select>
              </label>
            </div>

            <div className="creative-segment-card">
              <div className="creative-suggestion-label">{segmentIdea.segmentType}</div>
              <h3>{segmentIdea.headline}</h3>
              <p>{segmentIdea.description}</p>
              <div className="creative-list-subtle">{segmentIdea.reason}</div>
              <button className="btn btn-primary" type="button" onClick={() => setBooking({ idea: segmentIdea, draft: { ...segmentIdea }, date: currentDate, eventId: '', show: segmentForm.show })}>
                <FiCalendar /> Book Segment
              </button>
            </div>
          </section>

          <section className="creative-panel creative-panel-cues glass">
            <div className="creative-panel-header">
              <div>
                <h2>Assistant Cues</h2>
                <p>Small pressure points the save is hinting at.</p>
              </div>
            </div>
            <div className="creative-cue-list">
              {assistantCues.map((cue) => (
                <div key={`${cue.title}-${cue.detail}`} className="creative-cue">
                  <strong>{cue.title}</strong>
                  <span>{cue.detail}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>

      {booking && (() => {
        const draft = booking.draft || booking.idea
        const matchHeadline = draft.kind === 'match' ? getMatchHeadline(wrestlers, draft.participantIds || [], draft.mode) : draft.headline
        const eligibleDraftTalent = competitiveRoster
          .filter((wrestler) => booking.show === 'all' || wrestler.show === booking.show)
        const segmentSlots = Math.max(1, Math.min(3, draft.wrestlerIds?.length || 3))

        return (
          <Modal title={draft.kind === 'match' ? 'Edit And Schedule Match' : 'Edit And Schedule Segment'} onClose={() => setBooking(null)} style={{ maxWidth: '880px' }}>
            <div className="creative-booking-summary">
              <strong>{draft.kind === 'match' ? matchHeadline : draft.title}</strong>
              <span>{draft.reason}</span>
            </div>

            {draft.kind === 'match' ? (
              <div className="creative-edit-block">
                <div className="creative-edit-grid">
                  {(draft.participantIds || []).map((participantId, index) => (
                    <label key={`${index}-${participantId}`}>
                      {getMatchSlotLabel(draft.mode, index)}
                      <select value={participantId} onChange={(e) => updateDraftParticipant(index, e.target.value)}>
                        {eligibleDraftTalent.map((wrestler) => (
                          <option key={wrestler.id} value={wrestler.id}>{wrestler.name}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="creative-edit-grid">
                  <label>
                    Story Link
                    <select value={draft.storyId || ''} onChange={(e) => updateBookingDraft({ storyId: e.target.value ? parseInt(e.target.value, 10) : null })}>
                      <option value="">No story</option>
                      {activeStories.map((story) => <option key={story.id} value={story.id}>{story.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Championship
                    <select value={draft.titleId || ''} onChange={(e) => updateBookingDraft({ titleId: e.target.value ? parseInt(e.target.value, 10) : null })}>
                      <option value="">Non-title</option>
                      {titles.map((title) => <option key={title.id} value={title.id}>{title.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="creative-edit-grid">
                  <label>
                    Stipulation
                    <input value={draft.stipulation || ''} onChange={(e) => updateBookingDraft({ stipulation: e.target.value })} placeholder="Optional stipulation" />
                  </label>
                  <label>
                    Notes
                    <input value={draft.notes || ''} onChange={(e) => updateBookingDraft({ notes: e.target.value })} placeholder="Producer notes" />
                  </label>
                </div>
              </div>
            ) : (
              <div className="creative-edit-block">
                <div className="creative-edit-grid">
                  <label>
                    Segment Title
                    <input value={draft.title || ''} onChange={(e) => updateBookingDraft({ title: e.target.value, headline: e.target.value })} />
                  </label>
                  <label>
                    Segment Type
                    <select value={draft.segmentType || 'Promo'} onChange={(e) => updateBookingDraft({ segmentType: e.target.value })}>
                      {SEGMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  Story Link
                  <select value={draft.storyId || ''} onChange={(e) => updateBookingDraft({ storyId: e.target.value ? parseInt(e.target.value, 10) : null })}>
                    <option value="">Standalone</option>
                    {activeStories.map((story) => <option key={story.id} value={story.id}>{story.name}</option>)}
                  </select>
                </label>
                <div className="creative-edit-grid">
                  {Array.from({ length: segmentSlots }, (_, index) => (
                    <label key={index}>
                      Featured {index + 1}
                      <select value={draft.wrestlerIds?.[index] || ''} onChange={(e) => updateDraftSegmentWrestler(index, e.target.value)}>
                        {eligibleDraftTalent.map((wrestler) => (
                          <option key={wrestler.id} value={wrestler.id}>{wrestler.name}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <label>
                  Description
                  <textarea value={draft.description || ''} onChange={(e) => updateBookingDraft({ description: e.target.value })} rows={4} />
                </label>
              </div>
            )}

            <div className="creative-schedule-grid">
              <label>
                Available Date
                <select value={booking.date} onChange={(e) => setBooking((current) => ({ ...current, date: e.target.value, eventId: '' }))}>
                  {bookingOptions.map((option) => <option key={option.date} value={option.date}>{getBookingOptionLabel(option)}</option>)}
                </select>
              </label>
              <label>
                Event Card
                <select value={booking.eventId} onChange={(e) => setBooking((current) => ({ ...current, eventId: e.target.value }))}>
                  <option value="">Select Event</option>
                  {bookingEventOptions.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
                </select>
              </label>
            </div>
            <div className="form-actions" style={{ marginTop: 24 }}>
              <button className="btn btn-secondary" type="button" onClick={() => setBooking(null)}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={handleConfirmBooking}>Confirm Schedule</button>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
