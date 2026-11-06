import { defineConfig } from 'vitest/config';

/* Probes (test/probes/README.md): measurements, not tests. Run them with
   npx vitest run --config test/probes/vitest.config.ts [name] */
export default defineConfig({ test: { include: ['test/probes/*.probe.ts'], testTimeout: 600_000 } });
