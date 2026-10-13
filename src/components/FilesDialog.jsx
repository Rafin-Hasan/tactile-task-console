import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { NoteIcon, PaperclipIcon, TrashIcon } from './Icons.jsx'

const SHELVES = [
  { role: 'task', title: 'The task', note: 'What you were asked to do: the lab sheet, brief or question paper.', empty: 'No task file yet' },
  { role: 'work', title: 'My work', note: 'What you handed in: your report, code, results or photos.', empty: 'Nothing added yet' },
]

function sizeText(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function Shelf({ work, shelf, maxMb, onUpload, onDelete }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(0)
  const [over, setOver] = useState(false)
  const [problem, setProblem] = useState('')
  const [arming, setArming] = useState(null)
  const files = (work.files ?? []).filter((f) => f.role === shelf.role)

  const add = async (list) => {
    setProblem('')
    const picked = [...list]
    const tooBig = picked.filter((f) => f.size > maxMb * 1024 * 1024)
    if (tooBig.length) setProblem(`${tooBig.map((f) => f.name).join(', ')} ${tooBig.length > 1 ? 'are' : 'is'} over the ${maxMb} MB limit`)
    for (const file of picked.filter((f) => !tooBig.includes(f))) {
      setBusy((n) => n + 1)
      await onUpload(work.id, shelf.role, file)
      setBusy((n) => n - 1)
    }
  }

  return (
    <section aria-labelledby={`shelf-${shelf.role}`} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h3 id={`shelf-${shelf.role}`} className="sec text-laser">
          {shelf.title} · {files.length}
        </h3>
        <p className="muted">{shelf.note}</p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        <AnimatePresence initial={false}>
          {files.map((f) => (
            <motion.li key={f.id} className="file-row" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <NoteIcon />
              <a className="file-name" href={api.fileUrl(work.id, f.id)} target="_blank" rel="noreferrer" title={`Open ${f.name}`}>
                {f.name}
              </a>
              <span className="muted flex-none">{sizeText(f.size)}</span>
              <a className="tool min-h-9 min-w-9 px-2" href={`${api.fileUrl(work.id, f.id)}?download`} aria-label={`Download ${f.name}`} title="Download">
                ↓
              </a>
              <button
                type="button"
                className={arming === f.id ? 'danger min-h-9 px-3' : 'tool min-h-9 min-w-9 px-2'}
                aria-label={arming === f.id ? `Confirm removing ${f.name}` : `Remove ${f.name}`}
                title="Remove"
                onBlur={() => setArming(null)}
                onClick={() => {
                  if (arming !== f.id) return setArming(f.id)
                  setArming(null)
                  onDelete(work.id, f.id)
                }}
              >
                {arming === f.id ? 'Sure?' : <TrashIcon />}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        {files.length === 0 && <li className="muted py-1">{shelf.empty}</li>}
      </ul>
      <button
        type="button"
        className={over ? 'drop over' : 'drop'}
        onClick={() => input.current.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
      >
        <PaperclipIcon />
        {busy ? `Uploading ${busy} file${busy > 1 ? 's' : ''}…` : 'Add files — click or drop them here'}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        aria-label={`Add files to ${shelf.title}`}
        onChange={(e) => {
          add(e.target.files)
          e.target.value = ''
        }}
      />
      {problem && (
        <p className="muted text-[#ffb08a]" role="alert">
          {problem}
        </p>
      )}
    </section>
  )
}

// A work's two shelves of attachments: what was asked, and what was handed in.
export default function FilesDialog({ work, maxMb, onUpload, onDelete, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (work && !dialog.open) dialog.showModal()
    if (!work && dialog.open) dialog.close()
  }, [work])

  return (
    <dialog ref={ref} className="confirm files" aria-labelledby="files-title" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      {work && (
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="sec">Files</p>
              <h2 id="files-title" className="m-0 text-[22px] font-bold text-paper font-stretch-[110%]">
                {work.title}
              </h2>
            </div>
            <button type="button" className="ghost flex-none" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {SHELVES.map((shelf) => (
              <Shelf key={shelf.role} work={work} shelf={shelf} maxMb={maxMb} onUpload={onUpload} onDelete={onDelete} />
            ))}
          </div>
          <p className="muted">PDFs, images and text open in a new tab; other files download. Up to {maxMb} MB each.</p>
        </div>
      )}
    </dialog>
  )
}
