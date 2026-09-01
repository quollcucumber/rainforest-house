import { useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase'
import { LONG_STAY_MESSAGE, isPrivileged, today } from './lib/booking'
import { subscribeToBookingDetails, subscribeToBookings, subscribeToComments } from './lib/db'
import AuthPanel from './components/AuthPanel'
import BookingForm from './components/BookingForm'
import BookingList from './components/BookingList'
import Calendar from './components/Calendar'
import Comments from './components/Comments'
import Modal from './components/Modal'
import './App.css'

function Hero() {
  return (
    <header className="hero">
      <img src="/images/rainforest-hero.jpg" alt="Rainforest canopy in the Daintree, far north Queensland" />
      <div className="hero-text">
        <p className="eyebrow">Bookings</p>
        <h1>Cow Bay airstrip nursery house</h1>
        <p>A house in the rainforest, on a nursery. Check the calendar, then book your dates.</p>
      </div>
    </header>
  )
}

function Gallery() {
  return (
    <section className="card gallery">
      <h2>The rainforest around Cow Bay</h2>
      <div className="gallery-grid">
        <figure>
          <img src="/images/rainforest-creek.jpg" alt="A shallow creek running through dense Daintree rainforest" />
        </figure>
        <figure>
          <img
            src="/images/rainforest-understorey.jpg"
            alt="Palms and slender trunks in the Daintree rainforest understorey"
          />
        </figure>
      </div>
      <p className="muted">
        Photographs of the Daintree rainforest, far north Queensland — public domain (CC0) via Wikimedia
        Commons. They show the surrounding rainforest, not the house itself.
      </p>
    </section>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [publicBookings, setPublicBookings] = useState([])
  const [details, setDetails] = useState({})
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
    if (!isFirebaseConfigured) return
    return subscribeToBookings(setPublicBookings, (err) => setDataError(err.message))
  }, [])

  const isAdmin = isPrivileged(user?.email)

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setDetails({})
      return
    }
    return subscribeToBookingDetails(user, isAdmin, setDetails, (err) => setDataError(err.message))
  }, [user, isAdmin])

  useEffect(() => {
    if (!isFirebaseConfigured) return
    return subscribeToComments(setComments, (err) => setDataError(err.message))
  }, [])

  const onLongStay = useCallback(() => setShowLongStay(true), [])

  const bookings = useMemo(
    () => publicBookings.map((booking) => ({ ...booking, ...(details[booking.id] ?? {}) })),
    [publicBookings, details],
  )
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

      <Gallery />

      <Calendar bookings={publicBookings} uid={user?.uid} />

      {!authReady ? (
        <p className="muted">Loading…</p>
      ) : user ? (
        <>
          <section className="card account">
            <div>
              Signed in as <strong>{user.displayName || user.email}</strong>
              {isAdmin && <span className="badge">caretaker</span>}
            </div>
            <button type="button" className="ghost" onClick={() => signOut(auth)}>
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

          {isAdmin && (
            <BookingList
              title="All upcoming bookings (caretaker view)"
              items={upcoming}
              bookings={bookings}
              user={user}
              isAdmin={isAdmin}
              onLongStay={onLongStay}
              empty="Nothing booked yet."
            />
          )}
        </>
      ) : (
        <AuthPanel />
      )}

      <Comments user={user} isAdmin={isAdmin} comments={comments} bookings={myBookings} />

      {showLongStay && (
        <Modal title="Longer than 3 weeks" onClose={() => setShowLongStay(false)}>
          <p>{LONG_STAY_MESSAGE}</p>
        </Modal>
      )}
    </main>
  )
}
