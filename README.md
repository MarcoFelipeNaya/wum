# Heat: Wrestling Booker

A React app to book and manage a wrestling universe with roster control, branded shows, calendar booking, stories, tournaments, and championships.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```text
src/
  components/
    Nav.jsx / Nav.css         - top navigation bar
    Dashboard.jsx / .css      - stats overview
    Roster.jsx / .css         - wrestler management
    Shows.jsx                 - brands and show management
    Calendar.jsx / .css       - 4-week booking calendar
    Titles.jsx / .css         - championship management
    Modal.jsx                 - reusable modal wrapper
  hooks/
    useToast.js               - toast notification hook
  utils/
    dates.js                  - calendar date helpers
  styles/
    global.css                - design system and global styles
  store.js                    - app state (useStore hook)
  App.jsx / App.css           - root component
  main.jsx                    - entry point
```

## Features

- Dashboard with champions, live universe stats, ratings, and current card visibility
- Roster management for wrestlers and managers
- Shows, special events, factions, teams, and trios
- Calendar booking with mixed match/segment cards, drag reorder, stories, and results
- Championships with lineage, modal detail views, and tag/trios support
- Story and rivalry tracking with segments and tale-of-the-tape
- Tournament brackets that book directly to the calendar
- IndexedDB-backed saves with export/import and autosave recovery
