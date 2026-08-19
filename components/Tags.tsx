import Link from 'next/link'

interface TagsProps {
  tags: Record<string, number>
  currentTag?: string
}

const Tags = ({ tags, currentTag }: TagsProps) => {
  if (!tags) return null
  return (
    <div className="tag-container">
      <ul className="flex max-w-full mt-4 overflow-x-auto">
        {Object.keys(tags).map(key => {
          const selected = key === currentTag
          return (
            <li
              key={key}
              className={`mr-3 whitespace-nowrap rounded-md border transition-colors duration-150 ease-out ${
                selected
                  ? 'border-stone-400 font-medium text-stone-900 dark:border-stone-500 dark:text-stone-100'
                  : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-100'
              }`}
            >
              <Link
                key={key}
                href={
                  selected
                    ? '/search'
                    : `/tag/${encodeURIComponent(key)}`
                }
                prefetch={false}
                className="px-4 py-2 block"
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
