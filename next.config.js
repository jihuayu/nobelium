const path = require('path')

module.exports = {
  typescript: {
    tsconfigPath: './tsconfig.build.json'
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gravatar.com',
        pathname: '/**'
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*{/}?',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'interest-cohort=()'
          }
        ]
      }
    ]
  },
  async rewrites() {
    const markdownAccept = {
      type: 'header',
      key: 'accept',
      value: '.*text/markdown.*'
    }

    return [
      {
        source: '/',
        has: [markdownAccept],
        destination: '/.well-known/home.md'
      },
      {
        source: '/page/:path*',
        has: [markdownAccept],
        destination: '/.well-known/home.md/page/:path*'
      },
      {
        source: '/tag/:path*',
        has: [markdownAccept],
        destination: '/.well-known/home.md/tag/:path*'
      },
      {
        source: '/search',
        has: [markdownAccept],
        destination: '/.well-known/home.md/search'
      },
      {
        source: '/:slug((?!api|feed|docs|_next|.*\\..*).*)',
        has: [markdownAccept],
        destination: '/.well-known/home.md/:slug'
      }
    ]
  },
  turbopack: {
    root: path.resolve(__dirname)
  }
}
