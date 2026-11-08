import { defineConfig } from 'astro/config';
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
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'virtual-astro-env-server',
        resolveId(id) {
          if (id === 'astro:env/server') {
            return '\0astro:env/server';
          }
        },
        load(id) {
          if (id === '\0astro:env/server') {
            return `export function getSecret(key) { return process.env[key]; }`;
          }
        }
      }
    ],
    optimizeDeps: {
      exclude: ['astro:env/server'],
      esbuildOptions: {
        plugins: [
          {
            name: 'esbuild-astro-env-server',
            setup(build) {
              build.onResolve({ filter: /^astro:env\/server$/ }, () => ({
                path: 'astro:env/server',
                external: true
              }));
            }
          }
        ]
      }
    },
    ssr: {
      external: ['astro:env/server']
    },
    server: {
      port: 3000,
      host: '0.0.0.0'
    }
  }
});
