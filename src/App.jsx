import { useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase'
import { LONG_STAY_MESSAGE, isPrivileged, today } from './lib/booking'
import {
  hasAccess,
  subscribeToBookingDetails,
  subscribeToBookings,
  subscribeToCommentDetails,
  subscribeToComments,
} from './lib/db'
import AccessGate from './components/AccessGate'
import AllowlistPanel from './components/AllowlistPanel'
import AuthPanel from './components/AuthPanel'
import BookingForm from './components/BookingForm'
import BookingList from './components/BookingList'
import Calendar from './components/Calendar'
import Comments from './components/Comments'
import Modal from './components/Modal'
import './App.css'

function TopBar() {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <span className="wordmark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 22c0-6 1.6-9.8 4.6-12.4C13.2 10 10.8 12.2 9.6 15.3 8.3 13 8 10.4 8.8 7.6 5.7 9.8 4 12.7 4 16a8 8 0 0 0 6.9 5.9V22Zm2-11.6c1.7-3 4.4-5 6-5.4-.7 2.7-2.6 4.9-6 5.4Z" />
          </svg>
          Cow Bay airstrip nursery house
        </span>
        <nav>
          <a href="#calendar">Availability</a>
          <a href="#book">Book</a>
          <a href="#comments">Comments</a>
        </nav>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <header className="hero">
      <img src="/images/rainforest-hero.jpg" alt="Rainforest canopy in the Daintree, far north Queensland" />
      <div className="hero-text">
        <p className="eyebrow">Cow Bay · Daintree · far north Queensland</p>
        <h1>Cow Bay airstrip nursery house</h1>
        <p className="hero-lede">
          A house in the rainforest, on a nursery. Check the calendar, then book your dates.
        </p>
        <div className="hero-actions">
          <a className="button" href="#book">
            Book your stay
          </a>
          <a className="button quiet" href="#calendar">
            See availability
          </a>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>Cow Bay airstrip nursery house</span>
        <span>Stays longer than 3 weeks are arranged with the caretakers.</span>
      </div>
    </footer>
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
      <p className="credit">
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
  const [publicComments, setPublicComments] = useState([])
  const [commentDetails, setCommentDetails] = useState({})
  const [access, setAccess] = useState('none')
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

  const isAdmin = isPrivileged(user?.email)

  // 'none' → signed out, 'unverified' → email not confirmed, 'denied' → not on the caretakers'
  // allowlist, 'allowed' → may use the site. Nothing is read from Firestore until 'allowed'.
  const checkAccess = useCallback(async () => {
    if (!isFirebaseConfigured || !auth.currentUser) return setAccess('none')
    const current = auth.currentUser
    setUser(current)
    if (isPrivileged(current.email)) return setAccess('allowed')
    if (!current.emailVerified) return setAccess('unverified')
    setAccess((await hasAccess(current)) ? 'allowed' : 'denied')
  }, [])

  useEffect(() => {
    if (!user) {
      setAccess('none')
      return
    }
    setAccess('checking')
    checkAccess().catch((err) => {
      setDataError(err.message)
      setAccess('denied')
    })
  }, [user, checkAccess])

  const allowed = access === 'allowed'

  // The calendar needs an allowed account, so bookings are only read once there is one.
  useEffect(() => {
    if (!isFirebaseConfigured || !allowed) {
      setPublicBookings([])
      return
    }
    return subscribeToBookings(setPublicBookings, (err) => setDataError(err.message))
  }, [allowed])

  useEffect(() => {
    if (!isFirebaseConfigured || !allowed) {
      setDetails({})
      return
    }
    return subscribeToBookingDetails(user, isAdmin, setDetails, (err) => setDataError(err.message))
  }, [allowed, user, isAdmin])

  useEffect(() => {
    if (!isFirebaseConfigured) return
    return subscribeToComments(setPublicComments, (err) => setDataError(err.message))
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured || !allowed) {
      setCommentDetails({})
      return
    }
    return subscribeToCommentDetails(user, isAdmin, setCommentDetails, (err) =>
      setDataError(err.message),
    )
  }, [allowed, user, isAdmin])

  const onLongStay = useCallback(() => setShowLongStay(true), [])

  const bookings = useMemo(
    () => publicBookings.map((booking) => ({ ...booking, ...(details[booking.id] ?? {}) })),
    [publicBookings, details],
  )
  const comments = useMemo(
    () => publicComments.map((comment) => ({ ...comment, ...(commentDetails[comment.id] ?? {}) })),
    [publicComments, commentDetails],
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
      <>
        <TopBar />
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
        <Footer />
      </>
    )
  }

  return (
    <>
      <TopBar />
      <main className="page">
        <Hero />

        {dataError && <p className="error">{dataError}</p>}

        <Gallery />

        {allowed ? (
          <Calendar bookings={publicBookings} uid={user?.uid} />
        ) : (
          <section className="card" id="calendar">
            <h2>Who is in the house</h2>
            <p className="muted">
              The calendar is for guests: <a href="#book">create an account or sign in</a> with an address
              the caretakers have allowed to see who has the house and to book your own dates.
            </p>
          </section>
        )}

        {!authReady || access === 'checking' ? (
          <p className="muted">Loading…</p>
        ) : !user ? (
          <AuthPanel />
        ) : !allowed ? (
          <AccessGate user={user} reason={access} onRecheck={checkAccess} />
        ) : (
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

            <section className="card" id="book">
              <h2>Book your stay</h2>
              <p className="muted">
                Stays of up to 3 weeks (21 nights) can be booked here. Longer stays need a quick word
                with the caretakers.
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
              <>
                <BookingList
                  title="All upcoming bookings (caretaker view)"
                  items={upcoming}
                  bookings={bookings}
                  user={user}
                  isAdmin={isAdmin}
                  onLongStay={onLongStay}
                  empty="Nothing booked yet."
                />
                <AllowlistPanel user={user} />
              </>
            )}
          </>
        )}

        <Comments
          user={allowed ? user : null}
          isAdmin={isAdmin}
          comments={comments}
          bookings={myBookings}
        />

        {showLongStay && (
          <Modal title="Longer than 3 weeks" onClose={() => setShowLongStay(false)}>
            <p>{LONG_STAY_MESSAGE}</p>
          </Modal>
        )}
      </main>
      <Footer />
    </>
  )
}
