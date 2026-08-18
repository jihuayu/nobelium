interface MermaidRuntime {
  initialize: (config: { startOnLoad: boolean, theme: string }) => void
  render: (id: string, source: string) => Promise<{ svg: string }>
}

const mounts = document.querySelectorAll('[data-mermaid]')
if (mounts.length) {
  const load = async (node: Element) => {
    if (!(node instanceof HTMLElement) || node.dataset.rendered === 'true') return
    const source = node.parentElement?.querySelector('.mermaid-source')
    if (!(source instanceof HTMLElement) || !source.textContent) return
    node.dataset.rendered = 'true'
    const mermaidModule = await import(
      /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
    ) as { default: MermaidRuntime }
    const mermaid = mermaidModule.default
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'neutral'
    })
    const id = `mermaid-${Math.random().toString(36).slice(2)}`
    const { svg } = await mermaid.render(id, source.textContent)
    node.innerHTML = svg
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) void load(entry.target)
    }
  }, { rootMargin: '200px' })

  mounts.forEach(node => observer.observe(node))
}
