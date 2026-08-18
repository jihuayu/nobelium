import { config } from '@/lib/server/config'
import { buildPublicPath } from './variants'
import type { Locale } from '@jihuayu/site-policy'
import type { TranslationGroup } from '@jihuayu/site-policy'

export function siteOrigin(): string {
  return `${config.link || 'https://blog.jihuayu.com'}`.replace(/\/$/, '')
}

export function absoluteUrl(path: string): string {
  const origin = siteOrigin()
  if (!path || path === '/') return origin
  return new URL(path, `${origin}/`).toString()
}

export function buildHreflangLinks(group: TranslationGroup, locale: Locale) {
  const origin = siteOrigin()
  const zh = group.translations['zh-CN']
    ? { hreflang: 'zh-CN', href: new URL(buildPublicPath(`/${group.contentKey}`, 'zh-CN'), `${origin}/`).toString() }
    : null
  const en = group.translations.en
    ? { hreflang: 'en', href: new URL(buildPublicPath(`/${group.contentKey}`, 'en'), `${origin}/`).toString() }
    : null
  const links = [zh, en].filter(Boolean) as Array<{ hreflang: string, href: string }>
  const canonical = zh || en
  if (canonical) {
    links.push({ hreflang: 'x-default', href: canonical.href })
  }
  void locale
  return links
}
