;(() => {
  const bar = document.getElementById('reading-progress-bar')
  if (!bar) return
  let rafId = null
  const update = () => {
    rafId = null
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = docHeight <= 0 ? 0 : Math.min(1, Math.max(0, scrollTop / docHeight))
    bar.style.transform = `scaleX(${progress})`
  }
  const scheduleUpdate = () => {
    if (rafId !== null) return
    rafId = window.requestAnimationFrame(update)
  }
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate)
  update()
})()
