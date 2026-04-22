# Wrestling Universe Manager

A React app to manage your wrestling universe with roster, shows, calendar, and championships.

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

- Roster: add/edit wrestlers with name, show, alignment, and win/loss record
- Shows & Brands: create weekly shows with custom color and day
- Calendar: 4-week rolling calendar, book matches per day, set winners
- Championships: create titles, assign champions, track history
- Dashboard: live stats, recent matches, current champions

## Coming next

- Tag teams and stables
- Stories and rivalries
- Tournament bracket builder
- Simulate button
- Local storage persistence
