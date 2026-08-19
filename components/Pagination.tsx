import Link from 'next/link'
import loadLocale from '@/assets/i18n'
import { config } from '@/lib/server/config'

interface PaginationProps {
  page: number
  showNext: boolean
}

export default async function Pagination({ page, showNext }: PaginationProps) {
  const locale = await loadLocale('basic', config.lang)
  const currentPage = +page
  let additionalClassName = 'justify-between'
  if (currentPage === 1 && showNext) additionalClassName = 'justify-end'
  if (currentPage !== 1 && !showNext) additionalClassName = 'justify-start'

  return (
    <div className={`mt-8 flex font-medium text-stone-500 dark:text-stone-400 ${additionalClassName}`}>
      {currentPage !== 1 && (
        <Link
          href={
            currentPage - 1 === 1
              ? `${config.path || '/'}`
              : `/page/${currentPage - 1}`
          }
          prefetch={false}
          rel="prev"
          className="group flex items-center gap-1.5 cursor-pointer hover:text-stone-900 dark:hover:text-stone-100 transition-colors duration-150 ease-out"
        >
          <span className="transition-transform duration-150 ease-out group-hover:-translate-x-0.5">←</span>
          {locale.PAGINATION.PREV}
        </Link>
      )}
      {showNext && (
        <Link
          href={`/page/${currentPage + 1}`}
          prefetch={false}
          rel="next"
          className="group flex items-center gap-1.5 cursor-pointer hover:text-stone-900 dark:hover:text-stone-100 transition-colors duration-150 ease-out"
        >
          {locale.PAGINATION.NEXT}
          <span className="transition-transform duration-150 ease-out group-hover:translate-x-0.5">→</span>
        </Link>
      )}
    </div>
  )
}
