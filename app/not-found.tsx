import * as stylex from '@stylexjs/stylex'
import ContainerServer from '@/components/ContainerServer'
import { colors } from '@/styles/theme.stylex'

const styles = stylex.create({
  title: {
    color: colors.textPrimary,
    fontFamily: 'var(--font-source-serif-4), var(--font-noto-serif-sc), ui-serif, Georgia, serif',
    fontSize: '3rem',
    fontWeight: 600,
    letterSpacing: 0,
    lineHeight: 1,
    textAlign: 'center'
  },
  message: {
    color: colors.textSubtle,
    fontSize: '1.25rem',
    lineHeight: '1.75rem',
    textAlign: 'center'
  }
})

export default function NotFound() {
  return (
    <ContainerServer>
      <h1 {...stylex.props(styles.title)}>404</h1>
      <p {...stylex.props(styles.message)}>Page not found</p>
    </ContainerServer>
  )
}
