import { canAccessArticle, canShowComments, mergeArticlePolicies } from './region'
import type {
  ArticleCommentsPolicy,
  ArticlePolicy,
  ArticleVisibility,
  Locale,
  TranslationEntry,
  TranslationGroup
} from './types'
import { DEFAULT_LOCALE } from './types'

export interface RawPostPolicyFields {
  slug: string
  pageId: string
  title: string
  summary: string
  tags: string[]
  date: number
  fullWidth: boolean
  formats: string[]
  type?: string | null
  lang?: string | null
  visibility?: string | null
  comments?: string | null
}

function normalizeVisibility(raw: string | null | undefined): ArticleVisibility {
  return `${raw || ''}`.trim() === 'blocked-mainland' ? 'blocked-mainland' : 'public'
}

function normalizeComments(raw: string | null | undefined): ArticleCommentsPolicy {
  const value = `${raw || ''}`.trim()
  if (value === 'disabled') return 'disabled'
  if (value === 'disabled-mainland') return 'disabled-mainland'
  return 'default'
}

function normalizePostType(raw: string | null | undefined): string {
  return `${raw || ''}`.trim() === 'Page' ? 'Page' : 'Post'
}

function normalizePostLocale(raw: string | null | undefined): Locale {
  const value = `${raw || ''}`.trim()
  if (value === 'en') return 'en'
  return 'zh-CN'
}

export function groupPostsBySlug(posts: RawPostPolicyFields[]): TranslationGroup[] {
  const bySlug = new Map<string, RawPostPolicyFields[]>()
  for (const post of posts) {
    const slug = `${post.slug || ''}`.trim()
    if (!slug) continue
    const list = bySlug.get(slug) || []
    list.push(post)
    bySlug.set(slug, list)
  }

  return Array.from(bySlug.entries()).map(([contentKey, entries]) => {
    const policy = mergeArticlePolicies(entries.map(entry => ({
      visibility: normalizeVisibility(entry.visibility),
      comments: normalizeComments(entry.comments)
    })))

    const translations: Partial<Record<Locale, TranslationEntry>> = {}
    for (const entry of entries) {
      const locale = normalizePostLocale(entry.lang)
      translations[locale] = {
        locale,
        pageId: entry.pageId,
        title: entry.title,
        slug: entry.slug,
        summary: entry.summary,
        tags: entry.tags,
        date: entry.date,
        fullWidth: entry.fullWidth,
        formats: entry.formats,
        type: normalizePostType(entry.type)
      }
    }

    const canonicalLocale: Locale = translations['zh-CN'] ? 'zh-CN' : (Object.keys(translations)[0] as Locale) || DEFAULT_LOCALE

    return {
      contentKey,
      policy,
      canonicalLocale,
      translations
    }
  })
}

export function getTranslation(group: TranslationGroup, locale: Locale): TranslationEntry | null {
  return group.translations[locale] || null
}

export function listAvailableLocales(group: TranslationGroup): Locale[] {
  return (Object.keys(group.translations) as Locale[]).filter(locale => Boolean(group.translations[locale]))
}

export {
  canAccessArticle,
  canShowComments,
  mergeArticlePolicies
}
