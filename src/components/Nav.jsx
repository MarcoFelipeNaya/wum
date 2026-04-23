import React from 'react'
import './Nav.css'


const PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'roster', label: 'Roster' },
  { id: 'factions', label: 'Factions' },
  { id: 'shows', label: 'Shows' },
  { id: 'rankings', label: 'Rankings'},
  { id: 'records', label: 'Records' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'titles', label: 'Titles' },
  { id: 'stories', label: 'Stories'},
  { id: 'data', label: 'Data' },
]

export default function Nav({ current, onNavigate }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="nav-brand-icon">
          <img src="/heat-logo-trans.png" alt="Heat logo" />
        </span>
        <span className="nav-brand-text">Heat</span>
      </div>
      <div className="nav-links">
        {PAGES.map((p) => (
          <button
            key={p.id}
            className={`nav-btn${current === p.id ? ' active' : ''}`}
            onClick={() => onNavigate(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
