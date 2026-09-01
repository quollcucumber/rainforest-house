import { useState } from 'react'
import { cancelBooking, deleteBooking, reinstateBooking } from '../lib/db'
import BookingForm from './BookingForm'

function Row({ booking, user, canManage, bookings, onLongStay }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)

  async function run(action) {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <li className={booking.status === 'cancelled' ? 'booking cancelled' : 'booking'}>
      <div className="booking-head">
        <div>
          <strong>
            {booking.startDate} → {booking.endDate}
          </strong>
          <span className="muted">
            {' '}
            · {booking.nights} night{booking.nights === 1 ? '' : 's'} · {booking.guests} guest
            {booking.guests === 1 ? '' : 's'}
          </span>
          <div className="muted">
            {canManage ? `${booking.guestName} (${booking.email})` : 'Booked'}
            {booking.uid === user.uid ? ' · your booking' : ''}
            {booking.status === 'cancelled' ? ' · cancelled' : ''}
          </div>
          {canManage && booking.notes && <p className="notes">{booking.notes}</p>}
        </div>
        {canManage && (
          <div className="actions">
            <button type="button" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Close' : 'Edit'}
            </button>
            {booking.status === 'cancelled' ? (
              <button type="button" onClick={() => run(() => reinstateBooking(booking.id))}>
                Reinstate
              </button>
            ) : (
              <button type="button" onClick={() => run(() => cancelBooking(booking.id))}>
                Cancel
              </button>
            )}
            <button type="button" className="danger" onClick={() => run(() => deleteBooking(booking.id))}>
              Delete
            </button>
          </div>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {editing && (
        <BookingForm
          user={user}
          bookings={bookings}
          booking={booking}
          onLongStay={onLongStay}
          onDone={() => setEditing(false)}
        />
      )}
    </li>
  )
}

export default function BookingList({ title, items, bookings, user, isAdmin, onLongStay, empty }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="bookings">
          {items.map((booking) => (
            <Row
              key={booking.id}
              booking={booking}
              user={user}
              bookings={bookings}
              canManage={isAdmin || booking.uid === user.uid}
              onLongStay={onLongStay}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
