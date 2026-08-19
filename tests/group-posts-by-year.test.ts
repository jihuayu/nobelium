import assert from 'node:assert/strict'
import test from 'node:test'
import { groupPostsByYear } from '../lib/groupPostsByYear'
import type { PostData } from '../lib/notion/filterPublishedPosts'

function post(id: string, iso: string): PostData {
  return {
    id,
    title: id,
    slug: id,
    summary: '',
    tags: [],
    type: ['Post'],
    status: ['Published'],
    formats: [],
    fullWidth: false,
    date: Date.parse(iso)
  }
}

test('groupPostsByYear keeps chronological groups and timezone-aware years', () => {
  const groups = groupPostsByYear([
    post('a', '2026-08-06T00:00:00+08:00'),
    post('b', '2026-01-02T00:00:00+08:00'),
    post('c', '2025-12-31T23:30:00+08:00')
  ], 'Asia/Shanghai')

  assert.deepEqual(groups.map(group => ({ year: group.year, ids: group.posts.map(item => item.id) })), [
    { year: '2026', ids: ['a', 'b'] },
    { year: '2025', ids: ['c'] }
  ])
})

test('groupPostsByYear uses timezone when UTC date would fall on the previous day', () => {
  const groups = groupPostsByYear([
    post('new-year', '2025-12-31T16:30:00.000Z')
  ], 'Asia/Shanghai')

  assert.equal(groups[0]?.year, '2026')
})
