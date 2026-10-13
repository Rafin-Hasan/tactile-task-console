import confetti from 'canvas-confetti'

export const TEAL = ['#4ff0d0', '#bff9ee', '#d8fff6', '#c49a4d']
export const AMBER = ['#ffb347', '#ffe2a0', '#f2a53e', '#e9c27a']

export function burst(colors = TEAL, origin = { x: 0.5, y: 0.45 }) {
  const base = { colors, origin, shapes: ['square'], scalar: 0.8, disableForReducedMotion: true }
  confetti({ ...base, particleCount: 70, spread: 75, startVelocity: 38 })
  confetti({ ...base, particleCount: 40, spread: 130, startVelocity: 22, decay: 0.92 })
}
