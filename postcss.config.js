const path = require('path')

module.exports = {
  plugins: {
    '@stylexswc/postcss-plugin': {
      include: [
        'app/**/*.{js,jsx,ts,tsx}',
        'components/**/*.{js,jsx,ts,tsx}',
        'packages/notion-react/src/**/*.{js,jsx,ts,tsx}',
        'packages/somnium-comments/src/**/*.{js,jsx,ts,tsx}',
        'styles/**/*.{js,jsx,ts,tsx}'
      ],
      rsOptions: {
        dev: process.env.NODE_ENV === 'development',
        aliases: {
          '@/*': [path.join(__dirname, '*')]
        },
        unstable_moduleResolution: {
          type: 'commonJS'
        }
      }
    }
  }
}
