import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LONG_STAY_MESSAGE,
  isPrivileged,
  nightsBetween,
  overlaps,
  validateBooking,
} from './booking.js'

function futureDate(offsetDays) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)
}

const base = { guests: 2, bookings: [], email: 'guest@example.com' }

test('nightsBetween counts nights', () => {
  assert.equal(nightsBetween('2026-03-01', '2026-03-08'), 7)
  assert.equal(nightsBetween('2026-03-01', '2026-03-01'), 0)
})

test('caretaker emails are privileged, case-insensitively', () => {
  assert.ok(isPrivileged('arainforest@greatcactus.org'))
  assert.ok(isPrivileged('VRainforest@GreatCactus.org'))
  assert.ok(!isPrivileged('guest@greatcactus.org'))
})

test('21 nights is allowed for a guest', () => {
  assert.equal(
    validateBooking({ ...base, startDate: futureDate(1), endDate: futureDate(22) }),
    null,
  )
})

test('22 nights asks a guest to get in touch', () => {
  assert.equal(
    validateBooking({ ...base, startDate: futureDate(1), endDate: futureDate(23) }),
    LONG_STAY_MESSAGE,
  )
})

test('caretakers may book any length', () => {
  assert.equal(
    validateBooking({
      ...base,
      email: 'rainforest@greatcactus.org',
      startDate: futureDate(1),
      endDate: futureDate(200),
    }),
    null,
  )
})

test('clashing dates are rejected, cancelled bookings are ignored', () => {
  const existing = {
    id: 'a',
    startDate: futureDate(5),
    endDate: futureDate(10),
    status: 'confirmed',
  }
  const clash = validateBooking({
    ...base,
    bookings: [existing],
    startDate: futureDate(8),
    endDate: futureDate(12),
  })
  assert.match(clash, /clash/)

  assert.equal(
    validateBooking({
      ...base,
      bookings: [{ ...existing, status: 'cancelled' }],
      startDate: futureDate(8),
      endDate: futureDate(12),
    }),
    null,
  )

  assert.equal(
    validateBooking({
      ...base,
      bookings: [existing],
      startDate: futureDate(10),
      endDate: futureDate(12),
    }),
    null,
    'a checkout day may be another guest’s arrival day',
  )
})

test('editing a booking does not clash with itself', () => {
  const existing = {
    id: 'a',
    startDate: futureDate(5),
    endDate: futureDate(10),
    status: 'confirmed',
  }
  assert.equal(
    validateBooking({
      ...base,
      bookings: [existing],
      bookingId: 'a',
      startDate: futureDate(6),
      endDate: futureDate(11),
    }),
    null,
  )
})

test('past and reversed dates are rejected', () => {
  assert.match(
    validateBooking({ ...base, startDate: futureDate(-3), endDate: futureDate(2) }),
    /past/,
  )
  assert.match(
    validateBooking({ ...base, startDate: futureDate(5), endDate: futureDate(3) }),
    /after the arrival/,
  )
})

test('overlaps treats stays as half-open ranges', () => {
  assert.ok(overlaps({ startDate: '2026-01-01', endDate: '2026-01-05' }, { startDate: '2026-01-04', endDate: '2026-01-06' }))
  assert.ok(!overlaps({ startDate: '2026-01-01', endDate: '2026-01-05' }, { startDate: '2026-01-05', endDate: '2026-01-07' }))
})
