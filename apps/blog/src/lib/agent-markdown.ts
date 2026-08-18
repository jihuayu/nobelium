import { formatDate } from '@/lib/formatDate'
import { config } from '@/lib/server/config'
import { documentToMarkdown } from '@/lib/server/markdownForAgents'
import { buildNotionDocument, createNotionClientFromEnv } from '@jihuayu/notion-data'
import { filterGroupsForVariant, getPostHref, loadTranslationGroups } from './policy-content'
import { buildPublicPath } from './variants'
import { absoluteUrl } from './urls'
import type { Locale, RegionPolicy, TranslationGroup } from '@jihuayu/site-policy'

function escapeMarkdown(value: string): string {
  return `${value || ''}`.replace(/[\\`*_{}[\]()#+\-.!|>]/g, '\\$&')
}

function sortedPosts(groups: TranslationGroup[], locale: Locale): TranslationGroup[] {
  return groups.slice().sort((a, b) => (b.translations[locale]?.date || 0) - (a.translations[locale]?.date || 0))
}

function postListMarkdown(posts: TranslationGroup[], locale: Locale): string[] {
  const dateLang = locale === 'en' ? 'en' : 'zh-CN'
  return posts.flatMap(group => {
    const entry = group.translations[locale]!
    return [
      `- [${escapeMarkdown(entry.title)}](${absoluteUrl(getPostHref(group, locale))}) — ${formatDate(entry.date, dateLang, config.timezone)}`,
      entry.summary ? `  ${escapeMarkdown(entry.summary)}` : ''
    ].filter(Boolean)
  })
}

async function markdownForPageId(pageId: string, group: TranslationGroup, locale: Locale): Promise<string | null> {
  const entry = group.translations[locale]
  if (!entry) return null
  if (!process.env.NOTION_INTEGRATION_TOKEN) {
    return [
      `# ${escapeMarkdown(entry.title)}`,
      '',
      entry.summary ? `> ${escapeMarkdown(entry.summary)}` : '',
      '',
      `Canonical URL: ${absoluteUrl(getPostHref(group, locale))}`
    ].filter(Boolean).join('\n')
  }

  const document = await buildNotionDocument(createNotionClientFromEnv(), pageId)
  if (!document) return null
  const body = documentToMarkdown(document)
  const dateLang = locale === 'en' ? 'en' : 'zh-CN'
  return [
    `# ${escapeMarkdown(entry.title)}`,
    '',
    `Published: ${formatDate(entry.date, dateLang, config.timezone)}`,
    entry.tags?.length ? `Tags: ${entry.tags.map(escapeMarkdown).join(', ')}` : '',
    '',
    entry.summary ? `> ${escapeMarkdown(entry.summary)}` : '',
    '',
    body,
    '',
    `Canonical URL: ${absoluteUrl(getPostHref(group, locale))}`
  ].filter(line => line !== '').join('\n')
}

export async function renderVariantMarkdown(
  restPath: string,
  region: RegionPolicy,
  locale: Locale
): Promise<string | null> {
  const normalized = restPath === '/' ? '/' : restPath.replace(/\/$/, '') || '/'
  const posts = sortedPosts(
    filterGroupsForVariant(await loadTranslationGroups(false), region, locale),
    locale
  )

  if (normalized === '/' || normalized === '') {
    const shown = posts.slice(0, config.postsPerPage)
    const showNext = posts.length > config.postsPerPage
    return [
      `# ${escapeMarkdown(config.title)}`,
      '',
      escapeMarkdown(config.description || ''),
      '',
      '## Recent posts',
      '',
      ...postListMarkdown(shown, locale),
      ...(showNext ? ['', `[Next page](${absoluteUrl(buildPublicPath('/page/2', locale))})`] : []),
      '',
      `[RSS](${absoluteUrl(buildPublicPath('/feed', locale))})`
    ].join('\n')
  }

  if (normalized.startsWith('/page/')) {
    const pageNumber = Number(normalized.slice('/page/'.length))
    if (!Number.isInteger(pageNumber) || pageNumber < 1) return null
    const slice = posts.slice(config.postsPerPage * (pageNumber - 1), config.postsPerPage * pageNumber)
    if (!slice.length) return null
    const showNext = pageNumber * config.postsPerPage < posts.length
    return [
      `# ${escapeMarkdown(config.title)} — Page ${pageNumber}`,
      '',
      ...postListMarkdown(slice, locale),
      '',
      pageNumber > 1
        ? `[Previous page](${absoluteUrl(buildPublicPath(pageNumber === 2 ? '/' : `/page/${pageNumber - 1}`, locale))})`
        : '',
      showNext ? `[Next page](${absoluteUrl(buildPublicPath(`/page/${pageNumber + 1}`, locale))})` : ''
    ].filter(Boolean).join('\n')
  }

  if (normalized.startsWith('/tag/')) {
    const currentTag = decodeURIComponent(normalized.slice('/tag/'.length))
    const filtered = posts.filter(group => (group.translations[locale]?.tags || []).includes(currentTag))
    return [
      `# Posts tagged ${escapeMarkdown(currentTag)}`,
      '',
      `${filtered.length} post${filtered.length === 1 ? '' : 's'} found.`,
      '',
      ...postListMarkdown(filtered, locale)
    ].join('\n')
  }

  if (normalized === '/search') {
    const tags = new Set<string>()
    for (const group of posts) {
      for (const tag of group.translations[locale]?.tags || []) tags.add(tag)
    }
    return [
      '# Search',
      '',
      locale === 'en'
        ? 'Use the on-page search, or fetch `/search-index.json` for this locale and region.'
        : '请使用站内搜索，或请求当前地区/语言对应的 `/search-index.json`。',
      '',
      '## Recent posts',
      '',
      ...postListMarkdown(posts.slice(0, config.postsPerPage), locale),
      '',
      '## Tags',
      '',
      ...Array.from(tags).map(tag => `- [${escapeMarkdown(tag)}](${absoluteUrl(buildPublicPath(`/tag/${encodeURIComponent(tag)}`, locale))})`)
    ].join('\n')
  }

  const slug = normalized.replace(/^\//, '')
  const group = posts.find(item => item.contentKey === slug)
    || filterGroupsForVariant(await loadTranslationGroups(true), region, locale).find(item => item.contentKey === slug)
  if (!group) return null
  const entry = group.translations[locale]
  if (!entry) return null
  return markdownForPageId(entry.pageId, group, locale)
}
