export function getPostFormatClassNames(formats: string[] = []): string[] {
  const set = new Set(formats)
  return [
    set.has('wide') ? 'notion-post-format-wide' : '',
    set.has('codeHeavy') ? 'notion-post-format-code-heavy' : ''
  ].filter(Boolean)
}
