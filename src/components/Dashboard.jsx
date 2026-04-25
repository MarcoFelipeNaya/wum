import React, { useMemo, useState } from 'react'
import { DAY_NAMES, getCustomDow, parseDate, formatUniverseDate, daysBetween } from '../utils/dates.js'
import { buildRankings, buildWeeklyPRSChanges } from '../utils/rankings.js'
import { getMatchRatingSummary } from '../utils/matchRatings.js'
import './Dashboard.css'

function getChampIds(title) {
  if (Array.isArray(title?.champIds) && title.champIds.length > 0) return title.champIds
  return title?.champId ? [title.champId] : []
}

function getParticipantIds(match) {
  if (Array.isArray(match?.participantIds) && match.participantIds.length > 0) return match.participantIds
  const fallback = []
  if (match?.w1) fallback.push(match.w1)
  if (match?.w2) fallback.push(match.w2)
  return fallback
}

function getTeamsFromMatch(match) {
  const participantIds = getParticipantIds(match)
  if (match.mode === 'tag' && participantIds.length === 4) {
    return [participantIds.slice(0, 2), participantIds.slice(2, 4)]
  }
  if (match.mode === 'trios' && participantIds.length === 6) {
    return [participantIds.slice(0, 3), participantIds.slice(3, 6)]
  }
  if (match.mode === '3tag' && participantIds.length === 6) {
    return [participantIds.slice(0, 2), participantIds.slice(2, 4), participantIds.slice(4, 6)]
  }
  if (match.mode === 'handicap' && participantIds.length >= 3 && participantIds.length <= 6) {
    return [participantIds.slice(0, 1), participantIds.slice(1)]
  }
  return null
}

function specialShowOccursOnDate(specialShow, dateStr) {
  if (!specialShow) return false
  if (specialShow.type === 'one_off') return specialShow.oneOffDate === dateStr
  const date = parseDate(dateStr)
  return date.year >= specialShow.startYear && date.month === specialShow.month && date.day === specialShow.day
}

function formatFullDate(dateStr) {
  return formatUniverseDate(dateStr)
}

function segmentTypeBadgeColor(segmentType) {
  if (!segmentType) return 'var(--text2)'
  const t = segmentType.toLowerCase()
  if (t.includes('promo') || t.includes('interview')) return '#2980b9'
  if (t.includes('brawl') || t.includes('attack') || t.includes('ambush')) return '#c0392b'
  if (t.includes('vignette') || t.includes('video') || t.includes('recap')) return '#9b59b6'
  if (t.includes('gm') || t.includes('contract') || t.includes('ceremony')) return '#d4af37'
  if (t.includes('celebration') || t.includes('retirement') || t.includes('return')) return '#27ae60'
  return 'var(--text2)'
}

function DashboardPanel({ title, count, filters = null, empty = false, emptyText = '', children, className = '' }) {
  return (
    <div className={`dashboard-panel${className ? ` ${className}` : ''}`}>
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-heading">{title}</div>
        {count && <div className="dashboard-panel-count">{count}</div>}
      </div>
      {filters}
      {empty ? <div className="dashboard-empty-state">{emptyText}</div> : children}
    </div>
  )
}

function FilterTabs({ options, value, onChange }) {
  return (
    <div className="dashboard-filter-row">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`dashboard-filter-btn${value === option.value ? ' active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-accent" style={{ background: `linear-gradient(90deg, ${tone}, transparent)` }} />
      <div className="dashboard-stat-value">{value}</div>
      <div className="dashboard-stat-label">{label}</div>
    </div>
  )
}

export default function Dashboard({ state }) {
  const {
    wrestlers = [],
    shows = [],
    titles = [],
    matches = [],
    stories = [],
    factions = [],
    teams = [],
    specialShows = [],
    currentDate,
    standaloneSegments = [],
  } = state
  const [titleShowFilter, setTitleShowFilter] = useState('all')
  const [storyShowFilter, setStoryShowFilter] = useState('all')
  const [rankingsShowFilter, setRankingsShowFilter] = useState('all')

  const getW = (id) => wrestlers.find((w) => w.id === id)
  const getShow = (name) => shows.find((show) => show.name === name)
  const getBrandColor = (showName) => getShow(showName)?.color || 'var(--primary)'
  const getFaction = (id) => factions.find((faction) => faction.id === id)
  const getTeam = (id) => teams.find((team) => team.id === id)
  const activeStories = stories.filter((story) => story.status !== 'Concluded')
  const crownedTitles = titles.filter((title) => getChampIds(title).length > 0)
  const competitiveRoster = wrestlers.filter((wrestler) => (wrestler.role || 'wrestler') === 'wrestler')
  const managers = wrestlers.filter((wrestler) => (wrestler.role || 'wrestler') === 'manager')
  const completedMatches = matches.filter((match) => match.winnerId != null)
  const ratingSummary = useMemo(() => getMatchRatingSummary(matches), [matches])

  const todayShows = useMemo(() => {
    const safeDate = currentDate
    const dow = getCustomDow(safeDate)
    const weeklyShows = shows
      .filter((show) => show.day === DAY_NAMES[dow])
      .map((show) => ({ ...show, kind: 'weekly', label: show.name }))

    const eventShows = specialShows
      .filter((specialShow) => specialShowOccursOnDate(specialShow, safeDate))
      .map((specialShow) => {
        const parentShow = shows.find((show) => show.id === specialShow.showId)
        if (!parentShow) return null
        return {
          ...parentShow,
          id: `special-${specialShow.id}`,
          kind: 'special',
          label: specialShow.name || parentShow.name,
          eventType: specialShow.type,
        }
      })
      .filter(Boolean)

    return [...weeklyShows, ...eventShows]
  }, [currentDate, shows, specialShows])

  const recentResults = useMemo(
    () => [...matches].filter((match) => match.winnerId != null).slice(-6).reverse(),
    [matches]
  )
  const availableShowFilters = useMemo(() => shows.map((show) => show.name), [shows])
  const titleFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      { value: 'Universe', label: 'Universe' },
      ...availableShowFilters.map((showName) => ({ value: showName, label: showName })),
    ],
    [availableShowFilters]
  )
  const showFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...availableShowFilters.map((showName) => ({ value: showName, label: showName })),
    ],
    [availableShowFilters]
  )

  const tonightCard = useMemo(() => {
    const dayMatches = matches
      .filter((match) => match.date === currentDate)
      .map((match, index) => ({
        kind: 'match',
        id: match.id,
        cardOrder: Number(match.cardOrder) || index + 1,
        match,
      }))

    const storySegments = stories.flatMap((story) =>
      (story.segments || [])
        .filter((segment) => segment.date === currentDate)
        .map((segment, index) => ({
          kind: 'segment',
          id: segment.id || `story-${story.id}-${index}`,
          cardOrder: Number(segment.cardOrder) || dayMatches.length + index + 1,
          segment: { ...segment, storyName: story.name },
        }))
    )

    const looseSegments = standaloneSegments
      .filter((segment) => segment.date === currentDate)
      .map((segment, index) => ({
        kind: 'segment',
        id: segment.id || `standalone-${index}`,
        cardOrder: Number(segment.cardOrder) || dayMatches.length + storySegments.length + index + 1,
        segment,
      }))

    return [...dayMatches, ...storySegments, ...looseSegments].sort((a, b) => a.cardOrder - b.cardOrder)
  }, [matches, stories, standaloneSegments, currentDate])

  const hotStories = useMemo(
    () => [...activeStories]
      .sort((a, b) => getStoryHeat(b) - getStoryHeat(a))
      .slice(0, 4),
    [activeStories, matches, teams, factions]
  )
  const filteredTitles = useMemo(() => {
    if (titleShowFilter === 'all') return titles
    if (titleShowFilter === 'Universe') return titles.filter((title) => (title.show || 'Universe') === 'Universe')
    return titles.filter((title) => (title.show || 'Universe') === titleShowFilter)
  }, [titles, titleShowFilter])
  const filteredRankings = useMemo(() => {
    const topRows = buildRankings(wrestlers, matches, titles)
    if (rankingsShowFilter === 'all') return topRows.slice(0, 5)
    return topRows.filter((row) => getW(row.id)?.show === rankingsShowFilter).slice(0, 5)
  }, [wrestlers, matches, titles, rankingsShowFilter])
  const filteredHotStories = useMemo(() => {
    if (storyShowFilter === 'all') return hotStories
    return hotStories.filter((story) => getStoryParticipantIds(story).some((id) => getW(id)?.show === storyShowFilter))
  }, [hotStories, storyShowFilter])
  const weeklyPrsMovers = useMemo(
    () => buildWeeklyPRSChanges(wrestlers, matches, currentDate)
      .sort((a, b) => {
        const absDiff = Math.abs(b.delta) - Math.abs(a.delta)
        if (absDiff !== 0) return absDiff
        return a.name.localeCompare(b.name)
      })
      .slice(0, 5),
    [wrestlers, matches, currentDate]
  )

  const heatCheck = useMemo(() => {
    const currentRankings = buildRankings(wrestlers, matches, titles)
    const rankMap = new Map(currentRankings.map((row) => [row.id, row]))
    const storyParticipantMap = new Map()

    activeStories.forEach((story) => {
      getStoryParticipantIds(story).forEach((id) => {
        storyParticipantMap.set(id, (storyParticipantMap.get(id) || 0) + 1)
      })
    })

    const segmentActivityMap = new Map()
    stories.forEach((story) => {
      ;(story.segments || []).forEach((segment) => {
        ;(segment.wrestlerIds || getStoryParticipantIds(story)).forEach((id) => {
          segmentActivityMap.set(id, (segmentActivityMap.get(id) || 0) + 1)
        })
      })
    })
    standaloneSegments.forEach((segment) => {
      ;(segment.wrestlerIds || []).forEach((id) => {
        segmentActivityMap.set(id, (segmentActivityMap.get(id) || 0) + 1)
      })
    })

    const snapshots = competitiveRoster.map((wrestler) => {
      const wrestlerMatches = completedMatches
        .filter((match) => getParticipantIds(match).includes(wrestler.id))
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || ((Number(a.id) || 0) - (Number(b.id) || 0)))
      const recentMatches = wrestlerMatches.slice(-5)
      const recentWindowMatches = wrestlerMatches.filter((match) => {
        const age = daysBetween(match.date, currentDate)
        return age >= 0 && age <= 28
      })
      const recentWins = recentMatches.filter((match) => match.winnerId === wrestler.id).length
      const recentLosses = recentMatches.filter((match) => match.winnerId && match.winnerId !== wrestler.id).length
      const ratings = recentMatches.map((match) => Number(match.rating)).filter((rating) => Number.isFinite(rating))
      const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0
      const titleCount = titles.filter((title) => getChampIds(title).includes(wrestler.id)).length
      const storyCount = storyParticipantMap.get(wrestler.id) || 0
      const segmentCount = segmentActivityMap.get(wrestler.id) || 0
      const ranking = rankMap.get(wrestler.id)
      const lastMatch = wrestlerMatches[wrestlerMatches.length - 1]
      const daysIdle = lastMatch ? daysBetween(lastMatch.date, currentDate) : null
      const score = Math.round(
        (recentWins * 16)
        - (recentLosses * 7)
        + ((wrestler.streak || 0) * 5)
        + (titleCount * 12)
        + (storyCount * 7)
        + (segmentCount * 2)
        + (averageRating * 4)
        + (recentWindowMatches.length * 3)
        + (ranking ? Math.max(0, 8 - ranking.rank) : 0)
      )

      let status = 'Steady'
      if (score >= 55 || (recentWins >= 4 && (wrestler.streak || 0) >= 3)) status = 'On Fire'
      else if (score >= 35 || recentWins >= 3) status = 'Rising'
      else if ((wrestler.streak || 0) <= -2 || recentLosses >= 3) status = 'Cooling'
      else if (daysIdle == null || daysIdle > 28) status = 'Underused'

      return {
        id: wrestler.id,
        name: wrestler.name,
        show: wrestler.show || 'Universe',
        score,
        status,
        recentRecord: `${recentWins}-${recentLosses}`,
        recentMatches: recentMatches.length,
        titleCount,
        storyCount,
        daysIdle,
        rank: ranking?.rank,
      }
    })

    const topMomentum = [...snapshots]
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 4)
    const attention = [...snapshots]
      .filter((row) => row.status === 'Cooling' || row.status === 'Underused')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'Cooling' ? -1 : 1
        return (b.daysIdle || 0) - (a.daysIdle || 0)
      })
      .slice(0, 4)

    return { topMomentum, attention }
  }, [wrestlers, matches, titles, activeStories, stories, standaloneSegments, competitiveRoster, completedMatches, currentDate])

  const universeNews = useMemo(() => {
    const titleMap = new Map(titles.map((title) => [title.id, title]))
    const items = []

    completedMatches.forEach((match) => {
      const title = titleMap.get(match.titleId)
      const winner = getW(match.winnerId)
      const label = renderMatchLabel(match)
      if (title && winner) {
        items.push({
          id: `title-${match.id}`,
          date: match.date,
          type: 'Title Scene',
          tone: '#d4af37',
          headline: `${winner.name} leaves with ${title.name}`,
          detail: `${label} ended with championship stakes settled.`,
        })
        return
      }
      if (winner) {
        items.push({
          id: `match-${match.id}`,
          date: match.date,
          type: 'Result',
          tone: '#2980b9',
          headline: `${winner.name} scores the win`,
          detail: label,
        })
      }
    })

    stories.forEach((story) => {
      ;(story.segments || []).forEach((segment, index) => {
        items.push({
          id: `story-${story.id}-${segment.id || index}`,
          date: segment.date,
          type: story.type === 'rivalry' ? 'Rivalry Beat' : 'Story Beat',
          tone: segmentTypeBadgeColor(segment.segmentType),
          headline: segment.title || story.name,
          detail: `${story.name}${segment.segmentType ? ` - ${segment.segmentType}` : ''}`,
        })
      })
    })

    standaloneSegments.forEach((segment, index) => {
      items.push({
        id: `standalone-${segment.id || index}`,
        date: segment.date,
        type: 'Segment',
        tone: segmentTypeBadgeColor(segment.segmentType),
        headline: segment.title || 'Standalone segment',
        detail: segment.segmentType || 'Angle added to the card',
      })
    })

    return items
      .filter((item) => item.date)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.id).localeCompare(String(a.id)))
      .slice(0, 8)
  }, [completedMatches, titles, stories, standaloneSegments])

  const brandPulse = useMemo(
    () =>
      shows.map((show) => {
        const rosterCount = wrestlers.filter((wrestler) => wrestler.show === show.name).length
        const titleCount = titles.filter((title) => (title.show || 'Universe') === show.name).length
        const specialCount = specialShows.filter((specialShow) => specialShow.showId === show.id).length
        const bookedCount = matches.filter((match) => {
          const participants = getParticipantIds(match)
          return participants.some((id) => getW(id)?.show === show.name)
        }).length

        return {
          ...show,
          rosterCount,
          titleCount,
          specialCount,
          bookedCount,
        }
      }),
    [shows, wrestlers, titles, specialShows, matches]
  )

  const stats = [
    { label: 'Roster Entries', value: wrestlers.length, tone: '#d4af37' },
    { label: 'Active Stories', value: activeStories.length, tone: '#c0392b' },
    { label: 'Completed Matches', value: completedMatches.length, tone: '#2980b9' },
    { label: 'Champions Crowned', value: crownedTitles.length, tone: '#27ae60' },
    { label: 'Avg Match Rating', value: ratingSummary.averageRating != null ? `${ratingSummary.averageRating}/5` : '--', tone: '#f39c12' },
  ]

  function renderMatchLabel(match) {
    const participantIds = getParticipantIds(match)
    const participantNames = participantIds.map((id) => getW(id)?.name || 'Unknown')
    if (match.mode === 'tag' || match.mode === 'trios' || match.mode === '3tag') {
      const teamSize = match.mode === 'trios' ? 3 : 2
      const teams = []
      for (let i = 0; i < participantNames.length; i += teamSize) {
        teams.push(participantNames.slice(i, i + teamSize).join(' / '))
      }
      return teams.join(' vs ')
    }
    return participantNames.join(' vs ')
  }

  const getWinnerLabel = (match) => {
    if (!match?.winnerId) return 'Pending result'
    const teams = getTeamsFromMatch(match)
    if (teams) {
      const winningTeam = teams.find((team) => team.includes(match.winnerId))
      if (winningTeam) {
        return `${winningTeam.map((id) => getW(id)?.name || 'Unknown').join(' / ')} won`
      }
    }
    return `${getW(match.winnerId)?.name || 'Unknown'} won`
  }

  function getStoryParticipantName(participant) {
    if (participant.type === 'wrestler') return getW(participant.id)?.name || 'Unknown'
    if (participant.type === 'team') return getTeam(participant.id)?.name || 'Unknown Team'
    if (participant.type === 'faction') return getFaction(participant.id)?.name || 'Unknown Faction'
    return 'Unknown'
  }

  function getStoryParticipantIds(story) {
    return (story.participants || []).flatMap((participant) => {
      if (participant.type === 'wrestler') return [participant.id]
      if (participant.type === 'team') return getTeam(participant.id)?.memberIds || []
      if (participant.type === 'faction') return getFaction(participant.id)?.memberIds || []
      return []
    })
  }

  function getStoryHeat(story) {
    const participantIds = getStoryParticipantIds(story)
    const storyMatchCount = matches.filter((match) => getParticipantIds(match).some((id) => participantIds.includes(id))).length
    return storyMatchCount + (story.segments?.length || 0)
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="dashboard-kicker">Heat: Wrestling Booker</div>
          <h1 className="page-title">Run The Show. Build The Legacy. Control The Heat</h1>
          <div className="dashboard-hero-tagline">The live booking desk for your wrestling universe.</div>
          <p className="dashboard-hero-subtle">
            {formatFullDate(currentDate)} is your current in-universe date, with {todayShows.length} show
            {todayShows.length !== 1 ? 's' : ''} scheduled, {activeStories.length} active stor
            {activeStories.length === 1 ? 'y' : 'ies'}, and {matches.length} total booked match
            {matches.length !== 1 ? 'es' : ''} across the save.
          </p>

          <div className="dashboard-show-strip">
            {todayShows.length === 0 ? (
              <span className="dashboard-empty-pill">No shows scheduled today</span>
            ) : (
              todayShows.map((show) => (
                <span
                  key={show.id}
                  className="dashboard-show-pill"
                  style={{ background: `${show.color}22`, color: show.color, borderColor: `${show.color}44` }}
                >
                  {show.label}
                  {show.kind === 'special' && <span className="dashboard-show-pill-meta">Special</span>}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-hero-side">
          <div className="dashboard-side-card">
            <div className="dashboard-side-heading">Tonight&apos;s Heat</div>
            <div className="dashboard-side-value">{todayShows.length}</div>
            <div className="dashboard-side-subtle">Shows on the board for the current date</div>
          </div>
          <div className="dashboard-side-card">
            <div className="dashboard-side-heading">Story Sparks</div>
            <div className="dashboard-side-value">{standaloneSegments.length + stories.reduce((total, story) => total + (story.segments?.length || 0), 0)}</div>
            <div className="dashboard-side-subtle">Segments and angles fueling the universe</div>
          </div>
        </div>
      </section>

      <section className="dashboard-showcase">
        <div className="dashboard-showcase-card">
          <div className="dashboard-showcase-kicker">Book With Intent</div>
          <h3 className="dashboard-showcase-title">One desk for cards, stories, and momentum.</h3>
          <p className="dashboard-showcase-copy">
            Build full show cards, track angles, and keep the entire universe moving without bouncing between disconnected tools.
          </p>
        </div>
        <div className="dashboard-showcase-card">
          <div className="dashboard-showcase-kicker">Brand The Universe</div>
          <h3 className="dashboard-showcase-title">Shows, specials, factions, tournaments, and gold all stay connected.</h3>
          <p className="dashboard-showcase-copy">
            Heat is built to manage branded promotions, big event identity, title scenes, and faction ecosystems in one place.
          </p>
        </div>
        <div className="dashboard-showcase-card">
          <div className="dashboard-showcase-kicker">Protect The Save</div>
          <h3 className="dashboard-showcase-title">Your universe keeps its history.</h3>
          <p className="dashboard-showcase-copy">
            IndexedDB persistence, recovery snapshots, and import/export backups keep long-running universes safer as they grow.
          </p>
        </div>
      </section>

      <section className="dashboard-stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="dashboard-feature-grid">
        <DashboardPanel
          title="Heat Check"
          count={`${heatCheck.topMomentum.length} momentum picks`}
          empty={heatCheck.topMomentum.length === 0}
          emptyText="Book completed matches to generate Heat Check momentum."
          className="dashboard-panel-feature"
        >
          <div className="dashboard-formula-note">
            Heat weighs recent wins and losses, streak, championships, active stories, segment activity, match ratings,
            recent booking, and current ranking position.
          </div>
          <div className="dashboard-heat-layout">
            <div className="dashboard-heat-column">
              <div className="dashboard-mini-heading">On The Rise</div>
              <div className="dashboard-list">
                {heatCheck.topMomentum.map((row) => (
                  <div key={row.id} className="dashboard-heat-card">
                    <div className="dashboard-heat-score">
                      <span>{Math.max(0, row.score)}</span>
                      <small>Heat</small>
                    </div>
                    <div className="dashboard-list-main">
                      <div className="dashboard-result-topline">
                        <span className="dashboard-match-type">{row.status}</span>
                        <span className="dashboard-result-date">{row.show}</span>
                      </div>
                      <div className="dashboard-result-title">{row.name}</div>
                      <div className="dashboard-list-subtle">
                        Recent {row.recentRecord}
                        {row.rank ? ` - ranked #${row.rank}` : ''}
                        {row.titleCount > 0 ? ` - ${row.titleCount} title${row.titleCount !== 1 ? 's' : ''}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="dashboard-heat-column">
              <div className="dashboard-mini-heading">Needs Attention</div>
              {heatCheck.attention.length === 0 ? (
                <div className="dashboard-empty-state dashboard-empty-state-compact">No cooling or idle wrestlers flagged.</div>
              ) : (
                <div className="dashboard-list">
                  {heatCheck.attention.map((row) => (
                    <div key={row.id} className="dashboard-alert-row">
                      <div>
                        <div className="dashboard-list-title">{row.name}</div>
                        <div className="dashboard-list-subtle">
                          {row.status === 'Underused'
                            ? row.daysIdle == null ? 'No completed matches yet' : `${row.daysIdle} days since last result`
                            : `Recent form ${row.recentRecord} needs a rebound`}
                        </div>
                      </div>
                      <span className={`dashboard-badge ${row.status === 'Cooling' ? 'dashboard-badge-danger' : 'dashboard-badge-muted'}`}>
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Universe News"
          count={`${universeNews.length} items`}
          empty={universeNews.length === 0}
          emptyText="Book results or story segments to generate the universe news feed."
          className="dashboard-panel-feature"
        >
          <div className="dashboard-news-list">
            {universeNews.map((item) => (
              <div key={item.id} className="dashboard-news-item">
                <div className="dashboard-news-marker" style={{ background: item.tone }} />
                <div className="dashboard-list-main">
                  <div className="dashboard-result-topline">
                    <span className="dashboard-match-type" style={{ color: item.tone }}>{item.type}</span>
                    <span className="dashboard-result-date">{formatUniverseDate(item.date)}</span>
                  </div>
                  <div className="dashboard-result-title">{item.headline}</div>
                  <div className="dashboard-list-subtle">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">Current Champions</div>
            <div className="dashboard-panel-count">{filteredTitles.length} title{filteredTitles.length !== 1 ? 's' : ''}</div>
          </div>
          <FilterTabs options={titleFilterOptions} value={titleShowFilter} onChange={setTitleShowFilter} />
          {filteredTitles.length === 0 ? (
            <div className="dashboard-empty-state">No titles have been created yet.</div>
          ) : (
            <div className="dashboard-list">
              {filteredTitles.map((title) => {
                const championNames = getChampIds(title).map((id) => getW(id)?.name).filter(Boolean)
                const accent = getBrandColor(title.show)
                return (
                  <div key={title.id} className="dashboard-list-row">
                    <div className="dashboard-list-main">
                      <div className="dashboard-list-title" style={{ color: accent }}>{title.name}</div>
                      <div className="dashboard-list-subtle">
                        {championNames.length > 0 ? championNames.join(' / ') : 'Vacant'}
                      </div>
                    </div>
                    <span className="dashboard-badge" style={{ background: `${accent}22`, color: accent, borderColor: `${accent}44` }}>
                      {title.show || 'Universe'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">Recent Results</div>
            <div className="dashboard-panel-count">{recentResults.length} shown</div>
          </div>
          {recentResults.length === 0 ? (
            <div className="dashboard-empty-state">No completed matches yet.</div>
          ) : (
            <div className="dashboard-list">
              {recentResults.map((match) => {
                const winner = getW(match.winnerId)
                return (
                  <div key={match.id} className="dashboard-result-card">
                    <div className="dashboard-result-topline">
                      <span className="dashboard-match-type">{match.matchType || 'Match'}</span>
                      <span className="dashboard-result-date">{formatUniverseDate(match.date)}</span>
                    </div>
                    <div className="dashboard-result-title">{renderMatchLabel(match)}</div>
                    <div className="dashboard-result-footer">
                      <span className="dashboard-result-winner">{getWinnerLabel(match)}</span>
                      {match.stipulation && <span className="dashboard-badge dashboard-badge-muted">{match.stipulation}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">Tonight&apos;s Card</div>
            <div className="dashboard-panel-count">{tonightCard.length} item{tonightCard.length !== 1 ? 's' : ''}</div>
          </div>
          {tonightCard.length === 0 ? (
            <div className="dashboard-empty-state">Nothing is booked on the current show day yet.</div>
          ) : (
            <div className="dashboard-list">
              {tonightCard.map((item, index) => (
                item.kind === 'match' ? (
                  <div key={item.id} className="dashboard-result-card">
                    <div className="dashboard-result-topline">
                      <span className="dashboard-match-type">Match {index + 1}</span>
                      <span className="dashboard-result-date">{item.match.matchType || 'Match'}</span>
                    </div>
                    <div className="dashboard-result-title">{renderMatchLabel(item.match)}</div>
                    <div className="dashboard-result-footer">
                      <span className="dashboard-list-subtle">{item.match.titleId ? 'Title match' : 'Standard bout'}</span>
                      {item.match.stipulation && <span className="dashboard-badge dashboard-badge-muted">{item.match.stipulation}</span>}
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className="dashboard-segment-card">
                    <div className="dashboard-result-topline">
                      <span className="dashboard-match-type">Segment {index + 1}</span>
                      {item.segment.segmentType && (
                        <span className="dashboard-badge" style={{ background: `${segmentTypeBadgeColor(item.segment.segmentType)}22`, color: segmentTypeBadgeColor(item.segment.segmentType), borderColor: `${segmentTypeBadgeColor(item.segment.segmentType)}44` }}>
                          {item.segment.segmentType}
                        </span>
                      )}
                    </div>
                    <div className="dashboard-result-title">{item.segment.title || 'Segment'}</div>
                    <div className="dashboard-result-footer">
                      <span className="dashboard-list-subtle">{item.segment.storyName || 'Standalone segment'}</span>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">Brand Pulse</div>
            <div className="dashboard-panel-count">{shows.length} brand{shows.length !== 1 ? 's' : ''}</div>
          </div>
          {brandPulse.length === 0 ? (
            <div className="dashboard-empty-state">No brands created yet.</div>
          ) : (
            <div className="dashboard-brand-grid">
              {brandPulse.map((show) => (
                <div key={show.id} className="dashboard-brand-card">
                  <div className="dashboard-brand-topline">
                    <span className="dashboard-brand-dot" style={{ background: show.color }} />
                    <strong>{show.name}</strong>
                    <span className="dashboard-badge dashboard-badge-muted">{show.day}</span>
                  </div>
                  <div className="dashboard-brand-stats">
                    <div><span>Roster</span><strong>{show.rosterCount}</strong></div>
                    <div><span>Titles</span><strong>{show.titleCount}</strong></div>
                    <div><span>Specials</span><strong>{show.specialCount}</strong></div>
                    <div><span>Matches</span><strong>{show.bookedCount}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">Hot Feuds</div>
            <div className="dashboard-panel-count">{filteredHotStories.length} spotlighted</div>
          </div>
          <FilterTabs options={showFilterOptions} value={storyShowFilter} onChange={setStoryShowFilter} />
          {filteredHotStories.length === 0 ? (
            <div className="dashboard-empty-state">No active stories are running right now.</div>
          ) : (
            <div className="dashboard-list">
              {filteredHotStories.map((story) => (
                <div key={story.id} className="dashboard-story-card">
                  <div className="dashboard-result-topline">
                    <span className="dashboard-match-type">{story.type === 'rivalry' ? 'Rivalry' : 'Story'}</span>
                    <span className={`dashboard-badge ${story.status === 'Active' ? '' : 'dashboard-badge-muted'}`}>
                      {story.status}
                    </span>
                  </div>
                  <div className="dashboard-result-title">{story.name}</div>
                  <div className="dashboard-list-subtle">
                    {(story.participants || []).slice(0, 3).map(getStoryParticipantName).join(' / ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">Top Ranked</div>
            <div className="dashboard-panel-count">{filteredRankings.length} shown</div>
          </div>
          <FilterTabs options={showFilterOptions} value={rankingsShowFilter} onChange={setRankingsShowFilter} />
          {filteredRankings.length === 0 ? (
            <div className="dashboard-empty-state">No rankings data yet.</div>
          ) : (
            <div className="dashboard-list">
              {filteredRankings.map((row) => (
                <div key={row.id} className="dashboard-ranking-row">
                  <div className="dashboard-ranking-rank">#{row.rank}</div>
                  <div className="dashboard-list-main">
                    <div className="dashboard-list-title">{row.name}</div>
                    <div className="dashboard-list-subtle">Record {row.record} - PRS {Math.round(row.prs)}</div>
                  </div>
                  <span className="dashboard-badge dashboard-badge-muted">{row.titles} title{row.titles !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">PRS Movers This Week</div>
            <div className="dashboard-panel-count">{weeklyPrsMovers.length} tracked</div>
          </div>
          {weeklyPrsMovers.length === 0 ? (
            <div className="dashboard-empty-state">No PRS movement yet this week.</div>
          ) : (
            <div className="dashboard-list">
              {weeklyPrsMovers.map((row) => (
                <div key={row.id} className="dashboard-ranking-row">
                  <div className="dashboard-ranking-rank">{row.delta > 0 ? 'UP' : 'DN'}</div>
                  <div className="dashboard-list-main">
                    <div className="dashboard-list-title">{row.name}</div>
                    <div className="dashboard-list-subtle">{row.show} - PRS {Math.round(row.previousPrs)} to {Math.round(row.currentPrs)}</div>
                  </div>
                  <span
                    className="dashboard-badge"
                    style={{
                      background: row.delta > 0 ? 'rgba(39, 174, 96, 0.16)' : 'rgba(52, 152, 219, 0.16)',
                      color: row.delta > 0 ? '#73e2a7' : '#8ed0ff',
                      borderColor: row.delta > 0 ? 'rgba(39, 174, 96, 0.35)' : 'rgba(52, 152, 219, 0.35)',
                    }}
                  >
                    {row.delta > 0 ? '+' : ''}{Math.round(row.delta)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">Match Ratings</div>
            <div className="dashboard-panel-count">{ratingSummary.ratedCount} rated</div>
          </div>
          {ratingSummary.ratedCount === 0 ? (
            <div className="dashboard-empty-state">No match ratings yet.</div>
          ) : (
            <div className="dashboard-list">
              <div className="dashboard-fact-list" style={{ marginBottom: 14 }}>
                <div className="dashboard-fact-row"><span>Average rating</span><strong>{ratingSummary.averageRating}/5</strong></div>
                <div className="dashboard-fact-row"><span>Rated matches</span><strong>{ratingSummary.ratedCount}</strong></div>
              </div>
              {ratingSummary.topMatches.map((match) => (
                <div key={match.id} className="dashboard-result-card">
                  <div className="dashboard-result-topline">
                    <span className="dashboard-match-type">{match.matchType || 'Match'}</span>
                    <span className="dashboard-result-date">{formatUniverseDate(match.date)}</span>
                  </div>
                  <div className="dashboard-result-title">{renderMatchLabel(match)}</div>
                  <div className="dashboard-result-footer">
                    <span className="dashboard-result-winner">{match.rating}/5 stars</span>
                    {match.stipulation && <span className="dashboard-badge dashboard-badge-muted">{match.stipulation}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">Universe Snapshot</div>
            <div className="dashboard-panel-count">Live totals</div>
          </div>
          <div className="dashboard-fact-list">
            <div className="dashboard-fact-row"><span>Competitive roster</span><strong>{competitiveRoster.length}</strong></div>
            <div className="dashboard-fact-row"><span>Managers</span><strong>{managers.length}</strong></div>
            <div className="dashboard-fact-row"><span>Teams</span><strong>{teams.length}</strong></div>
            <div className="dashboard-fact-row"><span>Factions</span><strong>{factions.length}</strong></div>
            <div className="dashboard-fact-row"><span>Special events</span><strong>{specialShows.length}</strong></div>
            <div className="dashboard-fact-row"><span>Stories concluded</span><strong>{stories.filter((story) => story.status === 'Concluded').length}</strong></div>
          </div>
        </div>
      </section>
    </div>
  )
}
