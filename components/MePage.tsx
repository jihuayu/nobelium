import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatDate } from '@/lib/formatDate'
import { formatQuote, isExternalHref, padIndex } from '@/lib/profile'

export interface MePagePost {
  id: string
  title: string
  slug: string
  tags: string[]
  date: number
}

export interface MePageSocial {
  label: string
  href: string
}

export interface MePageCopy {
  recent: string
  guestbook: string
  posts: string
  days: string
  viewAll: string
}

interface MePageProps {
  greeting: string
  name: string
  tagline: string
  quote: string
  postCount: number
  days: number
  season: string
  socials: MePageSocial[]
  posts: MePagePost[]
  blogPath: string
  copy: MePageCopy
  lang: string
  timezone: string
  guestbook?: ReactNode
}

function postHref(blogPath: string, slug: string): string {
  const base = `${blogPath || ''}`.replace(/\/+$/, '')
  return `${base}/${slug}`
}

function SocialLink({ social }: { social: MePageSocial }) {
  const external = isExternalHref(social.href)
  const className = 'text-sm text-stone-500 transition-colors duration-150 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'

  if (!external) {
    return (
      <Link href={social.href} className={className}>
        {social.label}
      </Link>
    )
  }

  const isMail = social.href.startsWith('mailto:')
  return (
    <a
      href={social.href}
      className={className}
      rel={isMail ? 'me' : 'me noopener noreferrer'}
      target={isMail ? undefined : '_blank'}
    >
      {social.label}
    </a>
  )
}

export default function MePage({
  greeting,
  name,
  tagline,
  quote,
  postCount,
  days,
  season,
  socials,
  posts,
  blogPath,
  copy,
  lang,
  timezone,
  guestbook
}: MePageProps) {
  const quoted = formatQuote(quote)
  const homeHref = blogPath || '/'

  return (
    <article className="pb-8">
      <header className="pt-6 md:pt-10">
        {greeting ? (
          <p className="text-sm tracking-wide text-stone-400 dark:text-stone-500">
            {greeting}
          </p>
        ) : null}
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-stone-900 md:text-6xl dark:text-stone-100">
          {name}
        </h1>
        {tagline ? (
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600 md:text-xl dark:text-stone-300">
            {tagline}
          </p>
        ) : null}
      </header>

      {quoted ? (
        <blockquote className="mt-10 border-l border-stone-200 pl-4 font-serif text-base leading-relaxed text-stone-500 italic dark:border-stone-700 dark:text-stone-400">
          {quoted}
        </blockquote>
      ) : null}

      <p className="mt-8 text-sm tabular-nums tracking-wide text-stone-400 dark:text-stone-500">
        {postCount} {copy.posts}
        <span className="mx-2 text-stone-300 dark:text-stone-600" aria-hidden>
          ·
        </span>
        {days} {copy.days}
      </p>

      {socials.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
          {socials.map(social => (
            <li key={`${social.label}-${social.href}`}>
              <SocialLink social={social} />
            </li>
          ))}
        </ul>
      ) : null}

      {posts.length > 0 ? (
        <section className="mt-16" aria-labelledby="me-recent-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2
              id="me-recent-heading"
              className="font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
            >
              {copy.recent}
            </h2>
            <Link
              href={homeHref}
              className="text-sm text-stone-400 transition-colors duration-150 hover:text-stone-800 dark:text-stone-500 dark:hover:text-stone-200"
            >
              {copy.viewAll}
            </Link>
          </div>
          <ol className="mt-6">
            {posts.map((post, index) => (
              <li
                key={post.id}
                className="border-b border-stone-100 last:border-b-0 dark:border-stone-800/80"
              >
                <Link
                  href={postHref(blogPath, post.slug)}
                  prefetch={false}
                  className="group flex items-baseline gap-4 py-4"
                >
                  <span className="w-8 shrink-0 text-sm tabular-nums text-stone-300 dark:text-stone-600">
                    {padIndex(index + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-serif text-lg font-semibold tracking-tight break-words text-stone-900 underline-offset-[5px] decoration-1 decoration-stone-300 group-hover:underline dark:text-stone-100 dark:decoration-stone-600">
                      {post.title}
                    </span>
                    {post.tags?.length ? (
                      <span className="mt-1 block text-xs tracking-wide text-stone-400 dark:text-stone-500">
                        {post.tags.join(' · ')}
                      </span>
                    ) : null}
                  </span>
                  <time className="hidden shrink-0 text-sm tabular-nums tracking-wide text-stone-400 md:block dark:text-stone-500">
                    {formatDate(post.date, lang, timezone)}
                  </time>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {season ? (
        <p className="mt-16 text-sm text-stone-400 dark:text-stone-500">
          {season}
        </p>
      ) : null}

      {guestbook ? (
        <section className="mt-10" aria-label={copy.guestbook}>
          {guestbook}
        </section>
      ) : null}
    </article>
  )
}
