import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import './Records.css'

function getParticipantIds(match) {
  if (Array.isArray(match?.participantIds) && match.participantIds.length > 0) return match.participantIds
  const fallback = []
  if (match?.w1) fallback.push(match.w1)
  if (match?.w2) fallback.push(match.w2)
  return fallback
}

function arraysMatch(a = [], b = []) {
  if (a.length !== b.length) return false
  const left = [...a].sort((x, y) => x - y)
  const right = [...b].sort((x, y) => x - y)
  return left.every((value, index) => value === right[index])
}

function getMatchTeams(match) {
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
  return null
}

function formatRecordValue(record, value) {
  if (record.key === 'winPct') return `${value}%`
  if (record.key === 'avgRating') return `${Number(value).toFixed(2)} / 5`
  if (record.key === 'streak') return `${value} straight`
  return String(value)
}

function getRecordRowValue(recordKey, row) {
  if (recordKey === 'mainEvents') return row.mainEventMatches
  if (recordKey === 'fiveStars') return row.fiveStarMatches
  if (recordKey === 'titleWins') return row.titleMatchWins
  if (recordKey === 'matches') return row.totalMatches
  if (recordKey === 'avgRating') return row.averageRating
  return row[recordKey]
}

function buildMainEventMatchIds(matches = []) {
  const grouped = new Map()
  matches.forEach((match) => {
    const date = match.date || ''
    if (!grouped.has(date)) grouped.set(date, [])
    grouped.get(date).push(match)
  })

  const mainEventIds = new Set()
  grouped.forEach((dayMatches) => {
    const mainEvent = [...dayMatches]
      .sort((a, b) => (Number(a.cardOrder) || 9999) - (Number(b.cardOrder) || 9999))[0]
    if (mainEvent?.id != null) mainEventIds.add(mainEvent.id)
  })
  return mainEventIds
}

export default function Records({ state }) {
  const { wrestlers = [], matches = [], titles = [], teams = [] } = state
  const [activeRecord, setActiveRecord] = useState(null)

  const competitiveWrestlers = useMemo(
    () => wrestlers.filter((wrestler) => (wrestler.role || 'wrestler') === 'wrestler'),
    [wrestlers]
  )

  const championMap = useMemo(() => {
    const counts = new Map()
    titles.forEach((title) => {
      const champIds = Array.isArray(title.champIds) && title.champIds.length > 0
        ? title.champIds
        : (title.champId ? [title.champId] : [])
      champIds.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1))
    })
    return counts
  }, [titles])

  const teamChampionMap = useMemo(() => {
    const counts = new Map()
    teams.forEach((team) => {
      const reigns = titles.filter((title) => {
        const champIds = Array.isArray(title.champIds) && title.champIds.length > 0
          ? title.champIds
          : (title.champId ? [title.champId] : [])
        return arraysMatch(champIds, team.memberIds || [])
      }).length
      counts.set(team.id, reigns)
    })
    return counts
  }, [teams, titles])

  const recordRows = useMemo(() => {
    const completedMatches = matches.filter((match) => match.winnerId != null)
    const mainEventMatchIds = buildMainEventMatchIds(matches)

    return competitiveWrestlers.map((wrestler) => {
      const wrestlerMatches = completedMatches.filter((match) => getParticipantIds(match).includes(wrestler.id))
      const ratedMatches = wrestlerMatches.filter((match) => match.rating != null)
      const fiveStarMatches = ratedMatches.filter((match) => Number(match.rating) === 5).length
      const mainEventMatches = wrestlerMatches.filter((match) => mainEventMatchIds.has(match.id)).length
      const titleMatchWins = wrestlerMatches.filter((match) => match.titleId && match.winnerId === wrestler.id).length
      const averageRating = ratedMatches.length > 0
        ? ratedMatches.reduce((total, match) => total + Number(match.rating || 0), 0) / ratedMatches.length
        : null
      const wins = wrestler.wins || 0
      const losses = wrestler.losses || 0
      const draws = wrestler.draws || 0
      const totalMatches = wins + losses + draws
      const winPct = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

      return {
        id: wrestler.id,
        name: wrestler.name,
        show: wrestler.show || 'Universe',
        align: wrestler.align || 'Neutral',
        wins,
        losses,
        draws,
        totalMatches,
        winPct,
        streak: Math.max(0, wrestler.streak || 0),
        mainEventMatches,
        fiveStarMatches,
        averageRating,
        ratedMatches: ratedMatches.length,
        titleMatchWins,
        titlesHeld: championMap.get(wrestler.id) || 0,
      }
    })
  }, [competitiveWrestlers, matches, championMap])

  const teamRecordRows = useMemo(() => {
    const completedMatches = matches.filter((match) => match.winnerId != null)
    const mainEventMatchIds = buildMainEventMatchIds(matches)

    return teams.map((team) => {
      const memberIds = team.memberIds || []
      const teamMatches = completedMatches.filter((match) => {
        const matchTeams = getMatchTeams(match)
        return matchTeams?.some((matchTeam) => arraysMatch(matchTeam, memberIds)) || false
      })
      const ratedMatches = teamMatches.filter((match) => match.rating != null)
      const fiveStarMatches = ratedMatches.filter((match) => Number(match.rating) === 5).length
      const mainEventMatches = teamMatches.filter((match) => mainEventMatchIds.has(match.id)).length
      const wins = teamMatches.filter((match) => memberIds.includes(match.winnerId)).length
      const draws = teamMatches.filter((match) => String(match.finishType || '').trim().toLowerCase() === 'no contest').length
      const losses = Math.max(0, teamMatches.length - wins - draws)
      const titleMatchWins = teamMatches.filter((match) => match.titleId && memberIds.includes(match.winnerId)).length
      const averageRating = ratedMatches.length > 0
        ? ratedMatches.reduce((total, match) => total + Number(match.rating || 0), 0) / ratedMatches.length
        : null
      const totalMatches = wins + losses + draws
      const winPct = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

      let streak = 0
      for (let i = teamMatches.length - 1; i >= 0; i -= 1) {
        const match = teamMatches[i]
        const isDraw = String(match.finishType || '').trim().toLowerCase() === 'no contest'
        if (isDraw) {
          streak = 0
          break
        }
        const won = memberIds.includes(match.winnerId)
        if (won) {
          if (streak < 0) break
          streak += 1
          continue
        }
        if (streak > 0) break
        streak -= 1
      }

      return {
        id: `team-${team.id}`,
        sourceId: team.id,
        name: team.name,
        show: team.show || wrestlers.find((wrestler) => memberIds.includes(wrestler.id))?.show || 'Universe',
        type: team.type === 'trio' ? 'Trios' : 'Tag Team',
        wins,
        losses,
        draws,
        totalMatches,
        winPct,
        streak: Math.max(0, streak),
        mainEventMatches,
        fiveStarMatches,
        averageRating,
        ratedMatches: ratedMatches.length,
        titleMatchWins,
        titlesHeld: teamChampionMap.get(team.id) || 0,
      }
    })
  }, [teams, matches, wrestlers, teamChampionMap])

  const buildRecordCards = (rows, scopeLabel) => {
    const sortAndTrim = (rows, accessor, options = {}) => {
      const minValue = options.minValue ?? 1
      const filtered = rows.filter((row) => {
        const value = accessor(row)
        if (value == null) return false
        return value >= minValue
      })

      return [...filtered]
        .sort((a, b) => {
          const valueDelta = accessor(b) - accessor(a)
          if (valueDelta !== 0) return valueDelta
          return a.name.localeCompare(b.name)
        })
        .slice(0, 25)
    }

    return [
      {
        key: 'matches',
        title: `Most Matches${scopeLabel}`,
        subtitle: 'Workhorses with the busiest schedules',
        accent: '#2980b9',
        valueLabel: 'matches',
        rows: sortAndTrim(rows, (row) => row.totalMatches),
      },
      {
        key: 'wins',
        title: `Most Wins${scopeLabel}`,
        subtitle: 'The winningest names in the universe',
        accent: '#27ae60',
        valueLabel: 'wins',
        rows: sortAndTrim(rows, (row) => row.wins),
      },
      {
        key: 'streak',
        title: `Longest Win Streaks${scopeLabel}`,
        subtitle: 'Current runs of dominant form',
        accent: '#ff851b',
        valueLabel: 'straight wins',
        rows: sortAndTrim(rows, (row) => row.streak),
      },
      {
        key: 'mainEvents',
        title: `Most Main Events${scopeLabel}`,
        subtitle: 'Most appearances in the featured match slot',
        accent: '#d4af37',
        valueLabel: 'main events',
        rows: sortAndTrim(rows, (row) => row.mainEventMatches),
      },
      {
        key: 'fiveStars',
        title: `Most 5-Star Matches${scopeLabel}`,
        subtitle: 'Classic performances rated the full five',
        accent: '#9b59b6',
        valueLabel: '5-star matches',
        rows: sortAndTrim(rows, (row) => row.fiveStarMatches),
      },
      {
        key: 'winPct',
        title: `Best Win Percentage${scopeLabel}`,
        subtitle: 'Minimum 5 recorded matches',
        accent: '#16a085',
        valueLabel: 'win rate',
        rows: sortAndTrim(rows.filter((row) => row.totalMatches >= 5), (row) => row.winPct),
      },
      {
        key: 'avgRating',
        title: `Best Average Rating${scopeLabel}`,
        subtitle: 'Minimum 3 rated matches',
        accent: '#e67e22',
        valueLabel: 'avg rating',
        rows: sortAndTrim(rows.filter((row) => row.ratedMatches >= 3), (row) => row.averageRating, { minValue: 0.5 }),
      },
      {
        key: 'titleWins',
        title: `Most Title Match Wins${scopeLabel}`,
        subtitle: 'Big-match success when gold was on the line',
        accent: '#c0392b',
        valueLabel: 'title wins',
        rows: sortAndTrim(rows, (row) => row.titleMatchWins),
      },
    ]
  }

  const singlesCards = useMemo(() => buildRecordCards(recordRows, ''), [recordRows])
  const teamCards = useMemo(() => buildRecordCards(teamRecordRows, ' (Teams)'), [teamRecordRows])
  const recordCards = [...singlesCards, ...teamCards]

  const activeCard = recordCards.find((card) => card.title === activeRecord) || null

  return (
    <div className="records-page">
      <div className="page-header">
        <h1 className="page-title">Records & Accolades</h1>
      </div>

      <div className="records-intro card">
        <div className="records-intro-kicker">Universe Milestones</div>
        <p className="records-intro-copy">
          A spotlight on the most impressive resumes in your save, from workhorse volume to main-event status and elite match quality.
        </p>
      </div>

      <div className="records-section">
        <div className="records-section-heading">Singles Records</div>
        <div className="records-grid">
          {singlesCards.map((card) => (
            <div key={card.title} className="records-card" onClick={() => setActiveRecord(card.title)}>
              <div className="records-card-accent" style={{ background: `linear-gradient(90deg, ${card.accent}, transparent)` }} />
              <div className="records-card-head">
                <div>
                  <div className="records-card-kicker" style={{ color: card.accent }}>{card.valueLabel}</div>
                  <h3 className="records-card-title">{card.title}</h3>
                </div>
                <div className="records-card-open" style={{ color: card.accent }}>Top 25</div>
              </div>
              <div className="records-card-copy">{card.subtitle}</div>

              {card.rows.length === 0 ? (
                <div className="records-empty-state">Not enough completed data yet.</div>
              ) : (
                <div className="records-list">
                  {card.rows.slice(0, 5).map((row, index) => (
                    <div key={row.id} className="records-list-row">
                      <div className="records-list-rank">#{index + 1}</div>
                      <div className="records-list-main">
                        <div className="records-list-name">{row.name}</div>
                        <div className="records-list-meta">{row.show}</div>
                      </div>
                      <div className="records-list-value">{formatRecordValue(card, getRecordRowValue(card.key, row))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="records-section">
        <div className="records-section-heading">Team & Trios Records</div>
        <div className="records-grid">
          {teamCards.map((card) => (
            <div key={card.title} className="records-card" onClick={() => setActiveRecord(card.title)}>
              <div className="records-card-accent" style={{ background: `linear-gradient(90deg, ${card.accent}, transparent)` }} />
              <div className="records-card-head">
                <div>
                  <div className="records-card-kicker" style={{ color: card.accent }}>{card.valueLabel}</div>
                  <h3 className="records-card-title">{card.title}</h3>
                </div>
                <div className="records-card-open" style={{ color: card.accent }}>Top 25</div>
              </div>
              <div className="records-card-copy">{card.subtitle}</div>

              {card.rows.length === 0 ? (
                <div className="records-empty-state">Not enough completed data yet.</div>
              ) : (
                <div className="records-list">
                  {card.rows.slice(0, 5).map((row, index) => (
                    <div key={row.id} className="records-list-row">
                      <div className="records-list-rank">#{index + 1}</div>
                      <div className="records-list-main">
                        <div className="records-list-name">{row.name}</div>
                        <div className="records-list-meta">{row.type} · {row.show}</div>
                      </div>
                      <div className="records-list-value">{formatRecordValue(card, getRecordRowValue(card.key, row))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {activeCard && (
        <Modal title={activeCard.title} onClose={() => setActiveRecord(null)} style={{ maxWidth: '920px' }}>
          <div className="records-modal-shell">
            <div className="records-modal-header">
              <div className="records-modal-kicker" style={{ color: activeCard.accent }}>{activeCard.valueLabel}</div>
              <div className="records-modal-copy">{activeCard.subtitle}</div>
            </div>

            {activeCard.rows.length === 0 ? (
              <div className="records-empty-state">Not enough completed data yet.</div>
            ) : (
              <div className="records-modal-table">
                <div className="records-modal-table-head">
                  <span>Rank</span>
                  <span>Competitor</span>
                  <span>Show</span>
                  <span>{activeCard.valueLabel}</span>
                </div>
                <div className="records-modal-table-body">
                  {activeCard.rows.map((row, index) => (
                    <div key={row.id} className="records-modal-row">
                      <span className="records-modal-rank">#{index + 1}</span>
                      <span className="records-modal-name">{row.name}</span>
                      <span className="records-modal-show">{row.show}</span>
                      <span className="records-modal-value" style={{ color: activeCard.accent }}>
                        {formatRecordValue(activeCard, getRecordRowValue(activeCard.key, row))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
