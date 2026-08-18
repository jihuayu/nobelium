import { buildPageLinkMap } from '@/lib/notion/pageLinkMap'
import { buildPostPagePreviewMap } from '@/lib/notion/postAdapter'
import { buildNotionOgImageUrl } from '@/lib/server/metadata'
import { config } from '@/lib/server/config'
import { getAllPosts } from './posts'

export async function loadPageMaps() {
  const posts = await getAllPosts({ includePages: true })
  const pageLinkMap = buildPageLinkMap(posts, config.path || '')
  const pagePreviewMap = buildPostPagePreviewMap(posts, pageLinkMap, {
    siteUrl: config.link || '',
    buildImageUrl: buildNotionOgImageUrl
  })
  return { posts, pageLinkMap, pagePreviewMap }
}
