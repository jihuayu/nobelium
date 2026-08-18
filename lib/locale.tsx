export interface Locale {
  NAV: {
    INDEX: string
    ME: string
    ABOUT: string
    RSS: string
    SEARCH: string
  }
  PAGINATION: {
    PREV: string
    NEXT: string
  }
  POST: {
    BACK: string
    TOP: string
  }
  PAGE: {
    ERROR_404: {
      MESSAGE: string
    }
  }
  ME: {
    RECENT: string
    GUESTBOOK: string
    POSTS: string
    DAYS: string
    VIEW_ALL: string
    SEASON: {
      SPRING: string
      SUMMER: string
      AUTUMN: string
      WINTER: string
    }
  }
  [key: string]: unknown
}
