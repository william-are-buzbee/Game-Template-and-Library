/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// TypeScript games import the source (package.json "exports"); this build is for the games with no bundler:
//   dist/core.js         an ES module, for a game that loads modules itself (an import map: "@wb/core" -> this file)
//   dist/core.global.js  a classic script that defines the global `WB`, for a game built as one script (Tethys)
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'WB',
      formats: ['es', 'iife'],
      fileName: format => (format === 'es' ? 'core.js' : 'core.global.js'),
    },
    minify: false,
  },
  test: { include: ['test/**/*.test.ts'], testTimeout: 10_000 },
});
