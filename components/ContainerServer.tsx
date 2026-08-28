import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import Header from '@/components/Header'
import FooterServer from '@/components/FooterServer'
import { appStyles } from '@/styles/app.stylex'
import { config } from '@/lib/server/config'
import loadLocale from '@/assets/i18n'

interface ContainerServerProps {
  children: ReactNode
  layout?: string
  fullWidth?: boolean
  title?: string
}

export default async function ContainerServer({ children, layout, fullWidth, title }: ContainerServerProps) {
  const locale = await loadLocale('basic', config.lang)

  return (
    <div id="top">
      <div className={`wrapper ${stylex.props(config.font === 'serif' ? appStyles.serifFont : appStyles.sansFont).className}`}>
        <Header
          navBarTitle={layout === 'blog' ? title || config.title : null}
          fullWidth={fullWidth}
          siteTitle={config.title}
          siteDescription={config.description}
          path={config.path || '/'}
          showAbout={config.showAbout}
          autoCollapsedNavBar={config.autoCollapsedNavBar}
          navLocale={locale.NAV}
        />
        <main
          {...stylex.props(
            styles.main,
            layout !== 'blog' && styles.constrainedMain,
            layout !== 'blog' && (fullWidth ? appStyles.wideContentWidth : appStyles.contentWidth)
          )}
        >
          {children}
        </main>
        <FooterServer fullWidth={fullWidth} />
      </div>
    </div>
  )
}

const styles = stylex.create({
  main: {
    flexGrow: 1,
    transitionProperty: 'all'
  },
  constrainedMain: {
    alignSelf: 'center',
    paddingInline: '1rem',
    width: '100%'
  }
})
