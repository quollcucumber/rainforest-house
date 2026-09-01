export const MAX_NIGHTS_WITHOUT_APPROVAL = 21

export const LONG_STAY_MESSAGE =
  'To make a booking over 3 weeks, please contact arainforest@greatcactus.org or vrainforest@greatcactus.org'

export const PRIVILEGED_EMAILS = [
  'rainforest@greatcactus.org',
  'vrainforest@greatcactus.org',
  'arainforest@greatcactus.org',
]

export function isPrivileged(email) {
  return Boolean(email) && PRIVILEGED_EMAILS.includes(email.toLowerCase())
}

export function nightsBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.round((end - start) / 86400000)
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function overlaps(a, b) {
  return a.startDate < b.endDate && b.startDate < a.endDate
}

export function addDays(date, days) {
  const at = new Date(`${date}T00:00:00Z`)
  at.setUTCDate(at.getUTCDate() + days)
  return at.toISOString().slice(0, 10)
}

// The nights a booking occupies: arrival up to, but not including, the departure day.
export function nightsOf(booking) {
  const nights = []
  for (let date = booking.startDate; date < booking.endDate; date = addDays(date, 1)) {
    nights.push(date)
  }
  return nights
}

export function bookedNights(bookings) {
  const taken = new Set()
  bookings
    .filter((booking) => booking.status !== 'cancelled')
    .forEach((booking) => nightsOf(booking).forEach((date) => taken.add(date)))
  return taken
}

export function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1))
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const blanks = Array.from({ length: first.getUTCDay() }, () => null)
  const dates = Array.from({ length: days }, (_unused, index) =>
    new Date(Date.UTC(year, month, index + 1)).toISOString().slice(0, 10),
  )
  return [...blanks, ...dates]
}

export function validateBooking({ startDate, endDate, guests, email, bookings, bookingId }) {
  if (!startDate || !endDate) return 'Pick both an arrival and a departure date.'

  const nights = nightsBetween(startDate, endDate)
  if (nights < 1) return 'The departure date must be after the arrival date.'
  if (startDate < today()) return 'Arrival date cannot be in the past.'
  if (!guests || guests < 1) return 'At least one guest is required.'
  if (guests > 8) return 'A booking can be for at most 8 guests.'
  if (nights > MAX_NIGHTS_WITHOUT_APPROVAL && !isPrivileged(email)) return LONG_STAY_MESSAGE

  const clash = bookings.find(
    (booking) =>
      booking.id !== bookingId &&
      booking.status !== 'cancelled' &&
      overlaps({ startDate, endDate }, booking),
  )
  if (clash) return `Those dates clash with an existing booking (${clash.startDate} → ${clash.endDate}).`

  return null
}
