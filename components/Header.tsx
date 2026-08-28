import Link from 'next/link'
import Image from 'next/image'
import * as stylex from '@stylexjs/stylex'
import HeaderBehavior from '@/components/HeaderBehavior'
import { appStyles } from '@/styles/app.stylex'
import { colors } from '@/styles/theme.stylex'

interface NavLocale {
  INDEX: string
  ABOUT: string
  RSS: string
  SEARCH: string
}

interface NavBarProps {
  path: string
  showAbout: boolean
  locale: NavLocale
}

const NavBar = ({ path, showAbout, locale }: NavBarProps) => {
  const links = [
    { id: 0, name: locale.INDEX, to: path || '/', show: true },
    { id: 1, name: locale.ABOUT, to: '/about', show: showAbout },
    { id: 2, name: locale.RSS, to: '/feed', show: true, external: true },
    { id: 3, name: locale.SEARCH, to: '/search', show: true }
  ]

  return (
    <div className={`header-nav-wrap ${stylex.props(styles.navWrap).className}`}>
      <ul className={`header-nav-list ${stylex.props(styles.navList).className}`}>
        {links.map(
          link =>
            link.show && (
              <li
                key={link.id}
                className={`nav ${stylex.props(styles.navItem).className}`}
              >
                <Link
                  href={link.to}
                  target={link.external ? '_blank' : undefined}
                  {...stylex.props(appStyles.action)}
                >
                  {link.name}
                </Link>
              </li>
            )
        )}
      </ul>
    </div>
  )
}

interface HeaderProps {
  navBarTitle?: string | null
  fullWidth?: boolean
  siteTitle: string
  siteDescription: string
  path: string
  showAbout: boolean
  autoCollapsedNavBar: boolean
  navLocale: NavLocale
}

interface HeaderNameProps {
  siteTitle: string
  siteDescription: string
  postTitle?: string | null
}

function HeaderName({ siteTitle, siteDescription, postTitle }: HeaderNameProps) {
  return (
    <p
      id="header-title"
      className={`header-name ${!postTitle ? 'header-name-no-post-title' : ''} capture-pointer-events ${stylex.props(styles.headerName).className}`}
    >
      {postTitle && <span className={`post-title ${stylex.props(styles.gridLayer, styles.tracking).className}`}>{postTitle}</span>}
      <span {...stylex.props(styles.gridLayer)}>
        <span className={`site-title ${stylex.props(styles.tracking).className}`}>{siteTitle}</span>
        <span className={`site-description ${stylex.props(styles.description).className}`}>{siteDescription}</span>
      </span>
    </p>
  )
}

export default function Header({
  navBarTitle,
  fullWidth,
  siteTitle,
  siteDescription,
  path,
  showAbout,
  autoCollapsedNavBar,
  navLocale
}: HeaderProps) {
  return (
    <>
      <HeaderBehavior useSticky={!autoCollapsedNavBar} fullWidth={fullWidth} />
      <div className={`observer-element ${stylex.props(styles.observer).className}`} id="header-sentinel" />
      <div
        className={`sticky-nav ${stylex.props(styles.stickyNav, fullWidth ? appStyles.wideContentWidth : appStyles.contentWidth).className}`}
        id="sticky-nav"
      >
        <svg
          viewBox="0 0 24 24"
          className={`caret ${stylex.props(styles.caret).className}`}
        >
          <path
            d="M12 10.828l-4.95 4.95-1.414-1.414L12 8l6.364 6.364-1.414 1.414z"
            {...stylex.props(styles.caretPath)}
          />
        </svg>
        <div className={`header-main ${stylex.props(styles.headerMain).className}`}>
          <Link href={path || '/'} aria-label={siteTitle} className={`header-icon-link ${stylex.props(styles.iconLink).className}`}>
            <Image
              src="/favicon-mark-light-512.png"
              width={26}
              height={26}
              alt=""
              aria-hidden
              className={`header-icon ${stylex.props(styles.lightIcon).className}`}
            />
            <Image
              src="/favicon-mark-dark-512.png"
              width={26}
              height={26}
              alt=""
              aria-hidden
              className={`header-icon ${stylex.props(styles.darkIcon).className}`}
            />
          </Link>
          <HeaderName
            siteTitle={siteTitle}
            siteDescription={siteDescription}
            postTitle={navBarTitle}
          />
        </div>
        <NavBar path={path} showAbout={showAbout} locale={navLocale} />
      </div>
    </>
  )
}

const styles = stylex.create({
  navWrap: {
    alignSelf: {
      '@media (min-width: 768px)': 'flex-end'
    },
    flexShrink: 0
  },
  navList: {
    alignItems: 'flex-end',
    display: 'flex',
    flexDirection: 'row'
  },
  navItem: {
    display: 'block',
    marginLeft: '1rem'
  },
  headerName: {
    alignItems: 'flex-end',
    color: colors.textPrimary,
    fontFamily: 'var(--font-source-serif-4), var(--font-noto-serif-sc), "Source Serif", ui-serif, Georgia, serif',
    fontWeight: 600,
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'minmax(0, 1fr)',
    lineHeight: 1
  },
  gridLayer: {
    gridColumnStart: 1,
    gridRowStart: 1
  },
  tracking: {
    letterSpacing: 0
  },
  description: {
    color: colors.textQuiet,
    fontSize: '0.75rem',
    fontWeight: 400,
    marginLeft: '0.5rem'
  },
  observer: {
    height: {
      default: '1rem',
      '@media (min-width: 768px)': '3rem'
    }
  },
  stickyNav: {
    alignItems: {
      default: 'center',
      '@media (min-width: 768px)': 'flex-end'
    },
    display: 'flex',
    flexDirection: 'row',
    height: '1.5rem',
    justifyContent: 'space-between',
    margin: '0 auto',
    marginBottom: {
      default: '0.25rem',
      '@media (min-width: 768px)': '1.5rem'
    },
    padding: '2rem 1rem',
    width: '100%'
  },
  caret: {
    bottom: 0,
    height: '1.5rem',
    insetInline: 0,
    marginInline: 'auto',
    opacity: 0.3,
    pointerEvents: 'none',
    position: 'absolute',
    transitionDuration: '100ms',
    transitionProperty: 'all',
    width: '1.5rem'
  },
  caretPath: {
    fill: colors.iconInverse
  },
  headerMain: {
    alignItems: {
      default: 'center',
      '@media (min-width: 768px)': 'flex-end'
    },
    display: 'flex',
    gap: '0.5rem'
  },
  iconLink: {
    alignItems: {
      default: 'center',
      '@media (min-width: 768px)': 'flex-end'
    },
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    lineHeight: 1,
    transitionDuration: '500ms',
    transitionProperty: 'transform'
  },
  lightIcon: {
    display: {
      default: 'block',
      ':is(.dark *)': 'none'
    }
  },
  darkIcon: {
    display: {
      default: 'none',
      ':is(.dark *)': 'block'
    }
  }
})
