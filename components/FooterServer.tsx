import * as stylex from '@stylexjs/stylex'
import { config } from '@/lib/server/config'
import { appStyles } from '@/styles/app.stylex'
import { colors } from '@/styles/theme.stylex'

interface FooterServerProps {
  fullWidth?: boolean
}

export default function FooterServer({ fullWidth }: FooterServerProps) {
  const currentYear = new Date().getFullYear()
  const since = +config.since
  return (
    <div
      {...stylex.props(styles.footer, fullWidth ? appStyles.wideContentWidth : appStyles.contentWidth)}
    >
      <hr {...stylex.props(styles.rule)} />
      <div {...stylex.props(styles.meta)}>
        <div {...stylex.props(styles.metaRow)}>
          <p>
            © {config.author} {since === currentYear || !since ? currentYear : `${since} - ${currentYear}`}
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = stylex.create({
  footer: {
    color: colors.textQuiet,
    flexShrink: 0,
    margin: '3rem auto 0',
    paddingInline: '1rem',
    width: '100%'
  },
  rule: {
    borderColor: colors.borderSubtle,
    borderStyle: 'solid',
    borderWidth: '1px 0 0'
  },
  meta: {
    fontSize: '0.875rem',
    lineHeight: '1.5rem',
    marginBlock: '1rem'
  },
  metaRow: {
    alignItems: 'baseline',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  }
})
