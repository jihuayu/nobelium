'use client'

import { useEffect, useRef } from 'react'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/theme.stylex'

export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let rafId: number | null = null

    const update = () => {
      rafId = null
      const bar = barRef.current
      if (!bar) return
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight <= 0
        ? 0
        : Math.min(1, Math.max(0, scrollTop / docHeight))
      bar.style.transform = `scaleX(${progress})`
    }

    const scheduleUpdate = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(update)
    }

    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [])

  return (
    <div {...stylex.props(styles.track)}>
      <div
        ref={barRef}
        {...stylex.props(styles.bar)}
        style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }}
      />
    </div>
  )
}

const styles = stylex.create({
  track: {
    height: '0.125rem',
    insetInline: 0,
    pointerEvents: 'none',
    position: 'fixed',
    top: 0,
    zIndex: 50
  },
  bar: {
    backgroundColor: colors.textQuiet,
    height: '100%',
    transitionDuration: '75ms',
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease-out',
    willChange: 'transform'
  }
})
