import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import keystatic from '@keystatic/astro';

export default defineConfig({
  output: 'static',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [
    react(),
    mdx(),
    keystatic()
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
                path: '/app/applet/src/env-shim.ts',
                external: false
              }));
            }
          }
        ]
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
