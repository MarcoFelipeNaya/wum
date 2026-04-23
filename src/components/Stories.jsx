import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { formatUniverseDate } from '../utils/dates.js'
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
  if (!segmentType) return '#666'
  const t = segmentType.toLowerCase()
  if (t.includes('promo') || t.includes('interview')) return '#2980b9'
  if (t.includes('brawl') || t.includes('attack') || t.includes('ambush')) return '#c0392b'
  if (t.includes('confrontation') || t.includes('challenge') || t.includes('mystery') || t.includes('arrival') || t.includes('locker') || t.includes('conversation') || t.includes('meeting') || t.includes('formation') || t.includes('breakup') || t.includes('medical') || t.includes('stipulation')) return '#8e44ad'
  if (t.includes('vignette') || t.includes('video') || t.includes('recap')) return '#9b59b6'
  if (t.includes('hype') || t.includes('sponsor')) return '#9b59b6'
  if (t.includes('gm') || t.includes('authority') || t.includes('contract')) return '#d4af37'
  if (t.includes('celebration') || t.includes('retirement') || t.includes('return') || t.includes('talk show') || t.includes('ceremony')) return '#27ae60'
  return '#666'
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
  const statusColor = story.status === 'Active' ? '#27ae60' : story.status === 'Building' ? '#2980b9' : '#666'
  const typeColor = story.type === 'rivalry' ? '#c0392b' : '#9b59b6'

  return (
    <div className="story-compact-card" onClick={() => onOpen(story)}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${typeColor}, transparent)`, margin: '-14px -14px 14px -14px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, padding: '2px 7px', borderRadius: 3, background: typeColor + '22', color: typeColor, border: `1px solid ${typeColor}44`, textTransform: 'uppercase' }}>
              {story.type === 'rivalry' ? 'Rivalry' : 'Story'}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: '2px 7px', borderRadius: 3, background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44`, textTransform: 'uppercase' }}>
              {story.status}
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, letterSpacing: -0.3 }}>
            {story.name}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }} onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(story)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(story.id)}>Delete</button>
        </div>
      </div>

      {/* VS layout for rivalries */}
      {isRivalry ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getParticipantName(sides[0].participant)}
          </span>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text2)', letterSpacing: 2, padding: '2px 6px', background: 'var(--bg3)', borderRadius: 3, flexShrink: 0 }}>VS</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getParticipantName(sides[1].participant)}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {story.participants.map((p, i) => (
            <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)' }}>
              {getParticipantName(p)}
            </span>
          ))}
        </div>
      )}

      {/* Win bar */}
      {isRivalry && (sides[0].wins > 0 || sides[1].wins > 0) && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span style={{ fontWeight: 800, color: '#c0392b' }}>{sides[0].wins}W</span>
            <span style={{ color: 'var(--text2)' }}>{storyMatches.filter(m => m.winnerId).length} matches scored</span>
            <span style={{ fontWeight: 800, color: '#2980b9' }}>{sides[1].wins}W</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--bg3)', overflow: 'hidden', display: 'flex' }}>
            {(() => {
              const total = sides[0].wins + sides[1].wins
              const pct = total ? (sides[0].wins / total) * 100 : 50
              return (
                <>
                  <div style={{ width: `${pct}%`, background: '#c0392b' }} />
                  <div style={{ flex: 1, background: '#2980b9' }} />
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{storyMatches.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Matches</div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{segCount}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Segments</div>
        </div>
        {tape.lastMatch && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', lineHeight: 1 }}>{formatUniverseDate(tape.lastMatch.date)}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Last Match</div>
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

  const typeColor = story.type === 'rivalry' ? '#c0392b' : '#9b59b6'
  const statusColor = story.status === 'Active' ? '#27ae60' : story.status === 'Building' ? '#2980b9' : '#666'

  return (
    <Modal title={story.name} onClose={onClose} style={{ maxWidth: '920px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, padding: '3px 9px', borderRadius: 3, background: typeColor + '22', color: typeColor, border: `1px solid ${typeColor}44`, textTransform: 'uppercase' }}>
          {story.type === 'rivalry' ? 'Rivalry' : 'Story'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 3, background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44`, textTransform: 'uppercase' }}>
          {story.status}
        </span>
        {story.description && (
          <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 4, fontStyle: 'italic' }}>{story.description}</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Timeline ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text2)' }}>
              Timeline ({storyMatches.length} match{storyMatches.length !== 1 ? 'es' : ''}, {segCount} segment{segCount !== 1 ? 's' : ''})
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSegForm((v) => !v)}>
              {showSegForm ? 'Cancel' : '+ Add Segment'}
            </button>
          </div>

          {showSegForm && (
            <form onSubmit={handleAddSegment} style={{ marginBottom: 14, padding: 14, background: 'var(--bg2)', border: '1px solid var(--border2)', borderLeft: '3px solid #9b59b6', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#9b59b6', marginBottom: 12 }}>New Segment</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Title *</label>
                  <input name="title" placeholder="e.g., 'The Challenge'" autoFocus
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 10px', borderRadius: 'var(--radius)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Date</label>
                  <input type="date" name="date"
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 10px', borderRadius: 'var(--radius)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 3 }}>Description</label>
                <textarea name="description" rows={2} placeholder="What happened..."
                  style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 10px', borderRadius: 'var(--radius)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Type (optional)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {SEGMENT_CATEGORIES.map((cat) => (
                    <button key={cat.key} type="button"
                      onClick={() => { setSegCategory(segCategory === cat.key ? null : cat.key); setSegSubType(null) }}
                      style={{ padding: '4px 9px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: segCategory === cat.key ? '#9b59b6' : 'var(--bg3)', borderColor: segCategory === cat.key ? '#9b59b6' : 'var(--border2)', color: segCategory === cat.key ? '#fff' : 'var(--text)' }}>
                      {cat.label}
                    </button>
                  ))}
                </div>
                {segCategory && activeCategoryTypes.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {activeCategoryTypes.map((type) => (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                        <input type="radio" checked={segSubType === type} onChange={() => setSegSubType(type)} style={{ accentColor: '#9b59b6' }} />
                        {type}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-actions" style={{ marginBottom: 0 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowSegForm(false); setSegCategory(null); setSegSubType(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Segment</button>
              </div>
            </form>
          )}

          {timeline.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
              No history yet. Book matches or add segments from the Calendar.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {timeline.map((item, i) => {
              if (item.kind === 'match') {
                const { match } = item
                const participantIds = getParticipantIdsFromMatch(match)
                const participants = participantIds.map((id) => getWrestler(id)).filter(Boolean)
                const winner = getWrestler(match.winnerId)

                return (
                  <div key={`m-${match.id}`} style={{ padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderLeft: '3px solid #c0392b', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '2px 6px', borderRadius: 3, background: 'rgba(192,57,43,0.15)', color: '#c0392b', border: '1px solid rgba(192,57,43,0.3)', textTransform: 'uppercase' }}>Match</span>
                      <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{formatUniverseDate(match.date)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text2)' }}>{getMatchTypeLabel(match)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      {participants.map((w, idx) => (
                        <span key={w.id}>
                          <span style={{ fontWeight: match.winnerId === w.id ? 800 : 400, color: match.winnerId === w.id ? '#c0392b' : 'var(--text)' }}>{w.name}</span>
                          {idx < participants.length - 1 && <span style={{ color: 'var(--text2)', margin: '0 4px', fontSize: 11 }}>vs</span>}
                        </span>
                      ))}
                    </div>
                    {winner && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Winner: <strong style={{ color: 'var(--text)' }}>{winner.name}</strong></div>}
                    {match.notes?.trim() && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 6 }}>{match.notes}</div>
                    )}
                  </div>
                )
              }

              const { seg, idx: segIdx } = item
              const typeColor = segmentTypeBadgeColor(seg.segmentType)
              const taggedWrestlers = (seg.wrestlerIds || []).map((id) => getWrestler(id)).filter(Boolean)

              return (
                <div key={`s-${segIdx}`} style={{ padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderLeft: '3px solid #9b59b6', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '2px 6px', borderRadius: 3, background: 'rgba(155,89,182,0.15)', color: '#9b59b6', border: '1px solid rgba(155,89,182,0.3)', textTransform: 'uppercase' }}>Segment</span>
                      <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{formatUniverseDate(seg.date)}</span>
                      {seg.segmentType && (
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: typeColor + '22', color: typeColor, border: `1px solid ${typeColor}44` }}>{seg.segmentType}</span>
                      )}
                    </div>
                    <button type="button" onClick={() => { onDeleteSegment(story.id, segIdx); showToast('Segment removed') }}
                      style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                  {seg.title && <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{seg.title}</div>}
                  {seg.description && <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{seg.description}</div>}
                  {taggedWrestlers.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {taggedWrestlers.map((w) => (
                        <span key={w.id} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)' }}>{w.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT: Tale of the Tape ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tale of the Tape panel */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, background: '#d4af37', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#d4af37' }}>Tale of the Tape</span>
            </div>

            <div style={{ padding: 14 }}>
              {/* General stats */}
              {[
                { label: 'Total Matches', value: storyMatches.length },
                { label: 'Completed', value: completedMatches.length },
                { label: 'Segments', value: segCount },
                { label: 'First Match', value: firstMatch?.date || '—' },
                { label: 'Latest Match', value: lastMatch?.date || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{value}</span>
                </div>
              ))}

              {/* Head-to-head for rivalries */}
              {isRivalry && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 12 }}>Head to Head</div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      <span style={{ color: '#c0392b', maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getParticipantName(sides[0].participant)}</span>
                      <span style={{ color: '#2980b9', maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{getParticipantName(sides[1].participant)}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ textAlign: 'right', fontSize: 28, fontWeight: 900, color: '#c0392b', lineHeight: 1 }}>{sides[0].wins}</div>
                      <div style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'center', fontWeight: 700, padding: '0 4px' }}>WINS</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: '#2980b9', lineHeight: 1 }}>{sides[1].wins}</div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden', display: 'flex' }}>
                      {(() => {
                        const total = sides[0].wins + sides[1].wins
                        const pct = total ? (sides[0].wins / total) * 100 : 50
                        return (
                          <>
                            <div style={{ width: `${pct}%`, background: '#c0392b', transition: 'width 0.4s' }} />
                            <div style={{ flex: 1, background: '#2980b9' }} />
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Current streak */}
                  {completedMatches.length > 0 && (() => {
                    const last = completedMatches[completedMatches.length - 1]
                    const lastWinnerSide = sides.find(s => s.ids.includes(last.winnerId))
                    if (!lastWinnerSide) return null
                    let streak = 0
                    for (let i = completedMatches.length - 1; i >= 0; i--) {
                      if (lastWinnerSide.ids.includes(completedMatches[i].winnerId)) streak++
                      else break
                    }
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Streak</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#d4af37' }}>{getParticipantName(lastWinnerSide.participant)} ×{streak}</span>
                      </div>
                    )
                  })()}

                  {/* Recent form */}
                  {completedMatches.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 8 }}>Recent Form (last 5)</div>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {completedMatches.slice(-5).map((m, i) => {
                          const side0won = sides[0].ids.includes(m.winnerId)
                          return (
                  <div key={i} title={`${formatUniverseDate(m.date)} — ${side0won ? getParticipantName(sides[0].participant) : getParticipantName(sides[1].participant)} wins`}
                              style={{ flex: 1, height: 22, borderRadius: 3, background: side0won ? '#c0392b' : '#2980b9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{side0won ? 'A' : 'B'}</span>
                            </div>
                          )
                        })}
                        {Array.from({ length: Math.max(0, 5 - completedMatches.slice(-5).length) }).map((_, i) => (
                          <div key={`e-${i}`} style={{ flex: 1, height: 22, borderRadius: 3, background: 'var(--bg3)' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text2)', marginTop: 4 }}>
                        <span style={{ color: '#c0392b', fontWeight: 700 }}>A = {getParticipantName(sides[0].participant)}</span>
                        <span style={{ color: '#2980b9', fontWeight: 700 }}>B = {getParticipantName(sides[1].participant)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Non-rivalry participant records */}
              {!isRivalry && sides.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 10 }}>Participant Records</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sides.map((side, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{getParticipantName(side.participant)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>
                          <span style={{ color: '#27ae60' }}>{side.wins}W</span>{' '}
                          <span style={{ color: '#c0392b' }}>{side.losses}L</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participants panel */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, background: '#c0392b', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text2)' }}>Participants</span>
            </div>
            <div style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {story.participants.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 20 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 2, background: '#c0392b', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.type}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{getParticipantName(p)}</span>
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

  const getParticipantIds = (p) => {
    if (p.type === 'wrestler') return [p.id]
    if (p.type === 'faction') return getFaction(p.id)?.memberIds || []
    if (p.type === 'team') return getTeam(p.id)?.memberIds || []
    return []
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
          style={{ maxWidth: '980px' }}
        >
          <form onSubmit={handleSaveStory}>
            {(() => {
              const story = editModal !== 'add' ? stories.find((s) => s.id === editModal.id) : null
              return (
                <div className="story-form-shell">
                  <div className="story-form-main">
                    <div className="story-form-card">
                      <div className="story-form-heading">Story Setup</div>
                      <div className="story-form-grid">
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
                        <div className="radio-group">
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
                      <div className="story-form-card-header">
                        <div className="story-form-heading">Participants</div>
                        <div className="story-form-count">{selectedParticipants.length} selected</div>
                      </div>

                      <div className="story-participant-filters">
                        <div className="form-group">
                          <label>Search Wrestlers</label>
                          <input value={participantSearch} onChange={(e) => setParticipantSearch(e.target.value)} placeholder="Filter by wrestler name" />
                        </div>
                        <div className="form-group">
                          <label>Show</label>
                          <select value={participantShowFilter} onChange={(e) => setParticipantShowFilter(e.target.value)}>
                            <option value="all">All shows</option>
                            <option value="">No show</option>
                            {availableShows.map((show) => (
                              <option key={show} value={show}>{show}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {selectedParticipants.length > 0 && (
                        <div className="story-selected-strip">
                          {selectedParticipants.map((participant, index) => (
                            <button
                              key={`${participant.type}-${participant.id}-${index}`}
                              type="button"
                              className="story-selected-chip"
                              onClick={() => toggleParticipant(participant.type, participant.id)}
                            >
                              <span className="story-selected-chip-type">{participant.type}</span>
                              <span>{getParticipantName(participant)}</span>
                              <span className="story-selected-chip-remove">x</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="participant-selector story-participant-selector">
                        <div className="participant-category">
                          <div className="category-title">Wrestlers</div>
                          {filteredWrestlers.length === 0 ? (
                            <div className="story-filter-empty">No wrestlers match the current filters.</div>
                          ) : (
                            filteredWrestlers.map((w) => (
                              <label key={`w-${w.id}`} className="participant-option story-participant-option">
                                <input type="checkbox" checked={selectedParticipants.some((p) => p.type === 'wrestler' && p.id === w.id)} onChange={() => toggleParticipant('wrestler', w.id)} />
                                <span>{w.name}</span>
                                <span className="story-option-meta">{w.show || 'No show'}</span>
                              </label>
                            ))
                          )}
                        </div>
                        {factions.length > 0 && (
                          <div className="participant-category">
                            <div className="category-title">Factions</div>
                            {factions.map((f) => (
                              <label key={`f-${f.id}`} className="participant-option story-participant-option">
                                <input type="checkbox" checked={selectedParticipants.some((p) => p.type === 'faction' && p.id === f.id)} onChange={() => toggleParticipant('faction', f.id)} />
                                <span>{f.name}</span>
                                <span className="story-option-meta">{f.memberIds?.length || 0} members</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {teams.length > 0 && (
                          <div className="participant-category">
                            <div className="category-title">Teams</div>
                            {teams.map((t) => (
                              <label key={`t-${t.id}`} className="participant-option story-participant-option">
                                <input type="checkbox" checked={selectedParticipants.some((p) => p.type === 'team' && p.id === t.id)} onChange={() => toggleParticipant('team', t.id)} />
                                <span>{t.name}</span>
                                <span className="story-option-meta">{t.type === 'trio' ? 'Trios' : 'Tag Team'}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="story-form-side">
                    <div className="story-form-card">
                      <div className="story-form-heading">Quick Rules</div>
                      <div className="story-form-facts">
                        <div className="story-form-fact-row">
                          <span>Minimum participants</span>
                          <strong>2</strong>
                        </div>
                        <div className="story-form-fact-row">
                          <span>Current type</span>
                          <strong>{storyType === 'rivalry' ? 'Rivalry' : 'Story'}</strong>
                        </div>
                        <div className="story-form-fact-row">
                          <span>Selected now</span>
                          <strong>{selectedParticipants.length}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-actions story-form-actions">
                    <button type="button" className="btn btn-secondary" onClick={closeStoryEditor}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{editModal === 'add' ? 'Create' : 'Save'}</button>
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
