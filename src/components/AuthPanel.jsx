import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'

export default function AuthPanel() {
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() })
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim())
        setNotice('Password reset email sent.')
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card auth" id="book">
      <h2>{mode === 'signup' ? 'Create an account' : mode === 'reset' ? 'Reset password' : 'Sign in'}</h2>
      <p className="muted">
        An account lets you book the house, change your own booking and leave a comment.
      </p>
      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <label>
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        {mode !== 'reset' && (
          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}
        <button type="submit" disabled={busy}>
          {mode === 'signup' ? 'Sign up' : mode === 'reset' ? 'Send reset email' : 'Sign in'}
        </button>
      </form>
      <div className="auth-switch">
        {mode !== 'signin' && (
          <button type="button" className="link" onClick={() => setMode('signin')}>
            Sign in instead
          </button>
        )}
        {mode !== 'signup' && (
          <button type="button" className="link" onClick={() => setMode('signup')}>
            Create an account
          </button>
        )}
        {mode !== 'reset' && (
          <button type="button" className="link" onClick={() => setMode('reset')}>
            Forgot password?
          </button>
        )}
      </div>
    </section>
  )
}
