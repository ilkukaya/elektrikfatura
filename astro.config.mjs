import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://www.elektrikfatura.com',
  integrations: [tailwind()],
  compressHTML: true,
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            alpine: ['alpinejs'],
          },
        },
      },
    },
  },
});
