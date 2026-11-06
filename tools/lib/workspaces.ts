// tools/lib/workspaces.ts — what is in the repo: every package, game and lab, read from its package.json.
// The catalog, the site, the look and the per-workspace runner all list workspaces through here, so they agree.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const SITE = 'https://william-are-buzbee.github.io/Game-Template-and-Library/';
export const SCOPE = '@wb/';

export const KINDS = ['package', 'game', 'lab'] as const;
export type Kind = (typeof KINDS)[number];
/** the folder each kind lives in */
export const FOLDER: Record<Kind, string> = { package: 'packages', game: 'games', lab: 'labs' };

export interface Workspace {
  kind: Kind;
  /** the folder name, which is also the name after the scope (`games/tethys` is `@wb/tethys`) */
  name: string;
  /** relative to the root, with forward slashes: `games/tethys` */
  dir: string;
  pkgName: string;
  description: string;
  scripts: Record<string, string>;
  /** the other workspaces it depends on, by package name */
  uses: string[];
}

export function workspaces(): Workspace[] {
  const out: Workspace[] = [];
  for (const kind of KINDS) {
    const base = join(ROOT, FOLDER[kind]);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base).sort()) {
      const abs = join(base, name);
      if (!statSync(abs).isDirectory() || !existsSync(join(abs, 'package.json'))) continue;
      const pkg = JSON.parse(readFileSync(join(abs, 'package.json'), 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
      out.push({
        kind,
        name,
        dir: `${FOLDER[kind]}/${name}`,
        pkgName: pkg.name ?? '',
        description: pkg.description ?? '',
        scripts: pkg.scripts ?? {},
        uses: Object.keys(deps).filter(d => d.startsWith(SCOPE)).sort(),
      });
    }
  }
  return out;
}

/** where a game or lab is published on the site (packages have no page of their own yet) */
export function liveUrl(w: Workspace, base = SITE): string | null {
  return w.kind === 'package' ? null : `${base}${w.dir}/`;
}
