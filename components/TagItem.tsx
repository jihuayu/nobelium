import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/theme.stylex'

interface TagItemProps {
  tag: string
}

const TagItem = ({ tag }: TagItemProps) => (
  <Link href={`/tag/${encodeURIComponent(tag)}`} prefetch={false} className="tag-link">
    <p className={`tag-pill ${stylex.props(styles.pill).className}`}>
      {tag}
    </p>
  </Link>
)

export default TagItem

const styles = stylex.create({
  pill: {
    borderColor: colors.borderDefault,
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    color: colors.textSubtle,
    fontSize: '0.875rem',
    lineHeight: 1,
    marginRight: '0.25rem',
    padding: '0.25rem 0.625rem',
    transitionDuration: '150ms',
    transitionProperty: 'color, border-color',
    transitionTimingFunction: 'ease-out'
  }
})
