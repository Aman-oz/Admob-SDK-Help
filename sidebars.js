// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Two independent sidebars — one per SDK track. Docusaurus shows whichever
 * one contains the doc currently being viewed, so a reader following the
 * XML SDK never sees Compose pages in the left nav, and vice versa.
 *
 * @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  xmlSidebar: [
    'xml-sdk/overview',
    'xml-sdk/getting-started',
    {
      type: 'category',
      label: 'Ad Formats',
      link: {type: 'doc', id: 'xml-sdk/ad-formats/index'},
      items: [
        'xml-sdk/ad-formats/app-open-resume',
        'xml-sdk/ad-formats/interstitial',
        'xml-sdk/ad-formats/rewarded',
        'xml-sdk/ad-formats/banner',
        'xml-sdk/ad-formats/native',
      ],
    },
    'xml-sdk/remote-config',
    'xml-sdk/navigation-configuration',
    'xml-sdk/analytics-consent',
    'xml-sdk/frequency-premium-controls',
    'xml-sdk/troubleshooting',
  ],

  composeSidebar: [
    'compose-sdk/overview',
    'compose-sdk/getting-started',
    {
      type: 'category',
      label: 'Ad Formats',
      link: {type: 'doc', id: 'compose-sdk/ad-formats/index'},
      items: [
        'compose-sdk/ad-formats/app-open-resume',
        'compose-sdk/ad-formats/interstitial',
        'compose-sdk/ad-formats/rewarded',
        'compose-sdk/ad-formats/banner',
        'compose-sdk/ad-formats/native',
      ],
    },
    'compose-sdk/remote-config',
    'compose-sdk/loading-dialog',
    'compose-sdk/troubleshooting',
  ],
};

export default sidebars;
