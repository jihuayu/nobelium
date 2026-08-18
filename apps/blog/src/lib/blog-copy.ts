import type { Locale } from '@jihuayu/site-policy'

export function getBlogCopy(locale: Locale) {
  if (locale === 'en') {
    return {
      NAV: { INDEX: 'Blog', ABOUT: 'About', RSS: 'RSS', SEARCH: 'Search' },
      PAGINATION: { PREV: 'Prev', NEXT: 'Next' },
      POST: { BACK: 'Back', TOP: 'Top' }
    }
  }
  return {
    NAV: { INDEX: '博客', ABOUT: '关于', RSS: '订阅', SEARCH: '搜索' },
    PAGINATION: { PREV: '上一页', NEXT: '下一页' },
    POST: { BACK: '返回', TOP: '回到顶部' }
  }
}
