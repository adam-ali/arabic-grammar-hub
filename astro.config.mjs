// @ts-check
import { defineConfig } from 'astro/config';

// Served from GitHub Pages at https://adam-ali.github.io/arabic-grammar-hub/
export default defineConfig({
  site: 'https://adam-ali.github.io',
  base: '/arabic-grammar-hub',
  trailingSlash: 'always',
});
