import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gold-silver-copper-today',
  brand: {
    displayName: '오늘 금은동 시세',
    primaryColor: '#D4AF37',
    icon: 'https://gold-silver-copper-today.lovable.app/favicon.ico',
  },
  web: {
    host: 'localhost',
    port: 8080,
    commands: {
      dev: 'vite --host',
      build: 'vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
  webViewProps: {
    type: 'partner',
  },
});
