import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Weave',
  description: 'A modern TypeScript reactive library — no Virtual DOM, no compilation, no custom attributes',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'API', link: '/api' },
      { text: 'Examples', link: '/examples' },
      {
        text: 'v0.8.0',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Contributing', link: '/contributing' }
        ]
      }
    ],

    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/getting-started' },
            { text: 'Examples', link: '/examples' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Reactive State', link: '/reactive-state' },
            { text: 'Store System', link: '/store' },
            { text: 'Extensibility (Macros)', link: '/extensibility' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Plugin System', link: '/plugins' },
            { text: 'DevTools', link: '/devtools' },
            { text: 'Adapters & Sync', link: '/adapters' },
            { text: 'Performance', link: '/performance' }
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'API Reference', link: '/api' },
            { text: 'Browser Compatibility', link: '/browser-compatibility' },
            { text: 'Security', link: '/security' },
            { text: 'Troubleshooting', link: '/troubleshooting' },
            { text: 'Contributing', link: '/contributing' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ludows/weave' }
    ],

    editLink: {
      pattern: 'https://github.com/Ludows/weave/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2026-present Weave Contributors'
    },

    search: {
      provider: 'local'
    }
  }
})
