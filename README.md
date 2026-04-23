# Heat: Wrestling Booker

Heat is a local-first wrestling booking sandbox for building shows, managing stories, tracking championships, running tournaments, and protecting long-running universes.

Run the show. Build the legacy.

## Live Project

- Live app: [heatwb.netlify.app](https://heatwb.netlify.app)
- Installable PWA: available from the hosted app
- Demo universe: loads automatically on a fresh install with fully fictional data

## What Makes Heat Stand Out

- Mixed-card booking calendar with matches and story segments in the same running order
- Singles, tag, and trios title ecosystems with lineage, reign history, and show branding
- Story and rivalry management with tale-of-the-tape, active/concluded tracking, and segment support
- Tournament brackets that book directly into the calendar
- Rankings, records, accolades, match ratings, and dashboard analytics
- Local-first persistence with IndexedDB, autosave recovery, export/import backups, and offline-ready PWA behavior

## Feature Snapshot

### Universe Management

- Roster management for wrestlers and managers
- Brands, weekly shows, and special events
- Teams, trios, factions, and faction leaders
- Fictional demo universe for portfolio/demo use

### Booking & Storytelling

- Match booking with singles, tag, trios, handicap, and tournament support
- Story segments, standalone segments, stipulations, finish types, and match ratings
- Mixed event-card ordering with drag/drop reordering
- Same-day event support for weekly shows and specials

### Competition Systems

- Singles, tag, and trios championships
- Rankings with PRS, win percentage, streak state, and sortable metrics
- Records and accolades for both singles and teams
- Tournament creation, bracket tracking, and calendar booking

### Data Safety

- Primary save state stored in IndexedDB
- Rolling autosave snapshots with restore support
- Full JSON export/import from the `Data` page
- Hosted PWA support with offline/app status visibility

## Tech Stack

- React 18
- Vite 5
- Font Awesome
- IndexedDB for primary persistence
- Netlify for hosting
- PWA manifest + custom service worker

## Demo Universe

Heat ships with a fully fictional demo universe in [public/demo-universe.json](E:\websites\wum\public\demo-universe.json).

It includes:

- 3 original brands
- active champions and title history
- teams, trios, factions, and managers
- active and concluded stories
- special events and tournaments
- current and historical booking data

If a user opens Heat with no existing local save, the app boots into this demo universe automatically.

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

## Netlify Deployment

Heat is configured for Netlify as a Vite single-page app.

Recommended site settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20`

This repo already includes [netlify.toml](E:\websites\wum\netlify.toml) with:

- SPA redirect handling so direct refreshes do not 404
- no-cache headers for `index.html`, `sw.js`, and `site.webmanifest`
- the correct build/publish settings

Deployment flow:

1. Push the current branch to GitHub.
2. In Netlify, choose `Add new site` -> `Import an existing project`.
3. Connect the GitHub repo that contains Heat.
4. Confirm the detected settings match the values above.
5. Deploy the site.

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
  og-cover.svg
  sw.js
  site.webmanifest
  favicon and install icons
```

## Brand Direction

Heat is positioned as a dramatic but polished booking desk for a wrestling universe.

- Visual language: ember orange, flame red, dark arena-night surfaces
- Product voice: sharp, fast, wrestling-native
- Portfolio angle: installable app, persistent saves, demo-ready universe, and deep management systems
