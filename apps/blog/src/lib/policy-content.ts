import {
  buildPolicyManifest,
  canAccessArticle,
  canShowComments,
  getTranslation,
  groupPostsBySlug,
  type Locale,
  type RegionPolicy,
  type TranslationGroup
} from '@jihuayu/site-policy'
import type { PostData } from '@/lib/notion/filterPublishedPosts'
import { buildLocalePath } from '@jihuayu/site-policy'
import { getAllPosts } from './posts'

function firstSelect(values?: string[]): string {
  return values?.[0] || ''
}

export function postsToPolicyInput(posts: PostData[]) {
  return posts.map(post => ({
    slug: post.slug,
    pageId: post.id,
    title: post.title,
    summary: post.summary,
    tags: post.tags,
    date: post.date,
    fullWidth: post.fullWidth,
    formats: post.formats,
    lang: firstSelect(post.lang),
    type: firstSelect(post.type),
    visibility: firstSelect(post.visibility),
    comments: firstSelect(post.comments)
  }))
}

export async function loadTranslationGroups(includePages = true): Promise<TranslationGroup[]> {
  const posts = await getAllPosts({ includePages })
  return groupPostsBySlug(postsToPolicyInput(posts))
}

export async function loadPolicyManifest() {
  const groups = await loadTranslationGroups(true)
  return buildPolicyManifest(groups)
}

export function filterGroupsForVariant(
  groups: TranslationGroup[],
  region: RegionPolicy,
  locale: Locale
): TranslationGroup[] {
  return groups.filter(group => {
    if (!canAccessArticle(group.policy, region)) return false
    return Boolean(getTranslation(group, locale))
  })
}

export function getPostHref(group: TranslationGroup, locale: Locale): string {
  return buildLocalePath(`/${group.contentKey}`, locale)
}

export function shouldRenderComments(group: TranslationGroup, region: RegionPolicy): boolean {
  return canShowComments(group.policy, region)
}

export function collectTags(groups: TranslationGroup[], locale: Locale): Record<string, number> {
  const tags: Record<string, number> = {}
  for (const group of groups) {
    const entry = group.translations[locale]
    if (!entry) continue
    for (const tag of entry.tags || []) {
      tags[tag] = (tags[tag] || 0) + 1
    }
  }
  return tags
}
