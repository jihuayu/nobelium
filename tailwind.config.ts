import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

interface BlogAppearanceConfig {
  lightBackground?: string
  darkBackground?: string
}

const tailwindRequire = createRequire(require.resolve('@tailwindcss/postcss'))
const createJiti = tailwindRequire('jiti') as (id: string, options?: { interopDefault?: boolean }) => (source: string) => BlogAppearanceConfig
const jiti = createJiti(filename, { interopDefault: true })
const config = jiti(path.resolve(dirname, 'config/blog.config.ts'))

const FONTS_SANS = [
  'var(--font-ibm-plex-sans)',
  '"PingFang SC"', '"Microsoft YaHei"', '"Hiragino Sans GB"', '"Noto Sans CJK SC"',
  '"Source Han Sans SC"', '"Source Han Sans CN"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont',
  'Segoe UI', 'Roboto', '"Noto Sans"', '"Helvetica Neue"', 'Helvetica', '"Nimbus Sans L"',
  'Arial', '"Liberation Sans"', '"Wenquanyi Micro Hei"',
  '"WenQuanYi Zen Hei"', '"ST Heiti"', 'SimHei', '"WenQuanYi Zen Hei Sharp"', 'sans-serif'
]
const FONTS_SERIF = [
  'var(--font-source-serif-4)', 'var(--font-noto-serif-sc)',
  '"Source Serif"', 'ui-serif', 'Georgia', '"Nimbus Roman No9 L"', '"Songti SC"',
  '"Noto Serif CJK SC"', '"Source Han Serif SC"', '"Source Han Serif CN"', 'STSong',
  '"AR PL New Sung"', '"AR PL SungtiL GB"', 'NSimSun', 'SimSun', '"TW-Sung"',
  '"WenQuanYi Bitmap Song"', '"AR PL UMing CN"', '"AR PL UMing HK"', '"AR PL UMing TW"',
  '"AR PL UMing TW MBE"', 'PMingLiU', 'MingLiU', 'serif'
]

const tailwindConfig = {
  content: [
    './*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './layouts/**/*.{js,ts,jsx,tsx}',
    './packages/notion-react/.storybook/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/notion-react/stories/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/notion-react/src/**/*.{js,ts,jsx,tsx}',
    './packages/somnium-comments/src/**/*.{js,ts,jsx,tsx}',
    './apps/blog/src/**/*.{astro,js,ts,jsx,tsx}'
  ],
  darkMode: 'class' as const,
  theme: {
    extend: {
      colors: {
        day: {
          DEFAULT: config.lightBackground || '#ffffff'
        },
        night: {
          DEFAULT: config.darkBackground || '#111827'
        }
      },
      fontFamily: {
        sans: FONTS_SANS,
        serif: FONTS_SERIF,
        noEmoji: [
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif'
        ]
      }
    }
  },
  variants: {
    extend: {}
  },
  plugins: []
}

export default tailwindConfig
