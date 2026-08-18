interface MentionPreview {
  href?: string
  title?: string
  description?: string
  icon?: string
  image?: string
  provider?: string
}

const CARD_CLASS = 'notion-url-mention-hover-card'
const CLOSE_DELAY_MS = 90
const VIEWPORT_PADDING = 12
const GAP = 10
const TARGET_WIDTH = 280
const MIN_WIDTH = 120
const FALLBACK_HEIGHT = 220
const GITHUB_ICON = '<svg viewBox="0 0 16 16" fill="currentColor" role="presentation"><path d="M8 0C3.58 0 0 3.58 0 8a8.001 8.001 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.34c-2.23.49-2.7-1.08-2.7-1.08-.36-.92-.9-1.16-.9-1.16-.73-.5.06-.49.06-.49.82.06 1.25.84 1.25.84.72 1.25 1.9.89 2.36.68.07-.53.28-.9.5-1.1-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.58.82-2.13-.08-.2-.36-1.01.08-2.1 0 0 .67-.21 2.2.81.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.91.08 2.11.51.55.82 1.26.82 2.13 0 3.07-1.87 3.75-3.66 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8.001 8.001 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path></svg>'
const LINK_ICON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" role="presentation"><path d="M8.75 6.25h-1.5a4 4 0 1 0 0 8h1.5"></path><path d="M11.25 6.25h1.5a4 4 0 1 1 0 8h-1.5"></path><path d="M7.5 10h5"></path></svg>'

let card: HTMLAnchorElement | null = null
let trigger: HTMLAnchorElement | null = null
let hideTimer = 0
let raf = 0
let viewportBound = false
let observer: ResizeObserver | null = null

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const isInternalHref = (href: string) => href.startsWith('/')
const isGithubHref = (href: string) => {
  try {
    const hostname = new URL(href).hostname.toLowerCase()
    return hostname === 'github.com' || hostname === 'www.github.com'
  } catch {
    return /^https?:\/\/(?:www\.)?github\.com\/?/i.test(href || '')
  }
}

const renderProviderIcon = (href: string, iconUrl: string) => {
  if (iconUrl) {
    const img = document.createElement('img')
    img.src = iconUrl
    img.alt = ''
    img.loading = 'lazy'
    img.className = 'h-full w-full object-contain'
    return img
  }
  const wrap = document.createElement('span')
  wrap.innerHTML = isGithubHref(href) ? GITHUB_ICON : LINK_ICON
  return wrap.firstElementChild as SVGSVGElement
}

const clearHide = () => {
  window.clearTimeout(hideTimer)
  hideTimer = 0
}

const clearRaf = () => {
  if (!raf) return
  window.cancelAnimationFrame(raf)
  raf = 0
}

const unbindViewport = () => {
  if (!viewportBound) return
  window.removeEventListener('resize', scheduleUpdate)
  window.removeEventListener('scroll', scheduleUpdate, true)
  viewportBound = false
}

const bindViewport = () => {
  if (viewportBound) return
  window.addEventListener('resize', scheduleUpdate)
  window.addEventListener('scroll', scheduleUpdate, { capture: true, passive: true })
  viewportBound = true
}

const destroyCard = () => {
  observer?.disconnect()
  observer = null
  unbindViewport()
  clearRaf()
  card?.remove()
  card = null
  trigger = null
}

const hide = () => {
  clearHide()
  destroyCard()
}

const scheduleHide = () => {
  clearHide()
  hideTimer = window.setTimeout(hide, CLOSE_DELAY_MS)
}

const updatePosition = () => {
  if (!card || !trigger) return
  const triggerRect = trigger.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const measured = card.getBoundingClientRect()
  const width = Math.min(TARGET_WIDTH, Math.max(MIN_WIDTH, viewportWidth - VIEWPORT_PADDING * 2))
  const height = Math.ceil(measured.height) || FALLBACK_HEIGHT
  const canPlaceBottom = triggerRect.bottom + GAP + height + VIEWPORT_PADDING <= viewportHeight
  const canPlaceTop = triggerRect.top - GAP - height >= VIEWPORT_PADDING
  const placeTop = !canPlaceBottom && canPlaceTop
  const left = clamp(triggerRect.left, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING)
  const top = clamp(
    placeTop ? triggerRect.top - GAP - height : triggerRect.bottom + GAP,
    VIEWPORT_PADDING,
    viewportHeight - height - VIEWPORT_PADDING
  )
  card.style.position = 'fixed'
  card.style.left = `${Number.isFinite(left) ? left : VIEWPORT_PADDING}px`
  card.style.top = `${Number.isFinite(top) ? top : VIEWPORT_PADDING}px`
  card.style.width = `${width}px`
  card.style.visibility = 'visible'
}

function scheduleUpdate() {
  clearRaf()
  raf = window.requestAnimationFrame(() => {
    raf = 0
    updatePosition()
  })
}

const parsePreview = (anchor: HTMLAnchorElement): MentionPreview | null => {
  const raw = anchor.getAttribute('data-preview')
  if (!raw) return null
  try { return JSON.parse(raw) as MentionPreview } catch { return null }
}

const buildCard = (preview: MentionPreview, anchor: HTMLAnchorElement) => {
  const href = preview.href || anchor.href
  const el = document.createElement('a')
  el.className = CARD_CLASS
  el.href = href
  if (!isInternalHref(href)) {
    el.target = '_blank'
    el.rel = 'noopener noreferrer'
  }
  el.addEventListener('mouseenter', clearHide)
  el.addEventListener('mouseleave', scheduleHide)
  el.addEventListener('focus', clearHide)
  el.addEventListener('blur', event => {
    const next = event.relatedTarget
    if (next instanceof Node && (anchor.contains(next) || el.contains(next))) return
    scheduleHide()
  })

  if (preview.image) {
    const cover = document.createElement('span')
    cover.className = 'notion-url-mention-hover-cover'
    const img = document.createElement('img')
    img.src = preview.image
    img.alt = preview.title || ''
    img.loading = 'lazy'
    img.addEventListener('load', scheduleUpdate)
    cover.appendChild(img)
    el.appendChild(cover)
  }

  const body = document.createElement('span')
  body.className = 'notion-url-mention-hover-body'
  const title = document.createElement('span')
  title.className = 'notion-url-mention-hover-title'
  title.textContent = preview.title || anchor.textContent || preview.href || ''
  body.appendChild(title)
  if (preview.description) {
    const description = document.createElement('span')
    description.className = 'notion-url-mention-hover-description'
    description.textContent = preview.description
    body.appendChild(description)
  }
  const footer = document.createElement('span')
  footer.className = 'notion-url-mention-hover-footer'
  const iconWrap = document.createElement('span')
  iconWrap.className = 'notion-url-mention-hover-provider-icon'
  iconWrap.setAttribute('aria-hidden', 'true')
  iconWrap.appendChild(renderProviderIcon(anchor.href, preview.icon || ''))
  footer.appendChild(iconWrap)
  const provider = document.createElement('span')
  provider.className = 'notion-url-mention-hover-provider'
  provider.textContent = preview.provider || ''
  footer.appendChild(provider)
  body.appendChild(footer)
  el.appendChild(body)
  return el
}

const show = (anchor: HTMLAnchorElement) => {
  const preview = parsePreview(anchor)
  if (!preview) return
  clearHide()
  if (card && trigger === anchor) {
    scheduleUpdate()
    return
  }

  destroyCard()
  trigger = anchor
  card = buildCard(preview, anchor)
  card.style.position = 'fixed'
  card.style.left = `${VIEWPORT_PADDING}px`
  card.style.top = `${VIEWPORT_PADDING}px`
  card.style.width = `${TARGET_WIDTH}px`
  card.style.visibility = 'hidden'
  document.body.appendChild(card)

  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(() => scheduleUpdate())
    observer.observe(card)
  }
  bindViewport()
  scheduleUpdate()
}

const mentionAnchorFrom = (node: EventTarget | null) => {
  if (!(node instanceof Element)) return null
  const anchor = node.closest('[data-url-mention][data-preview]')
  return anchor instanceof HTMLAnchorElement ? anchor : null
}

document.addEventListener('mouseover', event => {
  const anchor = mentionAnchorFrom(event.target)
  if (anchor) show(anchor)
})

document.addEventListener('mouseout', event => {
  const anchor = mentionAnchorFrom(event.target)
  if (!anchor) return
  const next = event.relatedTarget
  if (next instanceof Node && (anchor.contains(next) || card?.contains(next))) return
  scheduleHide()
})

document.addEventListener('focusin', event => {
  const anchor = mentionAnchorFrom(event.target)
  if (anchor) {
    show(anchor)
    return
  }
  if (card && event.target instanceof Node && card.contains(event.target)) clearHide()
})

document.addEventListener('focusout', event => {
  if (!card) return
  const next = event.relatedTarget
  if (next instanceof Node && (trigger?.contains(next) || card.contains(next))) return
  scheduleHide()
})
