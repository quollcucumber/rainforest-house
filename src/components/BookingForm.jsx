import { useEffect, useState } from 'react'
import {
  LONG_STAY_MESSAGE,
  MAX_NIGHTS_WITHOUT_APPROVAL,
  isPrivileged,
  nightsBetween,
  today,
  validateBooking,
} from '../lib/booking'
import { createBooking, updateBooking } from '../lib/db'

function initialForm(booking, user) {
  return {
    guestName: booking?.guestName ?? user.displayName ?? '',
    startDate: booking?.startDate ?? '',
    endDate: booking?.endDate ?? '',
    guests: booking?.guests ?? 2,
    notes: booking?.notes ?? '',
  }
}

export default function BookingForm({ user, bookings, booking, onLongStay, onDone }) {
  const [form, setForm] = useState(() => initialForm(booking, user))
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const nights = nightsBetween(form.startDate, form.endDate)
  const privileged = isPrivileged(user.email)
  const tooLong = nights > MAX_NIGHTS_WITHOUT_APPROVAL && !privileged

  useEffect(() => {
    if (tooLong) onLongStay()
  }, [tooLong, form.startDate, form.endDate, onLongStay])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const problem = validateBooking({
      ...form,
      email: user.email,
      bookings,
      bookingId: booking?.id,
    })
    if (problem) {
      if (problem === LONG_STAY_MESSAGE) onLongStay()
      else setError(problem)
      return
    }
    setError(null)
    setBusy(true)
    try {
      if (booking) await updateBooking(booking.id, form)
      else await createBooking(user, form)
      if (!booking) setForm(initialForm(null, user))
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <div className="row">
        <label>
          Booking name
          <input required value={form.guestName} onChange={(e) => set('guestName', e.target.value)} />
        </label>
        <label>
          Guests
          <input
            type="number"
            min={1}
            max={8}
            required
            value={form.guests}
            onChange={(e) => set('guests', e.target.value)}
          />
        </label>
      </div>
      <div className="row">
        <label>
          Arrival
          <input
            type="date"
            required
            min={today()}
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </label>
        <label>
          Departure
          <input
            type="date"
            required
            min={form.startDate || today()}
            value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </label>
      </div>
      <label>
        Anything we should know? (arrival time, nursery volunteering, accessibility…)
        <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      <p className="muted">
        {nights > 0 ? `${nights} night${nights === 1 ? '' : 's'}` : 'Choose your dates'}
        {privileged && ' · your account may book any length of stay'}
      </p>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy || tooLong}>
        {booking ? 'Save changes' : 'Request booking'}
      </button>
    </form>
  )
}
