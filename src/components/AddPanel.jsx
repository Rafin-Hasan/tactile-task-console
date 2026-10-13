import { motion } from 'motion/react'
import { useState } from 'react'
import { PRI } from '../lib/data'

const COPY = {
  folder: { title: 'New folder', label: 'Folder name', hint: 'e.g. a subject — Physics, Web Engineering…', submit: 'Add folder' },
  work: { title: 'New work', label: 'Work title', hint: 'e.g. Lab 3 report, Coursework 1…', submit: 'Add work' },
  temp: { title: 'New temporary work', label: 'What needs doing?', hint: 'A one-off job; its stopwatch shows how long it took', submit: 'Add temporary work' },
  challenge: { title: 'New challenge work', label: 'What is the challenge?', hint: 'You set a time limit and race the countdown', submit: 'Add challenge' },
}
const LIMITS = [15, 30, 60, 120]

// Form of the Add section. onSubmit resolves true once the API has saved the item.
export default function AddPanel({ kind, where, maxFileMb, onSubmit, onClose }) {
  const copy = COPY[kind]
  const [text, setText] = useState('')
  const [pri, setPri] = useState('med')
  const [due, setDue] = useState('')
  const [limit, setLimit] = useState(30)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    const fields = kind === 'folder' ? { name: text, pri } : { title: text, kind, pri }
    if (kind === 'work') fields.dueAt = due ? new Date(due).toISOString() : null
    if (kind === 'challenge') fields.limitMin = Number(limit)
    const ok = await onSubmit(fields, files)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden"
    >
      <form onSubmit={submit} className="forge">
        <p className="sec sm:col-span-2">
          {copy.title} · <span className="text-laser">{where}</span>
        </p>
        <div className="field sm:col-span-2">
          <label htmlFor="add-text">{copy.label}</label>
          <input id="add-text" autoFocus required maxLength={kind === 'folder' ? 60 : 120} value={text} onChange={(e) => setText(e.target.value)} placeholder={copy.hint} />
        </div>
        <fieldset className="field">
          <legend>Priority</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRI).map(([key, label]) => (
              <button key={key} type="button" className="tool" aria-pressed={pri === key} onClick={() => setPri(key)}>
                <span className={`core c-${key} size-3`} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        {kind === 'work' && (
          <div className="field">
            <label htmlFor="add-due">Due (optional)</label>
            <input id="add-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        )}
        {kind === 'work' && (
          <div className="field sm:col-span-2">
            <label htmlFor="add-files">Task files (optional) — the lab sheet or brief, up to {maxFileMb} MB each</label>
            <input id="add-files" type="file" multiple onChange={(e) => setFiles([...e.target.files])} />
          </div>
        )}
        {kind === 'challenge' && (
          <div className="field">
            <label htmlFor="add-limit">Time limit (minutes)</label>
            <input id="add-limit" type="number" min={1} max={1440} step={1} required value={limit} onChange={(e) => setLimit(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {LIMITS.map((m) => (
                <button key={m} type="button" className="tool" aria-pressed={Number(limit) === m} onClick={() => setLimit(m)}>
                  {m} min
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <motion.button type="submit" className="brass min-h-[48px] px-6" disabled={busy} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97, y: 2 }}>
            {busy ? 'Saving…' : copy.submit}
          </motion.button>
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  )
}
