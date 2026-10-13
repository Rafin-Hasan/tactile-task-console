import { motion } from 'motion/react'
import { useState } from 'react'
import { KIND, nextPri, PRI, STATUS } from '../lib/data'
import { clockText, describeDue, workElapsed } from '../lib/time'
import { BookmarkIcon, DomeIcon, PaperclipIcon, TrashIcon } from './Icons.jsx'

const SPARKS = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324]

const card = {
  hidden: { opacity: 0, y: 60, rotateX: -35, scale: 0.9 },
  show: (i) => ({ opacity: 1, y: 0, rotateX: 0, scale: 1, transition: { type: 'spring', stiffness: 90, damping: 13, delay: 0.06 * i } }),
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.25 } },
}

// What the clock of a timed work says right now.
function readClock(w, nowMs) {
  const elapsed = workElapsed(w, nowMs)
  if (w.kind === 'temp') {
    return { big: clockText(elapsed), small: w.status === 'done' ? 'time it took' : w.startedAt ? 'spent so far · running' : elapsed ? 'spent so far · paused' : 'stopwatch ready' }
  }
  const limit = w.limitMin * 60000
  const left = limit - elapsed
  if (w.status === 'done') {
    return left >= 0
      ? { big: clockText(elapsed), small: `beaten with ${clockText(left)} to spare`, fill: elapsed / limit }
      : { big: clockText(elapsed), small: `finished ${clockText(-left)} over the limit`, fill: 1, failed: true }
  }
  if (left <= 0) return { big: '00:00', small: `time is up · limit was ${w.limitMin} min`, fill: 1, failed: true }
  return { big: clockText(left), small: w.startedAt ? `left of ${w.limitMin} min` : `${w.limitMin} min on the clock`, fill: elapsed / limit, urgent: w.startedAt && left < limit * 0.2 }
}

export default function WorkCard({ ref, w, index, nowMs, folderName, onPatch, onTimer, onDelete, onLoad, onFiles }) {
  const [sparked, setSparked] = useState(false)
  const done = w.status === 'done'
  const working = w.status === 'working'
  const timed = w.kind !== 'work'
  const clock = timed ? readClock(w, nowMs) : null
  const due = describeDue(w.dueAt, new Date(nowMs))
  const late = !done && (due.overdue || clock?.failed)

  const cls = ['mod', `pri-${w.pri}`, done && 'is-done', working && 'is-working', late && 'decayed'].filter(Boolean).join(' ')

  const toggleDone = () => {
    if (!done) {
      setSparked(true)
      setTimeout(() => setSparked(false), 1300)
    }
    onPatch({ status: done ? 'todo' : 'done' })
  }

  // the main action depends on the kind of work and where its clock stands
  let action = null
  if (!done) {
    if (w.kind === 'work') action = { label: working ? 'Working' : 'Start', pressed: working, run: () => onPatch({ status: working ? 'todo' : 'working' }) }
    else if (w.kind === 'temp') {
      if (w.startedAt) action = { label: 'Pause', pressed: true, run: () => onTimer('pause') }
      else action = { label: w.spentMs ? 'Resume' : 'Start clock', pressed: false, run: () => onTimer('start') }
    } else if (clock.failed) action = { label: 'Retry', pressed: false, run: () => onTimer('reset') }
    else if (working) action = { label: 'Running', pressed: true, disabled: true }
    else action = { label: 'Start challenge', pressed: false, run: () => onTimer('start') }
  }

  return (
    <motion.div ref={ref} custom={index} variants={card} initial="hidden" animate="show" exit="exit" style={{ transformPerspective: 900 }}>
      <article
        className={cls}
        draggable="true"
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', w.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
      >
        <div className="shell">
          {w.pri === 'high' && !done && <div className="haze" aria-hidden="true" />}
          {late && <div className="dust" aria-hidden="true" />}
          {late && <span className="beacon beacon-left" aria-hidden="true" />}
          <span className="tag-stamp">{w.kind === 'work' ? folderName : KIND[w.kind]}</span>
          <motion.button
            type="button"
            className="mark-btn"
            aria-pressed={w.bookmarked}
            aria-label={w.bookmarked ? `Remove bookmark: ${w.title}` : `Bookmark: ${w.title}`}
            onClick={() => onPatch({ bookmarked: !w.bookmarked })}
            whileTap={{ scale: 0.8, y: 4 }}
          >
            <BookmarkIcon filled={w.bookmarked} size={18} />
          </motion.button>

          <div className="flex items-start gap-4">
            <span className="socket" aria-hidden="true">
              <span className={`core c-${done ? 'low' : w.pri}`} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2 pr-9">
              <h3 className="mod-title">{w.title}</h3>
              <p className="due">
                {STATUS[w.status]}
                {w.kind === 'work' && w.dueAt && !done ? ` · ${due.label}` : ''}
              </p>
            </div>
          </div>

          {clock && (
            <div className={`timer${clock.failed ? ' failed' : ''}${clock.urgent ? ' urgent' : ''}`} role="timer" aria-live="off">
              <span className="timer-big">{clock.big}</span>
              <span className="timer-small">{clock.small}</span>
              {w.kind === 'challenge' && (
                <span className="bar" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, clock.fill * 100).toFixed(1)}%` }} />
                </span>
              )}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2.5">
            <div className="flex flex-wrap gap-2">
              {action && (
                <button type="button" className="tool" aria-pressed={action.pressed} disabled={action.disabled} onClick={action.run}>
                  {action.label}
                </button>
              )}
              <button type="button" className="tool" aria-label={`Priority ${PRI[w.pri]} — change`} title="Change priority" onClick={() => onPatch({ pri: nextPri(w.pri) })}>
                <span className={`core c-${w.pri} size-3`} aria-hidden="true" />
                {PRI[w.pri]}
              </button>
              <button type="button" className="tool" aria-label={`Files of ${w.title}: ${w.files?.length ?? 0}`} title="Task files and my work" onClick={onFiles}>
                <PaperclipIcon />
                {w.files?.length ?? 0}
              </button>
              {!done && (
                <motion.button type="button" className="tool" aria-label={`Load into Focus Crucible: ${w.title}`} title="Focus on this" onClick={onLoad} whileTap={{ scale: 0.9 }}>
                  <DomeIcon />
                </motion.button>
              )}
              <button type="button" className="tool" aria-label={`Delete: ${w.title}`} title="Delete" onClick={onDelete}>
                <TrashIcon />
              </button>
            </div>
            <motion.button
              type="button"
              className={done ? 'rocker flipped' : 'rocker'}
              aria-pressed={done}
              aria-label={done ? `Reopen: ${w.title}` : `Mark done: ${w.title}`}
              title={done ? 'Reopen' : 'Mark done'}
              onClick={toggleDone}
              whileTap={{ scale: 0.92 }}
            >
              <span className="paddle" />
            </motion.button>
          </div>
        </div>
        {sparked && (
          <div className="sparks" aria-hidden="true">
            {SPARKS.map((a) => (
              <span key={a} style={{ '--a': `${a}deg`, animationDelay: '0s' }} />
            ))}
          </div>
        )}
      </article>
    </motion.div>
  )
}
