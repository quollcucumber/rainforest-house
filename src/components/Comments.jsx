import { useState } from 'react'
import { createComment, deleteComment } from '../lib/db'
import { stayHasEnded } from '../lib/booking'

function Stars({ rating }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  )
}

export default function Comments({ user, isAdmin, comments, bookings }) {
  const finishedStays = bookings.filter(
    (booking) => booking.uid === user?.uid && stayHasEnded(booking),
  )
  const unreviewed = finishedStays.filter(
    (booking) => !comments.some((comment) => comment.bookingId === booking.id),
  )

  const [bookingId, setBookingId] = useState('')
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const booking = unreviewed.find((item) => item.id === bookingId) ?? unreviewed[0]
    if (!booking) return
    setBusy(true)
    setError(null)
    try {
      await createComment(user, {
        bookingId: booking.id,
        stayDates: `${booking.startDate} → ${booking.endDate}`,
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
        Left by guests after their stay: what was in good order, what needs fixing, and how the nursery
        was looking.
      </p>

      {user && (
        <>
          {unreviewed.length > 0 ? (
            <form className="comment-form" onSubmit={handleSubmit}>
              <label>
                Which stay?
                <select value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
                  {unreviewed.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.startDate} → {booking.endDate}
                    </option>
                  ))}
                </select>
              </label>
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
            <p className="muted">
              {finishedStays.length > 0
                ? 'Thanks — you have commented on all of your past stays.'
                : 'You can leave a comment here once your stay has finished.'}
            </p>
          )}
        </>
      )}

      {comments.length === 0 ? (
        <p className="muted">No comments yet.</p>
      ) : (
        <ul className="comments">
          {comments.map((comment) => (
            <li key={comment.id}>
              <div className="comment-head">
                <strong>{comment.email}</strong>
                <Stars rating={comment.rating} />
                <span className="muted">stayed {comment.stayDates}</span>
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
