import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { useLocation } from "react-router-dom"

/** Wrap <Outlet/> in your dashboard layout: <PageTransition><Outlet/></PageTransition> */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={pathname}
          initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-4 px-7 pb-12 pt-7">
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  )
}
