'use client'

import { useEffect, useId, useRef, useState } from 'react'
import cn from 'classnames'
import type { MermaidBlockProps } from '../types'

type MermaidModule = typeof import('mermaid')
let mermaidModulePromise: Promise<MermaidModule> | null = null

async function getMermaid() {
  if (!mermaidModulePromise) mermaidModulePromise = import('mermaid')
  const loadedModule = await mermaidModulePromise
  return loadedModule.default
}

function isDarkMode() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

const MERMAID_LIGHT_THEME_VARIABLES = {
  primaryColor: '#f5f5f4',
  primaryBorderColor: '#d6d3d1',
  primaryTextColor: '#292524',
  lineColor: '#57534e',
  secondaryColor: '#e7e5e4',
  tertiaryColor: '#fafaf9',
  background: '#fafaf9',
  mainBkg: '#f5f5f4',
  nodeBorder: '#d6d3d1',
  clusterBkg: '#fafaf9',
  clusterBorder: '#e7e5e4',
  titleColor: '#292524',
  edgeLabelBackground: '#fafaf9',
  fontFamily: 'inherit'
}

const MERMAID_DARK_THEME_VARIABLES = {
  primaryColor: '#292524',
  primaryBorderColor: '#44403c',
  primaryTextColor: '#e7e5e4',
  lineColor: '#a8a29e',
  secondaryColor: '#44403c',
  tertiaryColor: '#0c0a09',
  background: '#0c0a09',
  mainBkg: '#292524',
  nodeBorder: '#44403c',
  clusterBkg: '#0c0a09',
  clusterBorder: '#292524',
  titleColor: '#e7e5e4',
  edgeLabelBackground: '#0c0a09',
  fontFamily: 'inherit'
}

function sanitizeRenderedSvg(svg: string): string {
  if (typeof DOMParser === 'undefined') return svg

  const documentNode = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = documentNode.documentElement
  if (!root || root.nodeName.toLowerCase() === 'parsererror') {
    throw new Error('Failed to sanitize Mermaid SVG')
  }

  for (const selector of ['script', 'foreignObject', 'iframe', 'object', 'embed']) {
    for (const element of Array.from(root.querySelectorAll(selector))) {
      element.remove()
    }
  }

  for (const element of Array.from(root.querySelectorAll('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        continue
      }
      if ((name === 'href' || name === 'xlink:href') && /^javascript:/i.test(value)) {
        element.removeAttribute(attribute.name)
      }
    }
  }

  return root.outerHTML
}

export default function MermaidBlock({ code, className }: MermaidBlockProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const renderTokenRef = useRef(0)
  const [renderError, setRenderError] = useState('')
  const [themeVersion, setThemeVersion] = useState(0)
  const [shouldRender, setShouldRender] = useState(false)
  const localId = useId().replaceAll(':', '_')

  useEffect(() => {
    if (shouldRender || !hostRef.current) return undefined
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null
    const activate = () => setShouldRender(true)
    const scheduleActivate = () => {
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        idleId = window.requestIdleCallback(activate, { timeout: 1200 })
      } else {
        idleTimer = globalThis.setTimeout(activate, 160)
      }
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      scheduleActivate()
    }, { root: null, rootMargin: '240px 0px', threshold: 0.01 })
    observer.observe(hostRef.current)

    return () => {
      observer.disconnect()
      if (idleId !== null && typeof window !== 'undefined' && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId)
      }
      if (idleTimer !== null) globalThis.clearTimeout(idleTimer)
    }
  }, [shouldRender])

  useEffect(() => {
    if (!shouldRender || typeof document === 'undefined') return undefined
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes' && record.attributeName === 'class') {
          setThemeVersion(value => value + 1)
          break
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [shouldRender])

  useEffect(() => {
    if (!shouldRender) return undefined
    let cancelled = false
    const renderToken = renderTokenRef.current + 1
    renderTokenRef.current = renderToken

    async function renderDiagram() {
      const container = containerRef.current
      if (!container || !container.isConnected) return
      const source = `${code || ''}`.trim()

      if (!source) {
        container.innerHTML = ''
        setRenderError('')
        return
      }

      try {
        container.innerHTML = ''
        const mermaid = await getMermaid()
        const dark = isDarkMode()
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: dark ? MERMAID_DARK_THEME_VARIABLES : MERMAID_LIGHT_THEME_VARIABLES
        })
        const { svg, bindFunctions } = await mermaid.render(`mermaid-${localId}-${themeVersion}-${renderToken}`, source, container)
        if (cancelled || renderTokenRef.current !== renderToken || !container.isConnected || containerRef.current !== container) return
        container.innerHTML = sanitizeRenderedSvg(svg)
        bindFunctions?.(container)
        setRenderError('')
      } catch (error) {
        if (cancelled || renderTokenRef.current !== renderToken) return
        if (error instanceof DOMException && error.name === 'NoModificationAllowedError') return
        if (containerRef.current?.isConnected) containerRef.current.innerHTML = ''
        setRenderError(error instanceof Error ? error.message : 'Failed to render Mermaid diagram')
      }
    }

    renderDiagram()
    return () => { cancelled = true }
  }, [code, localId, shouldRender, themeVersion])

  if (renderError) {
    return (
      <div ref={hostRef} className={cn('notion-mermaid-block', className)}>
        <pre className="overflow-x-auto p-3 text-sm text-stone-900 dark:text-stone-100"><code>{code}</code></pre>
        <p className="px-3 pb-3 text-xs text-red-600 dark:text-red-400">Mermaid render error: {renderError}</p>
      </div>
    )
  }

  return (
    <div ref={hostRef} className={cn('notion-mermaid-block', className)}>
      {shouldRender
        ? <div ref={containerRef} className="notion-mermaid-svg" />
        : <pre className="overflow-x-auto p-3 text-sm text-stone-500 dark:text-stone-400"><code>Mermaid diagram deferred</code></pre>}
    </div>
  )
}
