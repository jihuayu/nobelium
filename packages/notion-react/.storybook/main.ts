import type { StorybookConfig } from '@storybook/react-vite'
import StylexRsPlugin from '@stylexswc/unplugin/vite'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  viteFinal: async viteConfig => {
    viteConfig.plugins ||= []
    viteConfig.plugins.push(StylexRsPlugin({
      rsOptions: {
        dev: true,
        include: ['packages/notion-react/**/*.{ts,tsx}'],
        unstable_moduleResolution: { type: 'commonJS' }
      }
    }))
    return viteConfig
  }
}

export default config
