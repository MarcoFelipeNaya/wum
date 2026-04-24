import React from 'react'

export function InspectorSummary({
  selectedBoardItem,
  getParticipantIdsFromMatch,
  getW,
  titles,
  getMatchTypeLabel,
  getWinnerNamesFromMatch,
}) {
  if (!selectedBoardItem) return null

  return (
    <div className="inspector-summary">
      <div className="inspector-summary-label">
        {selectedBoardItem.kind === 'match' ? 'Selected Match' : 'Selected Segment'}
      </div>
      {selectedBoardItem.kind === 'match' ? (
        <MatchInspectorSummary
          match={selectedBoardItem.match}
          getParticipantIdsFromMatch={getParticipantIdsFromMatch}
          getW={getW}
          titles={titles}
          getMatchTypeLabel={getMatchTypeLabel}
          getWinnerNamesFromMatch={getWinnerNamesFromMatch}
        />
      ) : (
        <SegmentInspectorSummary segment={selectedBoardItem.segment} />
      )}
    </div>
  )
}

function MatchInspectorSummary({
  match,
  getParticipantIdsFromMatch,
  getW,
  titles,
  getMatchTypeLabel,
  getWinnerNamesFromMatch,
}) {
  const participantIds = getParticipantIdsFromMatch(match)
  const participantNames = participantIds.map((id) => getW(id)?.name).filter(Boolean)
  const linkedTitle = titles.find((title) => title.id === match.titleId)

  return (
    <>
      <div className="inspector-summary-title">
        {participantNames.join(' vs ') || 'Match slot'}
      </div>
      <div className="inspector-summary-meta">
        <span>{match.matchType || getMatchTypeLabel(participantIds.length, match.mode)}</span>
        {linkedTitle && <span>{linkedTitle.name}</span>}
        {match.stipulation && <span>{match.stipulation}</span>}
        {match.winnerId && <span>Winner: {getWinnerNamesFromMatch(match, getW).join(' / ')}</span>}
      </div>
    </>
  )
}

function SegmentInspectorSummary({ segment }) {
  return (
    <>
      <div className="inspector-summary-title">
        {segment.title || segment.segmentType || 'Segment slot'}
      </div>
      <div className="inspector-summary-meta">
        {segment.segmentType && <span>{segment.segmentType}</span>}
        {segment.storyName && <span>{segment.storyName}</span>}
        {segment.wrestlerIds?.length > 0 && <span>{segment.wrestlerIds.length} tagged</span>}
      </div>
    </>
  )
}

export function MatchEditor({
  editingMatch,
  editParticipantCount,
  setEditParticipantCount,
  editMatchMode,
  setEditMatchMode,
  editLayout,
  editParticipantSelections,
  updateEditParticipantSlot,
  editWrestlers,
  getAvailableWrestlersForSlot,
  editEligibleTeams,
  editSavedTeamSelections,
  applySavedTeamToEdit,
  editTitles,
  getChampIds,
  getW,
  getTitleType,
  getAllowedModes,
  getMatchTypeLabel,
  selectStyle,
  smallSelectStyle,
  onSubmit,
  onCancel,
  allowedParticipantCounts,
}) {
  return (
    <form onSubmit={(event) => onSubmit(event, editingMatch)}>
      <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 0, marginBottom: 14 }}>
        Refine the selected match from the inspector while the event board stays focused on pacing.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Participants</label>
          <select name="participantCount" value={editParticipantCount} onChange={(event) => setEditParticipantCount(parseInt(event.target.value, 10))} style={smallSelectStyle}>
            {allowedParticipantCounts.map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </div>
        {getAllowedModes(editParticipantCount).length > 1 && (
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Match Style</label>
            <select name="mode" value={editMatchMode} onChange={(event) => setEditMatchMode(event.target.value)} style={smallSelectStyle}>
              {getAllowedModes(editParticipantCount).map((mode) => <option key={mode} value={mode}>{getMatchTypeLabel(editParticipantCount, mode)}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
        Match Type: <strong>{getMatchTypeLabel(editParticipantCount, editMatchMode)}</strong>
      </div>

      {!editLayout.isTeamBased && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
          {Array.from({ length: editParticipantCount }).map((_, index) => (
            <select key={index} name={`participant_${index}`} value={editParticipantSelections[index] ?? ''} onChange={(event) => updateEditParticipantSlot(index, event.target.value)} style={{ ...selectStyle, width: '100%' }}>
              <option value="">Participant {index + 1}</option>
              {getAvailableWrestlersForSlot(editWrestlers, editParticipantSelections, index).map((wrestler) => <option key={wrestler.id} value={wrestler.id}>{wrestler.name}</option>)}
            </select>
          ))}
        </div>
      )}

      {editLayout.isTeamBased && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${editLayout.teams.length}, minmax(0, 1fr))`, gap: 12, marginBottom: 12 }}>
          {editLayout.teams.map((team, teamIndex) => {
            const teamStart = editLayout.teams.slice(0, teamIndex).reduce((sum, currentTeam) => sum + currentTeam.size, 0)
            return (
              <div key={team.label}>
                {editEligibleTeams.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Saved {team.size === 2 ? 'Tag Team' : 'Trios Team'}</div>
                    <select name={`team${teamIndex}_saved`} value={editSavedTeamSelections[teamIndex] ?? ''} onChange={(event) => applySavedTeamToEdit(teamIndex, event.target.value)} style={{ ...selectStyle, width: '100%' }}>
                      <option value="">Manual selection</option>
                      {editEligibleTeams.map((eligibleTeam) => <option key={eligibleTeam.id} value={eligibleTeam.id}>{eligibleTeam.name}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{team.label}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {Array.from({ length: team.size }).map((_, index) => (
                    <select key={index} name={`team${teamIndex}_${index}`} value={editParticipantSelections[teamStart + index] ?? ''} onChange={(event) => updateEditParticipantSlot(teamStart + index, event.target.value)} style={{ ...selectStyle, width: '100%' }}>
                      <option value="">Select wrestler</option>
                      {getAvailableWrestlersForSlot(editWrestlers, editParticipantSelections, teamStart + index).map((wrestler) => <option key={wrestler.id} value={wrestler.id}>{wrestler.name}</option>)}
                    </select>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="form-group">
        <label>Stipulation (optional)</label>
        <input name="stipulation" defaultValue={editingMatch.stipulation || ''} placeholder="e.g. Casket Match, No DQ, Iron Man" style={{ ...selectStyle, width: '100%' }} />
      </div>

      <div className="form-group">
        <label>Title on the line (optional)</label>
        <select name="titleId" defaultValue={editingMatch.titleId ?? ''} style={{ ...selectStyle, flex: 'unset', width: '100%' }}>
          <option value="">- No title match -</option>
          {editTitles.map((title) => {
            const champNames = getChampIds(title).map((id) => getW(id)?.name).filter(Boolean)
            return <option key={title.id} value={title.id}>{title.name} [{getTitleType(title)}] {champNames.length > 0 ? `(C: ${champNames.join(' / ')})` : '(Vacant)'}</option>
          })}
        </select>
      </div>

      <div className="form-group">
        <label>Match Notes</label>
        <textarea name="notes" defaultValue={editingMatch.notes || ''} placeholder="What happened in the match?" rows={4} style={{ ...selectStyle, width: '100%', resize: 'vertical' }} />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Match</button>
      </div>
    </form>
  )
}

export function SegmentEditor({
  editSegTitle,
  setEditSegTitle,
  editSegDescription,
  setEditSegDescription,
  editSegCategory,
  setEditSegCategory,
  editSegType,
  setEditSegType,
  editActiveCategoryTypes,
  segmentCategories,
  twoColumnOptionGrid,
  editSegWrestlerSearch,
  setEditSegWrestlerSearch,
  editSegWrestlerBrand,
  setEditSegWrestlerBrand,
  availableShowOptions,
  smallSelectStyle,
  editSegmentWrestlers,
  editSegSelectedWrestlers,
  toggleEditSegWrestler,
  onCancel,
  onSave,
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 0, marginBottom: 2 }}>
        Update the selected segment from the inspector while the center board stays focused on the rundown.
      </p>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Segment Title</label>
        <input value={editSegTitle} onChange={(event) => setEditSegTitle(event.target.value)} placeholder="Segment title" />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Segment Description</label>
        <textarea value={editSegDescription} onChange={(event) => setEditSegDescription(event.target.value.slice(0, 3000))} rows={5} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Segment Type</label>
          {(editSegCategory || editSegType) && (
            <button type="button" onClick={() => { setEditSegCategory(null); setEditSegType(null) }} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Clear
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {segmentCategories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => { setEditSegCategory(editSegCategory === category.key ? null : category.key); setEditSegType(null) }}
              style={{
                padding: '5px 10px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                background: editSegCategory === category.key ? 'var(--red, #c0392b)' : 'var(--bg2)',
                borderColor: editSegCategory === category.key ? 'var(--red, #c0392b)' : 'var(--border2)',
                color: editSegCategory === category.key ? '#fff' : 'var(--text)',
              }}
            >
              {category.label}
            </button>
          ))}
        </div>
        {editSegCategory && editActiveCategoryTypes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: twoColumnOptionGrid, gap: 6 }}>
            {editActiveCategoryTypes.map((type) => (
              <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                <input type="radio" name="editSegType" value={type} checked={editSegType === type} onChange={() => setEditSegType(type)} style={{ accentColor: 'var(--red, #c0392b)', cursor: 'pointer' }} />
                {type}
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Tagged Wrestlers</label>
        <input value={editSegWrestlerSearch} onChange={(event) => setEditSegWrestlerSearch(event.target.value)} placeholder="Search by name..." style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 10px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
        <select value={editSegWrestlerBrand} onChange={(event) => setEditSegWrestlerBrand(event.target.value)} style={{ ...smallSelectStyle, fontSize: 12, marginBottom: 8 }}>
          <option value="all">All Brands</option>
          <option value="current">Current Show</option>
          {availableShowOptions.map((show) => <option key={show} value={show}>{show}</option>)}
        </select>
        <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--bg2)' }}>
          {editSegmentWrestlers.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>No wrestlers found</div>
          ) : (
            editSegmentWrestlers.map((wrestler) => (
              <label key={wrestler.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                <input type="checkbox" checked={editSegSelectedWrestlers.includes(wrestler.id)} onChange={() => toggleEditSegWrestler(wrestler.id)} style={{ accentColor: 'var(--red, #c0392b)', cursor: 'pointer' }} />
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{wrestler.name}</span>
                {wrestler.show && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 'auto' }}>{wrestler.show}</span>}
              </label>
            ))
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={!editSegTitle.trim()}>Save Segment</button>
      </div>
    </div>
  )
}
