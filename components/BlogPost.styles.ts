import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/theme.stylex'

export const blogPostStyles = stylex.create({
  link: {
    display: 'block'
  },
  article: {
    marginBottom: {
      default: '2.5rem',
      '@media (min-width: 768px)': '3rem'
    }
  },
  header: {
    alignItems: {
      default: 'stretch',
      '@media (min-width: 768px)': 'baseline'
    },
    display: 'flex',
    flexDirection: {
      default: 'column',
      '@media (min-width: 768px)': 'row'
    },
    gap: {
      default: 0,
      '@media (min-width: 768px)': '1.5rem'
    },
    justifyContent: 'space-between'
  },
  title: {
    color: colors.textPrimary,
    cursor: 'pointer',
    fontFamily: 'var(--font-source-serif-4), var(--font-noto-serif-sc), "Source Serif", ui-serif, Georgia, serif',
    fontSize: {
      default: '1.125rem',
      '@media (min-width: 768px)': '1.5rem'
    },
    fontWeight: 600,
    letterSpacing: 0,
    marginBottom: '0.375rem',
    textDecorationColor: colors.borderStrong,
    textDecorationLine: 'none',
    textDecorationThickness: '1px',
    textUnderlineOffset: '5px'
  },
  time: {
    color: colors.textQuiet,
    flexShrink: 0,
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: 0
  },
  summary: {
    color: colors.textMuted,
    display: {
      default: 'none',
      '@media (min-width: 768px)': 'block'
    },
    lineHeight: '2rem'
  }
})
