import { useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase'
import { LONG_STAY_MESSAGE, isPrivileged, today } from './lib/booking'
import { subscribeToBookings, subscribeToComments } from './lib/db'
import AuthPanel from './components/AuthPanel'
import BookingForm from './components/BookingForm'
import BookingList from './components/BookingList'
import Comments from './components/Comments'
import Modal from './components/Modal'
import './App.css'

function Hero() {
  return (
    <header className="hero">
      <h1>Fern Hollow</h1>
      <p>
        A timber house deep in the rainforest, on a working native plant nursery. Fall asleep to frogs and
        rain on the roof, wake up among the seedling benches.
      </p>
      <ul className="facts">
        <li>Sleeps 8 across three bedrooms</li>
        <li>Wood stove, rainwater tank, off-grid solar</li>
        <li>Nursery walks and propagation days with the growers</li>
        <li>20 minutes of gravel road from the nearest town</li>
      </ul>
    </header>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [bookings, setBookings] = useState([])
  const [comments, setComments] = useState([])
  const [dataError, setDataError] = useState(null)
  const [showLongStay, setShowLongStay] = useState(false)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthReady(true)
      return
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setBookings([])
      return
    }
    return subscribeToBookings(setBookings, (err) => setDataError(err.message))
  }, [user])

  useEffect(() => {
    if (!isFirebaseConfigured) return
    return subscribeToComments(setComments, (err) => setDataError(err.message))
  }, [])

  const onLongStay = useCallback(() => setShowLongStay(true), [])

  const isAdmin = isPrivileged(user?.email)
  const myBookings = useMemo(
    () => bookings.filter((booking) => booking.uid === user?.uid),
    [bookings, user],
  )
  const upcoming = useMemo(
    () => bookings.filter((booking) => booking.endDate >= today() && booking.status !== 'cancelled'),
    [bookings],
  )

  if (!isFirebaseConfigured) {
    return (
      <main className="page">
        <Hero />
        <section className="card">
          <h2>Firebase is not configured yet</h2>
          <p>
            Copy <code>.env.example</code> to <code>.env.local</code> and fill in the config from your
            Firebase project (Project settings → Your apps → Web app), then restart the dev server.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <Hero />

      {dataError && <p className="error">{dataError}</p>}

      {!authReady ? (
        <p className="muted">Loading…</p>
      ) : user ? (
        <>
          <section className="card account">
            <div>
              Signed in as <strong>{user.displayName || user.email}</strong>
              {isAdmin && <span className="badge">caretaker</span>}
            </div>
            <button type="button" onClick={() => signOut(auth)}>
              Sign out
            </button>
          </section>

          <section className="card">
            <h2>Book your stay</h2>
            <p className="muted">
              Stays of up to 3 weeks (21 nights) can be booked here. Longer stays need a quick word with
              the caretakers.
            </p>
            <BookingForm user={user} bookings={bookings} onLongStay={onLongStay} />
          </section>

          <BookingList
            title="Your bookings"
            items={myBookings}
            bookings={bookings}
            user={user}
            isAdmin={isAdmin}
            onLongStay={onLongStay}
            empty="You have no bookings yet."
          />

          <BookingList
            title={isAdmin ? 'All upcoming bookings (caretaker view)' : 'The house is taken on these dates'}
            items={upcoming}
            bookings={bookings}
            user={user}
            isAdmin={isAdmin}
            onLongStay={onLongStay}
            empty="Nothing booked yet — the house is wide open."
          />
        </>
      ) : (
        <AuthPanel />
      )}

      <Comments user={user} isAdmin={isAdmin} comments={comments} bookings={bookings} />

      {showLongStay && (
        <Modal title="Longer than 3 weeks" onClose={() => setShowLongStay(false)}>
          <p>{LONG_STAY_MESSAGE}</p>
        </Modal>
      )}
    </main>
  )
}
