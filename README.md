# Heat: Wrestling Booker

Heat is a local-first wrestling booking sandbox built with React and Vite.

It is designed as a full universe management tool: book cards, track stories, manage championships, run tournaments, and protect long-running saves with recovery tools.

Run the show. Build the legacy.

## What Heat Includes

- Roster management for wrestlers and managers
- Brand and special event management
- A custom in-universe calendar with mixed match and segment cards
- Story and rivalry tracking with segments and tale-of-the-tape
- Singles, tag, and trios championships with lineage and history
- Tournament brackets that book directly into the calendar
- Rankings, records, accolades, and dashboard reporting
- Import/export backups plus IndexedDB autosave recovery
- A fictional demo universe that loads by default on a fresh install
- Local PWA support for installable app behavior

## Local Development

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Production Preview

```bash
npm run build
npm run preview
```

Use the production preview when testing:

- PWA installability
- service worker behavior
- offline/app-shell updates

The service worker does not register in `npm run dev`.

## Demo Universe

Heat ships with a fully fictional demo universe in [public/demo-universe.json](E:\websites\wum\public\demo-universe.json).

It includes:

- 3 original brands
- active champions and lineage
- teams, trios, factions, and managers
- active and concluded stories
- special events
- tournament data
- current and historical booking data

If a user starts Heat with no existing local save, the app now boots into this demo universe by default.

## Data Safety

Heat is built around local-first save protection:

- primary universe state is stored in IndexedDB
- rolling autosave snapshots are kept for recovery
- full JSON export/import is available from the `Data` page

This makes the app safer for long-running personal universes and also easier to demo in a portfolio context.

## PWA Status

Heat includes a local PWA foundation:

- manifest
- custom service worker
- install prompt handling
- update-ready handling
- offline/app status visibility in the `Data` page

For local testing, use `npm run build` + `npm run preview`.

## Project Structure

```text
src/
  components/
    Dashboard.jsx / Dashboard.css
    Roster.jsx / Roster.css
    Shows.jsx / Shows.css
    Calendar.jsx / Calendar.css
    Titles.jsx / Titles.css
    Stories.jsx / Stories.css
    Factions.jsx / Factions.css
    Rankings.jsx / Rankings.css
    Records.jsx / Records.css
    Tournaments.jsx / Tournaments.css
    Data.jsx / Data.css
    Nav.jsx / Nav.css
    Modal.jsx
  hooks/
    useToast.js
  pwa/
    registerServiceWorker.js
  styles/
    global.css
  utils/
    calendarEvents.js
    dates.js
    matchRatings.js
    persistence.js
    rankings.js
  store.js
  App.jsx / App.css
  main.jsx

public/
  demo-universe.json
  sw.js
  site.webmanifest
  favicon and install icons
```

## Brand Direction

Heat is positioned as a dramatic but polished booking desk for a wrestling universe.

- Visual language: ember orange, flame red, dark arena-night surfaces
- Product voice: sharp, fast, wrestling-native
- Portfolio angle: installable local app, persistent saves, demo-ready universe, and deep management systems
