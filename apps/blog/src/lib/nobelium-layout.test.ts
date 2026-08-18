import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { getBlogCopy } from './blog-copy'

const blogRoot = path.resolve(import.meta.dirname, '..')

function readSrc(relPath: string) {
  return fs.readFileSync(path.join(blogRoot, relPath), 'utf8')
}

test('blog copy matches Nobelium i18n for header and article chrome', () => {
  assert.deepEqual(getBlogCopy('zh-CN').NAV, {
    INDEX: '博客',
    ABOUT: '关于',
    RSS: '订阅',
    SEARCH: '搜索'
  })
  assert.deepEqual(getBlogCopy('en').NAV, {
    INDEX: 'Blog',
    ABOUT: 'About',
    RSS: 'RSS',
    SEARCH: 'Search'
  })
  assert.equal(getBlogCopy('zh-CN').POST.BACK, '返回')
  assert.equal(getBlogCopy('zh-CN').POST.TOP, '回到顶部')
})

test('Astro chrome keeps the Nobelium class contract', () => {
  const header = readSrc('components/Header.astro')
  const postCard = readSrc('components/PostCard.astro')
  const layout = readSrc('layouts/BaseLayout.astro')
  const footer = readSrc('components/Footer.astro')

  assert.match(header, /id="sticky-nav"/)
  assert.match(header, /class="observer-element h-4 md:h-12"/)
  assert.match(header, /ARTICLE_CONTENT_MAX_WIDTH_CLASS/)
  assert.match(header, /header-icon-link/)
  assert.match(header, /id="locale-toggle"/)
  assert.match(header, /\/\?somnium-locale=zh-CN/)

  assert.match(postCard, /class="group block"/)
  assert.match(postCard, /mb-10 md:mb-12/)
  assert.match(postCard, /tabular-nums/)
  assert.match(postCard, /hidden md:block leading-8/)

  assert.match(layout, /body class="bg-day dark:bg-night"/)
  assert.match(layout, /id="top"/)
  assert.match(layout, /wrapper \$\{wrapperFont\}/)
  assert.match(layout, /flex-grow transition-all/)

  assert.match(footer, /mt-12 flex-shrink-0 m-auto w-full px-4 text-stone-400/)
})
