import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/theme.stylex'

interface TagsProps {
  tags: Record<string, number>
  currentTag?: string
}

const Tags = ({ tags, currentTag }: TagsProps) => {
  if (!tags) return null
  return (
    <div className="tag-container">
      <ul {...stylex.props(styles.list)}>
        {Object.keys(tags).map(key => {
          const selected = key === currentTag
          return (
            <li
              key={key}
              {...stylex.props(styles.item, selected ? styles.selected : styles.unselected)}
            >
              <Link
                key={key}
                href={
                  selected
                    ? '/search'
                    : `/tag/${encodeURIComponent(key)}`
                }
                prefetch={false}
                {...stylex.props(styles.link)}
              >
                {`${key} (${tags[key]})`}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Tags

const styles = stylex.create({
  list: {
    display: 'flex',
    marginTop: '1rem',
    maxWidth: '100%',
    overflowX: 'auto'
  },
  item: {
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    fontWeight: 500,
    marginRight: '0.75rem',
    transitionDuration: '150ms',
    transitionProperty: 'color, background-color, border-color',
    transitionTimingFunction: 'ease-out',
    whiteSpace: 'nowrap'
  },
  selected: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
    color: colors.textOnEmphasis
  },
  unselected: {
    backgroundColor: 'transparent',
    borderColor: {
      default: colors.borderDefault,
      ':hover': colors.borderFocus
    },
    color: {
      default: colors.textSubtle,
      ':hover': colors.textPrimary
    }
  },
  link: {
    display: 'block',
    padding: '0.5rem 1rem'
  }
})
