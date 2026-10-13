import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ComboDial from '../components/ComboDial.jsx'
import Embers from '../components/Embers.jsx'
import { FingerprintIcon } from '../components/Icons.jsx'
import Magnetic from '../components/Magnetic.jsx'
import Page from '../components/Page.jsx'
import { useConsole } from '../context/console'
import { burst, TEAL } from '../lib/fx'


const vault = {
  hidden: { y: 90, opacity: 0, rotateX: 28, scale: 0.94 },
  idle: { y: 0, opacity: 1, rotateX: 0, scale: 1, x: 0, rotate: 0, transition: { type: 'spring', stiffness: 70, damping: 14 } },
  scanning: { y: 0, opacity: 1, rotateX: 0, scale: 1.01, x: 0, rotate: 0 },
  success: { y: 0, opacity: 1, rotateX: 0, scale: 1.04, x: 0, rotate: 0, transition: { duration: 1.5, ease: [0.7, 0, 0.2, 1] } },
  error: {
    y: 0,
    opacity: 1,
    rotateX: 0,
    scale: 1,
    x: [0, -8, 7, -5, 4, -2, 1, 0],
    rotate: [0, -0.35, 0.3, 0, 0, 0, 0, 0],
    transition: { duration: 0.55, ease: [0.36, 0.07, 0.19, 0.97] },
  },
}
const reveal = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 1.3 } },
}
const rise = {
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6 } },
}
const panel = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] },
}

export default function Gatekeeper() {
  const { user, rules, login, register, logout, play } = useConsole()
  const CODE_MAX = rules.codeMax
  const [mode, setMode] = useState('login')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  // an already signed-in visitor finds the vault open
  const [phase, setPhase] = useState(user ? 'success' : 'idle')
  const [message, setMessage] = useState('')
  const form = useRef(null)
  const timers = useRef([])
  const isOpen = phase === 'success'
  const busy = phase === 'scanning'
  const joining = mode === 'register'
  // creating a vault can demand a longer code than opening an existing one
  const CODE_MIN = joining ? rules.codeMin : 4
  const ready = code.length >= CODE_MIN

  // key light that trails the cursor
  const mx = useMotionValue(-999)
  const my = useMotionValue(-999)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  const status = isOpen
    ? 'Bolts withdrawn · vault open'
    : busy
      ? 'Bolts testing the combination'
      : phase === 'error'
        ? message
        : needsPassword
          ? 'Code accepted · this vault also needs its password'
          : joining
            ? `New vault · dial a code of ${CODE_MIN}-${CODE_MAX} digits`
            : 'Locked · dial your code and turn the handle'

  const reject = (text, { keepCode = false } = {}) => {
    setMessage(text)
    setPhase('error')
    play('click')
    if (!keepCode) later(() => setCode(''), 600)
    later(() => setPhase((p) => (p === 'error' ? 'idle' : p)), 3200)
  }
  const clearError = () => setPhase((p) => (p === 'error' ? 'idle' : p))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (isOpen || busy) return
    if (!ready) return reject(`Dial at least ${CODE_MIN} digits first`, { keepCode: true })
    setPhase('scanning')
    const failure = joining ? await register({ code, name, password }) : await login({ code, password })
    if (failure?.needsPassword && !needsPassword) {
      // right code, but the owner added a password: ask for it without treating this as a miss
      setNeedsPassword(true)
      setPhase('idle')
      return
    }
    if (failure) return reject(failure.message, { keepCode: failure.needsPassword })
    setCode('')
    setPassword('')
    setNeedsPassword(false)
    setPhase('success')
    play('resonance')
    later(() => burst(TEAL, { x: 0.5, y: 0.4 }), 1100)
  }
  const onSignOut = async () => {
    play('click')
    await logout()
    setMode('login')
    setPhase('idle')
  }
  const switchMode = () => {
    play('click')
    setMode(joining ? 'login' : 'register')
    setCode('')
    setPassword('')
    setNeedsPassword(false)
    setPhase('idle')
  }
  const onCode = (next) => {
    setCode(next)
    setNeedsPassword(false)
    clearError()
  }

  const slots = Math.max(CODE_MIN, code.length)

  return (
    <Page>
      <div
        className={`room-gate is-${phase}`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          mx.set(e.clientX - r.left)
          my.set(e.clientY - r.top)
        }}
      >
        <div className="keylight" aria-hidden="true" />
        <motion.div className="spot" style={{ x: sx, y: sy }} aria-hidden="true" />
        <div className="desk" aria-hidden="true" />
        <Embers />

        <div className="relative z-2 flex min-h-screen flex-col items-center gap-9 px-5 pt-8 pb-16">
          <header className="flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4">
            <motion.div
              className="plate"
              initial={{ y: -60, rotate: -6, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 11, delay: 0.5 }}
            >
              Task Console · Unit 01
            </motion.div>
            <motion.div
              className="chip"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <span className="led" aria-hidden="true" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={status}
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.22 }}
                >
                  {status}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          </header>

          <form ref={form} onSubmit={onSubmit} className="m-0 flex w-full flex-col items-center gap-14">
            <div className="flex w-full justify-center" style={{ perspective: 1400 }}>
              <motion.div className="vault" variants={vault} initial="hidden" animate={phase}>
                <div className="chamber chamber-one">
                  <div className="interior">
                    <motion.div
                      className="halo"
                      aria-hidden="true"
                      animate={isOpen ? { opacity: [0, 1, 0.7, 1], scale: [0.6, 1.15, 1, 1.08] } : { opacity: 0, scale: 0.6 }}
                      transition={isOpen ? { duration: 3, delay: 1, repeat: Infinity, repeatType: 'mirror' } : { duration: 0.3 }}
                    />
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          className="relative flex flex-col items-center gap-[18px]"
                          variants={reveal}
                          initial="hidden"
                          animate="show"
                          exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        >
                          <motion.h1
                            variants={rise}
                            className="m-0 text-[clamp(28px,5vw,40px)] font-bold tracking-[-0.01em] text-[#eafffa] font-stretch-[118%]"
                          >
                            Welcome, {user?.name}
                          </motion.h1>
                          <motion.p
                            variants={rise}
                            className="m-0 font-mono text-[13px] leading-normal font-medium tracking-[0.12em] text-[#9fd9cd] uppercase"
                          >
                            Vault open · your workspace is ready
                          </motion.p>
                          <motion.div variants={rise} className="flex flex-wrap items-center justify-center gap-3">
                            <Magnetic>
                              <Link className="seal min-h-[52px] px-[26px] text-[14px]" to="/workspace">
                                Enter workspace
                              </Link>
                            </Magnetic>
                            <button type="button" className="ghost" onClick={onSignOut}>
                              Lock vault
                            </button>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* the door swings on its left hinges, like a real safe */}
                  <motion.div
                    className="door door-one"
                    initial={{ rotateY: -84 }}
                    animate={{ rotateY: isOpen ? -84 : 0 }}
                    transition={{ duration: 1.3, ease: [0.6, 0, 0.2, 1], delay: isOpen ? 0.55 : 0.3 }}
                  >
                    <span className="hinge top-[14%]" aria-hidden="true" />
                    <span className="hinge bottom-[14%]" aria-hidden="true" />

                    <div className="flex flex-col items-center gap-5">
                      <ComboDial
                        code={code}
                        maxLength={CODE_MAX}
                        disabled={isOpen || busy}
                        onChange={onCode}
                        onTick={() => play('click')}
                        onEnter={() => form.current?.requestSubmit()}
                      />
                      <div className="pips" aria-label={`${code.length} digits entered`}>
                        {Array.from({ length: slots }, (_, i) => (
                          <motion.span
                            key={`${i}-${i < code.length}`}
                            className={i < code.length ? 'pip on' : 'pip need'}
                            initial={i < code.length ? { scale: 1.35, y: -6 } : false}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                          >
                            {i < code.length ? (joining ? code[i] : '•') : ''}
                          </motion.span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-5">
                      <motion.button
                        type="submit"
                        className="handle"
                        aria-label={joining ? 'Turn the handle to create your vault' : 'Turn the handle to open the vault'}
                        disabled={busy || isOpen}
                        animate={{ rotate: isOpen ? -90 : busy ? [0, -14, 0] : 0 }}
                        transition={isOpen ? { type: 'spring', stiffness: 120, damping: 11 } : { duration: 0.5, repeat: busy ? Infinity : 0 }}
                        whileHover={ready ? { rotate: -10 } : undefined}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="handle-bar" />
                      </motion.button>
                      <p className="sec text-center leading-[1.6]">
                        {joining ? 'Turn to set' : 'Turn to open'}
                        <br />
                        <button type="button" className="mt-2 cursor-pointer text-laser underline underline-offset-4" onClick={() => onCode('')}>
                          Clear code
                        </button>
                      </p>
                    </div>

                    <p className="door-hint basis-full">
                      Turn the dial to a digit and press its centre to set it — or simply type the digits. Minimum {CODE_MIN}.
                    </p>
                  </motion.div>
                </div>
                <div className="vents" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span key={i} style={{ '--i': i }} />
                  ))}
                </div>
                <div className="vapor" aria-hidden="true" />
                <div className="vapor vapor-2" aria-hidden="true" />
              </motion.div>
            </div>

            <AnimatePresence initial={false}>
              {!isOpen && joining && (
                <motion.div key="join" className="w-[min(780px,100%)] overflow-hidden" {...panel}>
                  <div className="extras two">
                    <div className="field">
                      <label htmlFor="vault-name">Your name (optional)</label>
                      <input id="vault-name" name="name" autoComplete="name" maxLength={60} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="vault-password">Extra password (optional, 6+)</label>
                      <input
                        id="vault-password"
                        type="password"
                        name="password"
                        autoComplete="new-password"
                        maxLength={200}
                        value={password}
                        disabled={busy}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          clearError()
                        }}
                      />
                    </div>
                    <p className="muted sm:col-span-2">
                      Your code is the only thing that opens this vault, so anyone who guesses it gets in. Add a password for a second lock.
                    </p>
                  </div>
                </motion.div>
              )}
              {!isOpen && !joining && needsPassword && (
                <motion.div key="pass" className="w-[min(780px,100%)] overflow-hidden" {...panel}>
                  <div className="extras">
                    <div className="field">
                      <label htmlFor="vault-password">Vault password</label>
                      <input
                        id="vault-password"
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        autoFocus
                        required
                        maxLength={200}
                        value={password}
                        disabled={busy}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          clearError()
                        }}
                      />
                    </div>
                    <p className="muted">Enter it, then turn the handle again (or press Enter).</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isOpen && (
              <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7, duration: 0.6 }} className="w-[min(380px,100%)]">
                <motion.button
                  type="button"
                  className="scanner w-full"
                  onClick={switchMode}
                  disabled={busy}
                  whileHover={{ scale: 1.03, borderColor: 'rgba(79,240,208,.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="laser" aria-hidden="true" />
                  <FingerprintIcon />
                  <span className="flex flex-col gap-1.5">
                    <span className="text-[15px] leading-none font-bold tracking-[0.04em] font-stretch-[112%]">
                      {joining ? 'Already have a vault?' : 'New here?'}
                    </span>
                    <span className="font-mono text-[12px] leading-[1.3] font-medium text-[#b9d6d0]">
                      {joining ? 'Dial your existing code' : 'Create a vault with your own code'}
                    </span>
                  </span>
                </motion.button>
              </motion.div>
            )}
          </form>
        </div>
        <div className="tiltshift" aria-hidden="true" />
      </div>
    </Page>
  )
}
