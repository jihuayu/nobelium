import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isLinkPreviewImageWhitelisted,
  resolveLinkPreviewImageProxy,
  toLinkPreviewImageProxyUrl
} from '../lib/server/linkPreviewImageProxy'

test('resolveLinkPreviewImageProxy only allows whitelisted douban hosts', () => {
  const allowed = resolveLinkPreviewImageProxy('https://img3.doubanio.com/view/subject/l/public/s35172637.jpg')
  const blocked = resolveLinkPreviewImageProxy('https://opengraph.githubassets.com/hash/repo')

  assert.ok(allowed)
  assert.equal(allowed?.rule.id, 'douban')
  assert.equal(blocked, null)
})

test('isLinkPreviewImageWhitelisted checks source URLs directly', () => {
  assert.equal(
    isLinkPreviewImageWhitelisted('https://img1.doubanio.com/view/subject/l/public/s35172637.jpg'),
    true
  )
  assert.equal(
    isLinkPreviewImageWhitelisted('https://opengraph.githubassets.com/hash/repo'),
    false
  )
})

test('toLinkPreviewImageProxyUrl routes external images through og proxy', () => {
  assert.equal(
    toLinkPreviewImageProxyUrl('https://opengraph.githubassets.com/hash/repo', 'https://github.com/jihuayu/Somnium'),
    'https://og-proxy.raw2.cc/proxy/image?url=https%3A%2F%2Fopengraph.githubassets.com%2Fhash%2Frepo&referer=https%3A%2F%2Fgithub.com%2Fjihuayu%2FSomnium'
  )
})

test('toLinkPreviewImageProxyUrl preserves defaults for existing og proxy images', () => {
  assert.equal(
    toLinkPreviewImageProxyUrl('https://og-proxy.raw2.cc/proxy/image?url=https%3A%2F%2Fgithub.com%2Ffluidicon.png&q=80&f=jpeg&fit=scale-down'),
    'https://og-proxy.raw2.cc/proxy/image?url=https%3A%2F%2Fgithub.com%2Ffluidicon.png'
  )
})

test('toLinkPreviewImageProxyUrl leaves non-http image sources unchanged', () => {
  assert.equal(toLinkPreviewImageProxyUrl('/favicon.png'), '/favicon.png')
  assert.equal(toLinkPreviewImageProxyUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc')
})
