import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { domainOf, nightsBetween, nightsOf, normaliseEmail } from './booking'

// The caretakers keep two allowlists: whole domains and individual addresses. An account whose
// address matches neither cannot read or write anything (see firestore.rules).
export function subscribeToAllowlist(kind, onChange, onError) {
  return onSnapshot(
    query(collection(db, kind === 'domain' ? 'allowedDomains' : 'allowedEmails')),
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}

export function allowEntry(user, kind, value) {
  const path = kind === 'domain' ? 'allowedDomains' : 'allowedEmails'
  return setDoc(doc(db, path, normaliseEmail(value)), {
    addedBy: user.email,
    addedAt: serverTimestamp(),
  })
}

export function revokeEntry(kind, value) {
  const path = kind === 'domain' ? 'allowedDomains' : 'allowedEmails'
  return deleteDoc(doc(db, path, normaliseEmail(value)))
}

// Each account may read its own two allowlist entries, so the app can say why it is locked out.
export async function hasAccess(user) {
  const email = normaliseEmail(user.email)
  const [byEmail, byDomain] = await Promise.all([
    getDoc(doc(db, 'allowedEmails', email)),
    getDoc(doc(db, 'allowedDomains', domainOf(email))),
  ])
  return byEmail.exists() || byDomain.exists()
}

// Dates and the booking name live in `bookings`, readable by anyone with an account; email addresses
// and notes live in `bookingDetails`, readable only by the guest and the caretakers.
function publicFields(form) {
  return {
    guestName: form.guestName,
    startDate: form.startDate,
    endDate: form.endDate,
    nights: nightsBetween(form.startDate, form.endDate),
    guests: Number(form.guests),
    todo: Boolean(form.todo),
  }
}

function privateFields(form) {
  return {
    notes: form.notes ?? '',
  }
}

export function subscribeToBookings(onChange, onError) {
  const q = query(collection(db, 'bookings'), orderBy('startDate'))
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}

export function subscribeToBookingDetails(user, isAdmin, onChange, onError) {
  const details = collection(db, 'bookingDetails')
  const q = isAdmin ? query(details) : query(details, where('uid', '==', user.uid))
  return onSnapshot(
    q,
    (snapshot) => {
      const byBooking = {}
      snapshot.docs.forEach((d) => {
        byBooking[d.id] = d.data()
      })
      onChange(byBooking)
    },
    onError,
  )
}

export function subscribeToCommentDetails(user, isAdmin, onChange, onError) {
  const details = collection(db, 'commentDetails')
  const q = isAdmin ? query(details) : query(details, where('uid', '==', user.uid))
  return onSnapshot(
    q,
    (snapshot) => {
      const byComment = {}
      snapshot.docs.forEach((d) => {
        byComment[d.id] = d.data()
      })
      onChange(byComment)
    },
    onError,
  )
}

export function subscribeToComments(onChange, onError) {
  const q = query(collection(db, 'comments'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}

// Each booked night is also its own document in `nights`, keyed by the date. The rules refuse to
// overwrite one, so a batch that tries to claim a night somebody else holds fails as a whole:
// two bookings can never overlap, whatever the client does.
function claimNights(batch, dates, uid, bookingId) {
  dates.forEach((date) => batch.set(doc(db, 'nights', date), { uid, bookingId }))
}

function releaseNights(batch, dates) {
  dates.forEach((date) => batch.delete(doc(db, 'nights', date)))
}

function heldNights(booking) {
  return booking.status === 'cancelled' ? [] : nightsOf(booking)
}

export function createBooking(user, form) {
  const bookingRef = doc(collection(db, 'bookings'))
  const batch = writeBatch(db)
  batch.set(bookingRef, {
    ...publicFields(form),
    uid: user.uid,
    status: 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(doc(db, 'bookingDetails', bookingRef.id), {
    ...privateFields(form),
    uid: user.uid,
    email: user.email,
    updatedAt: serverTimestamp(),
  })
  claimNights(batch, nightsOf(form), user.uid, bookingRef.id)
  return batch.commit()
}

export function updateBooking(booking, form) {
  const before = heldNights(booking)
  const after = nightsOf(form)
  const batch = writeBatch(db)
  batch.update(doc(db, 'bookings', booking.id), {
    ...publicFields(form),
    status: 'confirmed',
    updatedAt: serverTimestamp(),
  })
  batch.set(doc(db, 'bookingDetails', booking.id), {
    ...privateFields(form),
    uid: booking.uid,
    email: booking.email,
    updatedAt: serverTimestamp(),
  })
  releaseNights(batch, before.filter((date) => !after.includes(date)))
  claimNights(
    batch,
    after.filter((date) => !before.includes(date)),
    booking.uid,
    booking.id,
  )
  return batch.commit()
}

export function cancelBooking(booking) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'bookings', booking.id), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  })
  releaseNights(batch, heldNights(booking))
  return batch.commit()
}

export function reinstateBooking(booking) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'bookings', booking.id), {
    status: 'confirmed',
    updatedAt: serverTimestamp(),
  })
  claimNights(batch, nightsOf(booking), booking.uid, booking.id)
  return batch.commit()
}

export function deleteBooking(booking) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'bookings', booking.id))
  batch.delete(doc(db, 'bookingDetails', booking.id))
  releaseNights(batch, heldNights(booking))
  return batch.commit()
}

// Comments show a name, never an email address: the address goes in `commentDetails`, which only
// the commenter and the caretakers can read.
export function displayNameFor(user) {
  return user.displayName?.trim() || user.email.split('@')[0]
}

export function createComment(user, { bookingId, stayDates, rating, body }) {
  const commentRef = doc(collection(db, 'comments'))
  const batch = writeBatch(db)
  batch.set(commentRef, {
    uid: user.uid,
    name: displayNameFor(user),
    bookingId: bookingId ?? '',
    stayDates: stayDates ?? '',
    rating: Number(rating),
    body,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'commentDetails', commentRef.id), { uid: user.uid, email: user.email })
  return batch.commit()
}

export function deleteComment(commentId) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'comments', commentId))
  batch.delete(doc(db, 'commentDetails', commentId))
  return batch.commit()
}
