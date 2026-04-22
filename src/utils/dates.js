export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAYS_PER_MONTH = 28
const MONTHS_PER_YEAR = 12
const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR

function pad2(n) {
  return String(n).padStart(2, '0')
}

function clampMonth(month) {
  return Math.min(12, Math.max(1, month))
}

function clampDay(day) {
  return Math.min(DAYS_PER_MONTH, Math.max(1, day))
}

function toSerial(year, month, day) {
  return year * DAYS_PER_YEAR + (month - 1) * DAYS_PER_MONTH + (day - 1)
}

function fromSerial(serial) {
  const year = Math.floor(serial / DAYS_PER_YEAR)
  const yearRemainder = serial - year * DAYS_PER_YEAR
  const month = Math.floor(yearRemainder / DAYS_PER_MONTH) + 1
  const day = (yearRemainder % DAYS_PER_MONTH) + 1
  return { year, month, day }
}

export function parseDate(str) {
  const match = String(str).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: Math.min(now.getDate(), DAYS_PER_MONTH) }
  }

  return {
    year: parseInt(match[1], 10),
    month: clampMonth(parseInt(match[2], 10)),
    day: clampDay(parseInt(match[3], 10)),
  }
}

export function fmt(input) {
  if (typeof input === 'string') {
    const p = parseDate(input)
    return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
  }

  if (input && typeof input.year === 'number' && typeof input.month === 'number' && typeof input.day === 'number') {
    return `${input.year}-${pad2(clampMonth(input.month))}-${pad2(clampDay(input.day))}`
  }

  if (input instanceof Date) {
    return `${input.getFullYear()}-${pad2(input.getMonth() + 1)}-${pad2(Math.min(input.getDate(), DAYS_PER_MONTH))}`
  }

  return todayStr()
}

export function addDays(input, n) {
  const p = typeof input === 'string' ? parseDate(input) : input
  const next = fromSerial(toSerial(p.year, p.month, p.day) + n)
  return next
}

export function daysBetween(dateA, dateB) {
  const a = parseDate(dateA)
  const b = parseDate(dateB)
  return toSerial(b.year, b.month, b.day) - toSerial(a.year, a.month, a.day)
}

export function getCustomDow(input) {
  const p = typeof input === 'string' ? parseDate(input) : input
  return (p.day - 1) % 7
}

export function getMondayOf(input) {
  const p = typeof input === 'string' ? parseDate(input) : input
  return addDays(p, -getCustomDow(p))
}

export function todayStr() {
  const now = new Date()
  return fmt({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: Math.min(now.getDate(), DAYS_PER_MONTH),
  })
}

export function isToday(input) {
  return fmt(input) === todayStr()
}
