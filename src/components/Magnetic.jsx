import { motion, useMotionValue, useSpring } from 'motion/react'

// Pulls its child toward the cursor, like a magnet under the desk.
export default function Magnetic({ children, strength = 0.3, className }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 14 })
  const sy = useSpring(y, { stiffness: 220, damping: 14 })
  return (
    <motion.div
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * strength)
        y.set((e.clientY - r.top - r.height / 2) * strength)
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}
