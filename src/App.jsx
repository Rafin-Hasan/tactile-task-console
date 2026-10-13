import Lenis from 'lenis'
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useConsole } from './context/console'
import Focus from './pages/Focus.jsx'
import Gatekeeper from './pages/Gatekeeper.jsx'
import Tutorial from './pages/Tutorial.jsx'
import Workspace from './pages/Workspace.jsx'

export default function App() {
  const location = useLocation()
  const { error, user } = useConsole()
  // signed-out visitors are sent back to the vault
  const guard = (page) => (user ? page : <Navigate to="/" replace />)
  const lenis = useRef(null)
  const { scrollYProgress } = useScroll()
  const beam = useSpring(scrollYProgress, { stiffness: 140, damping: 24 })

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const l = new Lenis({ autoRaf: true, lerp: 0.1 })
    lenis.current = l
    return () => {
      l.destroy()
      lenis.current = null
    }
  }, [])

  const toTop = () => {
    if (lenis.current) lenis.current.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }

  if (user === undefined) return null

  return (
    <MotionConfig reducedMotion="user">
      <motion.div className="scroll-beam" style={{ scaleX: beam }} aria-hidden="true" />
      <AnimatePresence mode="wait" onExitComplete={toTop}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Gatekeeper />} />
          <Route path="/workspace" element={guard(<Workspace />)} />
          <Route path="/focus" element={guard(<Focus />)} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="/modules" element={<Navigate to="/tutorial" replace />} />
          <Route path="*" element={<Gatekeeper />} />
        </Routes>
      </AnimatePresence>
      <AnimatePresence>
        {error && (
          <motion.div
            key={error}
            role="alert"
            className="toast"
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 30, x: '-50%' }}
          >
            <span className="led led-off" aria-hidden="true" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
