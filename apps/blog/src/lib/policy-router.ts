const BYPASS_PREFIXES = ['/_astro/', '/scripts/', '/fonts/', '/api/', '/.well-known/']
const BYPASS_EXACT = new Set(['/favicon.ico', '/favicon.png', '/robots.txt', '/manifest.webmanifest'])

export function shouldBypassPolicyRouter(pathname: string): boolean {
  if (BYPASS_EXACT.has(pathname)) return true
  return BYPASS_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function withResponseHeaders(
  response: Response,
  headers: Record<string, string>,
  status = response.status
): Response {
  const next = new Headers(response.headers)
  for (const [key, value] of Object.entries(headers)) next.set(key, value)
  return new Response(response.body, {
    status,
    statusText: status === 404 ? 'Not Found' : response.statusText,
    headers: next
  })
}
