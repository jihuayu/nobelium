document.addEventListener('click', event => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const button = target.closest('[data-copy-code]')
  if (!(button instanceof HTMLButtonElement)) return
  const code = button.parentElement?.querySelector('code')
  if (!code) return
  void navigator.clipboard.writeText(code.textContent || '').then(() => {
    const original = button.textContent
    button.textContent = 'Copied'
    setTimeout(() => { button.textContent = original }, 1200)
  })
})
