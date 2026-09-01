import { useState } from 'react'
import { createComment, deleteComment } from '../lib/db'

function Stars({ rating }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  )
}

export default function Comments({ user, isAdmin, comments, bookings }) {
  const myBookings = bookings.filter((booking) => booking.status !== 'cancelled')

  const [bookingId, setBookingId] = useState('')
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const booking = myBookings.find((item) => item.id === bookingId)
    setBusy(true)
    setError(null)
    try {
      await createComment(user, {
        bookingId: booking?.id ?? '',
        stayDates: booking ? `${booking.startDate} → ${booking.endDate}` : '',
        rating,
        body: body.trim(),
      })
      setBody('')
      setRating(5)
      setBookingId('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" id="comments">
      <h2>Comments on the state of the house</h2>
      <p className="muted">
        What is in good order, what needs fixing, anything the next guests should know. Anyone with an
        account can post at any time.
      </p>

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          {myBookings.length > 0 && (
            <label>
              About a stay (optional)
              <select value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
                <option value="">Not about a particular stay</option>
                {myBookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.startDate} → {booking.endDate}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            How did you find the house? ({rating}/5)
            <input
              type="range"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            />
          </label>
          <label>
            Your comment
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Condition of the house, anything left broken or running low, notes for the next guests…"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            Post comment
          </button>
        </form>
      ) : (
        <p className="muted">Sign in to leave a comment.</p>
      )}

      {comments.length === 0 ? (
        <p className="muted">No comments yet.</p>
      ) : (
        <ul className="comments">
          {comments.map((comment) => (
            <li key={comment.id}>
              <div className="comment-head">
                <strong>{comment.name || 'Guest'}</strong>
                {isAdmin && comment.email && <span className="muted">{comment.email}</span>}
                <Stars rating={comment.rating} />
                {comment.stayDates && <span className="muted">stayed {comment.stayDates}</span>}
                {(isAdmin || comment.uid === user?.uid) && (
                  <button type="button" className="link danger" onClick={() => deleteComment(comment.id)}>
                    Delete
                  </button>
                )}
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
