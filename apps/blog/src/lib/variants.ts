import type { Locale, PolicyManifest, RegionPolicy } from '@jihuayu/site-policy'
import { LOCALES, REGION_POLICIES } from '@jihuayu/site-policy'

export interface VariantParams {
  region: RegionPolicy
  locale: Locale
}

export function getAllVariants(): VariantParams[] {
  const variants: VariantParams[] = []
  for (const region of REGION_POLICIES) {
    for (const locale of LOCALES) {
      variants.push({ region, locale })
    }
  }
  return variants
}

export function variantBasePath(region: RegionPolicy, locale: Locale): string {
  return `/site/${region}/${locale}`
}

export function localePrefix(locale: Locale): string {
  return locale === 'en' ? '/en' : ''
}

export function buildPublicPath(internalPath: string, locale: Locale): string {
  const normalized = internalPath.startsWith('/') ? internalPath : `/${internalPath}`
  if (locale === 'en') {
    return normalized === '/' ? '/en/' : `/en${normalized}`
  }
  return normalized
}

export type { PolicyManifest }
