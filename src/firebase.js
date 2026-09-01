import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

export const isFirebaseConfigured =
  useEmulators || Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)

const app = isFirebaseConfigured
  ? initializeApp(
      useEmulators
        ? { ...firebaseConfig, apiKey: firebaseConfig.apiKey || 'emulator', projectId: firebaseConfig.projectId || 'demo-rainforest-house' }
        : firebaseConfig,
    )
  : null

export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
