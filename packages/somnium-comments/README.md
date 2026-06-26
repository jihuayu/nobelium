# @jihuayu/somnium-comments

Somnium-native comment box for Atrium's website/page/comment API.

This package owns the browser-side comment client:

- article-native header, loading, retry, and composer UI
- delayed viewport loading
- `/api/request-geo` suppression support
- Atrium account login via `/api/v1/auth/account/authorize`
- current-page comments via `/api/v1/comments/current`
- optional explicit comments via `/api/v1/websites/:websiteKey/pages/:pageKey/comments`
- Atrium JWT session storage and refresh

## API Model

The default mode is Atrium's quick Referer mode:

- `GET /api/v1/comments/current?page_title=<title>`
- `POST /api/v1/comments/current`

Atrium resolves the website and page from the browser `Referer` header. The
component sends the current page URL as the fetch referrer in quick mode so
cross-origin requests can still resolve per-page comments. The component sends
the article title as `page_title`; read endpoints return comment pagination
directly, and posting a comment uses the title when Atrium has to create the
page record. When a session is available, list requests include it so comment
objects can carry Atrium-computed `website_key`, `can_delete`, and `can_ban`
fields, which drive delete and ban actions. Page identity stays URL-based. If
the origin is not registered yet, Atrium can discover it from
`/.well-known/atrium.json` or the equivalent `_atrium.<host>` TXT record.

If a `websiteKey` prop is provided, the component uses explicit page endpoints:

- `GET /api/v1/websites/:websiteKey/pages/:pageKey/comments?parent_id=root`
- `POST /api/v1/websites/:websiteKey/pages/:pageKey/comments`

The component does not create websites or manage moderation settings.
