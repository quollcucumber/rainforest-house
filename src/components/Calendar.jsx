import { useMemo, useState } from 'react'
import { bookedNights, monthGrid, today } from '../lib/booking'

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

export default function Calendar({ bookings, uid }) {
  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth())

  const taken = useMemo(() => bookedNights(bookings), [bookings])
  const mine = useMemo(
    () => bookedNights(bookings.filter((booking) => booking.uid && booking.uid === uid)),
    [bookings, uid],
  )
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
      <p className="muted">Booked nights are shaded. Anyone can see this — names stay private.</p>

      <div className="calendar-grid" role="grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
        {cells.map((date, index) =>
          date ? (
            <div
              key={date}
              className={[
                'calendar-day',
                taken.has(date) ? 'booked' : 'free',
                mine.has(date) ? 'mine' : '',
                date === today() ? 'is-today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={taken.has(date) ? `${date} — booked` : `${date} — free`}
            >
              {Number(date.slice(8, 10))}
            </div>
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
        {uid && (
          <li>
            <span className="swatch mine" /> your stay
          </li>
        )}
      </ul>
    </section>
  )
}
