'use client'

import { useEffect, useLayoutEffect } from 'react'

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface HeaderBehaviorProps {
  useSticky: boolean
  fullWidth?: boolean
}

const WIDTH_STORAGE_KEY = 'notion-header-fullwidth'

export default function HeaderBehavior({ useSticky, fullWidth = false }: HeaderBehaviorProps) {
  useIsoLayoutEffect(() => {
    const navEl = document.getElementById('sticky-nav')
    const sentinelEl = document.getElementById('header-sentinel')
    const titleEl = document.getElementById('header-title')

    if (!navEl || !sentinelEl) return undefined

    // Width transition animation: only animate when crossing wide↔normal boundary
    let prevWide: boolean | null = null
    try {
      const stored = sessionStorage.getItem(WIDTH_STORAGE_KEY)
      prevWide = stored === null ? null : stored === 'true'
    } catch {
      prevWide = null
    }

    if (prevWide !== null && prevWide !== fullWidth) {
      const animClass = fullWidth ? 'notion-header-anim-wide' : 'notion-header-anim-normal'
      navEl.classList.add(animClass)
      // Remove the animation class after it completes so it can be re-added later
      const cleanup = () => navEl.classList.remove(animClass)
      navEl.addEventListener('animationend', cleanup, { once: true })
    }

    try {
      sessionStorage.setItem(WIDTH_STORAGE_KEY, String(fullWidth))
    } catch {
      // ignore
    }

    if (!useSticky) {
      navEl.classList.add('remove-sticky')
      return undefined
    }

    let collapseRaf: number | null = null
    const observer = new window.IntersectionObserver(([entry]) => {
      if (collapseRaf !== null) {
        window.cancelAnimationFrame(collapseRaf)
      }

      collapseRaf = window.requestAnimationFrame(() => {
        const sentinelBottom = entry?.boundingClientRect?.bottom ?? 0
        const shouldCollapse = sentinelBottom <= 0 && window.scrollY > 0 && !entry.isIntersecting
        navEl.classList.toggle('sticky-nav-full', shouldCollapse)
        collapseRaf = null
      })
    })

    const handleNavClick = (event: MouseEvent) => {
      const target = event.target as EventTarget | null
      if (!target) return
      if (target !== navEl && target !== titleEl) return
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    observer.observe(sentinelEl)
    navEl.addEventListener('click', handleNavClick)

    return () => {
      if (collapseRaf !== null) {
        window.cancelAnimationFrame(collapseRaf)
      }
      observer.disconnect()
      navEl.removeEventListener('click', handleNavClick)
    }
  }, [useSticky, fullWidth])

  return null
}
