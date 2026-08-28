import cn from 'classnames'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/theme.stylex'
import type { CSSProperties } from 'react'
import type { TocItem } from '@/lib/notion/getPostBlocks'

interface TableOfContentsProps {
  toc: TocItem[]
  className?: string
  style?: CSSProperties
}

export default function TableOfContents({ toc, className, style }: TableOfContentsProps) {
  if (!toc || !toc.length) return null

  function buildTargetId(id: string) {
    return `notion-heading-${id.replaceAll('-', '')}`
  }

  return (
    <nav
      aria-label="Table of contents"
      className={cn(className, stylex.props(styles.navigation).className)}
      style={style}
    >
      {toc.map(node => (
        <div key={node.id}>
          <a
            href={`#${buildTargetId(node.id)}`}
            {...stylex.props(styles.link)}
            style={{ paddingLeft: (node.indentLevel * 16) + 'px' }}
            title={node.text}
          >
            {node.text}
          </a>
        </div>
      ))}
    </nav>
  )
}

const styles = stylex.create({
  navigation: {
    color: colors.textQuiet,
    fontSize: '0.875rem',
    paddingLeft: '0.5rem'
  },
  link: {
    color: {
      ':hover': colors.textPrimary
    },
    cursor: 'pointer',
    display: 'block',
    overflow: 'hidden',
    paddingBlock: '0.25rem',
    textAlign: 'left',
    textOverflow: 'ellipsis',
    transitionDuration: '150ms',
    transitionProperty: 'color',
    transitionTimingFunction: 'ease-out',
    whiteSpace: 'nowrap',
    width: '100%'
  }
})
