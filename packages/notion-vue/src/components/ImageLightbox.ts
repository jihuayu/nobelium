import { defineComponent, h, ref, onMounted, onBeforeUnmount, Teleport } from 'vue'

export default defineComponent({
  name: 'ImageLightbox',
  setup() {
    const src = ref<string | null>(null)
    const alt = ref('')

    const open = (imgSrc: string, imgAlt: string) => {
      src.value = imgSrc
      alt.value = imgAlt
    }

    const close = () => {
      src.value = null
    }

    let clickHandler: (e: MouseEvent) => void
    let keyHandler: (e: KeyboardEvent) => void

    onMounted(() => {
      clickHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'IMG' && target.closest('.notion')) {
          const img = target as HTMLImageElement
          if (img.closest('.notion-asset-caption')) return
          e.preventDefault()
          open(img.src, img.alt || '')
        }
      }
      keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close()
      }
      document.addEventListener('click', clickHandler)
      document.addEventListener('keydown', keyHandler)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('click', clickHandler)
      document.removeEventListener('keydown', keyHandler)
    })

    return () => src.value
      ? h(Teleport, { to: 'body' }, [
          h('div', {
            class: 'notion-lightbox-overlay',
            onClick: close,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': alt.value || 'Image preview'
          }, [
            h('img', {
              src: src.value,
              alt: alt.value,
              class: 'notion-lightbox-image',
              onClick: (e: Event) => e.stopPropagation()
            }),
            h('button', {
              type: 'button',
              'aria-label': 'Close',
              class: 'notion-lightbox-close',
              onClick: close
            }, [
              h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
                h('path', { d: 'M18 6 6 18M6 6l12 12' })
              ])
            ])
          ])
        ])
      : null
  }
})
