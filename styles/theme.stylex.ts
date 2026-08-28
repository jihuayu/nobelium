import * as stylex from '@stylexjs/stylex'

export const colors = stylex.defineVars({
  surfaceElevated: '#fff',
  surfaceRaised: '#fafaf9',
  surfaceSubtle: '#f5f5f4',
  surfaceOverlay: '#292524',
  surfaceActiveAlpha: 'rgb(231 229 228 / 0.6)',
  surfaceHoverAlpha: 'rgb(231 229 228 / 0.4)',
  textPrimary: '#1c1917',
  textStrong: '#292524',
  textSecondary: '#44403c',
  textMuted: '#57534e',
  textMutedStrong: '#57534e',
  textSubtle: '#78716c',
  textQuiet: '#a8a29e',
  textOnEmphasis: '#fff',
  textTooltip: '#f5f5f4',
  iconInverse: '#000',
  borderSubtle: '#e7e5e4',
  borderDefault: '#e7e5e4',
  borderStrong: '#d6d3d1',
  borderInput: '#d6d3d1',
  borderFocus: '#a8a29e'
})

export const darkTheme = stylex.createTheme(colors, {
  surfaceElevated: '#1c1917',
  surfaceRaised: '#1c1917',
  surfaceSubtle: '#292524',
  surfaceOverlay: '#44403c',
  surfaceActiveAlpha: 'rgb(68 64 60 / 0.4)',
  surfaceHoverAlpha: 'rgb(68 64 60 / 0.3)',
  textPrimary: '#f5f5f4',
  textStrong: '#e7e5e4',
  textSecondary: '#d6d3d1',
  textMuted: '#a8a29e',
  textMutedStrong: '#d6d3d1',
  textSubtle: '#a8a29e',
  textQuiet: '#78716c',
  textOnEmphasis: '#1c1917',
  textTooltip: '#e7e5e4',
  iconInverse: '#fff',
  borderSubtle: '#292524',
  borderDefault: '#44403c',
  borderStrong: '#57534e',
  borderInput: '#44403c',
  borderFocus: '#78716c'
})
