import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildOgProxyApiUrl,
  mapOgProxyPayloadToPreview,
  parseCharsetFromContentType
} from '../lib/server/linkPreviewShared'

test('parseCharsetFromContentType normalizes common aliases', () => {
  assert.equal(parseCharsetFromContentType('text/html; charset=UTF-8'), 'utf-8')
  assert.equal(parseCharsetFromContentType('text/html; charset=utf8'), 'utf-8')
  assert.equal(parseCharsetFromContentType('text/html; charset=gb2312'), 'gbk')
  assert.equal(parseCharsetFromContentType('text/html; charset=gb18030'), 'gb18030')
  assert.equal(parseCharsetFromContentType('text/html'), '')
})

test('buildOgProxyApiUrl appends api path and preserves encoded target url', () => {
  assert.equal(
    buildOgProxyApiUrl('https://og-proxy.raw2.cc', 'https://blog.jihuayu.com/posts/hello?draft=0'),
    'https://og-proxy.raw2.cc/api?url=https%3A%2F%2Fblog.jihuayu.com%2Fposts%2Fhello%3Fdraft%3D0'
  )
})

test('mapOgProxyPayloadToPreview prefers proxy media fields from og proxy payload', () => {
  const preview = mapOgProxyPayloadToPreview(
    'https://blog.jihuayu.com/',
    {
      url: 'https://blog.jihuayu.com/',
      hostname: 'blog.jihuayu.com',
      title: 'blog.jihuayu.com',
      description: '',
      image: '',
      icon: ''
    },
    {
      status: 'success',
      data: {
        title: '浮生纪梦',
        description: '大梦一场，浮生今歇',
        url: 'https://jihuayu.com/',
        image: {
          url: 'https://example.com/og.png?foo=1&amp;bar=2',
          proxy: 'https://og-proxy.raw2.cc/proxy/image?url=https%3A%2F%2Fexample.com%2Fog.png'
        },
        logo: {
          url: 'https://example.com/favicon.png',
          proxy: 'https://og-proxy.raw2.cc/proxy/image?url=https%3A%2F%2Fexample.com%2Ffavicon.png'
        }
      }
    }
  )

  assert.deepEqual(preview, {
    url: 'https://jihuayu.com/',
    hostname: 'jihuayu.com',
    title: '浮生纪梦',
    description: '大梦一场，浮生今歇',
    image: 'https://og-proxy.raw2.cc/proxy/image?url=https%3A%2F%2Fexample.com%2Fog.png',
    icon: 'https://og-proxy.raw2.cc/proxy/image?url=https%3A%2F%2Fexample.com%2Ffavicon.png'
  })
})

test('mapOgProxyPayloadToPreview prefers local proxy for whitelisted douban media source urls', () => {
  const preview = mapOgProxyPayloadToPreview(
    'https://book.douban.com/subject/1007305/',
    {
      url: 'https://book.douban.com/subject/1007305/',
      hostname: 'book.douban.com',
      title: 'book.douban.com',
      description: '',
      image: '',
      icon: ''
    },
    {
      status: 'success',
      data: {
        title: '红楼梦',
        description: '豆瓣图书',
        url: 'https://book.douban.com/subject/1007305/',
        image: {
          url: 'https://img1.doubanio.com/view/subject/l/public/s1070959.jpg',
          proxy: 'https://og-proxy.raw2.cc/proxy/image?url=https%3A%2F%2Fimg1.doubanio.com%2Fview%2Fsubject%2Fl%2Fpublic%2Fs1070959.jpg'
        },
        logo: {
          url: 'https://img1.doubanio.com/favicon.ico',
          proxy: 'https://og-proxy.raw2.cc/proxy/image?url=https%3A%2F%2Fimg1.doubanio.com%2Ffavicon.ico'
        }
      }
    }
  )

  assert.equal(
    preview?.image,
    '/api/link-preview/image?url=https%3A%2F%2Fimg1.doubanio.com%2Fview%2Fsubject%2Fl%2Fpublic%2Fs1070959.jpg'
  )
  assert.equal(
    preview?.icon,
    '/api/link-preview/image?url=https%3A%2F%2Fimg1.doubanio.com%2Ffavicon.ico'
  )
})

test('mapOgProxyPayloadToPreview keeps media empty when og proxy payload has no media', () => {
  const preview = mapOgProxyPayloadToPreview(
    'https://example.com/',
    {
      url: 'https://example.com/',
      hostname: 'example.com',
      title: 'example.com',
      description: '',
      image: '',
      icon: ''
    },
    {
      status: 'success',
      data: {
        title: 'Example',
        url: 'https://example.com/'
      }
    }
  )

  assert.deepEqual(preview, {
    url: 'https://example.com/',
    hostname: 'example.com',
    title: 'Example',
    description: '',
    image: '',
    icon: ''
  })
})
