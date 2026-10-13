import AOS from 'aos'
import { motion } from 'motion/react'
import { useEffect } from 'react'

const shut = { duration: 0.55, ease: [0.7, 0, 0.2, 1] }

// Route wrapper: the page fades through while two steel shutters open and close over it.
export default function Page({ children }) {
  useEffect(() => {
    const t = setTimeout(() => AOS.refreshHard(), 120)
    return () => clearTimeout(t)
  }, [])
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.4 }}
        transition={{ duration: 0.45 }}
      >
        {children}
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="shutter shutter-top"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        transition={shut}
      />
      <motion.div
        aria-hidden="true"
        className="shutter shutter-bot"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        transition={shut}
      />
    </>
  )
}
