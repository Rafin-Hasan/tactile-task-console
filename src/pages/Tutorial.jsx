import { motion } from 'motion/react'
import Tilt from 'react-parallax-tilt'
import { Link } from 'react-router-dom'
import { BookmarkIcon, ChevronIcon, DomeIcon, FlagIcon, FolderIcon, NoteIcon, StopwatchIcon, TrashIcon } from '../components/Icons.jsx'
import Page from '../components/Page.jsx'
import { useConsole } from '../context/console'

const tilt = {
  tiltMaxAngleX: 7,
  tiltMaxAngleY: 7,
  glareEnable: true,
  glareMaxOpacity: 0.14,
  glareColor: '#d8fff6',
  glarePosition: 'all',
  glareBorderRadius: '24px',
  scale: 1.02,
  transitionSpeed: 900,
}

const CONTENTS = [
  ['vault', 'Open your vault'],
  ['add', 'The Add section'],
  ['folders', 'Folders and subfolders'],
  ['temp', 'Temporary works'],
  ['challenge', 'Challenge works'],
  ['marks', 'Bookmark, priority, working, done'],
  ['focus', 'Focus Crucible'],
  ['saving', 'Saving and syncing'],
]

// One numbered chapter: explanation on the left, a live sample of the real control on the right.
function Chapter({ id, n, title, children, demo }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-10 grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
      <div className="flex flex-col gap-5" data-aos="fade-up">
        <div className="flex items-center gap-4">
          <span className="step-num" aria-hidden="true">
            {n}
          </span>
          <h2 id={`${id}-h`} className="m-0 text-[clamp(22px,3vw,30px)] font-bold tracking-[-0.01em] text-paper font-stretch-[114%]">
            {title}
          </h2>
        </div>
        {children}
      </div>
      <div data-aos="zoom-in" data-aos-delay="150">
        {demo}
      </div>
    </section>
  )
}

const Sample = ({ children, className = '' }) => (
  <Tilt {...tilt}>
    <div className={`shell spec gap-4 ${className}`}>{children}</div>
  </Tilt>
)

const title = 'How the console works'.split(' ')

export default function Tutorial() {
  const { user, rules } = useConsole()
  return (
    <Page>
      <div className="sheet overflow-hidden">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-20 px-5 py-12 md:p-16">
          <header className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <p className="sec" data-aos="fade-down">
                Task Console · tutorial
              </p>
              <h1 aria-label="How the console works" className="m-0 flex flex-wrap gap-x-[0.28em] text-[clamp(30px,5vw,48px)] font-bold tracking-[-0.015em] font-stretch-[120%]">
                {title.map((w, i) => (
                  <span key={w} className="inline-block overflow-hidden pb-1">
                    <motion.span
                      className="inline-block"
                      initial={{ y: '110%', rotate: 6 }}
                      animate={{ y: 0, rotate: 0 }}
                      transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.6 + i * 0.1 }}
                    >
                      {w}
                    </motion.span>
                  </span>
                ))}
              </h1>
              <p className="guide" data-aos="fade-up" data-aos-delay="200">
                Your workspace starts empty. You fill it from one place — the <b>Add section</b> — with folders, temporary works and challenge works, then mark
                each one as you go.
              </p>
            </div>
            <Link className="tool" to={user ? '/workspace' : '/'} data-aos="fade-left" data-aos-delay="300">
              <ChevronIcon dir="left" />
              {user ? 'Back to workspace' : 'Back to the vault'}
            </Link>
          </header>

          <nav aria-label="Contents" className="flex flex-wrap gap-2.5" data-aos="fade-up">
            {CONTENTS.map(([id, label], i) => (
              <a key={id} className="tool" href={`#${id}`}>
                <span className="text-laser">{String(i + 1).padStart(2, '0')}</span>
                {label}
              </a>
            ))}
          </nav>

          <Chapter
            id="vault"
            n="1"
            title="Open your vault"
            demo={
              <Sample>
                <p className="sec">Your code</p>
                <div className="pips justify-start">
                  {['4', '8', '2', '1'].map((d, i) => (
                    <motion.span
                      key={i}
                      className="pip on"
                      initial={{ scale: 0.4, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.3 + i * 0.18 }}
                    >
                      {d}
                    </motion.span>
                  ))}
                </div>
                <p className="spec-cap">An example only. Yours is whatever you dialled when you created the vault.</p>
              </Sample>
            }
          >
            <p className="guide">
              There are no usernames. Your <b>vault code</b> is your account: dial it on the combination lock and turn the handle.
            </p>
            <ul className="guide-list">
              <li>
                <b>New here:</b> choose “Create a vault”, dial a code of {rules.codeMin} to {rules.codeMax} digits and turn the handle. A name and an extra password are optional.
              </li>
              <li>
                <b>Dialling:</b> drag or scroll the dial and press its centre to set a digit, or simply type the digits.
              </li>
              <li>
                <b>Keep it safe:</b> anyone who knows the code opens the vault, and a forgotten code cannot be recovered. Add the extra password for a second lock.
              </li>
            </ul>
          </Chapter>

          <Chapter
            id="add"
            n="2"
            title="The Add section"
            demo={
              <div className="flex flex-col gap-4">
                {[
                  [FolderIcon, 'Folder', 'Holds works and subfolders'],
                  [StopwatchIcon, 'Temporary work', 'A one-off job with a stopwatch'],
                  [FlagIcon, 'Challenge work', 'A job you race against a countdown'],
                ].map(([Icon, name, note], i) => (
                  <motion.div
                    key={name}
                    className="add-tile min-h-0 cursor-default"
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 14, delay: i * 0.12 }}
                  >
                    <span className="add-plus" aria-hidden="true">
                      +
                    </span>
                    <Icon size={24} />
                    <span className="add-name">{name}</span>
                    <span className="add-note">{note}</span>
                  </motion.div>
                ))}
              </div>
            }
          >
            <p className="guide">
              Everything is created from the <b>Add</b> row at the top of the workspace. Press a tile, fill in the short form and it is saved straight away.
            </p>
            <ul className="guide-list">
              <li>
                <b>At Home</b> the tiles are Folder, Temporary work and Challenge work.
              </li>
              <li>
                <b>Inside a folder</b> the tiles change to Work and Subfolder, and whatever you add goes into that folder.
              </li>
              <li>The heading always says where the new item will land, for example “Add · to Physics”.</li>
            </ul>
          </Chapter>

          <Chapter
            id="folders"
            n="3"
            title="Folders and subfolders"
            demo={
              <Sample>
                <p className="crumbs">
                  <span className="crumb cursor-default">Home</span>/<span className="crumb cursor-default">Physics</span>/
                  <span className="crumb cursor-default" aria-current="page">
                    Labs
                  </span>
                </p>
                <div className="cart on w-full cursor-default">
                  <span className="flex items-center gap-2 text-[17px] font-[650]">
                    <span className="core c-high size-3" aria-hidden="true" />
                    Labs
                  </span>
                  <span className="cart-count">2/5 done · 1 sub</span>
                  <span className="cart-progress" aria-hidden="true">
                    <motion.span initial={{ width: 0 }} whileInView={{ width: '40%' }} transition={{ duration: 1.2, delay: 0.4 }} />
                  </span>
                </div>
                <p className="spec-cap">A folder card shows how many of its works are done, counting its subfolders too.</p>
              </Sample>
            }
          >
            <p className="guide">
              A <b>folder</b> groups the works that belong together. A typical setup is one folder per subject, with its labs and coursework inside.
            </p>
            <ul className="guide-list">
              <li>
                <b>Open</b> a folder by pressing its card on the rail. The path at the top (Home / Physics / Labs) takes you back up.
              </li>
              <li>
                <b>Add works</b> to it with the Work tile: give a title, a priority and, if you like, a due date.
              </li>
              <li>
                <b>Attach files:</b> every work has a paperclip button with two shelves. <b>The task</b> holds what you were asked to do (the lab sheet or brief,
                e.g. a PDF) and <b>My work</b> holds what you handed in. You can also pick task files while adding the work. Come back any time to open or download
                them; each file can be up to {rules.maxFileMb} MB.
              </li>
              <li>
                <b>Subfolders</b> go up to five levels deep — Physics → Labs → Term 2, for example.
              </li>
              <li>
                <b>Deleting</b> a folder removes every subfolder and work inside it. You are asked to confirm first.
              </li>
            </ul>
          </Chapter>

          <Chapter
            id="temp"
            n="4"
            title="Temporary works"
            demo={
              <Sample>
                <span className="tag-stamp">Temporary</span>
                <p className="mod-title text-[17px]">Fix the printer driver</p>
                <div className="timer">
                  <span className="timer-big">00:18:42</span>
                  <span className="timer-small">spent so far · running</span>
                </div>
                <div className="flex gap-2">
                  <span className="tool" aria-pressed="true">
                    Pause
                  </span>
                </div>
              </Sample>
            }
          >
            <p className="guide">
              A <b>temporary work</b> is a one-off job that does not belong to any folder. It carries a stopwatch so you can see how long it really took.
            </p>
            <ul className="guide-list">
              <li>
                <b>Start clock</b> begins timing and marks the work as under working.
              </li>
              <li>
                <b>Pause</b> and <b>Resume</b> whenever you step away; only the running time is counted.
              </li>
              <li>
                Flip the brass switch to mark it <b>done</b>. The clock stops and the card keeps the total as “time it took”.
              </li>
            </ul>
          </Chapter>

          <Chapter
            id="challenge"
            n="5"
            title="Challenge works"
            demo={
              <Sample>
                <span className="tag-stamp">Challenge</span>
                <p className="mod-title text-[17px]">Finish problem set 4</p>
                <div className="timer urgent">
                  <span className="timer-big">04:31</span>
                  <span className="timer-small">left of 30 min</span>
                  <span className="bar" aria-hidden="true">
                    <motion.span initial={{ width: '20%' }} whileInView={{ width: '85%' }} transition={{ duration: 2.4, delay: 0.3 }} />
                  </span>
                </div>
                <p className="spec-cap">The readout turns amber in the last fifth of the time.</p>
              </Sample>
            }
          >
            <p className="guide">
              A <b>challenge work</b> has a time limit you set when adding it (1 minute to 24 hours). Once started, a countdown runs and you have to finish before it
              reaches zero.
            </p>
            <ul className="guide-list">
              <li>
                <b>Start challenge</b> starts the countdown. It <b>cannot be paused</b> — that is the challenge.
              </li>
              <li>
                Mark it <b>done</b> in time and the card records how much time you had to spare.
              </li>
              <li>
                If the countdown hits zero the card reads “time is up”. Press <b>Retry</b> for a fresh attempt, or mark it done anyway and it records how far over you
                went.
              </li>
            </ul>
          </Chapter>

          <Chapter
            id="marks"
            n="6"
            title="Bookmark, priority, working, done"
            demo={
              <div className="flex flex-col gap-3">
                {[
                  [<span key="v" className="text-amber"><BookmarkIcon filled size={20} /></span>, 'Bookmark', 'Pins it to the top and to the Bookmarks list'],
                  [<span key="v" className="core c-high" />, 'Priority', 'High glows amber, Medium teal, Low grey'],
                  [<span key="v" className="tool" aria-pressed="true">Working</span>, 'Under working', 'Teal outline: you are on it now'],
                  [<span key="v" className="rocker flipped h-10 w-16 cursor-default"><span className="paddle" style={{ animation: 'flip-loop 2.4s ease-in-out infinite' }} /></span>, 'Done', 'Flip the brass switch; flip back to reopen'],
                ].map(([visual, name, note], i) => (
                  <motion.div
                    key={name}
                    className="cue"
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 14, delay: i * 0.1 }}
                  >
                    <span className="grid w-[76px] flex-none place-items-center" aria-hidden="true">
                      {visual}
                    </span>
                    <p className="spec-cap">
                      <b>{name}</b> — {note}
                    </p>
                  </motion.div>
                ))}
              </div>
            }
          >
            <p className="guide">
              Every folder and every work — plain, temporary or challenge — carries the same four marks.
            </p>
            <ul className="guide-list">
              <li>
                <b>Bookmark:</b> the ribbon in a card’s top corner. Bookmarked works sort first and appear in the Bookmarks list on the right, one click away from
                anywhere.
              </li>
              <li>
                <b>Priority:</b> press the priority button to step through High, Medium and Low. Within a list, higher priority comes first.
              </li>
              <li>
                <b>Under working:</b> press Start on a work. Temporary and challenge works enter this state when their clock starts.
              </li>
              <li>
                <b>Done:</b> the brass switch. Done works sink to the end of their list and show in “Recently done”.
              </li>
              <li>
                The <b>Show</b> row filters every list to All, Bookmarked, Under working or Done.
              </li>
              <li>
                <span className="inline-flex translate-y-0.5">
                  <TrashIcon />
                </span>{' '}
                deletes a work for good, after a confirmation.
              </li>
            </ul>
          </Chapter>

          <Chapter
            id="focus"
            n="7"
            title="Focus Crucible"
            demo={
              <Sample className="items-center">
                <div className="dome w-full">
                  <div className="glass-dome">
                    <motion.div
                      className="docked"
                      initial={{ y: -60, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 11, delay: 0.4 }}
                    >
                      <span className="core c-high" aria-hidden="true" />
                      <span>Lab 3 report</span>
                    </motion.div>
                  </div>
                  <div className="dome-base" aria-hidden="true" />
                </div>
              </Sample>
            }
          >
            <p className="guide">
              The glass dome on the right of the workspace holds the <b>one work you are concentrating on</b>.
            </p>
            <ul className="guide-list">
              <li>
                Drag a card under the glass, or press its{' '}
                <span className="inline-flex translate-y-0.5">
                  <DomeIcon />
                </span>{' '}
                button.
              </li>
              <li>
                <b>Seal the dome</b> opens a distraction-free screen with an hourglass session of 5, 15, 25 or 50 minutes.
              </li>
              <li>
                The session keeps real time: close the page and it is still counting when you come back. <b>Release dome</b> returns to the workspace.
              </li>
            </ul>
          </Chapter>

          <Chapter
            id="saving"
            n="8"
            title="Saving and syncing"
            demo={
              <Sample>
                <span className="chip">
                  <span className="led" aria-hidden="true" />
                  Synced
                </span>
                <span className="chip">
                  <span className="led led-off" aria-hidden="true" />
                  API offline
                </span>
                <p className="spec-cap">The light in the workspace header tells you which state you are in.</p>
              </Sample>
            }
          >
            <p className="guide">
              There is no save button. Every change is written to your vault the moment you make it and shows up in your other tabs and devices within a few seconds.
            </p>
            <ul className="guide-list">
              <li>
                <b>Synced</b> means the change is saved. <b>API offline</b> means the server is not reachable and changes will not be kept.
              </li>
              <li>Clocks are stored as start times, so stopwatches and countdowns stay correct through reloads.</li>
              <li>
                <b>Sign out</b> locks the vault. Dial your code to open it again.
              </li>
            </ul>
            <div className="pt-2">
              <Link className="seal" to={user ? '/workspace' : '/'}>
                <NoteIcon />
                {user ? 'Go to my workspace' : 'Open the vault'}
              </Link>
            </div>
          </Chapter>
        </div>
      </div>
    </Page>
  )
}
