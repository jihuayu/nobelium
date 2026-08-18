export type RegionPolicy = 'mainland' | 'global'

export type Locale = 'zh-CN' | 'en'

export type ArticleVisibility = 'public' | 'blocked-mainland'

export type ArticleCommentsPolicy = 'default' | 'disabled-mainland' | 'disabled'

export interface ArticlePolicy {
  visibility: ArticleVisibility
  comments: ArticleCommentsPolicy
}

export interface RenderContext {
  region: RegionPolicy
  locale: Locale
  format: 'html' | 'markdown' | 'feed' | 'search'
}

export interface TranslationEntry {
  locale: Locale
  pageId: string
  title: string
  slug: string
  summary: string
  tags: string[]
  date: number
  fullWidth: boolean
  formats: string[]
}

export interface TranslationGroup {
  contentKey: string
  policy: ArticlePolicy
  canonicalLocale: Locale
  translations: Partial<Record<Locale, TranslationEntry>>
}

export interface PolicyManifestRoute {
  key: string
  locale: Locale
  internalPath: string
}

export interface PolicyManifestArticle {
  visibility: ArticleVisibility
  comments: ArticleCommentsPolicy
  translations: Partial<Record<Locale, true>>
}

export interface PolicyManifest {
  routes: Record<string, PolicyManifestRoute>
  articles: Record<string, PolicyManifestArticle>
}

export const REGION_POLICIES: readonly RegionPolicy[] = ['global', 'mainland'] as const
export const LOCALES: readonly Locale[] = ['zh-CN', 'en'] as const
export const DEFAULT_LOCALE: Locale = 'zh-CN'
export const LOCALE_COOKIE_NAME = 'somnium-locale'
