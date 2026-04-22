import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import './Factions.css'

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

function arraysMatch(left = [], right = []) {
  if (left.length !== right.length) return false
  const normalizedLeft = [...left].sort((a, b) => a - b)
  const normalizedRight = [...right].sort((a, b) => a - b)
  return normalizedLeft.every((value, index) => value === normalizedRight[index])
}

export default function Factions({ state, addFaction, addTeam, editFaction, editTeam, deleteFaction, deleteTeam, showToast }) {
  const { wrestlers, factions = [], teams = [], matches = [], stories = [], titles = [] } = state
  const [modal, setModal] = useState(null)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [teamType, setTeamType] = useState('tag')
  const [memberSearch, setMemberSearch] = useState('')
  const [factionLeaderId, setFactionLeaderId] = useState('')

  const getWrestler = (id) => wrestlers.find((w) => w.id === id)
  const getFaction = (id) => factions.find((f) => f.id === id)
  const getTeam = (id) => teams.find((t) => t.id === id)

  const getStoryParticipantIds = (participant) => {
    if (participant.type === 'wrestler') return [participant.id]
    if (participant.type === 'faction') return getFaction(participant.id)?.memberIds || []
    if (participant.type === 'team') return getTeam(participant.id)?.memberIds || []
    return []
  }

  const getRelatedStories = (memberIds, entityId, entityType) =>
    stories.filter((story) =>
      (story.participants || []).some((participant) => {
        if (entityType && participant.type === entityType && participant.id === entityId) return true
        return getStoryParticipantIds(participant).some((id) => memberIds.includes(id))
      })
    )

  const getFactionStats = (faction) => {
    const memberIds = faction.memberIds || []
    const memberRoster = memberIds.map(getWrestler).filter(Boolean)
    const factionTeams = teams.filter((team) => team.factionId === faction.id)
    const relatedMatches = matches.filter((match) => getParticipantIds(match).some((id) => memberIds.includes(id)))
    const activeTitles = titles.filter((title) => getChampIds(title).some((id) => memberIds.includes(id)))
    const relatedStories = getRelatedStories(memberIds, faction.id, 'faction')

    return {
      memberRoster,
      factionTeams,
      relatedMatches,
      completedMatches: relatedMatches.filter((match) => match.winnerId != null),
      activeTitles,
      relatedStories,
    }
  }

  const getTeamStats = (team) => {
    const memberIds = team.memberIds || []
    const members = memberIds.map(getWrestler).filter(Boolean)
    const faction = factions.find((item) => item.id === team.factionId) || null
    const relatedMatches = matches.filter((match) => {
      const participantIds = getParticipantIds(match)
      if (participantIds.length !== memberIds.length * 2) return false
      const halfway = participantIds.length / 2
      const teamA = participantIds.slice(0, halfway)
      const teamB = participantIds.slice(halfway)
      return arraysMatch(teamA, memberIds) || arraysMatch(teamB, memberIds)
    })
    const activeTitles = titles.filter((title) => arraysMatch(getChampIds(title), memberIds))
    const relatedStories = getRelatedStories(memberIds, team.id, 'team')

    return {
      members,
      faction,
      relatedMatches,
      completedMatches: relatedMatches.filter((match) => match.winnerId != null),
      activeTitles,
      relatedStories,
    }
  }

  const factionStatsById = useMemo(
    () => Object.fromEntries(factions.map((faction) => [faction.id, getFactionStats(faction)])),
    [factions, teams, wrestlers, matches, stories, titles]
  )

  const teamStatsById = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.id, getTeamStats(team)])),
    [teams, factions, wrestlers, matches, stories, titles]
  )

  const closeAll = () => {
    setModal(null)
    setSelectedMembers([])
    setTeamType('tag')
    setMemberSearch('')
    setFactionLeaderId('')
  }

  const openFactionForm = (faction = null) => {
    if (faction) {
      setSelectedMembers(faction.memberIds || [])
      setFactionLeaderId(faction.leaderId ? String(faction.leaderId) : '')
      setModal({ type: 'faction-form', id: faction.id })
      return
    }

    setSelectedMembers([])
    setFactionLeaderId('')
    setModal({ type: 'faction-form' })
  }

  const openTeamForm = (team = null) => {
    if (team) {
      setSelectedMembers(team.memberIds || [])
      setTeamType(team.type || 'tag')
      setModal({ type: 'team-form', id: team.id })
      return
    }

    setSelectedMembers([])
    setTeamType('tag')
    setModal({ type: 'team-form' })
  }

  const handleSaveFaction = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = {
      name: fd.get('name').trim(),
      align: fd.get('align'),
      memberIds: selectedMembers,
      leaderId: factionLeaderId ? parseInt(factionLeaderId, 10) : null,
    }

    if (!data.name) {
      showToast('Enter a faction name')
      return
    }

    if (selectedMembers.length < 4) {
      showToast('A faction needs at least 4 members')
      return
    }

    if (!modal?.id) {
      addFaction(data)
      showToast(`${data.name} faction created!`)
    } else {
      editFaction(modal.id, data)
      showToast('Faction updated!')
    }

    closeAll()
  }

  const handleSaveTeam = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const rawFactionId = fd.get('factionId')
    const data = {
      name: fd.get('name').trim(),
      type: teamType,
      memberIds: selectedMembers,
      factionId: rawFactionId ? parseInt(rawFactionId, 10) : null,
    }

    if (!data.name) {
      showToast('Enter a team name')
      return
    }

    const expectedCount = teamType === 'tag' ? 2 : 3
    if (selectedMembers.length !== expectedCount) {
      showToast(`A ${teamType === 'tag' ? 'tag team' : 'trio'} needs exactly ${expectedCount} members`)
      return
    }

    if (!modal?.id) {
      addTeam(data)
      showToast(`${data.name} created!`)
    } else {
      editTeam(modal.id, data)
      showToast('Team updated!')
    }

    closeAll()
  }

  const toggleMember = (id) => {
    setSelectedMembers((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      if (factionLeaderId && !next.includes(parseInt(factionLeaderId, 10))) setFactionLeaderId('')
      return next
    })
  }

  const alignBadgeClass = (align) => (align === 'Face' ? 'badge-green' : align === 'Heel' ? 'badge-red' : 'badge-gray')
  const alignAccent = (align) => (align === 'Face' ? 'var(--green)' : align === 'Heel' ? 'var(--red)' : 'var(--text2)')
  const getTeamTypeLabel = (team) => (team.type === 'trio' ? 'Trios' : 'Tag Team')
  const filteredRoster = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    if (!query) return wrestlers
    return wrestlers.filter((wrestler) => wrestler.name.toLowerCase().includes(query))
  }, [memberSearch, wrestlers])

  const FactionCard = ({ faction }) => {
    const stats = factionStatsById[faction.id]
    const accent = alignAccent(faction.align)
    const leader = faction.leaderId ? getWrestler(faction.leaderId) : null

    return (
      <div className="stable-compact-card" onClick={() => setModal({ type: 'faction-detail', id: faction.id })}>
        <div className="stable-card-accent" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <div className="stable-card-header">
          <div className="stable-card-badges">
            <span className={`badge ${alignBadgeClass(faction.align)}`}>{faction.align}</span>
            <span className="stable-card-badge stable-card-badge-muted">Faction</span>
          </div>
          <h3 className="stable-card-name" style={{ color: accent }}>{faction.name}</h3>
        </div>

        <div className="stable-card-summary">
          <div className="stable-card-section-label">At A Glance</div>
          <div className="stable-card-subtle">
            {stats.memberRoster.length} members, {stats.factionTeams.length} team{stats.factionTeams.length !== 1 ? 's' : ''}, {stats.activeTitles.length} active title{stats.activeTitles.length !== 1 ? 's' : ''}
          </div>
          {leader && <div className="stable-card-subtle">Leader: <strong style={{ color: 'var(--text)' }}>{leader.name}</strong></div>}
        </div>

        <div className="stable-card-chip-list">
          {stats.memberRoster.slice(0, 4).map((member) => (
            <span key={member.id} className="stable-mini-chip">
              {member.name}
            </span>
          ))}
          {stats.memberRoster.length > 4 && <span className="stable-mini-chip stable-mini-chip-muted">+{stats.memberRoster.length - 4} more</span>}
        </div>

        <div className="stable-card-footer">
          <div>
            <div className="stable-card-stat">{stats.relatedStories.length}</div>
            <div className="stable-card-stat-label">Stories</div>
          </div>
          <div>
            <div className="stable-card-stat">{stats.completedMatches.length}</div>
            <div className="stable-card-stat-label">Completed</div>
          </div>
          <div className="stable-card-open" style={{ color: accent }}>View Details</div>
        </div>
      </div>
    )
  }

  const TeamCard = ({ team }) => {
    const stats = teamStatsById[team.id]
    const accent = team.type === 'trio' ? 'var(--purple)' : 'var(--blue)'

    return (
      <div className="stable-compact-card" onClick={() => setModal({ type: 'team-detail', id: team.id })}>
        <div className="stable-card-accent" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <div className="stable-card-header">
          <div className="stable-card-badges">
            <span className={`badge ${team.type === 'trio' ? 'badge-purple-solid' : 'badge-blue'}`}>{getTeamTypeLabel(team)}</span>
            {stats.faction && <span className="stable-card-badge stable-card-badge-muted">{stats.faction.name}</span>}
          </div>
          <h3 className="stable-card-name" style={{ color: accent }}>{team.name}</h3>
        </div>

        <div className="stable-card-summary">
          <div className="stable-card-section-label">At A Glance</div>
          <div className="stable-card-subtle">
            {stats.members.length} members, {stats.activeTitles.length} championship{stats.activeTitles.length !== 1 ? 's' : ''}, {stats.relatedMatches.length} booked match{stats.relatedMatches.length !== 1 ? 'es' : ''}
          </div>
        </div>

        <div className="stable-card-chip-list">
          {stats.members.map((member) => (
            <span key={member.id} className="stable-mini-chip">
              {member.name}
            </span>
          ))}
        </div>

        <div className="stable-card-footer">
          <div>
            <div className="stable-card-stat">{stats.relatedStories.length}</div>
            <div className="stable-card-stat-label">Stories</div>
          </div>
          <div>
            <div className="stable-card-stat">{stats.completedMatches.length}</div>
            <div className="stable-card-stat-label">Completed</div>
          </div>
          <div className="stable-card-open" style={{ color: accent }}>View Details</div>
        </div>
      </div>
    )
  }

  return (
    <div className="factions-page">
      <div className="page-header">
        <h1 className="page-title">Factions & Teams</h1>
      </div>

      <section className="stables-section">
        <div className="section-header">
          <h2 className="section-title">Factions</h2>
          <button className="btn btn-primary" onClick={() => openFactionForm()}>
            + Create Faction
          </button>
        </div>

        <div className="stables-grid">
          {factions.length === 0 && (
            <div className="empty-state card" style={{ gridColumn: '1 / -1' }}>
              <p>No factions yet. Create one with 4 or more wrestlers!</p>
            </div>
          )}
          {factions.map((faction) => (
            <FactionCard key={faction.id} faction={faction} />
          ))}
        </div>
      </section>

      <section className="stables-section">
        <div className="section-header">
          <h2 className="section-title">Tag Teams & Trios</h2>
          <button className="btn btn-primary" onClick={() => openTeamForm()}>
            + Create Team
          </button>
        </div>

        <div className="stables-grid">
          {teams.length === 0 && (
            <div className="empty-state card" style={{ gridColumn: '1 / -1' }}>
              <p>No teams yet. Create a tag team or trio to get started.</p>
            </div>
          )}
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </section>

      {modal?.type === 'faction-detail' &&
        (() => {
          const faction = factions.find((item) => item.id === modal.id)
          if (!faction) return null
          const stats = factionStatsById[faction.id]
          const accent = alignAccent(faction.align)

          return (
            <Modal title={faction.name} onClose={closeAll} style={{ maxWidth: '980px' }}>
              <div className="stable-detail-shell">
                <div className="stable-detail-main">
                  <div className="stable-detail-meta-row">
                    <span className={`badge ${alignBadgeClass(faction.align)}`}>{faction.align}</span>
                    <span className="stable-card-badge stable-card-badge-muted">Faction</span>
                  </div>

                  <div className="stable-detail-current">
                    <div className="stable-detail-heading">Faction Snapshot</div>
                    <div className="stable-detail-brand" style={{ color: accent }}>{faction.name}</div>
                    <div className="stable-detail-subtle">
                      This group has {stats.memberRoster.length} members, {stats.factionTeams.length} linked team{stats.factionTeams.length !== 1 ? 's' : ''}, and {stats.activeTitles.length} active title holder{stats.activeTitles.length !== 1 ? 's' : ''}.
                    </div>
                    {faction.leaderId && (
                      <div className="stable-detail-subtle" style={{ marginTop: 8 }}>
                        Leader: <strong style={{ color: 'var(--text)' }}>{getWrestler(faction.leaderId)?.name || 'Unknown'}</strong>
                      </div>
                    )}
                  </div>

                  <div className="stable-detail-stats-grid">
                    {[
                      { label: 'Members', value: stats.memberRoster.length },
                      { label: 'Linked Teams', value: stats.factionTeams.length },
                      { label: 'Active Titles', value: stats.activeTitles.length },
                      { label: 'Booked Matches', value: stats.relatedMatches.length },
                      { label: 'Completed Matches', value: stats.completedMatches.length },
                      { label: 'Related Stories', value: stats.relatedStories.length },
                    ].map((item) => (
                      <div key={item.label} className="stable-detail-stat-card">
                        <div className="stable-detail-stat-value" style={{ color: accent }}>{item.value}</div>
                        <div className="stable-detail-stat-label">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="stable-detail-section">
                    <div className="stable-detail-heading">Members</div>
                    <div className="stable-detail-chip-list">
                      {stats.memberRoster.map((member) => (
                        <span key={member.id} className="stable-detail-chip">
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="stable-detail-section">
                    <div className="stable-detail-heading">Linked Teams</div>
                    {stats.factionTeams.length === 0 ? (
                      <div className="stable-detail-empty">No teams are linked to this faction yet.</div>
                    ) : (
                      <div className="stable-detail-list">
                        {stats.factionTeams.map((team) => (
                          <div key={team.id} className="stable-detail-list-row">
                            <div>
                              <div className="stable-detail-list-title">{team.name}</div>
                              <div className="stable-detail-list-subtle">
                                {(team.memberIds || []).map((id) => getWrestler(id)?.name ?? 'Unknown').join(' / ')}
                              </div>
                            </div>
                            <span className={`badge ${team.type === 'trio' ? 'badge-purple-solid' : 'badge-blue'}`}>{getTeamTypeLabel(team)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="stable-detail-side">
                  <div className="stable-side-card">
                    <div className="stable-detail-heading">Faction Actions</div>
                    <button className="btn btn-primary" onClick={() => openFactionForm(faction)}>
                      Edit Faction
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        deleteFaction(faction.id)
                        showToast('Faction disbanded')
                        closeAll()
                      }}
                    >
                      Disband Faction
                    </button>
                  </div>

                  <div className="stable-side-card">
                    <div className="stable-detail-heading">Quick Facts</div>
                    <div className="stable-fact-row">
                      <span>Alignment</span>
                      <strong>{faction.align}</strong>
                    </div>
                    <div className="stable-fact-row">
                      <span>Members</span>
                      <strong>{stats.memberRoster.length}</strong>
                    </div>
                    <div className="stable-fact-row">
                      <span>Leader</span>
                      <strong>{faction.leaderId ? (getWrestler(faction.leaderId)?.name || 'Unknown') : 'None'}</strong>
                    </div>
                    <div className="stable-fact-row">
                      <span>Teams</span>
                      <strong>{stats.factionTeams.length}</strong>
                    </div>
                    <div className="stable-fact-row">
                      <span>Stories</span>
                      <strong>{stats.relatedStories.length}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )
        })()}

      {modal?.type === 'team-detail' &&
        (() => {
          const team = teams.find((item) => item.id === modal.id)
          if (!team) return null
          const stats = teamStatsById[team.id]
          const accent = team.type === 'trio' ? 'var(--purple)' : 'var(--blue)'

          return (
            <Modal title={team.name} onClose={closeAll} style={{ maxWidth: '980px' }}>
              <div className="stable-detail-shell">
                <div className="stable-detail-main">
                  <div className="stable-detail-meta-row">
                    <span className={`badge ${team.type === 'trio' ? 'badge-purple-solid' : 'badge-blue'}`}>{getTeamTypeLabel(team)}</span>
                    {stats.faction && <span className="stable-card-badge stable-card-badge-muted">{stats.faction.name}</span>}
                  </div>

                  <div className="stable-detail-current">
                    <div className="stable-detail-heading">Team Snapshot</div>
                    <div className="stable-detail-brand" style={{ color: accent }}>{team.name}</div>
                    <div className="stable-detail-subtle">
                      {team.type === 'trio' ? 'This trio' : 'This tag team'} has {stats.members.length} members, {stats.activeTitles.length} active title reign{stats.activeTitles.length !== 1 ? 's' : ''}, and {stats.relatedMatches.length} booked match{stats.relatedMatches.length !== 1 ? 'es' : ''}.
                    </div>
                  </div>

                  <div className="stable-detail-stats-grid">
                    {[
                      { label: 'Members', value: stats.members.length },
                      { label: 'Active Titles', value: stats.activeTitles.length },
                      { label: 'Booked Matches', value: stats.relatedMatches.length },
                      { label: 'Completed Matches', value: stats.completedMatches.length },
                      { label: 'Related Stories', value: stats.relatedStories.length },
                      { label: 'Faction Link', value: stats.faction ? 1 : 0 },
                    ].map((item) => (
                      <div key={item.label} className="stable-detail-stat-card">
                        <div className="stable-detail-stat-value" style={{ color: accent }}>{item.value}</div>
                        <div className="stable-detail-stat-label">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="stable-detail-section">
                    <div className="stable-detail-heading">Members</div>
                    <div className="stable-detail-chip-list">
                      {stats.members.map((member) => (
                        <span key={member.id} className="stable-detail-chip">
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="stable-detail-section">
                    <div className="stable-detail-heading">Championships</div>
                    {stats.activeTitles.length === 0 ? (
                      <div className="stable-detail-empty">This team is not holding any titles right now.</div>
                    ) : (
                      <div className="stable-detail-list">
                        {stats.activeTitles.map((title) => (
                          <div key={title.id} className="stable-detail-list-row">
                            <div>
                              <div className="stable-detail-list-title">{title.name}</div>
                              <div className="stable-detail-list-subtle">{title.show || 'Universe'}</div>
                            </div>
                            <span className="stable-card-badge stable-card-badge-muted">{title.type || 'singles'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="stable-detail-side">
                  <div className="stable-side-card">
                    <div className="stable-detail-heading">Team Actions</div>
                    <button className="btn btn-primary" onClick={() => openTeamForm(team)}>
                      Edit Team
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        deleteTeam(team.id)
                        showToast('Team disbanded')
                        closeAll()
                      }}
                    >
                      Disband Team
                    </button>
                  </div>

                  <div className="stable-side-card">
                    <div className="stable-detail-heading">Quick Facts</div>
                    <div className="stable-fact-row">
                      <span>Type</span>
                      <strong>{getTeamTypeLabel(team)}</strong>
                    </div>
                    <div className="stable-fact-row">
                      <span>Faction</span>
                      <strong>{stats.faction?.name || 'Independent'}</strong>
                    </div>
                    <div className="stable-fact-row">
                      <span>Members</span>
                      <strong>{stats.members.length}</strong>
                    </div>
                    <div className="stable-fact-row">
                      <span>Stories</span>
                      <strong>{stats.relatedStories.length}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )
        })()}

      {modal?.type === 'faction-form' && (
        <Modal title={modal.id ? 'Edit Faction' : 'Create Faction'} onClose={closeAll} style={{ maxWidth: '1100px' }}>
          <form onSubmit={handleSaveFaction}>
            {(() => {
              const faction = modal.id ? factions.find((item) => item.id === modal.id) : null
              const selectedRoster = selectedMembers.map(getWrestler).filter(Boolean)
              const accent = alignAccent(faction?.align || 'Heel')

              return (
                <div className="stable-form-shell">
                  <div className="stable-form-main">
                    <div className="stable-form-card">
                      <div className="stable-form-card-header">
                        <div className="stable-form-heading">Faction Setup</div>
                        <div className="stable-form-count">{modal.id ? 'Editing' : 'New faction'}</div>
                      </div>

                      <div className="form-group">
                        <label>Faction Name</label>
                        <input name="name" defaultValue={faction?.name ?? ''} placeholder="e.g. The Shield" autoFocus />
                      </div>

                      <div className="form-group">
                        <label>Alignment</label>
                        <select name="align" defaultValue={faction?.align ?? 'Heel'}>
                          <option>Face</option>
                          <option>Heel</option>
                          <option>Neutral</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Leader (optional)</label>
                        <select value={factionLeaderId} onChange={(e) => setFactionLeaderId(e.target.value)}>
                          <option value="">No leader</option>
                          {selectedRoster.map((member) => (
                            <option key={member.id} value={member.id}>{member.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="stable-form-card">
                      <div className="stable-form-card-header">
                        <div className="stable-form-heading">Members</div>
                        <div className="stable-form-count">{selectedMembers.length} selected</div>
                      </div>

                      <div className="stable-member-tools">
                        <div className="form-group">
                          <label>Search Roster</label>
                          <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Filter by member name" />
                        </div>
                      </div>

                      {selectedRoster.length > 0 && (
                        <div className="stable-selected-strip">
                          {selectedRoster.map((member) => (
                            <button key={member.id} type="button" className="stable-selected-chip" onClick={() => toggleMember(member.id)}>
                              <span>{member.name}</span>
                              <span className="stable-selected-chip-remove">x</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="member-selector stable-member-selector">
                        {filteredRoster.length === 0 ? (
                          <div className="stable-filter-empty">No roster members match the current search.</div>
                        ) : (
                          filteredRoster.map((wrestler) => (
                            <label key={wrestler.id} className="member-option stable-member-option">
                              <input
                                type="checkbox"
                                checked={selectedMembers.includes(wrestler.id)}
                                onChange={() => toggleMember(wrestler.id)}
                              />
                              <span>{wrestler.name}</span>
                              <span className="stable-member-meta">{wrestler.show || 'No show'}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="stable-form-side">
                    <div className="stable-side-card stable-form-highlight">
                      <div className="stable-detail-heading">Faction Preview</div>
                      <div className="stable-form-brand" style={{ color: accent }}>{faction?.name || 'New Faction'}</div>
                      <div className="stable-card-badges">
                        <span className={`badge ${alignBadgeClass(faction?.align || 'Heel')}`}>{faction?.align || 'Heel'}</span>
                        <span className="stable-card-badge stable-card-badge-muted">Faction</span>
                      </div>
                    </div>

                    <div className="stable-side-card">
                      <div className="stable-detail-heading">Quick Rules</div>
                      <div className="stable-fact-row">
                        <span>Minimum members</span>
                        <strong>4</strong>
                      </div>
                      <div className="stable-fact-row">
                        <span>Selected now</span>
                        <strong>{selectedMembers.length}</strong>
                      </div>
                      <div className="stable-fact-row">
                        <span>Leader set</span>
                        <strong>{factionLeaderId ? 'Yes' : 'No'}</strong>
                      </div>
                      <div className="stable-fact-row">
                        <span>Eligible roster</span>
                        <strong>{wrestlers.length}</strong>
                      </div>
                    </div>

                    <div className="stable-form-actions">
                      <button type="button" className="btn btn-secondary" onClick={closeAll}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {modal.id ? 'Save Faction' : 'Create Faction'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </form>
        </Modal>
      )}

      {modal?.type === 'team-form' && (
        <Modal title={modal.id ? 'Edit Team' : 'Create Team'} onClose={closeAll} style={{ maxWidth: '1100px' }}>
          <form onSubmit={handleSaveTeam}>
            {(() => {
              const team = modal.id ? teams.find((item) => item.id === modal.id) : null
              const selectedRoster = selectedMembers.map(getWrestler).filter(Boolean)
              const accent = teamType === 'trio' ? 'var(--purple)' : 'var(--blue)'
              const expectedCount = teamType === 'tag' ? 2 : 3

              return (
                <div className="stable-form-shell">
                  <div className="stable-form-main">
                    <div className="stable-form-card">
                      <div className="stable-form-card-header">
                        <div className="stable-form-heading">Team Setup</div>
                        <div className="stable-form-count">{modal.id ? 'Editing' : 'New team'}</div>
                      </div>

                      <div className="form-group">
                        <label>Team Name</label>
                        <input name="name" defaultValue={team?.name ?? ''} placeholder="e.g. The Usos" autoFocus />
                      </div>

                      <div className="form-group">
                        <label>Team Type</label>
                        <div className="radio-group stable-radio-group">
                          <label>
                            <input
                              type="radio"
                              checked={teamType === 'tag'}
                              onChange={() => {
                                setTeamType('tag')
                                setSelectedMembers([])
                              }}
                            />
                            <span>Tag Team (2 members)</span>
                          </label>
                          <label>
                            <input
                              type="radio"
                              checked={teamType === 'trio'}
                              onChange={() => {
                                setTeamType('trio')
                                setSelectedMembers([])
                              }}
                            />
                            <span>Trios Team (3 members)</span>
                          </label>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Part of Faction (optional)</label>
                        <select name="factionId" defaultValue={team?.factionId ?? ''}>
                          <option value="">None</option>
                          {factions.map((faction) => (
                            <option key={faction.id} value={faction.id}>
                              {faction.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="stable-form-card">
                      <div className="stable-form-card-header">
                        <div className="stable-form-heading">Members</div>
                        <div className="stable-form-count">{selectedMembers.length} selected</div>
                      </div>

                      <div className="stable-member-tools">
                        <div className="form-group">
                          <label>Search Roster</label>
                          <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Filter by member name" />
                        </div>
                      </div>

                      {selectedRoster.length > 0 && (
                        <div className="stable-selected-strip">
                          {selectedRoster.map((member) => (
                            <button key={member.id} type="button" className="stable-selected-chip" onClick={() => toggleMember(member.id)}>
                              <span>{member.name}</span>
                              <span className="stable-selected-chip-remove">x</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="member-selector stable-member-selector">
                        {filteredRoster.length === 0 ? (
                          <div className="stable-filter-empty">No roster members match the current search.</div>
                        ) : (
                          filteredRoster.map((wrestler) => (
                            <label key={wrestler.id} className="member-option stable-member-option">
                              <input
                                type="checkbox"
                                checked={selectedMembers.includes(wrestler.id)}
                                onChange={() => toggleMember(wrestler.id)}
                              />
                              <span>{wrestler.name}</span>
                              <span className="stable-member-meta">{wrestler.show || 'No show'}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="stable-form-side">
                    <div className="stable-side-card stable-form-highlight">
                      <div className="stable-detail-heading">Team Preview</div>
                      <div className="stable-form-brand" style={{ color: accent }}>{team?.name || 'New Team'}</div>
                      <div className="stable-card-badges">
                        <span className={`badge ${teamType === 'trio' ? 'badge-purple-solid' : 'badge-blue'}`}>{teamType === 'trio' ? 'Trios' : 'Tag Team'}</span>
                        {team?.factionId && <span className="stable-card-badge stable-card-badge-muted">{getFaction(team.factionId)?.name || 'Faction'}</span>}
                      </div>
                    </div>

                    <div className="stable-side-card">
                      <div className="stable-detail-heading">Quick Rules</div>
                      <div className="stable-fact-row">
                        <span>Required members</span>
                        <strong>{expectedCount}</strong>
                      </div>
                      <div className="stable-fact-row">
                        <span>Selected now</span>
                        <strong>{selectedMembers.length}</strong>
                      </div>
                      <div className="stable-fact-row">
                        <span>Team format</span>
                        <strong>{teamType === 'trio' ? 'Trios' : 'Tag'}</strong>
                      </div>
                    </div>

                    <div className="stable-form-actions">
                      <button type="button" className="btn btn-secondary" onClick={closeAll}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {modal.id ? 'Save Team' : 'Create Team'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </form>
        </Modal>
      )}
    </div>
  )
}
