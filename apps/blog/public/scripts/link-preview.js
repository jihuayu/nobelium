;(() => {
  const CARD_CLASS = 'notion-url-mention-hover-card'
  let card = null
  let hideTimer = 0

  const hide = () => {
    card?.remove()
    card = null
  }

  const scheduleHide = () => {
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(hide, 90)
  }

  const show = (anchor) => {
    const raw = anchor.getAttribute('data-preview')
    if (!raw) return
    let preview
    try { preview = JSON.parse(raw) } catch { return }

    window.clearTimeout(hideTimer)
    hide()

    card = document.createElement('a')
    card.className = CARD_CLASS
    card.href = preview.href || anchor.href
    if (!card.getAttribute('href')?.startsWith('/')) {
      card.target = '_blank'
      card.rel = 'noopener noreferrer'
    }
    card.addEventListener('mouseenter', () => window.clearTimeout(hideTimer))
    card.addEventListener('mouseleave', scheduleHide)

    if (preview.image) {
      const cover = document.createElement('span')
      cover.className = 'notion-url-mention-hover-cover'
      const img = document.createElement('img')
      img.src = preview.image
      img.alt = preview.title || ''
      img.loading = 'lazy'
      cover.appendChild(img)
      card.appendChild(cover)
    }

    const body = document.createElement('span')
    body.className = 'notion-url-mention-hover-body'
    const title = document.createElement('span')
    title.className = 'notion-url-mention-hover-title'
    title.textContent = preview.title || anchor.textContent || preview.href
    body.appendChild(title)
    if (preview.description) {
      const description = document.createElement('span')
      description.className = 'notion-url-mention-hover-description'
      description.textContent = preview.description
      body.appendChild(description)
    }
    const footer = document.createElement('span')
    footer.className = 'notion-url-mention-hover-footer'
    if (preview.icon) {
      const iconWrap = document.createElement('span')
      iconWrap.className = 'notion-url-mention-hover-provider-icon'
      const icon = document.createElement('img')
      icon.src = preview.icon
      icon.alt = ''
      icon.loading = 'lazy'
      iconWrap.appendChild(icon)
      footer.appendChild(iconWrap)
    }
    const provider = document.createElement('span')
    provider.className = 'notion-url-mention-hover-provider'
    provider.textContent = preview.provider || ''
    footer.appendChild(provider)
    body.appendChild(footer)
    card.appendChild(body)
    document.body.appendChild(card)

    const rect = anchor.getBoundingClientRect()
    const width = Math.min(280, window.innerWidth - 24)
    let left = rect.left + window.scrollX
    let top = rect.bottom + window.scrollY + 10
    if (left + width > window.scrollX + window.innerWidth - 12) {
      left = window.scrollX + window.innerWidth - width - 12
    }
    card.style.position = 'absolute'
    card.style.left = `${Math.max(12, left)}px`
    card.style.top = `${top}px`
    card.style.width = `${width}px`
    card.style.zIndex = '50'
  }

  document.addEventListener('mouseover', event => {
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('[data-url-mention][data-preview]')
    if (!(anchor instanceof HTMLAnchorElement)) return
    show(anchor)
  })

  document.addEventListener('mouseout', event => {
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('[data-url-mention][data-preview]')
    if (!(anchor instanceof HTMLAnchorElement)) return
    const next = event.relatedTarget
    if (next instanceof Node && (anchor.contains(next) || card?.contains(next))) return
    scheduleHide()
  })
})()
