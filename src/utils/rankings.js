function getMatchResultForWrestler(match, wrestlerId) {
  const participantIds = getParticipantIds(match)
  if (!participantIds.includes(wrestlerId)) return 'pending'
  if (String(match?.finishType || '').trim().toLowerCase() === 'no contest') return 'draw'
  if (!match?.winnerId) return 'pending'
  if (match.winnerId === wrestlerId) return 'win'
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

export function buildRankings(wrestlers = [], matches = [], titles = []) {
  const competitiveWrestlers = wrestlers.filter((w) => (w.role || 'wrestler') === 'wrestler')
  const completedMatches = matches.filter((m) => m.winnerId != null)

  const baseRows = competitiveWrestlers.map((w) => ({
    id: w.id,
    basePRS: calcBasePRSForWrestler(w.id, completedMatches),
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

      const prs = wrestlerMatches.reduce((total, match) => {
        return total + calcAdvancedMatchScore(match, w.id, rankMap, competitiveWrestlers.length || 1)
      }, 0)

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
