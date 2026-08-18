;(() => {
  const input = document.getElementById('search-input')
  const results = document.getElementById('search-results')
  const indexUrl = document.body.dataset.searchIndex
  if (!(input instanceof HTMLInputElement) || !(results instanceof HTMLElement) || !indexUrl) return

  const currentTag = input.dataset.currentTag || ''
  const hasInitial = results.dataset.initialResults === 'true'
  const initialHtml = hasInitial ? results.innerHTML : ''
  let entries = []

  const formatDate = (value) => {
    if (!value) return ''
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang || 'zh-CN', {
        dateStyle: 'medium',
        timeZone: 'Asia/Shanghai'
      }).format(new Date(value))
    } catch {
      return ''
    }
  }

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const render = (items) => {
    results.innerHTML = items.map(item => `
      <a href="${escapeHtml(item.href)}" class="group block">
        <article class="mb-10 md:mb-12">
          <header class="flex flex-col justify-between md:flex-row md:items-baseline md:gap-6">
            <h2 class="text-lg md:text-2xl font-serif font-semibold mb-1.5 cursor-pointer text-stone-900 dark:text-stone-100 tracking-tight underline-offset-[5px] decoration-1 decoration-stone-300 dark:decoration-stone-600 group-hover:underline">${escapeHtml(item.title)}</h2>
            <time class="flex-shrink-0 text-sm tabular-nums tracking-wide text-stone-400 dark:text-stone-500">${escapeHtml(formatDate(item.date))}</time>
          </header>
          <main>
            <p class="hidden md:block leading-8 text-stone-600 dark:text-stone-400">${escapeHtml(item.summary)}</p>
          </main>
        </article>
      </a>
    `).join('')
  }

  fetch(indexUrl).then(r => r.json()).then(data => {
    entries = Array.isArray(data) ? data : []
  }).catch(() => {})

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase()
    if (!q) {
      results.innerHTML = hasInitial
        ? initialHtml
        : '<p class="text-stone-500 dark:text-stone-400">Type keywords to search posts in Notion.</p>'
      return
    }
    if (Array.from(q).length < 2) {
      results.innerHTML = '<p class="text-stone-500 dark:text-stone-400">Type at least 2 characters to search posts in Notion.</p>'
      return
    }
    const matched = entries.filter(item => {
      if (currentTag && !(item.tags || []).includes(currentTag)) return false
      const hay = `${item.title} ${item.summary} ${(item.tags || []).join(' ')}`.toLowerCase()
      return hay.includes(q)
    }).slice(0, 20)
    if (!matched.length) {
      results.innerHTML = '<p class="text-stone-500 dark:text-stone-400">No posts found.</p>'
      return
    }
    render(matched)
  })
})()
