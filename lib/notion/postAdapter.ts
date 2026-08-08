import dayjs from '@/lib/dayjs'
import { config as BLOG } from '@/lib/server/config'
import {
  normalizeNotionUuid,
  readNotionDateStartProperty,
  readNotionMultiSelectProperty,
  readNotionSelectProperty,
  readNotionTextProperty,
  type BuildPagePreviewMapOptions,
  type NotionPageLike,
  type NotionPagePreviewSource
} from '@jihuayu/notion-data'
import type { PageHrefMap, PagePreviewMap } from '@jihuayu/notion-type'
import { buildPagePreviewMap } from '@jihuayu/notion-data'
import type { PostData, PostFormat } from './filterPublishedPosts'

export { normalizeNotionUuid } from '@jihuayu/notion-data'

export interface PostFieldNames {
  title: string | string[]
  slug: string | string[]
  summary: string | string[]
  type: string | string[]
  status: string | string[]
  tags: string | string[]
  date: string | string[]
  formats: string | string[]
  lang: string | string[]
  visibility: string | string[]
  comments: string | string[]
}

export const BLOG_POST_FIELD_NAMES: PostFieldNames = {
  title: ['title', 'name'],
  slug: 'slug',
  summary: ['summary', 'description'],
  type: 'type',
  status: 'status',
  tags: ['tags', 'tag'],
  date: 'date',
  formats: ['格式', 'format', 'formats'],
  lang: 'lang',
  visibility: 'visibility',
  comments: 'comments'
}

interface MapPageToPostOptions {
  timeZone?: string
  fieldNames?: Partial<PostFieldNames>
}

function normalizeSingleSelect(value: string | null): string[] {
  return value ? [value] : []
}

function normalizePostFormats(values: string[]): PostFormat[] {
  const selected = new Set(values.map(value => `${value || ''}`.trim().toLowerCase()).filter(Boolean))
  const formats: PostFormat[] = []

  if (
    selected.has('全宽') ||
    selected.has('wide') ||
    selected.has('full width') ||
    selected.has('fullwidth')
  ) {
    formats.push('wide')
  }

  if (
    selected.has('多代码') ||
    selected.has('codeheavy') ||
    selected.has('code heavy') ||
    selected.has('multi code') ||
    selected.has('multicode')
  ) {
    formats.push('codeHeavy')
  }

  return formats
}

function resolveFieldNames(overrides: Partial<PostFieldNames> = {}): PostFieldNames {
  return {
    ...BLOG_POST_FIELD_NAMES,
    ...overrides
  }
}

function assertValidNotionPage(page: NotionPageLike): void {
  if (!`${page.id || ''}`.trim()) {
    throw new Error('Notion page is missing a valid id')
  }

  if (!`${page.created_time || ''}`.trim()) {
    throw new Error(`Notion page ${page.id} is missing created_time`)
  }

  if (!`${page.last_edited_time || ''}`.trim()) {
    throw new Error(`Notion page ${page.id} is missing last_edited_time`)
  }

  if (!page.properties || typeof page.properties !== 'object') {
    throw new Error(`Notion page ${page.id} is missing properties`)
  }

  if (!page.parent || typeof page.parent !== 'object') {
    throw new Error(`Notion page ${page.id} is missing parent`)
  }
}

export function mapNotionPageToPost(
  page: NotionPageLike,
  { timeZone = BLOG.timezone, fieldNames: fieldNameOverrides }: MapPageToPostOptions = {}
): PostData {
  assertValidNotionPage(page)
  const fieldNames = resolveFieldNames(fieldNameOverrides)
  const properties = page.properties

  const title = readNotionTextProperty(properties, fieldNames.title)
  const slug = readNotionTextProperty(properties, fieldNames.slug)
  const summary = readNotionTextProperty(properties, fieldNames.summary)
  const type = readNotionSelectProperty(properties, fieldNames.type)
  const status = readNotionSelectProperty(properties, fieldNames.status)
  const tags = readNotionMultiSelectProperty(properties, fieldNames.tags)
  const formats = normalizePostFormats(readNotionMultiSelectProperty(properties, fieldNames.formats))
  const lang = readNotionSelectProperty(properties, fieldNames.lang)
  const visibility = readNotionSelectProperty(properties, fieldNames.visibility)
  const comments = readNotionSelectProperty(properties, fieldNames.comments)

  const dateStart = readNotionDateStartProperty(properties, fieldNames.date)
  const date = dateStart
    ? dayjs.tz(dateStart, timeZone).valueOf()
    : dayjs(page.created_time).valueOf()

  return {
    id: page.id,
    title,
    slug,
    summary,
    tags,
    type: normalizeSingleSelect(type),
    status: normalizeSingleSelect(status),
    formats,
    fullWidth: formats.includes('wide'),
    date,
    lang: normalizeSingleSelect(lang) ? [normalizeSingleSelect(lang)!] : [],
    visibility: normalizeSingleSelect(visibility) ? [normalizeSingleSelect(visibility)!] : [],
    comments: normalizeSingleSelect(comments) ? [normalizeSingleSelect(comments)!] : []
  }
}

export function mapPostsToPreviewSources(posts: Array<Pick<PostData, 'id' | 'title' | 'summary'>>): NotionPagePreviewSource[] {
  return (posts || []).map(post => ({
    id: post.id,
    title: post.title,
    summary: post.summary
  }))
}

export function buildPostPagePreviewMap(
  posts: Array<Pick<PostData, 'id' | 'title' | 'summary'>>,
  pageHrefMap: PageHrefMap,
  options: BuildPagePreviewMapOptions
): PagePreviewMap {
  return buildPagePreviewMap(mapPostsToPreviewSources(posts), pageHrefMap, options)
}

export function collectNormalizedPostIds(posts: Array<Pick<PostData, 'id'>>): string[] {
  return (posts || [])
    .map(post => normalizeNotionUuid(post.id))
    .filter(Boolean)
}
