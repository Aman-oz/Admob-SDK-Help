// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Ozi AdMob SDK',
  tagline: 'One SDK for ads, remote config and navigation — every app, in sync',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  // TODO: set to the real deployment URL once the Vercel/Netlify project exists.
  url: 'https://ozi-admob-sdk.example.com',
  baseUrl: '/',

  organizationName: 'ozi-technology',
  projectName: 'ozi-admob-sdk-docs',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Public (non-secret) Firebase Web SDK config, baked into the client
  // bundle at build time — set these as Vercel project env vars.
  customFields: {
    firebaseConfig: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      appId: process.env.FIREBASE_APP_ID,
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/logo.svg',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Ozi AdMob SDK',
        logo: {
          alt: 'Ozi AdMob SDK',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'overview',
            position: 'left',
            label: 'Overview',
          },
          {
            type: 'doc',
            docId: 'getting-started',
            position: 'left',
            label: 'Getting Started',
          },
          {
            type: 'doc',
            docId: 'ad-formats/index',
            position: 'left',
            label: 'Ad Formats',
          },
          {
            type: 'doc',
            docId: 'remote-config',
            position: 'left',
            label: 'Remote Config',
          },
          {
            type: 'doc',
            docId: 'troubleshooting',
            position: 'right',
            label: 'Troubleshooting',
          },
          {
            to: '/team',
            position: 'right',
            label: 'Team Access',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'Overview', to: '/overview'},
              {label: 'Getting Started', to: '/getting-started'},
              {label: 'Ad Formats', to: '/ad-formats'},
              {label: 'Remote Config', to: '/remote-config'},
            ],
          },
          {
            title: 'More',
            items: [
              {label: 'Navigation Configuration', to: '/navigation-configuration'},
              {label: 'Analytics & Consent', to: '/analytics-consent'},
              {label: 'Troubleshooting', to: '/troubleshooting'},
            ],
          },
        ],
        copyright: `Internal documentation — Ozi Technology · com.ozi.admob:ads (Next-Gen line) · © ${new Date().getFullYear()}`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['kotlin', 'java', 'groovy', 'json'],
      },
    }),
};

export default config;
