// @ts-check
import { defineConfig, envField } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.transmoderna.com',
  output: 'server',
  adapter: netlify(),
  env: {
    schema: {
      SANITY_API_READ_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true
      }),
      SHOPIFY_SYNC_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true
      })
    }
  },
  vite: {
    server: {
      allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev']
    }
  }
});
