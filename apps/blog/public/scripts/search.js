;(() => {
  const input = document.getElementById('search-input')
  const results = document.getElementById('search-results')
  const indexUrl = document.body.dataset.searchIndex
  if (!(input instanceof HTMLInputElement) || !(results instanceof HTMLElement) || !indexUrl) return

  let entries = []
  fetch(indexUrl).then(r => r.json()).then(data => { entries = data }).catch(() => {})

  const render = (items) => {
    results.innerHTML = items.map(item => `
      <article class="mb-6 border-b border-stone-200 pb-4 dark:border-stone-800">
        <h2 class="text-xl font-semibold"><a href="${item.href}">${item.title}</a></h2>
        <p class="mt-2 text-sm text-stone-500">${item.summary || ''}</p>
      </article>
    `).join('')
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase()
    if (!q) {
      results.innerHTML = ''
      return
    }
    const matched = entries.filter(item => {
      const hay = `${item.title} ${item.summary} ${(item.tags || []).join(' ')}`.toLowerCase()
      return hay.includes(q)
    }).slice(0, 20)
    render(matched)
  })
})()
