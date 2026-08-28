import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import stylexBabelPlugin, { type Rule } from '@stylexjs/babel-plugin'
import { transform } from '@stylexswc/rs-compiler'
import type { Plugin, Loader } from 'esbuild'

interface StyleXEsbuildPluginOptions {
  baseCssPath?: string
  outputCssPath: string
}

const loaderByExtension: Record<string, Loader> = {
  '.js': 'js',
  '.jsx': 'jsx',
  '.ts': 'ts',
  '.tsx': 'tsx'
}

export function stylexEsbuildPlugin(options: StyleXEsbuildPluginOptions): Plugin {
  const rules = new Map<string, Rule[]>()

  return {
    name: 'somnium-stylex',
    setup(build) {
      build.onStart(() => {
        rules.clear()
      })

      build.onLoad({ filter: /\.[jt]sx?$/ }, async args => {
        const source = await readFile(args.path, 'utf8')
        if (!source.includes('@stylexjs/stylex')) return undefined

        const result = transform(args.path, source, {
          dev: false,
          unstable_moduleResolution: { type: 'commonJS' }
        })
        if (result.metadata.stylex?.length) {
          rules.set(args.path, result.metadata.stylex)
        }

        return {
          contents: result.code,
          loader: loaderByExtension[path.extname(args.path)]
        }
      })

      build.onEnd(async result => {
        if (result.errors.length) return

        const stylexCss = rules.size
          ? stylexBabelPlugin.processStylexRules([...rules.values()].flat(), {})
          : ''
        const baseCss = options.baseCssPath
          ? await readFile(path.resolve(options.baseCssPath), 'utf8')
          : ''
        const outputPath = path.resolve(options.outputCssPath)
        await mkdir(path.dirname(outputPath), { recursive: true })
        await writeFile(outputPath, [baseCss.trimEnd(), stylexCss].filter(Boolean).join('\n\n') + '\n', 'utf8')
      })
    }
  }
}
