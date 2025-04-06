import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  runner: {
    binaries: {
      firefox: 'firefox-devedition',
    },
    startUrls: ['about:debugging#/runtime/this-firefox'],
    openDevtools: true,
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      sourcemap: 'inline',
      minify: false,
      cssMinify: false,
    },
  }),
  manifest: {
    name: 'Tabs Workspaces in Markdown',
    permissions: [
      'nativeMessaging',
      'storage',
      'contextualIdentities',
      'cookies',
      'activeTab',
      'tabs',
      'contextMenus',
    ],
    browser_specific_settings: {
      gecko: {
        id: 'tabs_md_workspaces@example.org',
        strict_min_version: '50.0',
      },
    },
  },
});
