import type { APIRoute } from 'astro'
import { getFeedStaticPaths, renderFeedResponse } from '@blog/lib/feed'

export const getStaticPaths = getFeedStaticPaths
export const GET: APIRoute = renderFeedResponse
