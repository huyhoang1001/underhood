import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

export default defineConfig(() => {
  const mdxPlugin = mdx({
    remarkPlugins: [remarkFrontmatter, remarkGfm],
    providerImportSource: '@mdx-js/react'
  }) as Plugin;

  // Custom MDX plugin wrapper that skips raw string query imports (?raw)
  const rawAwareMdxPlugin: Plugin = {
    ...mdxPlugin,
    name: 'raw-aware-mdx-plugin',
    enforce: 'pre',
    async transform(code, id, options) {
      if (id.includes('?raw') || id.includes('&raw')) {
        return null;
      }
      if (typeof mdxPlugin.transform === 'function') {
        return mdxPlugin.transform.call(this, code, id, options);
      }
      return null;
    }
  };

  return {
    plugins: [
      rawAwareMdxPlugin,
      react(),
      tailwindcss()
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
