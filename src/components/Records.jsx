import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { FiAward, FiStar, FiZap, FiActivity, FiTv, FiTrendingUp, FiTarget, FiHash, FiChevronRight } from 'react-icons/fi'
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
  if (record.key === 'streak') return `${value} Wins`
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
      { key: 'matches', title: `Volume Leader${scopeLabel}`, subtitle: 'Highest career match counts', accent: '#3498db', icon: <FiActivity />, rows: sortAndTrim(rows, r => r.totalMatches) },
      { key: 'wins', title: `Hall of Wins${scopeLabel}`, subtitle: 'Most career victories', accent: '#2ecc71', icon: <FiZap />, rows: sortAndTrim(rows, r => r.wins) },
      { key: 'streak', title: `Unstoppable Runs${scopeLabel}`, subtitle: 'Longest active win streaks', accent: '#e67e22', icon: <FiTrendingUp />, rows: sortAndTrim(rows, r => r.streak) },
      { key: 'mainEvents', title: `Main Eventers${scopeLabel}`, subtitle: 'Most frequent show-closers', accent: '#f1c40f', icon: <FiAward />, rows: sortAndTrim(rows, r => r.mainEventMatches) },
      { key: 'fiveStars', title: `Elite Standard${scopeLabel}`, subtitle: 'Most 5-star rated classics', accent: '#9b59b6', icon: <FiStar />, rows: sortAndTrim(rows, r => r.fiveStarMatches) },
      { key: 'winPct', title: `Dominance Rate${scopeLabel}`, subtitle: 'Best win percentage (Min. 5)', accent: '#16a085', icon: <FiTarget />, rows: sortAndTrim(rows.filter(r => r.totalMatches >= 5), r => r.winPct) },
      { key: 'avgRating', title: `Work Rate Elite${scopeLabel}`, subtitle: 'Best avg rating (Min. 3)', accent: '#ff4d00', icon: <FiActivity />, rows: sortAndTrim(rows.filter(r => r.ratedMatches >= 3), r => r.averageRating, { minValue: 0.5 }) },
      { key: 'titleWins', title: `Big Match Players${scopeLabel}`, subtitle: 'Most wins in title bouts', accent: '#e74c3c', icon: <FiAward />, rows: sortAndTrim(rows, r => r.titleMatchWins) },
    ]
  }

  const singlesCards = useMemo(() => buildRecordCards(recordRows, ''), [recordRows])
  const teamCards = useMemo(() => buildRecordCards(teamRecordRows, ' (Teams)'), [teamRecordRows])
  const recordCards = [...singlesCards, ...teamCards]
  const activeCard = recordCards.find((card) => card.title === activeRecord) || null

  const RecordCategory = ({ title, cards }) => (
    <div className="records-section">
      <div className="records-section-heading">{title}</div>
      <div className="records-grid">
        {cards.map(card => (
          <div key={card.title} className="records-card" onClick={() => setActiveRecord(card.title)}>
            <div className="records-card-accent" style={{ background: `linear-gradient(90deg, ${card.accent}, transparent)` }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="records-card-kicker" style={{ color: card.accent }}>{card.key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
                <h3 className="records-card-title">{card.title}</h3>
              </div>
              <div style={{ fontSize: 24, color: 'var(--text3)', opacity: 0.5 }}>{card.icon}</div>
            </div>
            <p className="records-card-copy">{card.subtitle}</p>
            {card.rows.length === 0 ? (
              <div className="records-empty-state">No recorded data.</div>
            ) : (
              <div className="records-list">
                {card.rows.slice(0, 4).map((row, index) => (
                  <div key={row.id} className="records-list-row">
                    <span className="records-list-rank">#{index + 1}</span>
                    <div>
                      <div className="records-list-name">{row.name}</div>
                      <div className="records-list-meta">{row.type || row.show}</div>
                    </div>
                    <span className="records-list-value" style={{ color: card.accent }}>{formatRecordValue(card, getRecordRowValue(card.key, row))}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: card.accent, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginTop: 12 }}>
              Leaderboard <FiChevronRight />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="records-page">
      <div className="page-header">
        <h1 className="page-title">Hall of Records</h1>
      </div>

      <div className="records-intro">
        <div className="records-intro-kicker">Career Accolades</div>
        <p className="records-intro-copy">
          Tracking the most significant career milestones in your universe. From workhorses to main event legends, these leaderboards celebrate the elite.
        </p>
      </div>

      <RecordCategory title="Singles Accolades" cards={singlesCards} />
      <RecordCategory title="Tag Team & Trios Honors" cards={teamCards} />

      {activeCard && (
        <Modal title={activeCard.title} onClose={() => setActiveRecord(null)} style={{ maxWidth: '900px' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 20, background: 'var(--bg3)', borderRadius: 12, borderLeft: `4px solid ${activeCard.accent}` }}>
              <div style={{ fontSize: 32, color: activeCard.accent }}>{activeCard.icon}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: activeCard.accent }}>{activeCard.key.toUpperCase()}</div>
                <div style={{ fontSize: 14, color: 'var(--text2)' }}>{activeCard.subtitle}</div>
              </div>
            </div>

            <table className="reign-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Brand / Type</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {activeCard.rows.map((row, index) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 900, opacity: 0.3 }}>#{index + 1}</td>
                    <td style={{ fontWeight: 800, fontSize: 15 }}>{row.name}</td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{row.type || row.show}</td>
                    <td style={{ textAlign: 'right', fontWeight: 900, color: activeCard.accent }}>
                      {formatRecordValue(activeCard, getRecordRowValue(activeCard.key, row))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}
