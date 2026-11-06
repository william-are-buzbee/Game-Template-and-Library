// The architecture rule (root CLAUDE.md, *Architecture rules*): the sim never touches three.js, the presentation
// or the page. It is what lets the sim run in a test, on a server, or under a different renderer.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('layers', () => {
  it('src/sim stays clear of three.js, the presentation and the page', () => {
    const sim = fileURLToPath(new URL('../src/sim', import.meta.url));
    for (const f of files(sim)) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/from ['"]three(\/[^'"]*)?['"]/);
      expect(src, f).not.toMatch(/from ['"][./]*present\//);
      expect(src, f).not.toMatch(/\b(document|window|localStorage|requestAnimationFrame)\b/);
      expect(src, f).not.toMatch(/\bMath\.random\b/);
    }
  });
});
