import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import loadLocale from '@/assets/i18n'
import { config } from '@/lib/server/config'
import { appStyles } from '@/styles/app.stylex'

interface PaginationProps {
  page: number
  showNext: boolean
}

export default async function Pagination({ page, showNext }: PaginationProps) {
  const locale = await loadLocale('basic', config.lang)
  const currentPage = +page
  const alignEnd = currentPage === 1 && showNext
  const alignStart = currentPage !== 1 && !showNext

  return (
    <div {...stylex.props(styles.pagination, alignEnd ? styles.end : alignStart ? styles.start : styles.between)}>
      {currentPage !== 1 && (
        <Link
          href={
            currentPage - 1 === 1
              ? `${config.path || '/'}`
              : `/page/${currentPage - 1}`
          }
          prefetch={false}
          rel="prev"
          className={`direction-link direction-link-back ${stylex.props(appStyles.action, styles.link).className}`}
        >
          <span className={`direction-arrow ${stylex.props(styles.arrow).className}`}>←</span>
          {locale.PAGINATION.PREV}
        </Link>
      )}
      {showNext && (
        <Link
          href={`/page/${currentPage + 1}`}
          prefetch={false}
          rel="next"
          className={`direction-link direction-link-next ${stylex.props(appStyles.action, styles.link).className}`}
        >
          {locale.PAGINATION.NEXT}
          <span className={`direction-arrow ${stylex.props(styles.arrow).className}`}>→</span>
        </Link>
      )}
    </div>
  )
}

const styles = stylex.create({
  pagination: {
    display: 'flex',
    fontWeight: 500
  },
  between: { justifyContent: 'space-between' },
  end: { justifyContent: 'flex-end' },
  start: { justifyContent: 'flex-start' },
  link: {
    alignItems: 'center',
    display: 'flex',
    gap: '0.375rem'
  },
  arrow: {
    transitionDuration: '150ms',
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease-out'
  }
})
