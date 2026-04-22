import React, { useState } from 'react'
import Nav from './components/Nav.jsx'
import Dashboard from './components/Dashboard.jsx'
import Roster from './components/Roster.jsx'
import Factions from './components/Factions.jsx'
import Shows from './components/Shows.jsx'
import Rankings from './components/Rankings.jsx'
import Calendar from './components/Calendar.jsx'
import Titles from './components/Titles.jsx'
import Stories from './components/Stories.jsx'
import Data from './components/Data.jsx'
import Tournaments from './components/Tournaments.jsx'
import { useStore } from './store.js'
import { useToast } from './hooks/useToast.js'
import './App.css'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const { toast, showToast } = useToast()
  const store = useStore()
  const { state } = store

  const pageProps = { state, showToast, ...store }

  return (
    <div className="app">
      <Nav current={page} onNavigate={setPage} />

      <main className="app-main">
        {page === 'dashboard' && <Dashboard {...pageProps} />}
        {page === 'roster'    && <Roster    {...pageProps} />}
        {page === 'factions'  && <Factions  {...pageProps} />}
        {page === 'shows'     && <Shows     {...pageProps} />}
        {page === 'rankings'  && <Rankings  {...pageProps} />}
        {page === 'calendar'  && <Calendar  {...pageProps} advanceDay={store.advanceDay} />}
        {page === 'tournaments' && <Tournaments {...pageProps} />}
        {page === 'titles'    && <Titles    {...pageProps} />}
        {page === 'stories'   && <Stories   {...pageProps} />}
        {page === 'data'      && <Data      {...pageProps} />}
      </main>

      <div className={`toast${toast.show ? ' show' : ''}`}>{toast.msg}</div>
    </div>
  )
}
