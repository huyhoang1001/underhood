import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(),
    mdx(),
    // Keystatic only runs locally — in production, content is managed via git
    ...(isProd ? [] : [keystatic()]),
  ],
  env: {
    schema: {
      KEYSTATIC_GITHUB_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_GITHUB_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_KEYSTATIC_GITHUB_APP_SLUG: envField.string({ context: 'client', access: 'public', optional: true }),
    }
  },
  vite: {
    plugins: [
      tailwindcss()
    ],
    resolve: {
      alias: {
        'astro:env/server': '/src/env-shim.ts'
      }
    },
    ssr: {
      external: ['astro:env/server']
    },
    optimizeDeps: {
      exclude: ['astro:env/server'],
      esbuildOptions: {
        plugins: [
          {
            name: 'esbuild-keystatic-env-fix',
            setup(build) {
              build.onResolve({ filter: /^astro:env\/server$/ }, () => ({
                path: new URL('./src/env-shim.ts', import.meta.url).pathname,
                external: false
              }));
            }
          }
        ]
      }
    }
  },
});
