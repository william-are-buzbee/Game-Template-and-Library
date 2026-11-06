/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

const LIMIT = process.env.CI ? 30_000 : 10_000;

export default defineConfig({
  // relative paths, so the built game runs from any folder it is published to
  base: './',
  // three.js alone is about 600 kB; one chunk is fine for a game that loads once
  build: { chunkSizeWarningLimit: 1000 },
  // every test, and the whole run, has a hard limit: nothing is allowed to hang. On CI the limit is three times as long,
  // and still a limit: its shared machines vary, and the same suite took 87 s on one run and 152 s on the next (6 Nov
  // 2026), which put the night round and the motes, about 6 s each, past 10
  test: { include: ['test/**/*.test.ts'], testTimeout: LIMIT, hookTimeout: LIMIT, teardownTimeout: 5_000 },
});
