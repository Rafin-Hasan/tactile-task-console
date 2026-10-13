import { animate, AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AddPanel from '../components/AddPanel.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FilesDialog from '../components/FilesDialog.jsx'
import Embers from '../components/Embers.jsx'
import { BookIcon, BookmarkIcon, FlagIcon, FolderIcon, HomeIcon, LockIcon, NoteIcon, SoundIcon, StopwatchIcon, TrashIcon } from '../components/Icons.jsx'
import Magnetic from '../components/Magnetic.jsx'
import Page from '../components/Page.jsx'
import WorkCard from '../components/WorkCard.jsx'
import { useConsole } from '../context/console'
import { childFolders, folderProgress, nextPri, pathTo, PRI, sortWorks, STATUS } from '../lib/data'
import { sfx } from '../lib/sfx'

const TILT = 12
const pad = (n) => String(n).padStart(2, '0')
const FILTERS = { all: 'All', bookmarked: 'Bookmarked', working: 'Under working', done: 'Done' }
const NEXT_STATUS = { todo: 'working', working: 'done', done: 'todo' }
const ADD = {
  folder: { Icon: FolderIcon, name: 'Folder', note: 'A subject or project that holds works and subfolders' },
  work: { Icon: NoteIcon, name: 'Work', note: 'A lab, coursework or task inside this folder' },
  temp: { Icon: StopwatchIcon, name: 'Temporary work', note: 'A one-off job with a stopwatch: see how long it took' },
  challenge: { Icon: FlagIcon, name: 'Challenge work', note: 'Race a countdown: finish before the timer runs out' },
}

// Number that rolls over like a mechanical counter when it changes.
function Roll({ value }) {
  return (
    <span className="relative inline-flex overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ duration: 0.3 }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function Grid({ id, title, hint, list, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-[30px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className="sec">
          {title} · <Roll value={list.length} />
        </h2>
        <p className="muted">{hint}</p>
      </div>
      <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(290px,100%),1fr))] items-stretch gap-x-[26px] gap-y-10">
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </div>
    </section>
  )
}

export default function Workspace() {
  const c = useConsole()
  const { folders, works, focusId, session, link, user, rules, sound, play } = c
  const [here, setHere] = useState(null)
  const [adding, setAdding] = useState(null)
  const [filter, setFilter] = useState('all')
  const [over, setOver] = useState(false)
  const [now, setNow] = useState(() => new Date())
  // pending delete confirmation: { title, body, onYes }
  const [ask, setAsk] = useState(null)
  // id of the work whose files dialog is open
  const [filesFor, setFilesFor] = useState(null)

  // desk tilt: settles from a steep angle on entry, then leans with the cursor
  const base = useMotionValue(50)
  const tx = useMotionValue(0)
  const ty = useMotionValue(0)
  const sx = useSpring(tx, { stiffness: 80, damping: 18 })
  const sy = useSpring(ty, { stiffness: 80, damping: 18 })
  const rotateX = useTransform([base, sy], ([b, y]) => b + y * -4)
  const rotateY = useTransform(sx, (x) => x * 5)

  useEffect(() => {
    const settle = animate(base, TILT, { type: 'spring', stiffness: 40, damping: 12, delay: 0.35 })
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => {
      settle.stop()
      clearInterval(clock)
    }
  }, [base])

  const nowMs = now.getTime()
  const current = folders.find((f) => f.id === here) ?? null
  const hereId = current?.id ?? null
  const trail = pathTo(folders, hereId)
  const subfolders = childFolders(folders, hereId)
  const matches = (w) => filter === 'all' || (filter === 'bookmarked' ? w.bookmarked : w.status === filter)
  const pick = (kind) => sortWorks(works.filter((w) => w.kind === kind && (kind !== 'work' || w.folderId === hereId) && matches(w)))
  const folderWorks = current ? pick('work') : []
  const temps = current ? [] : pick('temp')
  const challenges = current ? [] : pick('challenge')
  const focus = works.find((w) => w.id === focusId)
  const pinned = [...folders.filter((f) => f.bookmarked), ...works.filter((w) => w.bookmarked)]
  const recent = works
    .filter((w) => w.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 6)
  const empty = link === 'live' && folders.length === 0 && works.length === 0
  const where = current ? current.name : 'Home'
  const h = now.getHours()
  const m = now.getMinutes()
  const sec = now.getSeconds()
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const go = (id) => {
    play('click')
    setHere(id)
    setAdding(null)
  }
  const openAdd = (kind) => {
    play('click')
    setAdding(adding === kind ? null : kind)
  }
  const submitAdd = async (fields, taskFiles) => {
    const ok = adding === 'folder' ? await c.addFolder({ ...fields, parentId: hereId }) : await c.addWork({ ...fields, folderId: adding === 'work' ? hereId : undefined }, taskFiles)
    if (ok) play('whoosh')
    return ok
  }
  const removeFolder = () => {
    const { total } = folderProgress(folders, works, current.id)
    const { id, parentId } = current
    play('click')
    setAsk({
      title: `Delete the folder “${current.name}”?`,
      body: `Everything inside it goes too — ${total} work${total === 1 ? '' : 's'} and any subfolders. This cannot be undone.`,
      onYes: () => {
        c.deleteFolder(id)
        setHere(parentId)
      },
    })
  }
  const cardProps = (w, i) => ({
    w,
    index: i,
    nowMs,
    folderName: where,
    onPatch: (patch) => {
      play(patch.status === 'done' ? 'whoosh' : 'click')
      c.updateWork(w.id, patch)
    },
    onTimer: (action) => {
      play('click')
      c.workTimer(w.id, action)
    },
    onDelete: () => {
      play('click')
      setAsk({ title: `Delete “${w.title}”?`, body: 'This work and its recorded time are removed for good. This cannot be undone.', onYes: () => c.deleteWork(w.id) })
    },
    onFiles: () => {
      play('click')
      setFilesFor(w.id)
    },
    onLoad: () => {
      play('whoosh')
      c.setFocusId(w.id)
    },
  })
  const onDrop = (e) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setOver(false)
    if (works.some((w) => w.id === id)) {
      play('whoosh')
      c.setFocusId(id)
    }
  }

  return (
    <Page>
      <div className="room-desk">
        <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
          <filter id="heat-haze" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.07" numOctaves="2" seed="4" result="n">
              <animate attributeName="baseFrequency" values="0.02 0.07;0.03 0.1;0.02 0.07" dur="2.6s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" />
          </filter>
        </svg>
        <Embers count={18} />

        <header className="relative z-2 mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-[18px] px-6 pt-7 pb-[22px]">
          <div className="flex flex-wrap items-center gap-[18px]">
            <motion.div
              className="plate"
              initial={{ y: -60, rotate: -6, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 11, delay: 0.4 }}
            >
              {user?.name} · Unit 01
            </motion.div>
            <h1 aria-label={dateLabel} className="m-0 flex flex-wrap gap-x-[0.3em] text-[30px] font-bold tracking-[-0.01em] text-paper font-stretch-[118%]">
              {dateLabel.split(' ').map((w, i) => (
                <span key={i} className="inline-block overflow-hidden">
                  <motion.span className="inline-block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.55 + i * 0.09 }}>
                    {w}
                  </motion.span>
                </span>
              ))}
            </h1>
          </div>
          <motion.div className="flex flex-wrap items-center gap-2.5" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, duration: 0.6 }}>
            <span className="chip mr-1.5" role="status">
              <span className={link === 'live' ? 'led' : 'led led-off'} aria-hidden="true" />
              {link === 'live' ? 'Synced' : link === 'offline' ? 'API offline' : 'Connecting'}
            </span>
            <button
              type="button"
              className="tool"
              aria-pressed={sound}
              onClick={() => {
                if (!sound) sfx('click')
                c.setSound(!sound)
              }}
            >
              <SoundIcon />
              Sound
            </button>
            <Link className="tool" to="/tutorial">
              <BookIcon />
              Tutorial
            </Link>
            <button
              type="button"
              className="tool"
              onClick={() => {
                play('click')
                c.logout()
              }}
            >
              <LockIcon />
              Sign out
            </button>
          </motion.div>
        </header>

        <div
          className="stage"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            tx.set((e.clientX - r.left) / r.width - 0.5)
            ty.set((e.clientY - r.top) / r.height - 0.5)
          }}
          onMouseLeave={() => {
            tx.set(0)
            ty.set(0)
          }}
        >
          <motion.div className="plane" style={{ rotateX, rotateY }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}>
            <div className="felt flex flex-wrap gap-10">
              <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-11">
                {/* where am I */}
                <nav aria-label="Folder path" className="crumbs" data-aos="fade-right" data-aos-delay="450">
                  <button type="button" className="crumb" aria-current={current ? undefined : 'page'} onClick={() => go(null)}>
                    <HomeIcon />
                    Home
                  </button>
                  {trail.map((f) => (
                    <span key={f.id} className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true">/</span>
                      <button type="button" className="crumb" aria-current={f.id === hereId ? 'page' : undefined} onClick={() => go(f.id)}>
                        {f.name}
                      </button>
                    </span>
                  ))}
                </nav>

                {/* add */}
                <section aria-labelledby="add-h" className="flex flex-col gap-[18px]" data-aos="fade-up" data-aos-delay="550">
                  <h2 id="add-h" className="sec">
                    Add · to <span className="text-laser">{where}</span>
                  </h2>
                  <div className="flex flex-wrap gap-4">
                    {(current ? ['work', 'folder'] : ['folder', 'temp', 'challenge']).map((kind) => {
                      const { Icon, name, note } = ADD[kind]
                      return (
                        <motion.button
                          key={kind}
                          type="button"
                          className="add-tile"
                          aria-pressed={adding === kind}
                          aria-expanded={adding === kind}
                          onClick={() => openAdd(kind)}
                          whileHover={{ y: -5 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <span className="add-plus" aria-hidden="true">
                            +
                          </span>
                          <Icon size={24} />
                          <span className="add-name">{kind === 'folder' && current ? 'Subfolder' : name}</span>
                          <span className="add-note">{kind === 'folder' && current ? `A folder inside ${current.name}` : note}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                  <AnimatePresence initial={false} mode="wait">
                    {adding && <AddPanel key={`${adding}-${hereId}`} kind={adding} where={where} maxFileMb={rules.maxFileMb} onSubmit={submitAdd} onClose={() => setAdding(null)} />}
                  </AnimatePresence>
                </section>

                {empty && (
                  <motion.div className="empty-desk" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
                    <p className="m-0 text-[22px] font-bold text-paper font-stretch-[112%]">Your desk is clear</p>
                    <p className="muted max-w-[46ch]">
                      Start with the Add section above: make a folder for a subject, or drop in a temporary or challenge work. The tutorial explains every part.
                    </p>
                    <Link className="tool" to="/tutorial">
                      <BookIcon />
                      Open the tutorial
                    </Link>
                  </motion.div>
                )}

                {/* this folder's own marks */}
                {current && (
                  <section aria-label={`Folder ${current.name}`} className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="socket" aria-hidden="true">
                        <span className={`core c-${current.status === 'done' ? 'low' : current.pri}`} />
                      </span>
                      <div className="flex min-w-0 flex-col gap-2">
                        <p className="mod-title">{current.name}</p>
                        <p className="due">
                          {STATUS[current.status]} · {folderProgress(folders, works, current.id).done}/{folderProgress(folders, works, current.id).total} works done
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="tool" aria-pressed={current.bookmarked} onClick={() => c.updateFolder(current.id, { bookmarked: !current.bookmarked })}>
                        <BookmarkIcon filled={current.bookmarked} />
                        Bookmark
                      </button>
                      <button type="button" className="tool" title="Change priority" onClick={() => c.updateFolder(current.id, { pri: nextPri(current.pri) })}>
                        <span className={`core c-${current.pri} size-3`} aria-hidden="true" />
                        {PRI[current.pri]}
                      </button>
                      <button type="button" className="tool" aria-pressed={current.status !== 'todo'} title="Change status" onClick={() => c.updateFolder(current.id, { status: NEXT_STATUS[current.status] })}>
                        {STATUS[current.status]}
                      </button>
                      <button type="button" className="tool" aria-label={`Delete folder ${current.name}`} onClick={removeFolder}>
                        <TrashIcon />
                      </button>
                    </div>
                  </section>
                )}

                {/* folders on the rail */}
                {subfolders.length > 0 && (
                  <section aria-labelledby="rail-h" className="flex flex-col gap-[18px]">
                    <h2 id="rail-h" className="sec">
                      {current ? 'Subfolders' : 'Folders'} · <Roll value={subfolders.length} />
                    </h2>
                    <div className="relative flex gap-4 overflow-x-auto px-1.5 pt-[18px] pb-[22px] [scrollbar-width:none]" data-lenis-prevent>
                      <div className="rod" aria-hidden="true" />
                      <AnimatePresence initial={false}>
                        {subfolders.map((f, i) => {
                          const p = folderProgress(folders, works, f.id)
                          return (
                            <motion.button
                              key={f.id}
                              type="button"
                              className={f.status === 'working' ? 'cart on' : 'cart'}
                              onClick={() => go(f.id)}
                              initial={{ x: 200, opacity: 0 }}
                              animate={{ x: 0, opacity: f.status === 'done' ? 0.6 : 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 110, damping: 14, delay: i * 0.05 }}
                              whileHover={{ y: -8 }}
                              whileTap={{ scale: 0.94 }}
                            >
                              {f.bookmarked && (
                                <span className="cart-flag" aria-label="Bookmarked">
                                  <BookmarkIcon filled size={18} />
                                </span>
                              )}
                              <span className="flex items-center gap-2 text-[17px] font-[650] font-stretch-[108%]">
                                <span className={`core c-${f.pri} size-3`} aria-hidden="true" />
                                {f.name}
                              </span>
                              <span className="cart-count">
                                {p.done}/{p.total} done · {childFolders(folders, f.id).length} sub
                              </span>
                              <span className="cart-progress" aria-hidden="true">
                                <span style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
                              </span>
                            </motion.button>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  </section>
                )}

                {/* show only… */}
                {works.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show">
                    <span className="sec mr-2">Show</span>
                    {Object.entries(FILTERS).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className="tool"
                        aria-pressed={filter === key}
                        onClick={() => {
                          play('click')
                          setFilter(key)
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {current && (
                  <Grid id="works-h" title={`Works in ${current.name}`} hint="Drag a card into the crucible to focus on it" list={folderWorks}>
                    {folderWorks.map((w, i) => (
                      <WorkCard key={w.id} {...cardProps(w, i)} />
                    ))}
                  </Grid>
                )}
                {!current && (temps.length > 0 || works.some((w) => w.kind === 'temp')) && (
                  <Grid id="temp-h" title="Temporary works" hint="The stopwatch shows how long each one took" list={temps}>
                    {temps.map((w, i) => (
                      <WorkCard key={w.id} {...cardProps(w, i)} />
                    ))}
                  </Grid>
                )}
                {!current && (challenges.length > 0 || works.some((w) => w.kind === 'challenge')) && (
                  <Grid id="chal-h" title="Challenge works" hint="Finish before the countdown reaches zero" list={challenges}>
                    {challenges.map((w, i) => (
                      <WorkCard key={w.id} {...cardProps(w, i)} />
                    ))}
                  </Grid>
                )}

                {recent.length > 0 && (
                  <section aria-labelledby="tube-h" className="flex flex-col gap-4">
                    <h2 id="tube-h" className="sec">
                      Recently done · <Roll value={works.filter((w) => w.status === 'done').length} /> in total
                    </h2>
                    <div className="tube" aria-live="polite">
                      <AnimatePresence initial={false}>
                        {recent.map((d) => (
                          <motion.span
                            key={d.id}
                            className="capsule cursor-default"
                            initial={{ x: -420, filter: 'blur(4px)', opacity: 0 }}
                            animate={{ x: 0, filter: 'blur(0px)', opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 90, damping: 13 }}
                          >
                            {d.title}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                )}
              </main>

              <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-10">
                <div data-aos="fade-left" data-aos-delay="600">
                  <div className="chrono">
                    <div className="cdial" aria-hidden="true">
                      <span className="hand h" style={{ transform: `rotate(${(h % 12) * 30 + m * 0.5}deg)` }} />
                      <span className="hand m" style={{ transform: `rotate(${m * 6 + sec * 0.1}deg)` }} />
                      <motion.span className="hand s" initial={false} animate={{ rotate: Math.floor(nowMs / 1000) * 6 }} transition={{ type: 'spring', stiffness: 300, damping: 9 }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="sec">Chronometer</p>
                      <p className="m-0 font-mono text-[28px] leading-none font-semibold text-paper">
                        {pad(h)}
                        <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                          :
                        </motion.span>
                        {pad(m)}
                      </p>
                      <p className="muted">
                        <Roll value={works.filter((w) => w.status === 'working').length} /> under working · <Roll value={works.filter((w) => w.status === 'done').length} /> done
                      </p>
                    </div>
                  </div>
                </div>

                <section aria-labelledby="cru-h" className="flex flex-col items-center gap-[22px]" data-aos="zoom-in-up" data-aos-delay="750">
                  <h2 id="cru-h" className="sec self-start">
                    Focus Crucible
                  </h2>
                  <div
                    className={`dome w-full${over ? ' over' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (!over) setOver(true)
                    }}
                    onDragLeave={() => setOver(false)}
                    onDrop={onDrop}
                  >
                    <motion.div className="glass-dome" animate={{ scale: over ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                      <AnimatePresence mode="wait" initial={false}>
                        {focus ? (
                          <motion.div
                            key={focus.id}
                            className="docked"
                            initial={{ y: -70, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -40, opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            transition={{ type: 'spring', stiffness: 220, damping: 11 }}
                          >
                            <span className={`core c-${focus.pri}`} aria-hidden="true" />
                            <span>{focus.title}</span>
                          </motion.div>
                        ) : (
                          <motion.p
                            key="empty"
                            className="muted pb-[30px] text-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            transition={{ duration: 2.6, repeat: Infinity }}
                          >
                            Drop a work under the glass
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <div className="dome-base" aria-hidden="true" />
                  </div>
                  <AnimatePresence>
                    {focus && (
                      <motion.div className="flex flex-wrap justify-center gap-2.5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
                        <Magnetic>
                          <Link className="seal" to="/focus" onClick={() => c.setSession({ minutes: session.minutes, running: true, startedAt: Date.now(), accumulated: 0 })}>
                            Seal the dome
                          </Link>
                        </Magnetic>
                        <button
                          type="button"
                          className="tool"
                          onClick={() => {
                            play('click')
                            c.setFocusId(null)
                          }}
                        >
                          Eject
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {pinned.length > 0 && (
                  <section aria-labelledby="pin-h" className="flex flex-col gap-3.5">
                    <h2 id="pin-h" className="sec">
                      Bookmarks · <Roll value={pinned.length} />
                    </h2>
                    <AnimatePresence initial={false}>
                      {pinned.map((x) => (
                        <motion.button
                          key={x.id}
                          type="button"
                          className="pin"
                          onClick={() => go(x.title === undefined ? x.id : x.folderId)}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 30 }}
                        >
                          <BookmarkIcon filled />
                          <span className="min-w-0 flex-1 truncate">{x.title ?? x.name}</span>
                          <span className="muted">{x.title === undefined ? 'folder' : x.kind}</span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </section>
                )}
              </aside>
            </div>
          </motion.div>
        </div>
        <div className="tiltshift" style={{ '--ts-blur': '4px', '--ts-top': '7%', '--ts-bot': '90%' }} aria-hidden="true" />
        <ConfirmDialog ask={ask} onClose={() => setAsk(null)} />
        <FilesDialog maxMb={rules.maxFileMb} work={works.find((w) => w.id === filesFor) ?? null} onUpload={c.uploadFile} onDelete={c.deleteFile} onClose={() => setFilesFor(null)} />
      </div>
    </Page>
  )
}
