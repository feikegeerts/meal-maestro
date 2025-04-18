import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      // Allow serving files from the static directory
      allow: ['static'],
    },
  },
  build: {
    // Add source maps for better debugging
    sourcemap: true,
  },
});
