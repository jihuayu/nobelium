function initHeaderBehavior() {
  const navEl = document.getElementById('sticky-nav')
  const sentinelEl = document.getElementById('header-sentinel')
  const titleEl = document.getElementById('header-title')
  if (!navEl || !sentinelEl) return

  const WIDTH_STORAGE_KEY = 'notion-header-fullwidth'
  const fullWidth = navEl.dataset.fullWidth === 'true'
  const useSticky = navEl.dataset.useSticky !== 'false'

  let prevWide: boolean | null = null
  try {
    const stored = sessionStorage.getItem(WIDTH_STORAGE_KEY)
    prevWide = stored === null ? null : stored === 'true'
  } catch {
    prevWide = null
  }

  if (prevWide !== null && prevWide !== fullWidth) {
    const animClass = fullWidth ? 'notion-header-anim-wide' : 'notion-header-anim-normal'
    navEl.classList.add(animClass)
    navEl.addEventListener('animationend', () => navEl.classList.remove(animClass), { once: true })
  }

  try {
    sessionStorage.setItem(WIDTH_STORAGE_KEY, String(fullWidth))
  } catch {}

  if (!useSticky) {
    navEl.classList.add('remove-sticky')
    return
  }

  let collapseRaf: number | null = null
  const observer = new IntersectionObserver(([entry]) => {
    if (collapseRaf !== null) window.cancelAnimationFrame(collapseRaf)
    collapseRaf = window.requestAnimationFrame(() => {
      const sentinelBottom = entry?.boundingClientRect?.bottom ?? 0
      const shouldCollapse = sentinelBottom <= 0 && window.scrollY > 0 && !entry.isIntersecting
      navEl.classList.toggle('sticky-nav-full', shouldCollapse)
      collapseRaf = null
    })
  })

  observer.observe(sentinelEl)
  navEl.addEventListener('click', event => {
    const target = event.target
    if (target !== navEl && target !== titleEl) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

initHeaderBehavior()
