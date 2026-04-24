import React from 'react'
import {
  FiActivity,
  FiAward,
  FiChevronDown,
  FiChevronUp,
  FiStar,
  FiTrash2,
} from 'react-icons/fi'

function MatchRatingInput({ rating, disabled, onChange }) {
  return (
    <div className="item-rating-row">
      <div className="star-rating">
        {Array.from({ length: 5 }).map((_, index) => {
          const starIndex = index + 1
          const isActive = (rating || 0) >= starIndex
          const isHalf = (rating || 0) >= starIndex - 0.5 && (rating || 0) < starIndex

          return (
            <div key={starIndex} style={{ position: 'relative', width: 24, height: 24 }}>
              <FiStar
                className="star-icon"
                style={{
                  color: 'var(--text3)',
                  opacity: 0.25,
                  position: 'absolute',
                  inset: 0,
                }}
              />
              {(isActive || isHalf) && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: isActive ? '100%' : '50%',
                    overflow: 'hidden',
                  }}
                >
                  <FiStar
                    className="star-icon active"
                    style={{
                      color: 'var(--gold)',
                      position: 'absolute',
                      inset: 0,
                    }}
                  />
                </div>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(starIndex - 0.5)}
                style={{ position: 'absolute', inset: '0 50% 0 0', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', zIndex: 2 }}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(starIndex)}
                style={{ position: 'absolute', inset: '0 0 0 50%', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', zIndex: 2 }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: rating ? 'var(--gold)' : 'var(--text3)', letterSpacing: '0.5px' }}>
          {rating ? `${rating.toFixed(1)} STARS` : 'UNRATED'}
        </span>
        {!disabled && rating != null && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(null)}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

export function SegmentShowCardItem({
  item,
  index,
  isCurrentDay,
  isFirst,
  isLast,
  selected,
  dragged,
  dragOver,
  setCardRef,
  onFocus,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMove,
  onDeleteSegment,
  onUpdateSegment,
  getW,
}) {
  const segment = item.segment
  const taggedWrestlers = (segment.wrestlerIds || []).map((id) => getW(id)).filter(Boolean)

  return (
    <div
      ref={setCardRef}
      onClick={() => onFocus(item)}
      draggable={isCurrentDay}
      onDragStart={() => onDragStart(item)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => onDragOver(event, item)}
      onDrop={() => onDrop(item)}
      className="show-card-item segment"
      style={{
        cursor: 'pointer',
        opacity: dragged ? 0.92 : 1,
        boxShadow: dragOver
          ? 'var(--glow-heat)'
          : selected
          ? '0 0 0 1px rgba(255, 90, 42, 0.22), 0 14px 30px rgba(0, 0, 0, 0.26)'
          : 'none',
      }}
    >
      <div className="item-badge-row">
        <div className="item-badges">
          <span className="badge badge-purple">SEGMENT {index + 1}</span>
          {segment.segmentType && <span className="badge badge-dim">{segment.segmentType}</span>}
          {segment.storyName && <span className="badge badge-dim">{segment.storyName}</span>}
        </div>
        <div className="item-actions">
          {isCurrentDay && <FiActivity style={{ fontSize: 14, color: 'var(--text3)', marginRight: 4 }} title="Drag to reorder" />}
          <button type="button" className="btn btn-icon btn-secondary btn-sm" onClick={() => onMove(item, 'up')} disabled={isFirst}><FiChevronUp /></button>
          <button type="button" className="btn btn-icon btn-secondary btn-sm" onClick={() => onMove(item, 'down')} disabled={isLast}><FiChevronDown /></button>
          {isCurrentDay && onDeleteSegment && (
            <button type="button" className="btn btn-icon btn-danger btn-sm" onClick={() => onDeleteSegment(segment.storyId, segment.segmentIndex, segment.id)}><FiTrash2 /></button>
          )}
        </div>
      </div>

      {segment.title && <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{segment.title}</div>}
      {segment.description && <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{segment.description}</div>}
      {taggedWrestlers.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {taggedWrestlers.map((wrestler) => (
            <span key={wrestler.id} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius)', background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border2)' }}>
              {wrestler.name}
            </span>
          ))}
        </div>
      )}
      {isCurrentDay && onUpdateSegment && (
        <div className="board-card-hint">
          {selected ? 'Editing in inspector' : 'Click card to edit in inspector'}
        </div>
      )}
    </div>
  )
}

export function MatchShowCardItem({
  item,
  index,
  isCurrentDay,
  isFirst,
  isLast,
  selected,
  dragged,
  dragOver,
  accentColor,
  isPhoneLayout,
  setCardRef,
  onFocus,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMove,
  onDeleteMatch,
  onSetMatchRating,
  canEditMatch,
  getParticipantIdsFromMatch,
  getTeamsFromMatch,
  getWinnerNamesFromMatch,
  getMatchTypeLabel,
  getW,
  titles,
  selectStyle,
  finishTypes,
  winnerFinishTypes,
  setWinnerFinishTypes,
  onWinnerSelect,
  expandedNotesId,
  setExpandedNotesId,
}) {
  const match = item.match
  const participantIds = getParticipantIdsFromMatch(match)
  const participants = participantIds.map((id) => getW(id)).filter(Boolean)
  const teams = getTeamsFromMatch(match)
  const titleMatch = titles.find((title) => title.id === match.titleId)

  return (
    <div
      ref={setCardRef}
      onClick={() => onFocus(item)}
      draggable={isCurrentDay}
      onDragStart={() => onDragStart(item)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => onDragOver(event, item)}
      onDrop={() => onDrop(item)}
      className="show-card-item match"
      style={{
        '--event-accent': accentColor,
        cursor: 'pointer',
        opacity: dragged ? 0.92 : 1,
        boxShadow: dragOver
          ? `0 0 0 1px ${accentColor}55, 0 14px 30px rgba(0, 0, 0, 0.26)`
          : selected
          ? `0 0 0 1px ${accentColor}55, 0 14px 30px rgba(0, 0, 0, 0.26)`
          : 'none',
      }}
    >
      <div className="item-badge-row">
        <div className="item-badges">
          <span className="badge badge-primary">MATCH {index + 1}</span>
          <span className="badge badge-dim">{match.matchType || getMatchTypeLabel(participantIds.length, match.mode)}</span>
          {index === 0 && <span className="badge badge-gold"><FiAward style={{ marginRight: 4 }} /> Main Event</span>}
          {match.stipulation && <span className="badge badge-red">{match.stipulation}</span>}
          {titleMatch && <span className="badge badge-gold"><FiAward style={{ marginRight: 4 }} /> {titleMatch.name}</span>}
        </div>
        <div className="item-actions">
          {isCurrentDay && <FiActivity style={{ fontSize: 14, color: 'var(--text3)', marginRight: 4 }} title="Drag to reorder" />}
          <button type="button" className="btn btn-icon btn-secondary btn-sm" onClick={() => onMove(item, 'up')} disabled={isFirst}><FiChevronUp /></button>
          <button type="button" className="btn btn-icon btn-secondary btn-sm" onClick={() => onMove(item, 'down')} disabled={isLast}><FiChevronDown /></button>
        </div>
      </div>

      {!teams && (
        <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
          {!match.winnerId && (
            <FinishTypeSelect
              matchId={match.id}
              finishTypes={finishTypes}
              winnerFinishTypes={winnerFinishTypes}
              setWinnerFinishTypes={setWinnerFinishTypes}
              selectStyle={selectStyle}
            />
          )}
          {participants.length >= 10 ? (
            <select
              value={match.winnerId ?? ''}
              onChange={(event) => event.target.value && isCurrentDay && onWinnerSelect(match.id, parseInt(event.target.value, 10))}
              style={selectStyle}
              disabled={!isCurrentDay}
            >
              <option value="">Select winner</option>
              {participants.map((wrestler) => <option key={wrestler.id} value={wrestler.id}>{wrestler.name}</option>)}
            </select>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {participants.map((wrestler) => (
                <button type="button" key={wrestler.id} className={`winner-btn${match.winnerId === wrestler.id ? ' selected' : ''}`} onClick={() => isCurrentDay && onWinnerSelect(match.id, wrestler.id)} disabled={!isCurrentDay}>{wrestler.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {teams && (
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {!match.winnerId && (
            <FinishTypeSelect
              matchId={match.id}
              finishTypes={finishTypes}
              winnerFinishTypes={winnerFinishTypes}
              setWinnerFinishTypes={setWinnerFinishTypes}
              selectStyle={selectStyle}
            />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isPhoneLayout ? '1fr' : `repeat(${teams.length}, minmax(0, 1fr))`, gap: 12, alignItems: 'start' }}>
            {teams.map((teamIds, teamIndex) => (
              <div key={`team-${teamIndex}`}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Team {String.fromCharCode(65 + teamIndex)}</div>
                <div
                  className="item-participants item-participants--team"
                  style={{ gridTemplateColumns: `repeat(${teamIds.length}, minmax(0, 1fr))` }}
                >
                  {teamIds.map((id) => {
                    const wrestler = getW(id)
                    if (!wrestler) return null
                    const teamWon = Boolean(match.winnerId && teamIds.includes(match.winnerId))
                    return (
                      <button
                        type="button"
                        key={id}
                        className={`winner-button ${teamWon ? 'selected' : ''}`}
                        onClick={() => isCurrentDay && onWinnerSelect(match.id, id)}
                        disabled={!isCurrentDay}
                      >
                        {wrestler.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {match.winnerId && <div className="match-winner-label">Winner: {getWinnerNamesFromMatch(match, getW).join(' / ')}{match.finishType ? ` \u2022 ${match.finishType}` : ''}</div>}

      <div className="item-rating-row">
        <MatchRatingInput
          rating={match.rating ?? null}
          disabled={!isCurrentDay}
          onChange={(value) => onSetMatchRating?.(match.id, value)}
        />
      </div>

      {match.notes && (
        <div className="item-notes" style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpandedNotesId(expandedNotesId === match.id ? null : match.id)}>
            {expandedNotesId === match.id ? 'Hide Notes' : 'Show Notes'}
          </button>
          {expandedNotesId === match.id && <p style={{ marginTop: 10, color: 'var(--text2)', lineHeight: 1.6 }}>{match.notes}</p>}
        </div>
      )}

      {isCurrentDay && (
        <div className="board-card-hint">
          {canEditMatch(match)
            ? selected
              ? 'Editing in inspector'
              : 'Click card to edit in inspector'
            : 'Result locked after winner is set'}
        </div>
      )}

      {canEditMatch(match) && (
        <div className="form-actions" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-danger" onClick={() => onDeleteMatch(match.id)}>Delete Match</button>
        </div>
      )}
    </div>
  )
}

function FinishTypeSelect({ matchId, finishTypes, winnerFinishTypes, setWinnerFinishTypes, selectStyle }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, color: 'var(--text2)' }}>Finish Type</label>
      <select
        value={winnerFinishTypes[matchId] || finishTypes[0]}
        onChange={(event) => setWinnerFinishTypes((current) => ({ ...current, [matchId]: event.target.value }))}
        style={selectStyle}
      >
        {finishTypes.map((finish) => <option key={finish} value={finish}>{finish}</option>)}
      </select>
    </div>
  )
}
