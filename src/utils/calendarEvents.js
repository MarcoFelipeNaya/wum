import { DAY_NAMES, fmt, getCustomDow } from './dates.js'

export function buildWeeklyEventId(showId, dateStr) {
  return `weekly:${parseInt(showId, 10)}:${fmt(dateStr)}`
}

export function buildSpecialEventId(specialShowId, dateStr) {
  return `special:${parseInt(specialShowId, 10)}:${fmt(dateStr)}`
}

export function specialShowOccursOnDate(specialShow, dateStr) {
  const safeDate = fmt(dateStr)
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(safeDate)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (specialShow?.type === 'one_off') return specialShow?.oneOffDate === safeDate
  return year >= specialShow?.startYear && month === specialShow?.month && day === specialShow?.day
}

export function getCalendarEventsOnDate(dateStr, shows = [], specialShows = []) {
  const safeDate = fmt(dateStr)
  const weeklyEvents = (shows || [])
    .filter((show) => show.day === DAY_NAMES[getCustomDow(safeDate)])
    .map((show) => ({
      id: buildWeeklyEventId(show.id, safeDate),
      date: safeDate,
      showId: show.id,
      specialShowId: null,
      name: show.name,
      color: show.color,
      day: show.day,
      kind: 'weekly',
      eventType: 'weekly',
      brandName: show.name,
    }))

  const specialEvents = (specialShows || [])
    .filter((specialShow) => specialShowOccursOnDate(specialShow, safeDate))
    .map((specialShow) => {
      const parentShow = (shows || []).find((show) => show.id === specialShow.showId)
      if (!parentShow) return null
      return {
        id: buildSpecialEventId(specialShow.id, safeDate),
        date: safeDate,
        showId: parentShow.id,
        specialShowId: specialShow.id,
        name: specialShow.name,
        color: parentShow.color,
        day: parentShow.day,
        kind: 'special',
        eventType: specialShow.type || 'annual',
        brandName: parentShow.name,
      }
    })
    .filter(Boolean)

  return [...specialEvents, ...weeklyEvents]
}

export function resolveCalendarEventId(eventId, dateStr, shows = [], specialShows = []) {
  const events = getCalendarEventsOnDate(dateStr, shows, specialShows)
  if (events.length === 0) return null
  if (eventId && events.some((event) => event.id === eventId)) return eventId
  return events[0].id
}

export function getDefaultCalendarEventId(dateStr, shows = [], specialShows = []) {
  return resolveCalendarEventId(null, dateStr, shows, specialShows)
}

export function getCalendarEventById(dateStr, eventId, shows = [], specialShows = []) {
  if (!eventId) return null
  return getCalendarEventsOnDate(dateStr, shows, specialShows).find((event) => event.id === eventId) || null
}
