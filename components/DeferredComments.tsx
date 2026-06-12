'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

interface DeferredCommentsProps {
  issueTerm: string
  repo: string
  appearance: 'light' | 'dark' | 'auto'
}

const Utterances = dynamic(() => import('@/components/Utterances'), {
  ssr: false
})

export default function DeferredComments({ issueTerm, repo, appearance }: DeferredCommentsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [suppressed, setSuppressed] = useState(false)

  useEffect(() => {
    if (enabled) return undefined
    if (suppressed) return undefined
    if (!containerRef.current) return undefined

    let idleTimer: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null
    let controller: AbortController | null = null
    let cancelled = false
    const activate = async () => {
      controller = new AbortController()
      try {
        const response = await fetch('/api/request-geo', {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store'
        })
        const payload = await response.json().catch(() => null)
        if (cancelled || controller.signal.aborted) return
        if (response.ok && payload?.hideComments === true) {
          setSuppressed(true)
          return
        }
      } catch {
        if (cancelled || controller?.signal.aborted) return
      }

      if (!cancelled) setEnabled(true)
    }

    const scheduleActivate = () => {
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        idleId = window.requestIdleCallback(activate, { timeout: 1200 })
      } else {
        idleTimer = globalThis.setTimeout(activate, 160)
      }
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      scheduleActivate()
    }, {
      root: null,
      rootMargin: '240px 0px',
      threshold: 0.01
    })

    observer.observe(containerRef.current)

    return () => {
      cancelled = true
      controller?.abort()
      observer.disconnect()
      if (idleId !== null && typeof window !== 'undefined' && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId)
      }
      if (idleTimer !== null) {
        globalThis.clearTimeout(idleTimer)
      }
    }
  }, [enabled, suppressed])

  if (suppressed) return null

  return (
    <div ref={containerRef}>
      {enabled ? (
        <Utterances issueTerm={issueTerm} repo={repo} appearance={appearance} />
      ) : (
        <div className="h-24 rounded border border-zinc-200/70 dark:border-zinc-700/70 bg-zinc-50/60 dark:bg-zinc-800/40" />
      )}
    </div>
  )
}
