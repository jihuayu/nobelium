'use client'

import { useState, useEffect, useRef } from 'react'
import * as stylex from '@stylexjs/stylex'
import type { TocItem } from '@/lib/notion/getPostBlocks'
import { colors } from '@/styles/theme.stylex'

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
      {...stylex.props(styles.root)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {open && (
        <nav
          aria-label="Table of contents"
          {...stylex.props(styles.panel)}
        >
          {toc.map(node => (
            <a
              key={node.id}
              href={`#${buildTargetId(node.id)}`}
              onClick={() => setOpen(false)}
              {...stylex.props(styles.item, activeId === buildTargetId(node.id) ? styles.activeItem : styles.inactiveItem)}
              style={{ paddingLeft: (node.indentLevel * 16 + 8) + 'px' }}
              title={node.text}
            >
              <span {...stylex.props(styles.itemLabel)}>{node.text}</span>
            </a>
          ))}
        </nav>
      )}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle table of contents"
        aria-expanded={open}
        {...stylex.props(styles.button, open ? styles.openButton : styles.closedButton)}
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
        <span {...stylex.props(styles.tooltip)}>
          {activeItem.text}
        </span>
      )}
    </div>
  )
}

const styles = stylex.create({
  root: {
    bottom: '1.5rem',
    display: {
      default: 'none',
      '@media (min-width: 768px)': 'block'
    },
    position: 'fixed',
    right: '1.5rem',
    zIndex: 30
  },
  panel: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderDefault,
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    marginBottom: '0.5rem',
    maxHeight: '60vh',
    overflowY: 'auto',
    padding: '0.75rem',
    width: '18rem'
  },
  item: {
    borderRadius: '0.25rem',
    cursor: 'pointer',
    display: 'block',
    fontSize: '0.875rem',
    padding: '0.375rem 0.5rem',
    textAlign: 'left',
    transitionDuration: '150ms',
    transitionProperty: 'color, background-color',
    width: '100%'
  },
  activeItem: {
    backgroundColor: colors.surfaceActiveAlpha,
    color: colors.textPrimary,
    fontWeight: 500
  },
  inactiveItem: {
    backgroundColor: {
      ':hover': colors.surfaceHoverAlpha
    },
    color: {
      default: colors.textSubtle,
      ':hover': colors.textPrimary
    }
  },
  itemLabel: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  button: {
    alignItems: 'center',
    borderRadius: '9999px',
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    cursor: 'pointer',
    display: 'flex',
    height: '2.75rem',
    justifyContent: 'center',
    transitionDuration: '150ms',
    transitionProperty: 'all',
    width: '2.75rem'
  },
  openButton: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderStrong,
    color: colors.textStrong
  },
  closedButton: {
    backgroundColor: colors.surfaceElevated,
    borderColor: {
      default: colors.borderDefault,
      ':hover': colors.borderStrong
    },
    color: {
      default: colors.textSubtle,
      ':hover': colors.textPrimary
    }
  },
  tooltip: {
    backgroundColor: colors.surfaceOverlay,
    borderRadius: '0.25rem',
    bottom: '100%',
    color: colors.textTooltip,
    fontSize: '0.75rem',
    marginBottom: '0.5rem',
    maxWidth: '200px',
    overflow: 'hidden',
    padding: '0.25rem 0.5rem',
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
})
