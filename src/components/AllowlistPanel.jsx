import { useEffect, useState } from 'react'
import { isValidDomain, isValidEmail, normaliseEmail } from '../lib/booking'
import { allowEntry, revokeEntry, subscribeToAllowlist } from '../lib/db'

function List({ kind, entries, onRevoke }) {
  if (entries.length === 0) {
    return <p className="muted">{kind === 'domain' ? 'No domains yet.' : 'No addresses yet.'}</p>
  }
  return (
    <ul className="allowlist">
      {entries.map((entry) => (
        <li key={entry.id}>
          <code>{kind === 'domain' ? `@${entry.id}` : entry.id}</code>
          <button type="button" className="link" onClick={() => onRevoke(entry.id)}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function AllowlistPanel({ user }) {
  const [emails, setEmails] = useState([])
  const [domains, setDomains] = useState([])
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(
    () => subscribeToAllowlist('email', setEmails, (err) => setError(err.message)),
    [],
  )
  useEffect(
    () => subscribeToAllowlist('domain', setDomains, (err) => setError(err.message)),
    [],
  )

  async function handleSubmit(event) {
    event.preventDefault()
    const entry = normaliseEmail(value).replace(/^@/, '')
    const kind = normaliseEmail(value).includes('@') && !normaliseEmail(value).startsWith('@')
      ? 'email'
      : 'domain'
    if (kind === 'email' ? !isValidEmail(entry) : !isValidDomain(entry)) {
      setError('Enter an address like guest@example.org, or a domain like example.org or @example.org.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await allowEntry(user, kind, entry)
      setValue('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke(kind, entry) {
    setError(null)
    try {
      await revokeEntry(kind, entry)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="card" id="allowlist">
      <h2>Who may sign up (caretaker view)</h2>
      <p className="muted">
        Only these addresses and domains can use the site. Anybody else can create an account, but it
        can neither see the calendar nor book until you add them here. Addresses must be verified by
        email either way.
      </p>
      <form className="allowlist-form" onSubmit={handleSubmit}>
        <label>
          Address or domain
          <input
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="guest@example.org or example.org"
          />
        </label>
        <button type="submit" disabled={busy}>
          Allow
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <h3>Domains</h3>
      <List kind="domain" entries={domains} onRevoke={(entry) => handleRevoke('domain', entry)} />
      <h3>Addresses</h3>
      <List kind="email" entries={emails} onRevoke={(entry) => handleRevoke('email', entry)} />
    </section>
  )
}
