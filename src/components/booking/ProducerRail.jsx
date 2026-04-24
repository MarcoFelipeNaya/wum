import React from 'react'
import { FiAward, FiMic } from 'react-icons/fi'

export default function ProducerRail({
  composerMode,
  onComposerModeChange,
  canUseTemplates,
  quickMatchTemplates,
  quickSegmentTemplates,
  onApplyMatchTemplate,
  onApplySegmentTemplate,
  producerTalent,
  producerStories,
  producerTitles,
  getTitleType,
}) {
  return (
    <>
      <div className="producer-rail-group">
        <div className="producer-rail-label">Composer</div>
        <div className="producer-mode-toggle">
          <button type="button" className={`producer-mode-btn${composerMode === 'match' ? ' active' : ''}`} onClick={() => onComposerModeChange('match')}>
            <FiAward /> Match
          </button>
          <button type="button" className={`producer-mode-btn${composerMode === 'segment' ? ' active' : ''}`} onClick={() => onComposerModeChange('segment')}>
            <FiMic /> Segment
          </button>
        </div>
      </div>

      {canUseTemplates && composerMode === 'match' && (
        <div className="producer-rail-group">
          <div className="producer-rail-label">Quick Match Templates</div>
          <div className="producer-chip-grid">
            {quickMatchTemplates.map((template) => (
              <button
                key={`${template.count}-${template.mode}`}
                type="button"
                className="producer-chip"
                onClick={() => onApplyMatchTemplate(template.count, template.mode)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {canUseTemplates && composerMode === 'segment' && (
        <div className="producer-rail-group">
          <div className="producer-rail-label">Quick Segment Templates</div>
          <div className="producer-chip-grid">
            {quickSegmentTemplates.map((template) => (
              <button
                key={`${template.category}-${template.type}`}
                type="button"
                className="producer-chip"
                onClick={() => onApplySegmentTemplate(template.category, template.type)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="producer-rail-group">
        <div className="producer-rail-label">Available Talent</div>
        <div className="producer-mini-list">
          {producerTalent.map((wrestler) => (
            <div key={wrestler.id} className="producer-mini-row">
              <div>
                <div className="producer-mini-title">{wrestler.name}</div>
                <div className="producer-mini-meta">{wrestler.show || 'Universe'}</div>
              </div>
            </div>
          ))}
          {producerTalent.length === 0 && <div className="producer-empty-copy">No talent in current filter.</div>}
        </div>
      </div>

      <div className="producer-rail-group">
        <div className="producer-rail-label">Story Hooks</div>
        <div className="producer-mini-list">
          {producerStories.map((story) => (
            <div key={story.id} className="producer-mini-row">
              <div>
                <div className="producer-mini-title">{story.name}</div>
                <div className="producer-mini-meta">{story.type} - {story.status}</div>
              </div>
            </div>
          ))}
          {producerStories.length === 0 && <div className="producer-empty-copy">No active stories available.</div>}
        </div>
      </div>

      <div className="producer-rail-group">
        <div className="producer-rail-label">Belts In Orbit</div>
        <div className="producer-mini-list">
          {producerTitles.map((title) => (
            <div key={title.id} className="producer-mini-row">
              <div>
                <div className="producer-mini-title">{title.name}</div>
                <div className="producer-mini-meta">{getTitleType(title)}</div>
              </div>
            </div>
          ))}
          {producerTitles.length === 0 && <div className="producer-empty-copy">No compatible titles in this filter.</div>}
        </div>
      </div>
    </>
  )
}
