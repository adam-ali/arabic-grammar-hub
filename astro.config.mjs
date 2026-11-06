// @ts-check
import path from 'node:path';
import { defineConfig } from 'astro/config';

// Served from GitHub Pages at https://adam-ali.github.io/arabic-grammar-hub/
export default defineConfig({
  site: 'https://adam-ali.github.io',
  base: '/arabic-grammar-hub',
  trailingSlash: 'always',
  vite: {
    plugins: [
      {
        // The lessons are read with fs from the root .md files, so Vite doesn't track them: restart on edit.
        name: 'restart-on-notes-change',
        configureServer(server) {
          server.watcher.add(path.resolve('*.md'));
          server.watcher.on('change', (f) => {
            if (path.dirname(f) === process.cwd() && f.endsWith('.md')) server.restart();
          });
        },
      },
    ],
  },
});
