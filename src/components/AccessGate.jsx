import { useState } from 'react'
import { sendEmailVerification, signOut } from 'firebase/auth'
import { auth } from '../firebase'

export default function AccessGate({ user, reason, onRecheck }) {
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function resend() {
    setBusy(true)
    setError(null)
    try {
      await sendEmailVerification(user)
      setNotice('Sent. Open the link in that email, then use “I have confirmed it”.')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setBusy(false)
    }
  }

  async function recheck() {
    setBusy(true)
    setError(null)
    try {
      await user.reload()
      await onRecheck()
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" id="book">
      <h2>{reason === 'unverified' ? 'Confirm your email address' : 'Your address is not allowed yet'}</h2>
      {reason === 'unverified' ? (
        <p className="muted">
          We emailed a confirmation link to <strong>{user.email}</strong>. Open it, then come back here.
        </p>
      ) : (
        <p className="muted">
          <strong>{user.email}</strong> is confirmed, but a caretaker has to allow your address or its
          domain before you can see the calendar or book. Ask a caretaker to add you.
        </p>
      )}
      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{error}</p>}
      <div className="auth-switch">
        {reason === 'unverified' && (
          <button type="button" className="link" onClick={resend} disabled={busy}>
            Send the email again
          </button>
        )}
        <button type="button" className="link" onClick={recheck} disabled={busy}>
          {reason === 'unverified' ? 'I have confirmed it' : 'Check again'}
        </button>
        <button type="button" className="link" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    </section>
  )
}
