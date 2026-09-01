import { useState } from 'react'
import { cancelBooking, deleteBooking, reinstateBooking } from '../lib/db'
import BookingForm from './BookingForm'

function Row({ booking, user, canManage, isAdmin, bookings, onLongStay }) {
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
            {booking.guestName || 'Booked'}
            {isAdmin && booking.email ? ` (${booking.email})` : ''}
            {booking.uid === user.uid ? ' · your booking' : ''}
            {booking.status === 'cancelled' ? ' · cancelled' : ''}
            {booking.todo ? ' · TODO' : ''}
          </div>
          {canManage && booking.notes && <p className="notes">{booking.notes}</p>}
        </div>
        {canManage && (
          <div className="actions">
            <button type="button" className="ghost" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Close' : 'Edit'}
            </button>
            {booking.status === 'cancelled' ? (
              <button type="button" onClick={() => run(() => reinstateBooking(booking))}>
                Reinstate
              </button>
            ) : (
              <button type="button" onClick={() => run(() => cancelBooking(booking))}>
                Cancel
              </button>
            )}
            <button type="button" className="danger" onClick={() => run(() => deleteBooking(booking))}>
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
              isAdmin={isAdmin}
              canManage={isAdmin || booking.uid === user.uid}
              onLongStay={onLongStay}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
