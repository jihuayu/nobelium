'use client'

import { useEffect, useLayoutEffect } from 'react'
import BLOG from '@/config/blog.config'

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function ThemeHydration() {
  useIsoLayoutEffect(() => {
    const appearance = BLOG.appearance as string
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = appearance === 'dark' || (appearance === 'auto' && media.matches)
      const root = document.documentElement
      root.classList.toggle('dark', dark)
      root.classList.remove('color-scheme-unset')
    }

    apply()

    if (appearance !== 'auto') return undefined

    const onChange = () => apply()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    } else if (typeof media.addListener === 'function') {
      media.addListener(onChange)
      return () => media.removeListener(onChange)
    }

    return undefined
  })

  return null
}
