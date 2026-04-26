import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gold-silver-copper-today',
  brand: {
    displayName: '금은동시세',
    primaryColor: '#D4AF37',
    icon: 'https://static.toss.im/appsintoss/24163/f26ec7d5-f75a-48b5-ab03-d2a53908cec9.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
});


