import Link from 'next/link'

interface TagItemProps {
  tag: string
}

const TagItem = ({ tag }: TagItemProps) => (
  <Link href={`/tag/${encodeURIComponent(tag)}`} prefetch={false} className="group">
    <p className="mr-1 rounded-md px-2.5 py-1 border leading-none text-sm border-stone-200 text-stone-500 transition-colors duration-150 ease-out group-hover:border-stone-300 group-hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:group-hover:border-stone-500 dark:group-hover:text-stone-100">
      {tag}
    </p>
  </Link>
)

export default TagItem
