import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, type Locale } from './types'

const SUPPORTED_LOCALES = new Set<Locale>(['zh-CN', 'en'])

export function normalizeLocale(raw: string | null | undefined): Locale | null {
  const value = `${raw || ''}`.trim()
  if (!value) return null
  if (value === 'zh' || value === 'zh-cn' || value === 'zh-CN') return 'zh-CN'
  if (value === 'en' || value.startsWith('en-')) return 'en'
  if (SUPPORTED_LOCALES.has(value as Locale)) return value as Locale
  return null
}

export function localePathPrefix(locale: Locale): string {
  return locale === 'en' ? '/en' : ''
}

export function buildLocalePath(pathname: string, locale: Locale): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  const withoutEn = normalized === '/en' ? '/' : normalized.replace(/^\/en(?=\/|$)/, '') || '/'
  if (locale === 'en') {
    return withoutEn === '/' ? '/en/' : `/en${withoutEn}`
  }
  return withoutEn
}

export function parseLocaleFromPathname(pathname: string): { locale: Locale, restPath: string } {
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const restPath = pathname === '/en' ? '/' : pathname.slice(3) || '/'
    return { locale: 'en', restPath }
  }
  return { locale: 'zh-CN', restPath: pathname || '/' }
}

function negotiateFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE
  const parts = header.split(',').map(part => {
    const [lang, ...params] = part.trim().split(';')
    const qParam = params.find(p => p.trim().startsWith('q='))
    const q = qParam ? Number.parseFloat(qParam.split('=')[1]) : 1
    return { lang: lang.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 }
  }).sort((a, b) => b.q - a.q)

  for (const { lang } of parts) {
    if (lang.startsWith('en')) return 'en'
    if (lang.startsWith('zh')) return 'zh-CN'
  }
  return DEFAULT_LOCALE
}

export interface ResolveLocaleInput {
  pathname: string
  cookie?: string | null
  acceptLanguage?: string | null
}

export interface ResolveLocaleResult {
  locale: Locale
  /** True when locale comes from URL prefix or cookie (user intent). */
  explicit: boolean
  restPath: string
}

export function readLocaleCookie(cookieHeader: string | null | undefined): Locale | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]+)`))
  if (!match) return null
  return normalizeLocale(decodeURIComponent(match[1]))
}

export function resolvePreferredLocale(input: Pick<ResolveLocaleInput, 'cookie' | 'acceptLanguage'>): Locale {
  return readLocaleCookie(input.cookie ?? null) || negotiateFromAcceptLanguage(input.acceptLanguage)
}

export function resolveLocale(input: ResolveLocaleInput): ResolveLocaleResult {
  const fromPath = parseLocaleFromPathname(input.pathname)
  if (fromPath.locale === 'en') {
    return { locale: 'en', explicit: true, restPath: fromPath.restPath }
  }

  // Unprefixed URLs are always zh-CN content (canonical Chinese paths). Cookie /
  // Accept-Language only negotiate the bare homepage, which middleware redirects.
  const isHome = fromPath.restPath === '/' || fromPath.restPath === ''
  if (!isHome) {
    return { locale: 'zh-CN', explicit: false, restPath: fromPath.restPath }
  }

  const fromCookie = readLocaleCookie(input.cookie ?? null)
  if (fromCookie) {
    return { locale: fromCookie, explicit: true, restPath: '/' }
  }

  return {
    locale: negotiateFromAcceptLanguage(input.acceptLanguage),
    explicit: false,
    restPath: '/'
  }
}

export { LOCALE_COOKIE_NAME }
