;(() => {
  const bar = document.getElementById('reading-progress')
  if (!bar) return
  let ticking = false
  const update = () => {
    const scrollTop = window.scrollY
    const height = document.documentElement.scrollHeight - window.innerHeight
    const progress = height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0
    bar.style.width = `${progress}%`
    ticking = false
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true
      requestAnimationFrame(update)
    }
  }, { passive: true })
  update()
})()
