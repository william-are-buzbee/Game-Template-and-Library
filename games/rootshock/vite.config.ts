/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // relative paths, so the built game runs from any folder it is published to
  base: './',
  // three.js alone is about 600 kB; one chunk is fine for a game that loads once
  build: { chunkSizeWarningLimit: 1000 },
  // every test, and the whole run, has a hard limit: nothing is allowed to hang
  test: { include: ['test/**/*.test.ts'], testTimeout: 10_000, hookTimeout: 10_000, teardownTimeout: 5_000 },
});
