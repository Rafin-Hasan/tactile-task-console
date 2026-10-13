import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

const STEP = 36
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const mod = (n, m) => ((n % m) + m) % m
const spring = { type: 'spring', stiffness: 110, damping: 15 }

// Combination dial. Drag, scroll or use the arrow keys to turn it; the digit under the
// marker is set by pressing the centre (or Space). Typing a digit spins the dial to it,
// alternating direction like a real lock.
export default function ComboDial({ code, maxLength, disabled, onChange, onTick, onEnter }) {
  const rotation = useMotionValue(0)
  const [current, setCurrent] = useState(0)
  const [pulse, setPulse] = useState(0)
  const el = useRef(null)
  const drag = useRef(null)
  const spinDir = useRef(1)
  const shown = useRef(0)
  const tick = useRef(onTick)
  useEffect(() => {
    tick.current = onTick
  })

  // the digit under the marker, with a click at every detent
  useEffect(
    () =>
      rotation.on('change', (r) => {
        const d = mod(Math.round(-r / STEP), 10)
        if (d === shown.current) return
        shown.current = d
        tick.current?.()
        setCurrent(d)
      }),
    [rotation],
  )

  const full = code.length >= maxLength
  const snapped = () => Math.round(rotation.get() / STEP) * STEP
  const step = (dir) => animate(rotation, snapped() + dir * STEP, spring)
  const push = (digit) => {
    if (full) return
    onChange(code + digit)
    setPulse((p) => p + 1)
  }
  const spinTo = (digit) => {
    if (full) return
    const from = snapped()
    const dir = spinDir.current
    spinDir.current = -dir
    const gap = mod(dir * (-digit * STEP - from), 360) || 360
    animate(rotation, from + dir * gap, { type: 'spring', stiffness: 70, damping: 14 })
    push(digit)
  }

  // wheel needs a non-passive listener so the page does not scroll while the dial turns
  useEffect(() => {
    const node = el.current
    let last = 0
    const onWheel = (e) => {
      e.preventDefault()
      if (disabled || e.timeStamp - last < 70) return
      last = e.timeStamp
      animate(rotation, Math.round(rotation.get() / STEP) * STEP + Math.sign(e.deltaY) * STEP, spring)
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [rotation, disabled])

  const angleAt = (e) => {
    const r = el.current.getBoundingClientRect()
    return (Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180) / Math.PI
  }
  const onPointerDown = (e) => {
    if (disabled || e.target.closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = angleAt(e)
  }
  const onPointerMove = (e) => {
    if (drag.current === null) return
    const a = angleAt(e)
    let d = a - drag.current
    if (d > 180) d -= 360
    if (d < -180) d += 360
    drag.current = a
    rotation.set(rotation.get() + d)
  }
  const onPointerUp = () => {
    if (drag.current === null) return
    drag.current = null
    animate(rotation, snapped(), spring)
  }
  const onKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(-1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(1)
    else if (e.key === ' ') push(current)
    else if (e.key === 'Enter') onEnter?.()
    else if (e.key === 'Backspace') onChange(code.slice(0, -1))
    else if (/^\d$/.test(e.key)) spinTo(Number(e.key))
    else return
    e.preventDefault()
  }

  return (
    <div
      ref={el}
      className="combo"
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Combination dial"
      aria-valuemin={0}
      aria-valuemax={9}
      aria-valuenow={current}
      aria-disabled={disabled}
      data-lenis-prevent
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <span className="combo-marker" aria-hidden="true" />
      <div className="bezel" aria-hidden="true" />
      <motion.div className="combo-face" style={{ rotate: rotation }} aria-hidden="true">
        {DIGITS.map((n) => (
          <span
            key={n}
            className={n === current ? 'combo-num on' : 'combo-num'}
            style={{ transform: `rotate(${n * STEP}deg) translateY(calc(var(--d) * -0.335))` }}
          >
            {n}
          </span>
        ))}
        <span className="combo-knob" />
      </motion.div>
      <motion.button
        type="button"
        className="combo-set"
        aria-label={`Set digit ${current}`}
        disabled={disabled || full}
        onClick={(e) => {
          // keyboard activation is handled by the dial itself
          if (e.detail > 0) push(current)
        }}
        whileTap={{ scale: 0.92 }}
      >
        <motion.span
          key={pulse}
          className="combo-digit"
          initial={pulse ? { scale: 1.7, opacity: 0.4 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 14 }}
        >
          {current}
        </motion.span>
        <span className="combo-set-label">Set</span>
      </motion.button>
    </div>
  )
}
