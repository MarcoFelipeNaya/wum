export function getRatedMatches(matches = []) {
  return (matches || []).filter((match) => match?.rating != null)
}

export function getAverageMatchRating(matches = []) {
  const ratedMatches = getRatedMatches(matches)
  if (ratedMatches.length === 0) return null
  const total = ratedMatches.reduce((sum, match) => sum + Number(match.rating || 0), 0)
  return Math.round((total / ratedMatches.length) * 10) / 10
}

export function getTopRatedMatches(matches = [], limit = 3) {
  return [...getRatedMatches(matches)]
    .sort((a, b) => {
      if (Number(b.rating) !== Number(a.rating)) return Number(b.rating) - Number(a.rating)
      return String(b.date || '').localeCompare(String(a.date || ''))
    })
    .slice(0, limit)
}

export function getMatchRatingSummary(matches = []) {
  const ratedMatches = getRatedMatches(matches)
  return {
    ratedCount: ratedMatches.length,
    averageRating: getAverageMatchRating(ratedMatches),
    topMatches: getTopRatedMatches(ratedMatches),
  }
}
