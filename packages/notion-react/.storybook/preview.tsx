import type { Preview } from '@storybook/react'
import * as stylex from '@stylexjs/stylex'
import { colors, darkTheme } from '../src/theme.stylex'
import '../src/storybook.css'

const darkThemeClasses = (stylex.props(darkTheme).className || '').split(' ').filter(Boolean)

const preview: Preview = {
  globalTypes: {
    colorMode: {
      name: 'Color Mode',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' }
        ]
      }
    }
  },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true }
  },
  decorators: [
    (Story, context) => {
      const dark = context.globals.colorMode === 'dark'
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', dark)
        for (const className of darkThemeClasses) {
          document.documentElement.classList.toggle(className, dark)
        }
      }

      return (
        <div className={`${dark ? 'dark' : ''} ${stylex.props(styles.canvas, dark ? darkTheme : null).className}`}>
          <div {...stylex.props(styles.surface)}>
            <Story />
          </div>
        </div>
      )
    }
  ]
}

export default preview

const styles = stylex.create({
  canvas: {
    backgroundColor: colors.canvas,
    color: colors.textPrimary,
    minHeight: '100vh',
    padding: '2rem'
  },
  surface: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.dividerStrong,
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    marginInline: 'auto',
    maxWidth: '64rem',
    padding: '2rem 1.5rem'
  }
})
