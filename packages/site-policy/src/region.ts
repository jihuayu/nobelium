import type { ArticleCommentsPolicy, ArticlePolicy, ArticleVisibility, RegionPolicy } from './types'

/** ISO 3166-1 alpha-2 codes treated as mainland policy group. */
export const MAINLAND_COUNTRIES = new Set(['CN'])

export function resolveRegionPolicy(country?: string | null): RegionPolicy {
  if (MAINLAND_COUNTRIES.has(`${country || ''}`.trim().toUpperCase())) {
    return 'mainland'
  }
  return 'global'
}

function stricterVisibility(left: ArticleVisibility, right: ArticleVisibility): ArticleVisibility {
  if (left === 'blocked-mainland' || right === 'blocked-mainland') return 'blocked-mainland'
  return 'public'
}

function stricterComments(left: ArticleCommentsPolicy, right: ArticleCommentsPolicy): ArticleCommentsPolicy {
  const rank: Record<ArticleCommentsPolicy, number> = {
    default: 0,
    'disabled-mainland': 1,
    disabled: 2
  }
  return rank[left] >= rank[right] ? left : right
}

export function mergeArticlePolicies(policies: ArticlePolicy[]): ArticlePolicy {
  return policies.reduce<ArticlePolicy>(
    (merged, policy) => ({
      visibility: stricterVisibility(merged.visibility, policy.visibility),
      comments: stricterComments(merged.comments, policy.comments)
    }),
    { visibility: 'public', comments: 'default' }
  )
}

export function canAccessArticle(policy: ArticlePolicy, region: RegionPolicy): boolean {
  if (region === 'mainland' && policy.visibility === 'blocked-mainland') return false
  return true
}

export function canShowComments(policy: ArticlePolicy, region: RegionPolicy): boolean {
  if (policy.comments === 'disabled') return false
  if (region === 'mainland' && policy.comments === 'disabled-mainland') return false
  return true
}
