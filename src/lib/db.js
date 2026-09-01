import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { nightsBetween, nightsOf } from './booking'

// Dates live in `bookings` (world readable, so the calendar works without an account);
// names, emails and notes live in `bookingDetails`, readable only by the owner and the caretakers.
function publicFields(form) {
  return {
    startDate: form.startDate,
    endDate: form.endDate,
    nights: nightsBetween(form.startDate, form.endDate),
    guests: Number(form.guests),
  }
}

function privateFields(form) {
  return {
    guestName: form.guestName,
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

export function createComment(user, { bookingId, stayDates, rating, body }) {
  return addDoc(collection(db, 'comments'), {
    uid: user.uid,
    email: user.email,
    bookingId: bookingId ?? '',
    stayDates: stayDates ?? '',
    rating: Number(rating),
    body,
    createdAt: serverTimestamp(),
  })
}

export function deleteComment(commentId) {
  return deleteDoc(doc(db, 'comments', commentId))
}
