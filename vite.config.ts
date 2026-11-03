/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `base: './'` lets the built site work from any GitHub Pages sub-path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 900 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
