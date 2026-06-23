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
              className={`mr-3 font-medium border whitespace-nowrap rounded-md transition-colors duration-150 ease-out ${
                selected
                  ? 'text-white bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                  : 'bg-transparent border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100'
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
