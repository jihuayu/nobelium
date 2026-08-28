import * as stylex from '@stylexjs/stylex'
import { colors } from '../theme.stylex'

export const linkPreviewStyles = stylex.create({
  card: {
    backgroundColor: 'transparent',
    borderColor: {
      default: colors.borderDefault,
      ':hover': colors.borderStrong
    },
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'block',
    height: '110px',
    marginBlock: '1rem',
    opacity: 1,
    overflow: 'hidden',
    transitionProperty: 'border-color'
  },
  inner: { alignItems: 'stretch', display: 'flex', height: '100%' },
  main: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    padding: '0.5rem 0.75rem'
  },
  mainWithImage: { flexBasis: '65%', flexShrink: 0 },
  mainWithoutImage: { flex: 1 },
  title: {
    color: colors.textPrimary,
    flexShrink: 0,
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: '1.5rem',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  description: {
    color: colors.textMutedStrong,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    marginBottom: 0,
    marginTop: '0.125rem',
    overflow: 'hidden'
  },
  footer: {
    alignItems: 'center',
    color: colors.textStrong,
    display: 'flex',
    fontSize: '0.75rem',
    gap: '0.5rem',
    marginTop: 'auto',
    paddingTop: '0.375rem'
  },
  iconFrame: {
    backgroundColor: 'transparent',
    borderRadius: '0.125rem',
    flex: 'none',
    height: '1rem',
    overflow: 'hidden',
    position: 'relative',
    width: '1rem'
  },
  icon: {
    backgroundColor: 'transparent',
    borderRadius: '0.125rem',
    height: '1rem',
    objectFit: 'contain',
    width: '1rem'
  },
  iconPlaceholder: {
    backgroundColor: colors.borderInput,
    borderRadius: '0.125rem',
    flex: 'none',
    height: '1rem',
    width: '1rem'
  },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  media: { flexBasis: '35%', flexShrink: 0, height: '100%' },
  mediaFrame: {
    backgroundColor: colors.surfaceSubtle,
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    width: '100%'
  },
  cover: {
    height: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
    transitionDuration: '200ms',
    transitionProperty: 'opacity',
    width: '100%'
  }
})
