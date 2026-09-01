import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { nightsBetween } from './booking'

export function subscribeToBookings(onChange, onError) {
  const q = query(collection(db, 'bookings'), orderBy('startDate'))
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
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

export function createBooking(user, form) {
  return addDoc(collection(db, 'bookings'), {
    uid: user.uid,
    email: user.email,
    guestName: form.guestName,
    startDate: form.startDate,
    endDate: form.endDate,
    nights: nightsBetween(form.startDate, form.endDate),
    guests: Number(form.guests),
    notes: form.notes ?? '',
    status: 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function updateBooking(bookingId, form) {
  return updateDoc(doc(db, 'bookings', bookingId), {
    guestName: form.guestName,
    startDate: form.startDate,
    endDate: form.endDate,
    nights: nightsBetween(form.startDate, form.endDate),
    guests: Number(form.guests),
    notes: form.notes ?? '',
    updatedAt: serverTimestamp(),
  })
}

export function cancelBooking(bookingId) {
  return updateDoc(doc(db, 'bookings', bookingId), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  })
}

export function reinstateBooking(bookingId) {
  return updateDoc(doc(db, 'bookings', bookingId), {
    status: 'confirmed',
    updatedAt: serverTimestamp(),
  })
}

export function deleteBooking(bookingId) {
  return deleteDoc(doc(db, 'bookings', bookingId))
}

export function createComment(user, { bookingId, stayDates, rating, body }) {
  return addDoc(collection(db, 'comments'), {
    uid: user.uid,
    email: user.email,
    bookingId,
    stayDates,
    rating: Number(rating),
    body,
    createdAt: serverTimestamp(),
  })
}

export function deleteComment(commentId) {
  return deleteDoc(doc(db, 'comments', commentId))
}
