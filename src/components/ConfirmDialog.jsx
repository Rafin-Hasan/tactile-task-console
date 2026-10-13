import { useEffect, useRef } from 'react'
import { TrashIcon } from './Icons.jsx'

// In-page confirmation for destructive actions. A native window.confirm() is silently
// blocked in embedded browsers, which made Delete look broken.
export default function ConfirmDialog({ ask, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (ask && !dialog.open) dialog.showModal()
    if (!ask && dialog.open) dialog.close()
  }, [ask])

  return (
    <dialog ref={ref} className="confirm" aria-labelledby="confirm-title" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      {ask && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <span className="confirm-icon" aria-hidden="true">
              <TrashIcon />
            </span>
            <div className="flex min-w-0 flex-col gap-2">
              <h2 id="confirm-title" className="m-0 text-[20px] font-bold text-paper font-stretch-[110%]">
                {ask.title}
              </h2>
              <p className="muted text-[13px] leading-normal">{ask.body}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="ghost" autoFocus onClick={onClose}>
              Keep it
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                ask.onYes()
                onClose()
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
