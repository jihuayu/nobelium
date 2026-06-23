'use client'

import { useState, useEffect, useCallback } from 'react'

export default function ImageLightbox() {
  const [src, setSrc] = useState<string | null>(null)
  const [alt, setAlt] = useState('')

  const open = useCallback((imgSrc: string, imgAlt: string) => {
    setSrc(imgSrc)
    setAlt(imgAlt)
  }, [])

  const close = useCallback(() => {
    setSrc(null)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.closest('.notion')) {
        const img = target as HTMLImageElement
        if (img.closest('.notion-asset-caption')) return
        e.preventDefault()
        open(img.src, img.alt || '')
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open])

  useEffect(() => {
    if (!src) return
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', keyHandler)
    return () => document.removeEventListener('keydown', keyHandler)
  }, [src, close])

  if (!src) return null

  return (
    <div
      className="notion-lightbox-overlay"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image preview'}
    >
      <img
        src={src}
        alt={alt}
        className="notion-lightbox-image"
        onClick={e => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="notion-lightbox-close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
