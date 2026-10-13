let ac

// Synthesised console sounds: switch click, pneumatic whoosh, vault resonance.
export function sfx(kind) {
  try {
    const C = window.AudioContext || window.webkitAudioContext
    if (!C) return
    ac = ac || new C()
    const t = ac.currentTime
    const g = ac.createGain()
    g.connect(ac.destination)
    if (kind === 'click') {
      const o = ac.createOscillator()
      o.type = 'square'
      o.frequency.setValueAtTime(1900, t)
      o.frequency.exponentialRampToValueAtTime(500, t + 0.03)
      g.gain.setValueAtTime(0.1, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      o.connect(g)
      o.start(t)
      o.stop(t + 0.06)
    } else if (kind === 'resonance') {
      const o = ac.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(82, t)
      o.frequency.exponentialRampToValueAtTime(164, t + 1.1)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.5)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
      o.connect(g)
      o.start(t)
      o.stop(t + 1.5)
    } else {
      const len = Math.floor(ac.sampleRate * 0.5)
      const buf = ac.createBuffer(1, len, ac.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
      const src = ac.createBufferSource()
      src.buffer = buf
      const f = ac.createBiquadFilter()
      f.type = 'bandpass'
      f.Q.value = 0.8
      f.frequency.setValueAtTime(300, t)
      f.frequency.exponentialRampToValueAtTime(2400, t + 0.45)
      g.gain.setValueAtTime(0.22, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      src.connect(f)
      f.connect(g)
      src.start(t)
    }
  } catch {
    // audio is decorative; ignore blocked or unsupported contexts
  }
}
