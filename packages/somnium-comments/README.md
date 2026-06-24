# @jihuayu/somnium-comments

Somnium-native comment box for the Atrium native API.

This package owns the browser-side comment client:

- article-native header, loading, retry, and composer UI
- GitHub-flavoured Markdown rendering (marked + DOMPurify, lazy-loaded)
- comment count, author GitHub links, Ctrl/Cmd+Enter to submit
- delayed viewport loading
- `/api/request-geo` suppression support
- Atrium native thread/comment reads and writes
- Thread lookup via `?slug=` O(1) server-side filter (no linear scan)
- Thread creation sends `slug` (the `threadKey` prop) alongside the human-readable `title`
- Atrium JWT session storage and refresh
- GitHub OAuth callback exchange for Atrium native auth

It does not own the Atrium backend or comment storage.

## Backend affinity

All three items from the original review have been addressed:

- **Thread lookup by slug.** `findThread` now calls
  `GET /api/v1/repos/:owner/:repo/threads?slug=<threadKey>` — a single O(1)
  server-side lookup. The old multi-page linear scan and its
  `THREAD_LOOKUP_MAX_PAGES` / `THREAD_LOOKUP_PAGE_SIZE` constants have been
  removed. Thread creation sends `slug: threadKey` so the slug is stored at
  creation time and can be looked up on subsequent visits.
- **Token storage.** Atrium now issues access/refresh tokens as `HttpOnly` +
  `Secure` + `SameSite` cookies. The backend reads cookies in
  `resolve_request_user` as a fallback when no `Authorization` header is
  present. Set `ATRIUM_CORS_ORIGIN` on the server and `credentials: 'include'`
  on the client to use cookie-based auth.
- **Legacy OAuth bridge.** Atrium now exposes native GitHub OAuth endpoints at
  `GET /api/v1/auth/github/authorize` and `GET /api/v1/auth/github/callback`.
  Configure `ATRIUM_GITHUB_CLIENT_ID` and `ATRIUM_GITHUB_CLIENT_SECRET` on the
  server to enable the flow. The callback exchanges the code, issues an Atrium
  JWT, sets cookies, and redirects to the frontend — no `utteranc.es`
  dependency required.
