let overlay: HTMLDivElement | null = null

const close = () => {
  if (!overlay) return
  overlay.remove()
  overlay = null
  document.body.style.overflow = ''
}

const open = (src: string, alt: string) => {
  close()
  overlay = document.createElement('div')
  overlay.className = 'notion-lightbox-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', alt || 'Image preview')

  const image = document.createElement('img')
  image.src = src
  image.alt = alt || ''
  image.className = 'notion-lightbox-image'
  image.addEventListener('click', event => event.stopPropagation())

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'notion-lightbox-close'
  button.setAttribute('aria-label', 'Close')
  button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>'
  button.addEventListener('click', close)

  overlay.appendChild(image)
  overlay.appendChild(button)
  overlay.addEventListener('click', close)
  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'
}

document.addEventListener('click', event => {
  const target = event.target
  if (!(target instanceof HTMLImageElement)) return
  if (!target.closest('.notion')) return
  if (target.closest('.notion-asset-caption')) return
  event.preventDefault()
  open(target.src, target.alt || '')
})

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') close()
})
