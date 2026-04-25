import React from 'react'
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiDatabase,
  FiLayout,
  FiTv,
  FiUsers,
  FiZap,
} from 'react-icons/fi'
import { HiOutlineUserGroup } from 'react-icons/hi'
import { TbTournament } from 'react-icons/tb'
import './Nav.css'

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: FiLayout },
  { id: 'roster', label: 'Roster', icon: FiUsers },
  { id: 'factions', label: 'Factions', icon: HiOutlineUserGroup },
  { id: 'shows', label: 'Shows', icon: FiTv },
  { id: 'rankings', label: 'Rankings', icon: FiBarChart2 },
  { id: 'records', label: 'Records', icon: FiActivity },
  { id: 'calendar', label: 'Calendar', icon: FiCalendar },
  { id: 'tournaments', label: 'Tournaments', icon: TbTournament },
  { id: 'titles', label: 'Titles', icon: FiAward },
  { id: 'stories', label: 'Stories', icon: FiBookOpen },
  { id: 'creative', label: 'HeatSpark', icon: FiZap },
  { id: 'data', label: 'Data', icon: FiDatabase },
]

export default function Nav({ current, onNavigate }) {
  return (
    <nav className="nav-sidebar">
      <div className="nav-sidebar-brand">
        <div className="nav-sidebar-logo">
          <img src="/heat-logo-trans.png" alt="Heat" />
        </div>
        <h1 className="nav-sidebar-title">Heat</h1>
      </div>
      
      <div className="nav-sidebar-links">
        {PAGES.map((p) => {
          const Icon = p.icon
          return (
            <button
              type="button"
              key={p.id}
              className={`nav-sidebar-btn${current === p.id ? ' active' : ''}`}
              onClick={() => onNavigate(p.id)}
              title={p.label}
            >
              <span className="nav-sidebar-icon">
                <Icon />
              </span>
              <span className="nav-sidebar-label">{p.label}</span>
            </button>
          )
        })}
      </div>

      <div className="nav-sidebar-footer">
        <div className="nav-sidebar-version">v1.2.0 Heat Spark</div>
      </div>
    </nav>
  )
}
