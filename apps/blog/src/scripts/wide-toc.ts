const root = document.querySelector('[data-wide-toc]')
if (root instanceof HTMLElement) {
  const panel = root.querySelector('[data-wide-toc-panel]')
  const button = root.querySelector('[data-wide-toc-toggle]')
  const hoverLabel = root.querySelector('[data-wide-toc-hover]')
  const listIcon = root.querySelector('[data-wide-toc-list]')
  const closeIcon = root.querySelector('[data-wide-toc-close]')
  const links = Array.from(root.querySelectorAll('a[href^="#"]'))

  if (button instanceof HTMLElement) {
    const closedButtonClass = [
      'border-stone-200', 'dark:border-stone-700', 'bg-white', 'dark:bg-stone-900',
      'text-stone-500', 'dark:text-stone-400', 'hover:text-stone-900', 'dark:hover:text-stone-100',
      'hover:border-stone-300', 'dark:hover:border-stone-600'
    ]
    const openButtonClass = [
      'border-stone-300', 'dark:border-stone-600', 'bg-stone-100', 'dark:bg-stone-800',
      'text-stone-700', 'dark:text-stone-200'
    ]

    const buildId = (href: string | null) => (href || '').replace(/^#/, '')
    const headings = links
      .map(link => document.getElementById(buildId(link.getAttribute('href'))))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)

    const setOpen = (open: boolean) => {
      root.dataset.open = open ? 'true' : 'false'
      button.setAttribute('aria-expanded', open ? 'true' : 'false')
      if (panel instanceof HTMLElement) panel.hidden = !open
      if (listIcon instanceof HTMLElement) listIcon.hidden = open
      if (closeIcon instanceof HTMLElement) closeIcon.hidden = !open
      closedButtonClass.forEach(name => button.classList.toggle(name, !open))
      openButtonClass.forEach(name => button.classList.toggle(name, open))
      if (open && hoverLabel instanceof HTMLElement) hoverLabel.classList.add('hidden')
    }

    setOpen(false)
    button.addEventListener('click', () => setOpen(root.dataset.open !== 'true'))
    document.addEventListener('mousedown', event => {
      if (root.dataset.open !== 'true') return
      const target = event.target
      if (target instanceof Node && !root.contains(target)) setOpen(false)
    })
    root.addEventListener('mouseenter', () => {
      if (root.dataset.open === 'true') return
      if (hoverLabel instanceof HTMLElement && hoverLabel.textContent) hoverLabel.classList.remove('hidden')
    })
    root.addEventListener('mouseleave', () => {
      if (hoverLabel instanceof HTMLElement) hoverLabel.classList.add('hidden')
    })

    if (headings.length) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (!visible[0]) return
        const id = visible[0].target.id
        links.forEach(link => {
          const active = link.getAttribute('href') === `#${id}`
          link.classList.toggle('text-stone-900', active)
          link.classList.toggle('dark:text-stone-100', active)
          link.classList.toggle('bg-stone-200/60', active)
          link.classList.toggle('dark:bg-stone-700/40', active)
          link.classList.toggle('font-medium', active)
          if (active && hoverLabel instanceof HTMLElement) hoverLabel.textContent = link.getAttribute('title') || ''
        })
      }, { rootMargin: '-72px 0px -70% 0px' })
      headings.forEach(heading => observer.observe(heading))
    }
  }
}
