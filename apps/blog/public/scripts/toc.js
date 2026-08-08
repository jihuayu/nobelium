;(() => {
  const toc = document.querySelector('[data-toc]')
  if (!toc) return
  const links = Array.from(toc.querySelectorAll('a[href^="#"]'))
  const headings = links
    .map(link => document.querySelector(link.getAttribute('href') || ''))
    .filter((node): node is HTMLElement => node instanceof HTMLElement)
  if (!headings.length) return

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const id = entry.target.id
      links.forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`)
      })
    }
  }, { rootMargin: '-20% 0px -70% 0px' })

  headings.forEach(heading => observer.observe(heading))
})()
