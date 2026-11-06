import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/* engine.md §3: the sim, the world and the content never import three.js or touch the page. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('layers', () => {
  for (const layer of ['core', 'content', 'world', 'sim']) {
    it(`${layer} stays clear of three.js, the page and the presentation`, () => {
      for (const f of files(join(fileURLToPath(new URL('../src', import.meta.url)), layer))) {
        const src = readFileSync(f, 'utf8');
        expect(src, f).not.toMatch(/from ['"]three['"]/);
        expect(src, f).not.toMatch(/from ['"][./]*present\//);
        expect(src, f).not.toMatch(/\b(document|window)\./);
      }
    });
  }
});
