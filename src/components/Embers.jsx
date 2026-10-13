import { useState } from 'react'

// Ambient dust motes drifting up through the key light.
export default function Embers({ count = 26, color = '255,222,170' }) {
  const [motes] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const size = 1.5 + Math.random() * 3
      return {
        id: i,
        style: {
          left: `${Math.random() * 100}%`,
          width: size,
          height: size,
          background: `rgba(${color},.9)`,
          boxShadow: `0 0 ${size * 3}px rgba(${color},.7)`,
          animationDuration: `${12 + Math.random() * 16}s`,
          animationDelay: `${-Math.random() * 24}s`,
          '--dx': `${Math.round(Math.random() * 140 - 70)}px`,
          '--o': (0.25 + Math.random() * 0.5).toFixed(2),
        },
      }
    }),
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {motes.map((m) => (
        <span key={m.id} className="ember" style={m.style} />
      ))}
    </div>
  )
}
