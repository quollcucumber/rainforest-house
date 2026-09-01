import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test, { after, before } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore'

let env

const guest = { sub: 'guest-1', email: 'guest@example.com', email_verified: true }
const other = { sub: 'guest-2', email: 'other@example.com', email_verified: true }
const caretaker = { sub: 'care-1', email: 'arainforest@greatcactus.org', email_verified: true }

function booking(overrides = {}) {
  return {
    uid: 'guest-1',
    email: 'guest@example.com',
    guestName: 'Guest One',
    startDate: '2030-03-01',
    endDate: '2030-03-08',
    nights: 7,
    guests: 2,
    notes: '',
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rainforest-house',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

after(async () => {
  await env?.cleanup()
})

test('signed-out visitors cannot read bookings but can read comments', async () => {
  const db = env.unauthenticatedContext().firestore()
  await assertFails(getDocs(collection(db, 'bookings')))
  await assertSucceeds(getDocs(collection(db, 'comments')))
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
        email: caretaker.email,
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
  await assertFails(addDoc(collection(db, 'bookings'), booking({ email: other.email })))
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

test('comments may only be posted against your own booking', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'bookings/b3'), booking())
  })
  const db = env.authenticatedContext(guest.sub, guest).firestore()
  const strangerDb = env.authenticatedContext(other.sub, other).firestore()

  const comment = {
    uid: guest.sub,
    email: guest.email,
    bookingId: 'b3',
    stayDates: '2030-03-01 → 2030-03-08',
    rating: 4,
    body: 'Verandah step is loose, otherwise spotless.',
    createdAt: new Date(),
  }

  await assertSucceeds(addDoc(collection(db, 'comments'), comment))
  await assertFails(
    addDoc(collection(strangerDb, 'comments'), { ...comment, uid: other.sub, email: other.email }),
  )
  await assertFails(addDoc(collection(db, 'comments'), { ...comment, rating: 9 }))
})

test('firestore state is reset between suites', async () => {
  await env.clearFirestore()
  assert.ok(true)
})
