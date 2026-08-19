import { config } from '@/lib/server/config'
import ContainerServer from '@/components/ContainerServer'
import PostList from '@/components/PostList'
import Pagination from '@/components/Pagination'
import { getAllPosts } from '@/lib/notion'

export const revalidate = 300

export default async function HomePage() {
  const posts = await getAllPosts({ includePages: false })
  const postsToShow = posts.slice(0, config.postsPerPage)
  const totalPosts = posts.length
  const showNext = totalPosts > config.postsPerPage

  return (
    <ContainerServer>
      <PostList posts={postsToShow} timezone={config.timezone} />
      {showNext && <Pagination page={1} showNext={showNext} />}
    </ContainerServer>
  )
}
