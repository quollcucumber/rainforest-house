import { useMemo, useState } from 'react'
import { monthGrid, occupancyByDay, today } from '../lib/booking'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function label(date, day) {
  if (!day) return `${date} — free`
  const am = day.am
  const pm = day.pm
  if (am && pm && am.name === pm.name) return `${date} — ${pm.name || 'booked'}`
  const parts = [
    am ? `until the morning: ${am.name || 'booked'}` : 'free until the afternoon',
    pm ? `from the afternoon: ${pm.name || 'booked'}` : 'free from the morning',
  ]
  return `${date} — ${parts.join(', ')}`
}

function Day({ date, day, uid }) {
  const am = day?.am ?? null
  const pm = day?.pm ?? null
  const whole = am && pm && am.uid === pm.uid
  const name = pm?.name || am?.name || ''
  const isMine = (half) => Boolean(uid) && half?.uid === uid

  return (
    <div
      className={[
        'calendar-day',
        am || pm ? 'booked' : 'free',
        isMine(am) || isMine(pm) ? 'mine' : '',
        date === today() ? 'is-today' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={label(date, day)}
    >
      {whole ? (
        <span className={`fill whole${isMine(am) ? ' mine' : ''}`} />
      ) : (
        <>
          {am && <span className={`fill am${isMine(am) ? ' mine' : ''}`} />}
          {pm && <span className={`fill pm${isMine(pm) ? ' mine' : ''}`} />}
        </>
      )}
      <span className="day-number">{Number(date.slice(8, 10))}</span>
      {name && <span className="day-name">{name}</span>}
    </div>
  )
}

export default function Calendar({ bookings, uid }) {
  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth())

  const occupancy = useMemo(() => occupancyByDay(bookings), [bookings])
  const cells = useMemo(() => monthGrid(year, month), [year, month])

  function shift(months) {
    const at = new Date(Date.UTC(year, month + months, 1))
    setYear(at.getUTCFullYear())
    setMonth(at.getUTCMonth())
  }

  return (
    <section className="card on-leaf calendar" id="calendar">
      <div className="calendar-head">
        <h2>Who is in the house</h2>
        <div className="calendar-nav">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month">
            ←
          </button>
          <span>
            {MONTHS[month]} {year}
          </span>
          <button type="button" onClick={() => shift(1)} aria-label="Next month">
            →
          </button>
        </div>
      </div>
      <p className="muted">
        Booked nights are shaded, with the name of whoever has the house. Half-shaded days are
        changeover days: guests arrive in the afternoon and leave in the morning, so half of the day is
        still free.
      </p>

      <div className="calendar-grid" role="grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
        {cells.map((date, index) =>
          date ? (
            <Day key={date} date={date} day={occupancy.get(date)} uid={uid} />
          ) : (
            <div key={`blank-${index}`} className="calendar-day blank" />
          ),
        )}
      </div>

      <ul className="legend">
        <li>
          <span className="swatch free" /> free
        </li>
        <li>
          <span className="swatch booked" /> booked
        </li>
        <li>
          <span className="swatch changeover" /> arrival or departure day
        </li>
        {uid && (
          <li>
            <span className="swatch mine" /> your stay
          </li>
        )}
      </ul>
    </section>
  )
}
