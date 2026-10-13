import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Embers from '../components/Embers.jsx'
import { LockIcon } from '../components/Icons.jsx'
import Magnetic from '../components/Magnetic.jsx'
import Page from '../components/Page.jsx'
import { useConsole } from '../context/console'
import { KIND, PRI } from '../lib/data'
import { AMBER, burst } from '../lib/fx'
import { sessionElapsed } from '../lib/time'

const DURATIONS = [5, 15, 25, 50]

function Steel({ title, meta, delay }) {
  return (
    <div className="steel" style={{ animationDelay: `${delay}s` }}>
      <p className="steel-title">{title}</p>
      <span className="steel-meta">
        <LockIcon size={13} strokeWidth={2.2} />
        {meta}
      </span>
    </div>
  )
}

export default function Focus() {
  const { works, folders, focusId, session, setSession, play } = useConsole()
  // re-render on a short tick; the time itself always comes from the saved timestamps
  const [nowMs, setNowMs] = useState(() => Date.now())
  const wasActive = useRef(false)

  const open = works.filter((w) => w.status !== 'done')
  const task = works.find((w) => w.id === focusId) ?? open[0]
  const sealed = open.filter((w) => w.id !== task?.id)
  const home = task?.kind === 'work' ? folders.find((f) => f.id === task.folderId)?.name : KIND[task?.kind]

  const { minutes, running } = session
  const total = minutes * 60
  const elapsed = sessionElapsed(session, nowMs)
  const remaining = total - elapsed
  const done = remaining === 0
  const active = running && !done
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 250)
    return () => clearInterval(tick)
  }, [])

  // celebrate only when the session finishes while this screen is watching it
  useEffect(() => {
    if (done && wasActive.current) {
      play('resonance')
      burst(AMBER, { x: 0.5, y: 0.5 })
    }
    wasActive.current = active
  }, [done, active, play])

  const status = done ? 'Session complete · dome may be released' : active ? 'Deep work · dome sealed' : 'Paused · dome sealed'
  const toggleLabel = done ? 'Run again' : active ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'
  const toggle = () => {
    play('click')
    if (done) setSession({ minutes, running: true, startedAt: Date.now(), accumulated: 0 })
    else if (active) setSession({ minutes, running: false, startedAt: null, accumulated: elapsed })
    else setSession({ minutes, running: true, startedAt: Date.now(), accumulated: elapsed })
  }
  const reset = () => {
    play('click')
    setSession({ minutes, running: false, startedAt: null, accumulated: 0 })
  }

  return (
    <Page>
      <div className="room-focus">
        <div className="cone" aria-hidden="true" />
        <Embers count={22} color="255,190,110" />

        <header className="relative z-2 mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-6 pt-7 pb-2.5">
          <motion.div
            className="plate plate-dim"
            initial={{ y: -60, rotate: -6, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 11, delay: 0.4 }}
          >
            Task Console · Unit 01
          </motion.div>
          <p className="sec text-[#a8a095]" role="status">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status}
                className="inline-block"
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.22 }}
              >
                {status}
              </motion.span>
            </AnimatePresence>
          </p>
        </header>

        <div className="relative z-2 mx-auto flex max-w-[1360px] flex-wrap items-center justify-center gap-12 px-6 pt-6 pb-[72px]">
          <div className="max-w-[280px] flex-[1_1_220px]" data-aos="fade-right" data-aos-delay="900">
            <aside aria-label="Sealed modules" className="flex flex-col gap-[22px] opacity-55">
              {sealed.slice(0, 3).map((t, i) => (
                <Steel key={t.id} title={t.title} meta="Sealed" delay={0.9 + i * 0.1} />
              ))}
            </aside>
          </div>

          <main className="flex min-w-0 flex-[3_1_560px] flex-col items-center gap-[34px] max-[900px]:-order-1">
            <div className="domewrap">
              <motion.div
                className="glass-crucible"
                initial={{ y: '-120%', opacity: 0.2 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 60, damping: 11, delay: 0.45 }}
              >
                <span className="glint" aria-hidden="true" />
                <div className="hg" aria-hidden="true">
                  <span className="pillar left-0" />
                  <span className="pillar right-0" />
                  <div className="hg-cap" />
                  <div className="bulb top">
                    <div className="sand" style={{ height: `${((remaining / total) * 82).toFixed(2)}%` }} />
                  </div>
                  <div className="neck">
                    <span className={active ? 'stream on' : 'stream'} />
                  </div>
                  <div className="bulb bot">
                    <div className="sand" style={{ height: `${((Math.min(elapsed, total) / total) * 82).toFixed(2)}%` }} />
                    {active &&
                      [0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="grain"
                          style={{ animationDelay: `${i * 0.22}s`, '--gx': `${(i - 1.5) * 9}px`, '--gy': `${50 + i * 8}px` }}
                        />
                      ))}
                  </div>
                  <div className="hg-cap" />
                </div>
                {done && (
                  <>
                    <span className="resonance" aria-hidden="true" />
                    <span className="resonance" style={{ animationDelay: '.8s' }} aria-hidden="true" />
                    <span className="resonance" style={{ animationDelay: '1.6s' }} aria-hidden="true" />
                  </>
                )}
                <span className="caustic" aria-hidden="true" />
              </motion.div>
              <motion.div
                className="crucible-base"
                aria-hidden="true"
                initial={{ scaleX: 0.3, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.3 }}
              />
            </div>

            <div data-aos="flip-up" data-aos-delay="1100">
              <div className="cartridge">
                <span className={`core c-${task?.pri ?? 'low'} size-4`} aria-hidden="true" />
                <div className="flex flex-col gap-1.5">
                  <h1 className="m-0 text-[20px] font-[650] text-paper font-stretch-[104%]">{task?.title ?? 'No work loaded'}</h1>
                  <p className="sec text-[#c9bfae]">
                    {task ? `${home} · ${PRI[task.pri]} priority` : 'Load one from the workspace'}
                  </p>
                </div>
              </div>
            </div>

            <p className="readout" role="timer" aria-live="off" aria-label={clock}>
              {clock.split('').map((ch, i) => (
                <span key={i} aria-hidden="true">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.b
                      key={ch}
                      className="inline-block font-semibold"
                      initial={{ y: '-100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: '100%', opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                      {ch}
                    </motion.b>
                  </AnimatePresence>
                </span>
              ))}
            </p>

            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Session length" data-aos="fade-up" data-aos-delay="1200" data-aos-offset="0">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="tool"
                  aria-pressed={minutes === d}
                  onClick={() => {
                    play('click')
                    setSession({ minutes: d, running, startedAt: running ? Date.now() : null, accumulated: 0 })
                  }}
                >
                  {d} min
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3" data-aos="fade-up" data-aos-delay="1300" data-aos-offset="0">
              <Magnetic>
                <motion.button
                  type="button"
                  className="brass min-h-[52px] px-7 tracking-[0.18em]"
                  onClick={toggle}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96, y: 2 }}
                >
                  {toggleLabel}
                </motion.button>
              </Magnetic>
              <button type="button" className="tool tool-lg" onClick={reset}>
                Reset
              </button>
              <Link className="tool tool-lg" to="/workspace">
                Release dome
              </Link>
            </div>
          </main>

          <div className="max-w-[280px] flex-[1_1_220px]" data-aos="fade-left" data-aos-delay="900">
            <aside aria-label="Held signals" className="flex flex-col gap-[22px] opacity-55">
              <Steel title="Notifications" meta="Held until release" delay={1} />
              <Steel title="Orbital rail" meta="Frozen" delay={1.1} />
              {sealed[3] && <Steel title={sealed[3].title} meta="Sealed" delay={1.2} />}
            </aside>
          </div>
        </div>
        <div className="tiltshift" style={{ '--ts-top': '14%', '--ts-bot': '86%' }} aria-hidden="true" />
      </div>
    </Page>
  )
}
