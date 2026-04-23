import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { formatUniverseDate } from '../utils/dates.js'
import { FiBookOpen, FiZap, FiTrash2, FiEdit3, FiPlus, FiCalendar, FiActivity, FiUsers, FiInfo, FiChevronRight } from 'react-icons/fi'
import './Stories.css'

// ─── helpers ────────────────────────────────────────────────────────────────

function getParticipantIdsFromMatch(match) {
  if (Array.isArray(match?.participantIds) && match.participantIds.length > 0) return match.participantIds
  const fallback = []
  if (match?.w1) fallback.push(match.w1)
  if (match?.w2) fallback.push(match.w2)
  return fallback
}

function getMatchTypeLabel(match) {
  if (match?.matchType) return match.matchType
  const count = getParticipantIdsFromMatch(match).length
  if (count === 2) return 'Singles'
  return `${count}-Person Match`
}

const SEGMENT_CATEGORIES = [
  { key: 'promos', label: 'Promos & Interviews', types: ['Promo (In-Ring)', 'Promo (Backstage)', 'Pre-Tape Promo', 'Interview (In-Ring)', 'Interview (Backstage)'] },
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
  if (t.includes('promo') || t.includes('interview')) return 'var(--blue)'
  if (t.includes('brawl') || t.includes('attack') || t.includes('ambush')) return 'var(--red)'
  if (t.includes('confrontation') || t.includes('challenge') || t.includes('mystery') || t.includes('arrival') || t.includes('locker') || t.includes('conversation') || t.includes('meeting') || t.includes('formation') || t.includes('breakup') || t.includes('medical') || t.includes('stipulation')) return 'var(--purple)'
  if (t.includes('vignette') || t.includes('video') || t.includes('recap')) return 'var(--purple)'
  if (t.includes('hype') || t.includes('sponsor')) return 'var(--purple)'
  if (t.includes('gm') || t.includes('authority') || t.includes('contract')) return 'var(--gold)'
  if (t.includes('celebration') || t.includes('retirement') || t.includes('return') || t.includes('talk show') || t.includes('ceremony')) return 'var(--green)'
  return 'var(--text2)'
}

// ─── Tale of the Tape computation ───────────────────────────────────────────

function computeTaleOfTape(story, matches, getWrestler, getFaction, getTeam) {
  const getParticipantIds = (p) => {
    if (p.type === 'wrestler') return [p.id]
    if (p.type === 'faction') return getFaction(p.id)?.memberIds || []
    if (p.type === 'team') return getTeam(p.id)?.memberIds || []
    return []
  }

  const storyMatches = matches
    .filter((match) => {
      if (match.storyId === story.id) return true
      const mw = getParticipantIdsFromMatch(match)
      const involvedSides = story.participants.filter((participant) =>
        getParticipantIds(participant).some((id) => mw.includes(id))
      )
      return involvedSides.length >= 2
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const sides = story.participants.map((p) => ({
    participant: p,
    ids: getParticipantIds(p),
    wins: 0,
    losses: 0,
  }))

  storyMatches.forEach((match) => {
    if (!match.winnerId) return
    sides.forEach((side) => {
      const inMatch = getParticipantIdsFromMatch(match).some((id) => side.ids.includes(id))
      if (!inMatch) return
      if (side.ids.includes(match.winnerId)) side.wins++
      else side.losses++
    })
  })

  const firstMatch = storyMatches[0]
  const lastMatch = storyMatches[storyMatches.length - 1]
  const segCount = story.segments?.length || 0
  const completedMatches = storyMatches.filter((m) => m.winnerId != null)

  return { sides, storyMatches, firstMatch, lastMatch, segCount, completedMatches }
}

// ─── Story Card (compact) ───────────────────────────────────────────────────

function StoryCard({ story, tape, getParticipantName, onOpen, onEdit, onDelete }) {
  const { sides, storyMatches, segCount } = tape
  const isRivalry = story.type === 'rivalry' && sides.length === 2
  const statusColor = story.status === 'Active' ? 'var(--green)' : story.status === 'Building' ? 'var(--blue)' : 'var(--text3)'
  const typeColor = story.type === 'rivalry' ? 'var(--red)' : 'var(--purple)'

  return (
    <div className="story-compact-card" onClick={() => onOpen(story)}>
      <div className="story-card-top-accent" style={{ background: `linear-gradient(90deg, ${typeColor}, transparent)` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="story-badge-list">
            <span className="story-badge" style={{ background: typeColor + '22', color: typeColor, borderColor: typeColor + '44' }}>
              {story.type === 'rivalry' ? 'Rivalry' : 'Story'}
            </span>
            <span className="story-badge" style={{ background: statusColor + '22', color: statusColor, borderColor: statusColor + '44' }}>
              {story.status}
            </span>
          </div>
          <h3 className="story-card-name">
            {story.name}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }} onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-icon btn-secondary" onClick={() => onEdit(story)} title="Edit Story"><FiEdit3 /></button>
          <button className="btn btn-icon btn-danger" onClick={() => onDelete(story.id)} title="Delete Story"><FiTrash2 /></button>
        </div>
      </div>

      {isRivalry ? (
        <div className="rivalry-vs-shell">
          <span className="rivalry-side" style={{ textAlign: 'right' }}>
            {getParticipantName(sides[0].participant)}
          </span>
          <span className="rivalry-vs-badge">VS</span>
          <span className="rivalry-side">
            {getParticipantName(sides[1].participant)}
          </span>
        </div>
      ) : (
        <div className="story-participants-strip">
          {story.participants.map((p, i) => (
            <span key={i} className="story-mini-chip">
              {getParticipantName(p)}
            </span>
          ))}
        </div>
      )}

      {isRivalry && (sides[0].wins > 0 || sides[1].wins > 0) && (
        <div className="story-progress-box">
          <div className="story-progress-labels">
            <span style={{ color: 'var(--red)' }}>{sides[0].wins}W</span>
            <span style={{ color: 'var(--text2)' }}>{storyMatches.filter(m => m.winnerId).length} Matches</span>
            <span style={{ color: 'var(--blue)' }}>{sides[1].wins}W</span>
          </div>
          <div className="story-progress-track">
            {(() => {
              const total = sides[0].wins + sides[1].wins
              const pct = total ? (sides[0].wins / total) * 100 : 50
              return (
                <>
                  <div style={{ width: `${pct}%`, background: 'var(--red)' }} />
                  <div style={{ flex: 1, background: 'var(--blue)' }} />
                </>
              )
            })()}
          </div>
        </div>
      )}

      <div className="story-card-footer">
        <div>
          <div className="story-footer-stat-value">{storyMatches.length}</div>
          <div className="story-footer-stat-label">Matches</div>
        </div>
        <div>
          <div className="story-footer-stat-value">{segCount}</div>
          <div className="story-footer-stat-label">Segments</div>
        </div>
        {tape.lastMatch && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="story-footer-stat-value" style={{ fontSize: 13 }}>{formatUniverseDate(tape.lastMatch.date)}</div>
            <div className="story-footer-stat-label">Latest Match</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Story Detail Modal ──────────────────────────────────────────────────────

function StoryDetailModal({ story, tape, wrestlers, getParticipantName, onClose, onAddSegment, onDeleteSegment, showToast }) {
  const { sides, storyMatches, segCount, firstMatch, lastMatch, completedMatches } = tape
  const isRivalry = story.type === 'rivalry' && sides.length === 2

  const [segCategory, setSegCategory] = useState(null)
  const [segSubType, setSegSubType] = useState(null)
  const [showSegForm, setShowSegForm] = useState(false)

  const getWrestler = (id) => wrestlers.find((w) => w.id === id)
  const activeCategoryTypes = segCategory ? SEGMENT_CATEGORIES.find((c) => c.key === segCategory)?.types ?? [] : []

  const timeline = useMemo(() => {
    const matchItems = storyMatches.map((match) => ({ kind: 'match', date: match.date, match }))
    const segItems = (story.segments || []).map((seg, idx) => ({ kind: 'segment', date: seg.date || '', seg, idx }))
    return [...matchItems, ...segItems].sort((a, b) => {
      if (b.date < a.date) return -1
      if (b.date > a.date) return 1
      if (a.kind === 'match' && b.kind === 'segment') return -1
      if (a.kind === 'segment' && b.kind === 'match') return 1
      return 0
    })
  }, [storyMatches, story.segments])

  const handleAddSegment = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const title = fd.get('title')?.trim()
    if (!title) { showToast('Enter a segment title'); return }
    onAddSegment(story.id, {
      date: fd.get('date'),
      title,
      description: fd.get('description')?.trim() || '',
      segmentType: segSubType || (segCategory ? SEGMENT_CATEGORIES.find(c => c.key === segCategory)?.label : null),
      wrestlerIds: [],
    })
    showToast('Segment added!')
    setShowSegForm(false)
    setSegCategory(null)
    setSegSubType(null)
    e.target.reset()
  }

  const typeColor = story.type === 'rivalry' ? 'var(--red)' : 'var(--purple)'
  const statusColor = story.status === 'Active' ? 'var(--green)' : story.status === 'Building' ? 'var(--blue)' : 'var(--text3)'

  return (
    <Modal title={story.name} onClose={onClose} style={{ maxWidth: '1000px' }}>
      <div className="story-detail-shell">

        {/* ── LEFT: Timeline ── */}
        <div>
          <div className="story-timeline-header">
            <div className="story-section-heading">
              Evolution Timeline
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSegForm((v) => !v)}>
              {showSegForm ? 'Close Form' : '+ Add Segment'}
            </button>
          </div>

          {showSegForm && (
            <div className="story-form-card" style={{ borderLeft: '3px solid var(--purple)', background: 'var(--bg3)' }}>
              <form onSubmit={handleAddSegment}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label>Segment Title *</label>
                    <input name="title" placeholder="e.g. Backstage Confrontation" autoFocus />
                  </div>
                  <div className="form-group">
                    <label>In-Universe Date</label>
                    <input type="date" name="date" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Story Details</label>
                  <textarea name="description" rows={3} placeholder="Describe what happened in this segment..." />
                </div>
                <div className="form-group">
                  <label>Segment Type</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {SEGMENT_CATEGORIES.map((cat) => (
                      <button key={cat.key} type="button"
                        onClick={() => { setSegCategory(segCategory === cat.key ? null : cat.key); setSegSubType(null) }}
                        className={`btn btn-sm ${segCategory === cat.key ? 'btn-primary' : 'btn-secondary'}`}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {segCategory && activeCategoryTypes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12, background: 'var(--bg4)', borderRadius: 'var(--radius)' }}>
                      {activeCategoryTypes.map((type) => (
                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                          <input type="radio" checked={segSubType === type} onChange={() => setSegSubType(type)} />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-actions" style={{ padding: 0, border: 'none', marginTop: 12 }}>
                  <button type="submit" className="btn btn-primary">Save Segment</button>
                </div>
              </form>
            </div>
          )}

          {timeline.length === 0 ? (
            <div className="empty-state card">
              <FiBookOpen style={{ fontSize: 32, opacity: 0.2, marginBottom: 12 }} />
              <p>No history yet. Start booking matches or adding segments to build this story.</p>
            </div>
          ) : (
            <div className="story-timeline-list">
              {timeline.map((item, i) => {
                if (item.kind === 'match') {
                  const { match } = item
                  const participantIds = getParticipantIdsFromMatch(match)
                  const participants = participantIds.map((id) => getWrestler(id)).filter(Boolean)
                  const winner = getWrestler(match.winnerId)

                  return (
                    <div key={`m-${match.id}`} className="timeline-card" style={{ borderLeft: '3px solid var(--red)' }}>
                      <div className="timeline-card-header">
                        <div className="timeline-meta">
                          <span className="story-badge" style={{ background: 'var(--red-dim)', color: 'var(--red)', borderColor: 'var(--red-dim)' }}>Match</span>
                          <span className="timeline-date"><FiCalendar /> {formatUniverseDate(match.date)}</span>
                          <span className="timeline-date">{getMatchTypeLabel(match)}</span>
                        </div>
                      </div>
                      <div className="timeline-title">
                        {participants.map((w, idx) => (
                          <span key={w.id}>
                            <span style={{ color: match.winnerId === w.id ? 'var(--red)' : 'var(--text)' }}>{w.name}</span>
                            {idx < participants.length - 1 && <span style={{ color: 'var(--text3)', margin: '0 6px', fontSize: 13 }}>VS</span>}
                          </span>
                        ))}
                      </div>
                      {winner && <div style={{ fontSize: 13, color: 'var(--text2)' }}>Winner: <strong style={{ color: 'var(--text)' }}>{winner.name}</strong></div>}
                      {match.notes?.trim() && (
                        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 10, padding: 10, background: 'var(--bg3)', borderRadius: 6, fontStyle: 'italic' }}>{match.notes}</div>
                      )}
                    </div>
                  )
                }

                const { seg, idx: segIdx } = item
                const badgeColor = segmentTypeBadgeColor(seg.segmentType)
                const taggedWrestlers = (seg.wrestlerIds || []).map((id) => getWrestler(id)).filter(Boolean)

                return (
                  <div key={`s-${segIdx}`} className="timeline-card" style={{ borderLeft: '3px solid var(--purple)' }}>
                    <div className="timeline-card-header">
                      <div className="timeline-meta">
                        <span className="story-badge" style={{ background: 'var(--purple-dim)', color: 'var(--purple)', borderColor: 'var(--purple-dim)' }}>Segment</span>
                        <span className="timeline-date"><FiCalendar /> {formatUniverseDate(seg.date)}</span>
                        {seg.segmentType && (
                          <span className="story-badge" style={{ background: badgeColor + '22', color: badgeColor, borderColor: badgeColor + '44' }}>{seg.segmentType}</span>
                        )}
                      </div>
                      <button className="btn btn-icon btn-sm btn-danger" onClick={() => { onDeleteSegment(story.id, segIdx); showToast('Segment removed') }} title="Remove Segment"><FiTrash2 /></button>
                    </div>
                    {seg.title && <div className="timeline-title">{seg.title}</div>}
                    {seg.description && <div className="timeline-description">{seg.description}</div>}
                    {taggedWrestlers.length > 0 && (
                      <div className="story-participants-strip">
                        {taggedWrestlers.map((w) => (
                          <span key={w.id} className="story-mini-chip">{w.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Side Panel ── */}
        <div className="story-side-panel">
          <div className="story-side-card">
            <div className="story-side-card-header">
              <FiInfo className="story-side-accent" style={{ color: 'var(--gold)' }} />
              <div className="story-section-heading">Quick Info</div>
            </div>
            <div className="story-fact-row">
              <span className="story-fact-label">Type</span>
              <span className="story-fact-value" style={{ color: typeColor }}>{story.type}</span>
            </div>
            <div className="story-fact-row">
              <span className="story-fact-label">Status</span>
              <span className="story-fact-value" style={{ color: statusColor }}>{story.status}</span>
            </div>
            {story.description && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--bg3)', borderRadius: 8, fontSize: 13, fontStyle: 'italic', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                {story.description}
              </div>
            )}
          </div>

          <div className="story-side-card">
            <div className="story-side-card-header">
              <FiActivity className="story-side-accent" style={{ color: 'var(--red)' }} />
              <div className="story-section-heading">Tale of the Tape</div>
            </div>
            <div className="story-fact-row">
              <span className="story-fact-label">Matches</span>
              <span className="story-fact-value">{storyMatches.length}</span>
            </div>
            <div className="story-fact-row">
              <span className="story-fact-label">Segments</span>
              <span className="story-fact-value">{segCount}</span>
            </div>

            {isRivalry && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: 'var(--text2)', marginBottom: 8 }}>
                  <span>H2H SCORE</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--red)' }}>{sides[0].wins}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)' }}>SIDE A</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', background: 'var(--bg3)', padding: '4px 8px', borderRadius: 4 }}>VS</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue)' }}>{sides[1].wins}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)' }}>SIDE B</div>
                  </div>
                </div>
                <div className="story-progress-track" style={{ height: 6 }}>
                  {(() => {
                    const total = sides[0].wins + sides[1].wins
                    const pct = total ? (sides[0].wins / total) * 100 : 50
                    return (
                      <>
                        <div style={{ width: `${pct}%`, background: 'var(--red)' }} />
                        <div style={{ flex: 1, background: 'var(--blue)' }} />
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="story-side-card">
            <div className="story-side-card-header">
              <FiUsers className="story-side-accent" style={{ color: 'var(--purple)' }} />
              <div className="story-section-heading">Involved Talent</div>
            </div>
            <div className="story-participants-strip" style={{ margin: 0 }}>
              {story.participants.map((p, i) => (
                <div key={i} className="story-mini-chip" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 8, fontWeight: 900, background: 'var(--purple-dim)', color: 'var(--purple)', padding: '1px 4px', borderRadius: 2 }}>{p.type.slice(0, 1).toUpperCase()}</span>
                  {getParticipantName(p)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Stories({ state, addStory, editStory, deleteStory, addSegment, deleteSegment, showToast }) {
  const { wrestlers, matches = [], stories = [], factions = [], teams = [] } = state

  const [editModal, setEditModal] = useState(null)
  const [detailStory, setDetailStory] = useState(null)
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [storyType, setStoryType] = useState('rivalry')
  const [storyView, setStoryView] = useState('active')
  const [participantSearch, setParticipantSearch] = useState('')
  const [participantShowFilter, setParticipantShowFilter] = useState('all')

  const getWrestler = (id) => wrestlers.find((w) => w.id === id)
  const getFaction = (id) => factions.find((f) => f.id === id)
  const getTeam = (id) => teams.find((t) => t.id === id)

  const getParticipantName = (p) => {
    if (p.type === 'wrestler') return getWrestler(p.id)?.name || 'Unknown'
    if (p.type === 'faction') return getFaction(p.id)?.name || 'Unknown'
    if (p.type === 'team') return getTeam(p.id)?.name || 'Unknown'
    return 'Unknown'
  }

  const getTape = (story) => computeTaleOfTape(story, matches, getWrestler, getFaction, getTeam)
  const availableShows = useMemo(() => [...new Set(wrestlers.map((w) => w.show || '').filter(Boolean))].sort((a, b) => a.localeCompare(b)), [wrestlers])
  const filteredWrestlers = useMemo(() => {
    const search = participantSearch.trim().toLowerCase()
    return wrestlers.filter((wrestler) => {
      if (search && !wrestler.name.toLowerCase().includes(search)) return false
      if (participantShowFilter !== 'all' && (wrestler.show || '') !== participantShowFilter) return false
      return true
    })
  }, [participantSearch, participantShowFilter, wrestlers])
  const filteredStories = useMemo(() => {
    if (storyView === 'all') return stories
    if (storyView === 'concluded') return stories.filter((story) => story.status === 'Concluded')
    return stories.filter((story) => story.status !== 'Concluded')
  }, [stories, storyView])
  const activeCount = stories.filter((story) => story.status !== 'Concluded').length
  const concludedCount = stories.filter((story) => story.status === 'Concluded').length
  const closeStoryEditor = () => {
    setEditModal(null)
    setSelectedParticipants([])
    setStoryType('rivalry')
    setParticipantSearch('')
    setParticipantShowFilter('all')
  }

  const handleSaveStory = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = {
      name: fd.get('name').trim(),
      type: storyType,
      status: fd.get('status'),
      participants: selectedParticipants,
      description: fd.get('description').trim(),
      segments: editModal?.id ? stories.find((s) => s.id === editModal.id)?.segments || [] : [],
    }
    if (!data.name) { showToast('Enter a story/rivalry name'); return }
    if (selectedParticipants.length < 2) { showToast('Need at least 2 participants'); return }

    if (editModal && editModal !== 'add') {
      editStory(editModal.id, data)
      showToast('Story updated!')
    } else {
      addStory(data)
      showToast(`${data.name} created!`)
    }
    closeStoryEditor()
  }

  const openEditModal = (story = null) => {
    if (story) {
      setSelectedParticipants(story.participants)
      setStoryType(story.type)
      setEditModal({ id: story.id })
    } else {
      setSelectedParticipants([])
      setStoryType('rivalry')
      setEditModal('add')
    }
    setParticipantSearch('')
    setParticipantShowFilter('all')
  }

  const toggleParticipant = (type, id) => {
    const exists = selectedParticipants.some((p) => p.type === type && p.id === id)
    if (exists) setSelectedParticipants((prev) => prev.filter((p) => !(p.type === type && p.id === id)))
    else setSelectedParticipants((prev) => [...prev, { type, id }])
  }

  // Keep detail in sync with live state
  const liveDetailStory = detailStory ? stories.find((s) => s.id === detailStory.id) || null : null

  return (
    <div className="stories-page">
      <div className="page-header">
        <h1 className="page-title">Stories & Rivalries</h1>
        <div className="stories-header-actions">
          <div className="stories-view-toggle">
            <button
              type="button"
              className={`stories-view-btn${storyView === 'active' ? ' active' : ''}`}
              onClick={() => setStoryView('active')}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`stories-view-btn${storyView === 'concluded' ? ' active' : ''}`}
              onClick={() => setStoryView('concluded')}
            >
              Concluded ({concludedCount})
            </button>
            <button
              type="button"
              className={`stories-view-btn${storyView === 'all' ? ' active' : ''}`}
              onClick={() => setStoryView('all')}
            >
              All ({stories.length})
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => openEditModal()}>+ Create Story</button>
        </div>
      </div>

      <div className="stories-compact-grid">
        {filteredStories.length === 0 && (
          <div className="empty-state card" style={{ gridColumn: '1 / -1' }}>
            <FiBookOpen style={{ fontSize: 48, opacity: 0.1, marginBottom: 16 }} />
            <p>
              {storyView === 'concluded'
                ? 'No concluded stories yet.'
                : storyView === 'all'
                ? 'No stories or rivalries yet. Create one to track ongoing feuds and storylines!'
                : 'No active stories or rivalries right now.'}
            </p>
          </div>
        )}
        {filteredStories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            tape={getTape(story)}
            getParticipantName={getParticipantName}
            onOpen={(s) => setDetailStory(s)}
            onEdit={openEditModal}
            onDelete={(id) => { deleteStory(id); showToast('Story deleted') }}
          />
        ))}
      </div>

      {liveDetailStory && (
        <StoryDetailModal
          story={liveDetailStory}
          tape={getTape(liveDetailStory)}
          wrestlers={wrestlers}
          getParticipantName={getParticipantName}
          onClose={() => setDetailStory(null)}
          onAddSegment={addSegment}
          onDeleteSegment={deleteSegment}
          showToast={showToast}
        />
      )}

      {(editModal === 'add' || editModal?.id) && (
        <Modal
          title={editModal === 'add' ? 'Create Story/Rivalry' : 'Edit Story/Rivalry'}
          onClose={closeStoryEditor}
          style={{ maxWidth: '1000px' }}
        >
          <form onSubmit={handleSaveStory}>
            {(() => {
              const story = editModal !== 'add' ? stories.find((s) => s.id === editModal.id) : null
              return (
                <div className="story-form-shell">
                  <div className="story-form-main">
                    <div className="story-form-card">
                      <div className="story-section-heading" style={{ marginBottom: 14 }}>Story Setup</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                          <label>Name</label>
                          <input name="name" defaultValue={story?.name ?? ''} placeholder="e.g., Championship Pursuit" autoFocus />
                        </div>
                        <div className="form-group">
                          <label>Status</label>
                          <select name="status" defaultValue={story?.status ?? 'Active'}>
                            <option>Active</option>
                            <option>Building</option>
                            <option>Concluded</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Type</label>
                        <div className="radio-group" style={{ background: 'var(--bg3)', padding: 12 }}>
                          <label><input type="radio" checked={storyType === 'rivalry'} onChange={() => setStoryType('rivalry')} /><span>Rivalry (focused feud between opponents)</span></label>
                          <label><input type="radio" checked={storyType === 'story'} onChange={() => setStoryType('story')} /><span>Story (broader storyline)</span></label>
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Description (optional)</label>
                        <textarea name="description" defaultValue={story?.description ?? ''} placeholder="Brief summary..." rows={3} />
                      </div>
                    </div>

                    <div className="story-form-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div className="story-section-heading">Talent Involvement</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>{selectedParticipants.length} selected</div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Search Roster</label>
                          <input value={participantSearch} onChange={(e) => setParticipantSearch(e.target.value)} placeholder="Filter talent..." />
                        </div>
                        <div style={{ width: 160 }}>
                          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Brand</label>
                          <select value={participantShowFilter} onChange={(e) => setParticipantShowFilter(e.target.value)}>
                            <option value="all">All Brands</option>
                            <option value="">No Brand</option>
                            {availableShows.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {selectedParticipants.length > 0 && (
                        <div className="story-participants-strip" style={{ marginBottom: 14, padding: 12, background: 'var(--bg3)', borderRadius: 8 }}>
                          {selectedParticipants.map((p, i) => (
                            <button key={i} type="button" className="story-mini-chip" onClick={() => toggleParticipant(p.type, p.id)} style={{ cursor: 'pointer', borderColor: 'var(--primary)' }}>
                              <span style={{ fontSize: 8, fontWeight: 900, background: 'var(--primary-dim)', color: 'var(--primary)', padding: '1px 4px', borderRadius: 2, marginRight: 6 }}>{p.type.slice(0, 1).toUpperCase()}</span>
                              {getParticipantName(p)}
                              <span style={{ marginLeft: 6, opacity: 0.5 }}>×</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="member-selector" style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
                        <div style={{ padding: 10, fontSize: 11, fontWeight: 800, color: 'var(--text3)', borderBottom: '1px solid var(--border)', marginBottom: 8, textTransform: 'uppercase' }}>Wrestlers</div>
                        {filteredWrestlers.map((w) => (
                          <label key={w.id} className="member-option" style={{ background: 'transparent' }}>
                            <input type="checkbox" checked={selectedParticipants.some(p => p.type === 'wrestler' && p.id === w.id)} onChange={() => toggleParticipant('wrestler', w.id)} />
                            <span>{w.name}</span>
                            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{w.show || 'Unassigned'}</span>
                          </label>
                        ))}

                        <div style={{ padding: 10, fontSize: 11, fontWeight: 800, color: 'var(--text3)', borderBottom: '1px solid var(--border)', margin: '12px 0 8px 0', textTransform: 'uppercase' }}>Teams & Factions</div>
                        {teams.map((t) => (
                          <label key={t.id} className="member-option" style={{ background: 'transparent' }}>
                            <input type="checkbox" checked={selectedParticipants.some(p => p.type === 'team' && p.id === t.id)} onChange={() => toggleParticipant('team', t.id)} />
                            <span>{t.name} (Team)</span>
                          </label>
                        ))}
                        {factions.map((f) => (
                          <label key={f.id} className="member-option" style={{ background: 'transparent' }}>
                            <input type="checkbox" checked={selectedParticipants.some(p => p.type === 'faction' && p.id === f.id)} onChange={() => toggleParticipant('faction', f.id)} />
                            <span>{f.name} (Faction)</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="story-form-side">
                    <div className="story-side-card" style={{ borderTop: '4px solid var(--primary)' }}>
                      <div className="story-section-heading" style={{ marginBottom: 12 }}>Preview</div>
                      <div className="story-card-name" style={{ fontSize: 20 }}>{fd.get('name') || 'New Story/Rivalry'}</div>
                      <div className="story-badge" style={{ marginTop: 8, display: 'inline-block', background: 'var(--primary-dim)', color: 'var(--primary)' }}>{storyType}</div>
                    </div>

                    <div className="story-side-card">
                      <div className="story-section-heading" style={{ marginBottom: 12 }}>Guidelines</div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                        <strong>Rivalries</strong> are focused on a head-to-head score and individual progress between sides.
                        <br /><br />
                        <strong>Stories</strong> are broader and can involve many participants in complex arcs.
                      </p>
                    </div>

                    <div className="story-form-actions" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button type="submit" className="btn btn-primary">{editModal?.id ? 'Update Story' : 'Create Story'}</button>
                      <button type="button" className="btn btn-secondary" onClick={closeStoryEditor}>Cancel</button>
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
