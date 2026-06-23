import dayjs from '../dayjs'
import type { DateMentionProps } from '../types'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const OFFSET_RE = /(Z|[+-]\d{2}:\d{2})$/i

function toDayjsLocale(locale: string): string {
  const normalized = `${locale || ''}`.trim().toLowerCase()
  if (!normalized) return 'zh-cn'
  if (normalized.startsWith('zh')) return 'zh-cn'
  return normalized
}

function hasExplicitTime(value?: string): boolean {
  return !!value && value.includes('T')
}

function stripLeadingAt(value: string): string {
  const trimmed = `${value || ''}`.trim()
  return trimmed.startsWith('@') ? trimmed.slice(1).trim() : trimmed
}

function ensureLeadingAt(value: string): string {
  const trimmed = `${value || ''}`.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

function parseMentionDate(value: string, timeZone?: string) {
  const raw = `${value || ''}`.trim()
  if (!raw) return null

  if (DATE_ONLY_RE.test(raw)) {
    if (timeZone) {
      const zoned = dayjs.tz(`${raw}T00:00:00`, timeZone)
      return zoned.isValid() ? zoned : null
    }
    const parsed = dayjs(raw)
    return parsed.isValid() ? parsed.startOf('day') : null
  }

  if (timeZone && !OFFSET_RE.test(raw)) {
    const zoned = dayjs.tz(raw, timeZone)
    if (zoned.isValid()) return zoned
  }

  const parsed = dayjs(raw)
  if (!parsed.isValid()) return null
  return timeZone ? parsed.tz(timeZone) : parsed
}

function joinRange(startText: string, endText: string): string {
  const left = `${startText || ''}`.trim()
  const right = `${endText || ''}`.trim()
  if (!left && !right) return ''
  if (!left) return right
  if (!right) return left
  return `${left} -> ${right}`
}

export default function DateMentionStatic({
  start,
  end = '',
  timeZone = '',
  locale,
  displayMode,
  includeTime,
  absoluteDateFormat,
  absoluteDateTimeFormat,
  relativeStyle,
  fallbackText = ''
}: DateMentionProps) {
  void relativeStyle

  const primaryMode = displayMode === 'notion' ? 'relative' : displayMode
  const secondaryMode = primaryMode === 'relative' ? 'absolute' : 'relative'
  const parsedStart = parseMentionDate(start, timeZone)
  const parsedEnd = parseMentionDate(end, timeZone)
  const now = timeZone ? dayjs().tz(timeZone) : dayjs()
  const hasTime = hasExplicitTime(start) || hasExplicitTime(end)
  const showTime = includeTime === 'never' ? false : includeTime === 'always' ? true : hasTime
  const absoluteText = joinRange(
    parsedStart ? parsedStart.format(showTime ? absoluteDateTimeFormat : absoluteDateFormat) : '',
    parsedEnd ? parsedEnd.format(showTime ? absoluteDateTimeFormat : absoluteDateFormat) : ''
  )
  const relativeText = joinRange(
    parsedStart ? parsedStart.locale(toDayjsLocale(locale)).from(now) : '',
    parsedEnd ? parsedEnd.locale(toDayjsLocale(locale)).from(now) : ''
  )
  const notionText = stripLeadingAt(fallbackText)
  const primaryRaw = primaryMode === 'relative' ? relativeText : absoluteText
  const secondaryRaw = secondaryMode === 'relative' ? relativeText : absoluteText
  const primaryText = ensureLeadingAt(primaryRaw || notionText || start || '@date')
  const secondaryText = ensureLeadingAt(secondaryRaw)
  const primaryBodyText = stripLeadingAt(primaryText)
  const title = secondaryText && secondaryText !== primaryText ? secondaryText : undefined

  return (
    <span className="notion-date-mention" title={title}>
      <span className="notion-date-mention-prefix" aria-hidden="true">@</span>
      <span className="notion-date-mention-text">{primaryBodyText}</span>
    </span>
  )
}
