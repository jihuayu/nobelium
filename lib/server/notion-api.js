import { NotionAPI } from 'notion-client'


const client = new NotionAPI({
    activeUser: process.env.NOTION_ACTIVE_USER,
    authToken: process.env.NOTION_TOKEN_V2
  })

export default client
