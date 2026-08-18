import { defineConfig } from 'eslint/config'
import tsParser from '@typescript-eslint/parser'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  { ignores: ['.cache/**', '.next/**', '.vercel/**', 'node_modules/**', 'packages/*/dist/**', 'packages/*/storybook-static/**', 'apps/blog/.astro/**', 'apps/blog/.vercel/**', 'apps/blog/dist/**'] },
  ...nextCoreWebVitals,
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: '19'
      }
    }
  },
  {
    files: ['packages/notion-react/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@next/next/no-img-element': 'off'
    }
  },
  {
    files: ['packages/somnium-comments/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@next/next/no-img-element': 'off'
    }
  },
  {
    files: ['packages/notion-vue/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off'
    }
  }
])
