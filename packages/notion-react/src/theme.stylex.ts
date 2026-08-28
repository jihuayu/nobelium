import * as stylex from '@stylexjs/stylex'

export const colors = stylex.defineVars({
  canvas: '#fafaf9',
  surfaceElevated: '#fff',
  surfaceSubtle: '#f5f5f4',
  surfaceReference: '#fafaf9',
  textPrimary: '#1c1917',
  textStrong: '#292524',
  textSecondary: '#44403c',
  textMuted: '#57534e',
  textMutedStrong: '#57534e',
  textSubtle: '#78716c',
  textQuiet: '#a8a29e',
  borderSubtle: '#e7e5e4',
  borderDefault: '#e7e5e4',
  borderStrong: '#d6d3d1',
  borderInput: '#d6d3d1',
  borderFocus: '#a8a29e',
  borderQuiet: '#a8a29e',
  dividerStrong: 'rgb(231 229 228 / 0.8)',
  danger: '#dc2626',
  overlayScrim: '#000'
})

export const darkTheme = stylex.createTheme(colors, {
  canvas: '#0c0a09',
  surfaceElevated: '#1c1917',
  surfaceSubtle: '#292524',
  surfaceReference: 'rgb(41 37 36 / 0.4)',
  textPrimary: '#f5f5f4',
  textStrong: '#e7e5e4',
  textSecondary: '#d6d3d1',
  textMuted: '#a8a29e',
  textMutedStrong: '#d6d3d1',
  textSubtle: '#a8a29e',
  textQuiet: '#78716c',
  borderSubtle: '#292524',
  borderDefault: '#44403c',
  borderStrong: '#57534e',
  borderInput: '#44403c',
  borderFocus: '#78716c',
  borderQuiet: '#57534e',
  dividerStrong: 'rgb(41 37 36 / 0.9)',
  danger: '#f87171',
  overlayScrim: '#000'
})
