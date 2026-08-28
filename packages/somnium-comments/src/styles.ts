import * as stylex from '@stylexjs/stylex'
import { colors } from './theme.stylex'

const disabled = {
  cursor: { ':disabled': 'not-allowed' as const },
  opacity: { ':disabled': 0.4 }
}

export const styles = stylex.create({
  reactionPicker: {
    alignItems: 'center', backgroundColor: colors.surface,
    borderColor: colors.borderSubtle, borderRadius: '0.375rem',
    borderStyle: 'solid', borderWidth: '1px', boxShadow: '0 1px 2px rgb(0 0 0 / .05)', display: 'flex',
    gap: '0.25rem', left: 0, marginTop: '0.5rem', padding: '0.25rem', position: 'absolute', top: '100%', zIndex: 10
  },
  reactionOption: {
    alignItems: 'center', borderRadius: '0.375rem', cursor: disabled.cursor, display: 'flex', fontSize: '1rem',
    height: '2rem', justifyContent: 'center', lineHeight: 1, opacity: disabled.opacity,
    transitionDuration: '150ms', transitionProperty: 'color, background-color', width: '2rem'
  },
  activeReactionOption: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textInverse
  },
  inactiveReactionOption: { backgroundColor: { ':hover': colors.surfaceSoft } },
  actions: {
    alignItems: 'center', color: colors.textFaint, display: 'flex',
    flexWrap: 'wrap', fontSize: '0.75rem', gap: '0.5rem', marginTop: '0.75rem', position: 'relative'
  },
  reactionPill: {
    alignItems: 'center', borderRadius: '9999px', borderStyle: 'solid', borderWidth: '1px', cursor: disabled.cursor,
    display: 'inline-flex', fontSize: '0.875rem', gap: '0.25rem', height: '1.75rem', lineHeight: 1,
    opacity: disabled.opacity, paddingInline: '0.5rem', transitionDuration: '150ms',
    transitionProperty: 'color, background-color, border-color'
  },
  activeReaction: {
    backgroundColor: colors.surfaceActive,
    borderColor: colors.borderQuiet,
    color: colors.textInverse
  },
  inactiveReaction: {
    backgroundColor: { default: colors.surfaceTranslucent, ':hover': colors.surfaceTranslucentHover },
    borderColor: { default: colors.borderSubtle, ':hover': colors.borderInput },
    color: colors.textSecondary
  },
  reactionTrigger: {
    alignItems: 'center', backgroundColor: { default: colors.surfaceTranslucent, ':hover': colors.surfaceTranslucentHover },
    borderColor: { default: colors.borderSubtle, ':hover': colors.borderInput },
    borderRadius: '9999px', borderStyle: 'solid', borderWidth: '1px', color: { default: colors.textNeutral, ':hover': colors.textAction },
    cursor: disabled.cursor, display: 'inline-flex', fontSize: '0.875rem', height: '1.75rem', justifyContent: 'center',
    lineHeight: 1, opacity: disabled.opacity, transitionDuration: '150ms', transitionProperty: 'all', width: '1.75rem'
  },
  reactionTriggerActive: { borderColor: colors.borderQuiet, color: colors.textPrimary },
  reactionIcon: { alignItems: 'center', display: 'inline-flex', height: '1rem', justifyContent: 'center', position: 'relative', width: '1rem' },
  smile: { fontSize: '15px' },
  plus: { fontSize: '10px', fontWeight: 600, lineHeight: 1, position: 'absolute', right: '-0.25rem', top: '-0.25rem' },
  textAction: { cursor: disabled.cursor, marginLeft: '0.25rem', opacity: disabled.opacity, transitionDuration: '150ms', transitionProperty: 'color' },
  textActionActive: { color: colors.textStrong, fontWeight: 500 },
  textActionInactive: { color: { default: colors.textNeutral, ':hover': colors.textAction } },
  dangerAction: {
    color: { default: colors.textNeutral, ':hover': colors.danger },
    cursor: disabled.cursor, opacity: disabled.opacity, transitionDuration: '150ms', transitionProperty: 'color'
  },
  actionIndent: { marginLeft: '0.25rem' },
  replies: { display: 'grid', gap: '0.125rem', marginTop: '0.75rem' },
  replyStatus: { color: colors.textFaint, fontSize: '0.75rem', padding: '0.5rem 0 0.5rem 2.75rem' },
  replyButton: { color: { default: colors.textNeutral, ':hover': colors.textAction }, fontSize: '0.75rem', fontWeight: 500, paddingLeft: '2.75rem', transitionProperty: 'color' },
  article: { padding: '1.25rem' },
  nestedArticle: { paddingBlock: '0.75rem' },
  commentRow: { display: 'flex', gap: '0.75rem' },
  avatarColumn: { alignItems: 'center', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  avatar8: { backgroundColor: colors.surfaceSoft, borderColor: colors.borderSubtle, borderRadius: '9999px', borderStyle: 'solid', borderWidth: '1px', height: '2rem', width: '2rem' },
  threadLine: { backgroundColor: colors.surfaceMuted, flex: 1, marginTop: '0.25rem', width: '1px' },
  commentContent: { flex: 1, minWidth: 0 },
  authorRow: { alignItems: 'baseline', display: 'flex', gap: '0.5rem' },
  authorName: { color: colors.textPrimary, fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  time: { color: colors.textFaint, flexShrink: 0, fontSize: '0.75rem' },
  body: { color: colors.textSecondary, fontSize: '0.95rem', lineHeight: '1.75rem', marginTop: '0.5rem', overflowWrap: 'break-word' },
  section: { borderTopColor: colors.dividerStrong, borderTopStyle: 'solid', borderTopWidth: '1px', color: colors.textSecondary, marginBlock: '2.5rem', paddingTop: '1.5rem' },
  header: { marginBottom: '1.25rem' },
  title: { color: colors.textPrimary, fontFamily: 'ui-serif, Georgia, serif', fontSize: '1.25rem', fontWeight: 600, letterSpacing: 0 },
  count: { color: colors.textQuiet, fontSize: '0.875rem', fontWeight: 400, marginLeft: '0.5rem', verticalAlign: 'middle' },
  captionText: { color: colors.textNeutral, fontSize: '0.875rem', lineHeight: '1.5rem', marginTop: '0.25rem' },
  panel: { backgroundColor: colors.surfacePanel, borderColor: colors.panelBorder, borderRadius: '0.375rem', borderStyle: 'solid', borderWidth: '1px' },
  panelPadding: { padding: '1.5rem 1.25rem' },
  skeletonTitle: { backgroundColor: colors.skeleton, borderRadius: '9999px', height: '0.75rem', width: '6rem' },
  skeletonLines: { display: 'grid', gap: '0.75rem', marginTop: '1.25rem' },
  skeletonLine: { backgroundColor: colors.skeletonSoft, borderRadius: '9999px', height: '0.75rem', maxWidth: '32rem', width: '100%' },
  skeletonShort: { backgroundColor: colors.skeletonFaint, width: '66.666667%' },
  statusText: { color: colors.textNeutral, fontSize: '0.875rem', fontWeight: 500, marginTop: '1.25rem' },
  errorTitle: { color: colors.textStrong, fontSize: '0.875rem', fontWeight: 600 },
  errorBody: { color: colors.textNeutral, fontSize: '0.875rem', lineHeight: '1.5rem', marginTop: '0.5rem' },
  outlineButton: { borderColor: { default: colors.borderInput, ':hover': colors.borderFocus, ':disabled': colors.borderSubtle }, borderRadius: '0.375rem', borderStyle: 'solid', borderWidth: '1px', color: { default: colors.textSecondary, ':hover': colors.textInverse, ':disabled': colors.textDisabled }, cursor: disabled.cursor, fontSize: '0.875rem', fontWeight: 500, padding: '0.375rem 0.75rem', transitionDuration: '150ms', transitionProperty: 'color, border-color' },
  retryButton: { marginTop: '1rem' },
  empty: { color: colors.textNeutral, fontSize: '0.875rem', padding: '1.5rem 1.25rem' },
  borderTop: { borderTopColor: colors.divider, borderTopStyle: 'solid', borderTopWidth: '1px' },
  loadMoreRow: { padding: '1rem 1.25rem' },
  loadMore: { color: { default: colors.textMuted, ':hover': colors.textInverse, ':disabled': colors.textDisabled }, cursor: disabled.cursor, fontSize: '0.875rem', fontWeight: 500, transitionDuration: '150ms', transitionProperty: 'color' },
  collapsedComposer: { alignItems: 'center', display: 'flex', gap: '0.75rem', padding: '1rem 1.25rem' },
  avatar7: { backgroundColor: colors.surfaceSoft, borderColor: colors.borderSubtle, borderRadius: '9999px', borderStyle: 'solid', borderWidth: '1px', flexShrink: 0, height: '1.75rem', width: '1.75rem' },
  composerPrompt: { backgroundColor: colors.surfaceInput, borderColor: { default: colors.borderSubtle, ':hover': colors.borderInput }, borderRadius: '0.375rem', borderStyle: 'solid', borderWidth: '1px', color: colors.textFaint, flex: 1, fontSize: '0.875rem', minWidth: 0, overflow: 'hidden', padding: '0.5rem 0.75rem', textAlign: 'left', textOverflow: 'ellipsis', transitionDuration: '150ms', transitionProperty: 'border-color', whiteSpace: 'nowrap' },
  subtleAction: { color: { default: colors.textFaint, ':hover': colors.textSecondary }, flexShrink: 0, fontSize: '0.75rem', transitionDuration: '150ms', transitionProperty: 'color' },
  disabledPrompt: { color: colors.textFaint, flex: 1, fontSize: '0.875rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  signIn: { color: { default: colors.textSubtle, ':hover': colors.textAction }, flexShrink: 0, fontSize: '0.75rem', fontWeight: 500, transitionDuration: '150ms', transitionProperty: 'color' },
  form: { padding: '1.25rem' },
  accountRow: { alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' },
  accountInfo: { alignItems: 'center', display: 'flex', gap: '0.5rem', minWidth: 0 },
  avatar6: { backgroundColor: colors.surfaceSoft, borderColor: colors.borderSubtle, borderRadius: '9999px', borderStyle: 'solid', borderWidth: '1px', flexShrink: 0, height: '1.5rem', width: '1.5rem' },
  accountName: { color: colors.textNeutral, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  replyBanner: { alignItems: 'center', backgroundColor: colors.surfaceBanner, borderColor: colors.borderSubtle, borderRadius: '0.375rem', borderStyle: 'solid', borderWidth: '1px', color: colors.textMuted, display: 'flex', fontSize: '0.875rem', gap: '0.75rem', justifyContent: 'space-between', marginBottom: '0.75rem', padding: '0.5rem 0.75rem' },
  truncate: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  replyCancel: { color: { default: colors.textNeutral, ':hover': colors.textInverse }, flexShrink: 0, fontSize: '0.75rem', fontWeight: 500, transitionProperty: 'color' },
  visuallyHidden: { borderWidth: 0, clip: 'rect(0,0,0,0)', height: '1px', margin: '-1px', overflow: 'hidden', padding: 0, position: 'absolute', whiteSpace: 'nowrap', width: '1px' },
  relative: { position: 'relative' },
  textarea: { backgroundColor: { default: colors.surfaceInput, ':disabled': colors.surfaceInputDisabled }, borderColor: { default: colors.borderSubtle, ':focus': colors.borderQuiet }, borderRadius: '0.375rem', borderStyle: 'solid', borderWidth: '1px', color: { default: colors.textStrong, ':disabled': colors.textDisabled }, cursor: disabled.cursor, display: 'block', fontSize: '0.875rem', lineHeight: '1.5rem', minHeight: '7rem', outline: 'none', padding: '0.5rem 0.75rem', resize: 'vertical', transitionProperty: 'color, background-color, border-color', width: '100%', '::placeholder': { color: colors.textFaint } },
  mentionMenu: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: '0.375rem', borderStyle: 'solid', borderWidth: '1px', bottom: '100%', boxShadow: '0 4px 6px -1px rgb(0 0 0 / .1)', left: '0.75rem', marginBottom: '0.25rem', minWidth: '10rem', overflow: 'hidden', paddingBlock: '0.25rem', position: 'absolute', zIndex: 20 },
  mentionOption: { alignItems: 'center', display: 'flex', fontSize: '0.875rem', gap: '0.5rem', padding: '0.375rem 0.75rem', textAlign: 'left', transitionProperty: 'color, background-color', width: '100%' },
  activeMention: { backgroundColor: colors.surfaceSubtle, color: colors.textPrimary },
  inactiveMention: { color: colors.textMuted },
  mentionAt: { color: colors.textQuiet },
  mentionLogin: { fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  composerFooter: { alignItems: 'center', display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '0.75rem' },
  errorText: { color: colors.textNeutral, fontSize: '0.875rem' },
  inlineActions: { alignItems: 'center', display: 'flex', gap: '0.75rem' },
  cancel: { color: { default: colors.textNeutral, ':hover': colors.textAction }, fontSize: '0.875rem', transitionDuration: '150ms', transitionProperty: 'color' }
})
