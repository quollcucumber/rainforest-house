import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test, { after, before } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

let env

const guest = { sub: 'guest-1', email: 'guest@example.com', email_verified: true }
const other = { sub: 'guest-2', email: 'other@example.com', email_verified: true }
const caretaker = { sub: 'care-1', email: 'arainforest@greatcactus.org', email_verified: true }
// example.com is on the domain allowlist (seeded below); the others are not, or are unconfirmed.
const unverified = { sub: 'guest-1', email: 'guest@example.com', email_verified: false }
const outsider = { sub: 'guest-3', email: 'nobody@elsewhere.org', email_verified: true }
const named = { sub: 'guest-4', email: 'named@elsewhere.org', email_verified: true }

function booking(overrides = {}) {
  return {
    uid: 'guest-1',
    guestName: 'Guest One',
    startDate: '2030-03-01',
    endDate: '2030-03-08',
    nights: 7,
    guests: 2,
    todo: false,
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function details(overrides = {}) {
  return {
    uid: 'guest-1',
    email: 'guest@example.com',
    notes: '',
    updatedAt: new Date(),
    ...overrides,
  }
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rainforest-house',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
  await seedAllowlist()
})

async function seedAllowlist() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'allowedDomains/example.com'), { addedBy: caretaker.email })
    await setDoc(doc(db, 'allowedEmails/named@elsewhere.org'), { addedBy: caretaker.email })
  })
}

after(async () => {
  await env?.cleanup()
})

test('the calendar and the comments need an allowed, confirmed account', async () => {
  const anon = env.unauthenticatedContext().firestore()
  const db = env.authenticatedContext(guest.sub, guest).firestore()
  await assertFails(getDocs(collection(anon, 'bookings')))
  await assertFails(getDocs(collection(anon, 'nights')))
  await assertSucceeds(getDocs(collection(db, 'bookings')))
  await assertSucceeds(getDocs(collection(db, 'nights')))
  await assertFails(getDocs(collection(anon, 'comments')))
  await assertSucceeds(getDocs(collection(db, 'comments')))
})

test('only allowed addresses or domains may use the site, and only once confirmed', async () => {
  const byDomain = env.authenticatedContext(guest.sub, guest).firestore()
  const byAddress = env.authenticatedContext(named.sub, named).firestore()
  const notConfirmed = env.authenticatedContext(unverified.sub, unverified).firestore()
  const notAllowed = env.authenticatedContext(outsider.sub, outsider).firestore()

  await assertSucceeds(getDocs(collection(byDomain, 'bookings')))
  await assertSucceeds(getDocs(collection(byAddress, 'bookings')))
  await assertFails(getDocs(collection(notConfirmed, 'bookings')))
  await assertFails(getDocs(collection(notAllowed, 'bookings')))

  await assertFails(addDoc(collection(notAllowed, 'bookings'), booking({ uid: outsider.sub })))
  await assertFails(
    addDoc(collection(notConfirmed, 'bookings'), booking({ startDate: '2032-01-01', endDate: '2032-01-03', nights: 2 })),
  )
})

test('only caretakers change the allowlist; everybody else sees just their own entry', async () => {
  const admin = env.authenticatedContext(caretaker.sub, caretaker).firestore()
  const db = env.authenticatedContext(guest.sub, guest).firestore()
  const anon = env.unauthenticatedContext().firestore()

  await assertSucceeds(setDoc(doc(admin, 'allowedEmails/friend@elsewhere.org'), { addedBy: caretaker.email }))
  await assertSucceeds(deleteDoc(doc(admin, 'allowedEmails/friend@elsewhere.org')))
  await assertSucceeds(getDocs(collection(admin, 'allowedEmails')))

  await assertFails(setDoc(doc(db, 'allowedEmails/guest@example.com'), { addedBy: guest.email }))
  await assertFails(setDoc(doc(db, 'allowedDomains/example.com'), { addedBy: guest.email }))
  await assertFails(getDocs(collection(db, 'allowedEmails')))
  await assertFails(getDoc(doc(db, 'allowedEmails/named@elsewhere.org')))
  await assertSucceeds(getDoc(doc(db, 'allowedDomains/example.com')))
  await assertSucceeds(getDoc(doc(db, 'allowedEmails/guest@example.com')))
  await assertFails(getDoc(doc(anon, 'allowedDomains/example.com')))

  await seedAllowlist()
})

test('booking names are visible to guests, emails and notes are not', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'bookingDetails/d1'), details())
  })
  const anon = env.unauthenticatedContext().firestore()
  const stranger = env.authenticatedContext(other.sub, other).firestore()
  const owner = env.authenticatedContext(guest.sub, guest).firestore()
  const admin = env.authenticatedContext(caretaker.sub, caretaker).firestore()

  await assertFails(getDoc(doc(anon, 'bookings/d1')))
  await assertFails(getDoc(doc(anon, 'bookingDetails/d1')))
  await assertFails(getDoc(doc(stranger, 'bookingDetails/d1')))
  await assertSucceeds(getDoc(doc(owner, 'bookingDetails/d1')))
  await assertSucceeds(getDocs(query(collection(owner, 'bookingDetails'), where('uid', '==', guest.sub))))
  await assertSucceeds(getDocs(collection(admin, 'bookingDetails')))

  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'bookings/named'), booking())
  })
  const named = await getDoc(doc(stranger, 'bookings/named'))
  assert.equal(named.data().guestName, 'Guest One')
})

test('a booking must carry a name', async () => {
  const db = env.authenticatedContext(guest.sub, guest).firestore()
  await assertFails(addDoc(collection(db, 'bookings'), booking({ guestName: '' })))
  await assertFails(addDoc(collection(db, 'bookings'), booking({ guestName: 'x'.repeat(121) })))
})

test('a guest can create a stay of 21 nights but not 22', async () => {
  const db = env.authenticatedContext(guest.sub, guest).firestore()
  await assertSucceeds(
    addDoc(collection(db, 'bookings'), booking({ startDate: '2030-03-01', endDate: '2030-03-22', nights: 21 })),
  )
  await assertFails(
    addDoc(collection(db, 'bookings'), booking({ startDate: '2030-05-01', endDate: '2030-05-23', nights: 22 })),
  )
})

test('a caretaker can create a stay of any length', async () => {
  const db = env.authenticatedContext(caretaker.sub, caretaker).firestore()
  await assertSucceeds(
    addDoc(
      collection(db, 'bookings'),
      booking({
        uid: caretaker.sub,
        startDate: '2031-01-01',
        endDate: '2031-06-01',
        nights: 151,
      }),
    ),
  )
})

test('a guest cannot book in somebody else’s name', async () => {
  const db = env.authenticatedContext(guest.sub, guest).firestore()
  await assertFails(addDoc(collection(db, 'bookings'), booking({ uid: other.sub })))
  await assertFails(
    setDoc(doc(db, 'bookingDetails/x1'), details({ uid: other.sub, email: other.email })),
  )
})

test('a booked night cannot be claimed twice, even by the same guest', async () => {
  const db = env.authenticatedContext(guest.sub, guest).firestore()
  const stranger = env.authenticatedContext(other.sub, other).firestore()

  await assertSucceeds(
    setDoc(doc(db, 'nights/2030-07-01'), { uid: guest.sub, bookingId: 'b-first' }),
  )
  await assertFails(
    setDoc(doc(stranger, 'nights/2030-07-01'), { uid: other.sub, bookingId: 'b-second' }),
  )
  await assertFails(setDoc(doc(db, 'nights/2030-07-01'), { uid: guest.sub, bookingId: 'b-third' }))

  // A batch claiming a run of nights fails as a whole if any single night is taken.
  const batch = writeBatch(stranger)
  batch.set(doc(stranger, 'nights/2030-06-30'), { uid: other.sub, bookingId: 'b-second' })
  batch.set(doc(stranger, 'nights/2030-07-01'), { uid: other.sub, bookingId: 'b-second' })
  await assertFails(batch.commit())
  const spilled = await getDoc(doc(stranger, 'nights/2030-06-30'))
  assert.equal(spilled.exists(), false, 'no night from a rejected batch is written')

  // Freeing the night lets somebody else take it.
  await assertFails(deleteDoc(doc(stranger, 'nights/2030-07-01')))
  await assertSucceeds(deleteDoc(doc(db, 'nights/2030-07-01')))
  await assertSucceeds(
    setDoc(doc(stranger, 'nights/2030-07-01'), { uid: other.sub, bookingId: 'b-second' }),
  )
})

test('guests edit and delete only their own booking; caretakers edit anybody’s', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'bookings/b1'), booking())
  })

  const owner = env.authenticatedContext(guest.sub, guest).firestore()
  const stranger = env.authenticatedContext(other.sub, other).firestore()
  const admin = env.authenticatedContext(caretaker.sub, caretaker).firestore()

  await assertSucceeds(updateDoc(doc(owner, 'bookings/b1'), booking({ guests: 3 })))
  await assertFails(updateDoc(doc(stranger, 'bookings/b1'), booking({ guests: 4 })))
  await assertSucceeds(updateDoc(doc(admin, 'bookings/b1'), booking({ status: 'cancelled' })))
  await assertFails(deleteDoc(doc(stranger, 'bookings/b1')))
  await assertSucceeds(deleteDoc(doc(admin, 'bookings/b1')))
})

test('a guest cannot stretch their own booking past three weeks by editing it', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'bookings/b2'), booking())
  })
  const db = env.authenticatedContext(guest.sub, guest).firestore()
  await assertFails(
    updateDoc(doc(db, 'bookings/b2'), booking({ startDate: '2030-03-01', endDate: '2030-04-30', nights: 60 })),
  )
})

test('anybody signed in may comment at any time, about a stay or not', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'bookings/b3'), booking())
  })
  const db = env.authenticatedContext(guest.sub, guest).firestore()
  const strangerDb = env.authenticatedContext(other.sub, other).firestore()
  const anon = env.unauthenticatedContext().firestore()

  const comment = {
    uid: guest.sub,
    name: 'Guest One',
    bookingId: 'b3',
    stayDates: '2030-03-01 → 2030-03-08',
    rating: 4,
    body: 'Verandah step is loose, otherwise spotless.',
    createdAt: new Date(),
  }

  // An upcoming, unfinished stay can be commented on.
  await assertSucceeds(addDoc(collection(db, 'comments'), comment))
  // So can no stay at all.
  await assertSucceeds(
    addDoc(collection(strangerDb, 'comments'), {
      ...comment,
      uid: other.sub,
      name: 'Guest Two',
      bookingId: '',
      stayDates: '',
    }),
  )
  // But not somebody else's stay, not anonymously, and not with a bogus rating.
  await assertFails(
    addDoc(collection(strangerDb, 'comments'), { ...comment, uid: other.sub, name: 'Guest Two' }),
  )
  await assertFails(addDoc(collection(anon, 'comments'), { ...comment, uid: 'nobody' }))
  await assertFails(addDoc(collection(db, 'comments'), { ...comment, rating: 9 }))
  await assertFails(addDoc(collection(db, 'comments'), { ...comment, email: guest.email }))
})

test('a commenter’s email is readable only by that commenter and the caretakers', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'commentDetails/c1'), {
      uid: guest.sub,
      email: guest.email,
    })
  })
  const anon = env.unauthenticatedContext().firestore()
  const owner = env.authenticatedContext(guest.sub, guest).firestore()
  const stranger = env.authenticatedContext(other.sub, other).firestore()
  const admin = env.authenticatedContext(caretaker.sub, caretaker).firestore()

  await assertFails(getDoc(doc(anon, 'commentDetails/c1')))
  await assertFails(getDoc(doc(stranger, 'commentDetails/c1')))
  await assertSucceeds(getDoc(doc(owner, 'commentDetails/c1')))
  await assertSucceeds(getDocs(collection(admin, 'commentDetails')))

  await assertSucceeds(setDoc(doc(owner, 'commentDetails/c2'), { uid: guest.sub, email: guest.email }))
  await assertFails(setDoc(doc(owner, 'commentDetails/c3'), { uid: guest.sub, email: other.email }))
})

test('firestore state is reset between suites', async () => {
  await env.clearFirestore()
  assert.ok(true)
})
