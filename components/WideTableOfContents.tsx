'use client'

import { useState, useEffect, useRef } from 'react'
import cn from 'classnames'
import type { TocItem } from '@/lib/notion/getPostBlocks'

interface WideTableOfContentsProps {
  toc: TocItem[]
}

function buildTargetId(id: string) {
  return `notion-heading-${id.replaceAll('-', '')}`
}

export default function WideTableOfContents({ toc }: WideTableOfContentsProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [activeId, setActiveId] = useState<string>('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!toc.length) return undefined
    const headings = toc
      .map(item => document.getElementById(buildTargetId(item.id)))
      .filter((el): el is HTMLElement => !!el)

    if (!headings.length) return undefined

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-72px 0px -70% 0px' }
    )

    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [toc])

  useEffect(() => {
    if (!open) return undefined
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!toc || !toc.length) return null

  const activeItem = toc.find(item => buildTargetId(item.id) === activeId)

  return (
    <div
      ref={panelRef}
      className="fixed bottom-6 right-6 z-30 hidden md:block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {open && (
        <nav
          aria-label="Table of contents"
          className="mb-2 max-h-[60vh] w-72 overflow-y-auto rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-3 shadow-lg"
        >
          {toc.map(node => (
            <a
              key={node.id}
              href={`#${buildTargetId(node.id)}`}
              onClick={() => setOpen(false)}
              className={cn(
                'block w-full py-1.5 px-2 text-left text-sm rounded transition-colors duration-150 cursor-pointer',
                activeId === buildTargetId(node.id)
                  ? 'text-stone-900 dark:text-stone-100 bg-stone-200/60 dark:bg-stone-700/40 font-medium'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/40 dark:hover:bg-stone-700/30'
              )}
              style={{ paddingLeft: (node.indentLevel * 16 + 8) + 'px' }}
              title={node.text}
            >
              <span className="block whitespace-nowrap overflow-hidden text-ellipsis">{node.text}</span>
            </a>
          ))}
        </nav>
      )}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle table of contents"
        aria-expanded={open}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full border shadow-md transition-all duration-150 cursor-pointer',
          open
            ? 'border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200'
            : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:border-stone-300 dark:hover:border-stone-600'
        )}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <>
              <line x1="4" y1="6" x2="14" y2="6" />
              <line x1="4" y1="12" x2="18" y2="12" />
              <line x1="4" y1="18" x2="10" y2="18" />
            </>
          )}
        </svg>
      </button>
      {!open && hovered && activeItem && (
        <span className="absolute bottom-full right-0 mb-2 max-w-[200px] truncate rounded bg-stone-800 dark:bg-stone-700 px-2 py-1 text-xs text-stone-100 dark:text-stone-200 pointer-events-none">
          {activeItem.text}
        </span>
      )}
    </div>
  )
}
