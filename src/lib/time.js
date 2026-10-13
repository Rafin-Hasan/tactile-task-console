const DAY = 86400000
const hm = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

// Human due label plus how far past the deadline a task is, from the live clock.
export function describeDue(dueAt, now) {
  if (!dueAt) return { label: 'No deadline', overdue: false, overdueDays: 0 }
  const due = new Date(dueAt)
  const late = now.getTime() - due.getTime()
  if (late > 0) {
    const days = Math.floor(late / DAY)
    const hours = Math.floor(late / 3600000)
    const label = days >= 1 ? `Overdue ${days} day${days > 1 ? 's' : ''}` : hours >= 1 ? `Overdue ${hours} h` : `Overdue ${Math.max(1, Math.floor(late / 60000))} min`
    return { label, overdue: true, overdueDays: days }
  }
  const dayGap = Math.round((startOfDay(due) - startOfDay(now)) / DAY)
  const label =
    dayGap === 0
      ? `Today ${hm(due)}`
      : dayGap === 1
        ? `Tomorrow ${hm(due)}`
        : due.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return { label, overdue: false, overdueDays: 0 }
}

// Seconds elapsed in a focus session stored as timestamps.
export function sessionElapsed(session, nowMs) {
  const live = session.running && session.startedAt ? Math.max(0, (nowMs - session.startedAt) / 1000) : 0
  return Math.min(session.minutes * 60, Math.floor(session.accumulated + live))
}

// Milliseconds a temporary or challenge work has been running, from its saved timestamps.
export const workElapsed = (w, nowMs) => w.spentMs + (w.startedAt ? Math.max(0, nowMs - w.startedAt) : 0)

// 754000 -> "12:34", 3723000 -> "1:02:03"
export function clockText(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const p = (n) => String(n).padStart(2, '0')
  const h = Math.floor(s / 3600)
  return h ? `${h}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}` : `${p(Math.floor(s / 60))}:${p(s % 60)}`
}

// Value for <input type="datetime-local"> in local time.
export function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
