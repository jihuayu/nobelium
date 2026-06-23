import { defineComponent, h, ref } from 'vue'

interface CodeBlockCopyButtonProps {
  codeSelector: string
}

export default defineComponent({
  name: 'CodeBlockCopyButton',
  props: {
    codeSelector: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const copied = ref(false)
    let timer: ReturnType<typeof setTimeout> | undefined

    const handleCopy = async () => {
      const codeEl = document.querySelector(props.codeSelector) as HTMLElement | null
      if (!codeEl) return
      const text = codeEl.textContent || ''
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        try { document.execCommand('copy') } catch { /* ignore */ }
        document.body.removeChild(textarea)
      }
      copied.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { copied.value = false }, 2000)
    }

    return () => h('button', {
      type: 'button',
      'aria-label': copied.value ? 'Copied' : 'Copy code',
      class: 'notion-code-copy-button',
      onClick: handleCopy
    }, copied.value
      ? h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('path', { d: 'M20 6 9 17l-5-5' })
        ])
      : h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('rect', { x: 9, y: 9, width: 13, height: 13, rx: 2, ry: 2 }),
          h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })
        ])
    )
  }
})
