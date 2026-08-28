import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/theme.stylex'

export const appStyles = stylex.create({
  contentWidth: {
    maxWidth: '50.6rem'
  },
  wideContentWidth: {
    maxWidth: '60rem'
  },
  serifFont: {
    fontFamily: 'var(--font-source-serif-4), var(--font-noto-serif-sc), "Source Serif", ui-serif, Georgia, "Times New Roman", "Songti SC", serif'
  },
  sansFont: {
    fontFamily: 'var(--font-ibm-plex-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, "PingFang SC", "Microsoft YaHei", Arial, sans-serif'
  },
  visuallyHidden: {
    borderWidth: 0,
    clip: 'rect(0, 0, 0, 0)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px'
  },
  mutedText: {
    color: colors.textSubtle
  },
  quietText: {
    color: colors.textQuiet
  },
  primaryText: {
    color: colors.textPrimary
  },
  action: {
    color: {
      default: colors.textSubtle,
      ':hover': colors.textPrimary
    },
    cursor: 'pointer',
    transitionDuration: '150ms',
    transitionProperty: 'color',
    transitionTimingFunction: 'ease-out'
  }
})
