import Link from 'next/link'

interface TagItemProps {
  tag: string
}

const TagItem = ({ tag }: TagItemProps) => (
  <Link href={`/tag/${encodeURIComponent(tag)}`} prefetch={false} className="group">
    <p className="mr-1 rounded-md px-2.5 py-1 border leading-none text-sm border-zinc-200 text-zinc-500 transition-colors duration-150 ease-out group-hover:border-zinc-300 group-hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:group-hover:border-zinc-500 dark:group-hover:text-zinc-100">
      {tag}
    </p>
  </Link>
)

export default TagItem
