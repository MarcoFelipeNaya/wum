function normalizeMode(match, participantIds) {
  const count = participantIds.length
  const mode = match?.mode || 'free_for_all'
  if (count === 2) return 'singles'
  if (count === 3 && ['free_for_all', 'handicap'].includes(mode)) return mode
  if (count === 4 && ['free_for_all', 'handicap', 'tag'].includes(mode)) return mode
  if (count === 5 && ['free_for_all', 'handicap'].includes(mode)) return mode
  if (count === 6 && ['free_for_all', 'handicap', 'trios', '3tag'].includes(mode)) return mode
  if ([7, 8, 9, 10, 20, 30].includes(count)) return mode
  return 'free_for_all'
}

function getTeamsFromMatch(match) {
  const participantIds = getParticipantIds(match)
  const mode = normalizeMode(match, participantIds)
  const count = participantIds.length

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

function getWinningIds(match) {
  if (!match?.winnerId) return []
  const teams = getTeamsFromMatch(match)
  if (teams) {
    const winningTeam = teams.find((team) => team.includes(match.winnerId))
    return winningTeam || [match.winnerId]
  }
  return [match.winnerId]
}

function getMatchResultForWrestler(match, wrestlerId) {
  const participantIds = getParticipantIds(match)
  if (!participantIds.includes(wrestlerId)) return 'pending'
  if (String(match?.finishType || '').trim().toLowerCase() === 'no contest') return 'draw'
  if (!match?.winnerId) return 'pending'
  if (getWinningIds(match).includes(wrestlerId)) return 'win'
  return 'loss'
}

function getParticipantIds(match) {
  if (Array.isArray(match?.participantIds) && match.participantIds.length > 0) return match.participantIds
  const fallback = []
  if (match?.w1) fallback.push(match.w1)
  if (match?.w2) fallback.push(match.w2)
  return fallback
}

function getOpponentId(match, wrestlerId) {
  if (match.w1 === wrestlerId) return match.w2
  if (match.w2 === wrestlerId) return match.w1
  return null
}

function calcBaseMatchScore(match, wrestlerId) {
  const result = getMatchResultForWrestler(match, wrestlerId)
  if (result === 'pending') return 0

  let score = 0

  if (result === 'win') score += 10
  if (result === 'loss') score -= 6

  if (match.titleId) {
    if (result === 'win') score += 3
    if (result === 'loss') score -= 1
  }

  return score
}

function calcBasePRSForWrestler(wrestlerId, matches) {
  return matches.reduce((total, match) => {
    if (!getParticipantIds(match).includes(wrestlerId)) return total
    return total + calcBaseMatchScore(match, wrestlerId)
  }, 0)
}

function getOpponentStrengthFactor(opponentRank, totalWrestlers) {
  return (totalWrestlers - opponentRank + 1) / totalWrestlers
}

function calcAdvancedMatchScore(match, wrestlerId, rankMap, totalWrestlers) {
  const result = getMatchResultForWrestler(match, wrestlerId)
  if (result === 'pending') return 0

  const participantIds = getParticipantIds(match)
  const opponentIds = participantIds.filter((id) => id !== wrestlerId)
  const strength = opponentIds.length > 0
    ? opponentIds.reduce((total, opponentId) => total + getOpponentStrengthFactor(rankMap[opponentId] || totalWrestlers, totalWrestlers), 0) / opponentIds.length
    : getOpponentStrengthFactor(totalWrestlers, totalWrestlers)

  let score = 0

  if (result === 'win') score += 10 + strength * 8
  if (result === 'loss') score += -8 + strength * 5

  if (match.titleId) {
    if (result === 'win') score += 3
    if (result === 'loss') score -= 1
  }

  return score
}

function sortMatchesChronologically(matches = []) {
  return [...matches].sort((a, b) => {
    const dateDelta = String(a.date || '').localeCompare(String(b.date || ''))
    if (dateDelta !== 0) return dateDelta
    return (Number(a.id) || 0) - (Number(b.id) || 0)
  })
}

function accumulatePRS(matches, scorer) {
  return sortMatchesChronologically(matches).reduce((total, match) => {
    const nextTotal = total + scorer(match)
    return Math.max(0, nextTotal)
  }, 0)
}

export function buildRankings(wrestlers = [], matches = [], titles = []) {
  const competitiveWrestlers = wrestlers.filter((w) => (w.role || 'wrestler') === 'wrestler')
  const completedMatches = matches.filter((m) => m.winnerId != null)

  const baseRows = competitiveWrestlers.map((w) => ({
    id: w.id,
    basePRS: accumulatePRS(
      completedMatches.filter((match) => getParticipantIds(match).includes(w.id)),
      (match) => calcBaseMatchScore(match, w.id)
    ),
  }))

  const baseSorted = [...baseRows].sort((a, b) => b.basePRS - a.basePRS)

  const rankMap = Object.fromEntries(
    baseSorted.map((row, index) => [row.id, index + 1])
  )

  return competitiveWrestlers
    .map((w) => {
      const wins = w.wins || 0
      const losses = w.losses || 0
      const draws = w.draws || 0
      const totalMatches = wins + losses + draws
      const wrestlerMatches = completedMatches.filter((m) => getParticipantIds(m).includes(w.id))

      const prs = accumulatePRS(
        wrestlerMatches,
        (match) => calcAdvancedMatchScore(match, w.id, rankMap, competitiveWrestlers.length || 1)
      )

      const winPct = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

      return {
        id: w.id,
        name: w.name,
        prs,
        winPct,
        record: `${wins}-${losses}-${draws}`,
        streak: w.streak || 0,
        titles: titles.filter((t) => {
          const champIds = Array.isArray(t.champIds) && t.champIds.length > 0 ? t.champIds : (t.champId ? [t.champId] : [])
          return champIds.includes(w.id)
        }).length,
        matches: totalMatches,
      }
    })
    .sort((a, b) => {
      if (b.prs !== a.prs) return b.prs - a.prs
      if (b.winPct !== a.winPct) return b.winPct - a.winPct
      return a.name.localeCompare(b.name)
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }))
}

export function buildWeeklyPRSChanges(wrestlers = [], matches = [], currentDate) {
  const competitiveWrestlers = wrestlers.filter((w) => (w.role || 'wrestler') === 'wrestler')
  const completedMatches = matches.filter((m) => m.winnerId != null)
  const currentRankings = buildRankings(wrestlers, completedMatches, [])
  const currentPrsMap = new Map(currentRankings.map((row) => [row.id, row.prs]))

  const weekStart = currentDate ? fmt(getMondayOf(currentDate)) : null
  const previousMatches = weekStart
    ? completedMatches.filter((match) => String(match.date || '').localeCompare(weekStart) < 0)
    : completedMatches
  const previousRankings = buildRankings(wrestlers, previousMatches, [])
  const previousPrsMap = new Map(previousRankings.map((row) => [row.id, row.prs]))

  return competitiveWrestlers
    .map((wrestler) => {
      const currentPrs = currentPrsMap.get(wrestler.id) || 0
      const previousPrs = previousPrsMap.get(wrestler.id) || 0
      return {
        id: wrestler.id,
        name: wrestler.name,
        show: wrestler.show || 'Universe',
        currentPrs,
        previousPrs,
        delta: currentPrs - previousPrs,
      }
    })
    .filter((row) => row.delta !== 0)
    .sort((a, b) => {
      const deltaDiff = b.delta - a.delta
      if (deltaDiff !== 0) return deltaDiff
      return a.name.localeCompare(b.name)
    })
}
import { fmt, getMondayOf } from './dates.js'
