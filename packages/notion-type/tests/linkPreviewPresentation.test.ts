import test from 'node:test'
import assert from 'node:assert/strict'
import { getLinkPreviewPresentation } from '../src'

test('getLinkPreviewPresentation formats GitHub repository cards', () => {
  const repo = getLinkPreviewPresentation(
    'https://github.com/Afilmory/afilmory',
    'Afilmory/afilmory',
    'github.com'
  )

  assert.deepEqual(repo, {
    previewKind: 'github-repo',
    titlePrefix: 'Afilmory/',
    titleName: 'afilmory',
    providerLabel: 'github.com · repo'
  })
})

test('getLinkPreviewPresentation keeps GitHub issue titles and labels the provider', () => {
  const issue = getLinkPreviewPresentation(
    'https://github.com/Afilmory/afilmory/issues/12',
    'Fix hover card overflow',
    'github.com'
  )

  assert.deepEqual(issue, {
    previewKind: 'github',
    titlePrefix: '',
    titleName: 'Fix hover card overflow',
    providerLabel: 'github.com · issue'
  })
})

test('getLinkPreviewPresentation uses owner/repo from the URL even when OG title is short', () => {
  const repo = getLinkPreviewPresentation(
    'https://www.github.com/jihuayu/somnium',
    'somnium',
    'github.com'
  )

  assert.equal(repo.previewKind, 'github-repo')
  assert.equal(repo.titlePrefix, 'jihuayu/')
  assert.equal(repo.titleName, 'somnium')
  assert.equal(repo.providerLabel, 'github.com · repo')
})

test('getLinkPreviewPresentation falls back to hostname for generic links', () => {
  const preview = getLinkPreviewPresentation(
    'https://storybook.js.org/docs',
    'Storybook Docs',
    'storybook.js.org'
  )

  assert.deepEqual(preview, {
    previewKind: 'default',
    titlePrefix: '',
    titleName: 'Storybook Docs',
    providerLabel: 'storybook.js.org'
  })
})
