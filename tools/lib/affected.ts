// tools/lib/affected.ts — which workspaces a set of changed files can affect: the ones the files are in, and every
// workspace that uses a changed one (by its `@wb/*` dependencies, the same edges CATALOG.md shows), round and round until
// nothing new is added. Anything outside a workspace that is not documentation (tools/, .github/, package.json, the
// lockfile, the tsconfigs…) can affect everything, so it means all of them. Pure: the git part is in tools/each.ts.
import type { Workspace } from './workspaces.ts';

/** changes that cannot change what any build or test does: documentation, and Claude's own settings and skills */
export function ignorable(file: string): boolean {
  return /\.md$/i.test(file) || file.startsWith('docs/') || file.startsWith('.claude/');
}

export interface Affected {
  /** the workspaces' dirs (`games/tethys`), in the order given; null means every workspace */
  dirs: string[] | null;
  /** one line per workspace, or the one file that made it all: why */
  why: string[];
}

export function affected(files: string[], all: Workspace[]): Affected {
  const marked = new Map<string, string>();
  for (const raw of files) {
    const file = raw.replace(/\\/g, '/').replace(/^\.\//, '');
    if (!file || ignorable(file)) continue;
    const w = all.find(w => file.startsWith(w.dir + '/'));
    if (w) {
      if (!marked.has(w.dir)) marked.set(w.dir, `${w.dir}: changed (${file})`);
    } else if (!/^(packages|games|labs)\/[^/]+$/.test(file)) {
      // a file in no workspace, and not a loose file directly in packages/, games/ or labs/ (their READMEs are
      // ignorable above; anything else there is not part of any build)
      return { dirs: null, why: [`everything: ${file} is shared by every workspace`] };
    }
  }
  for (let grew = true; grew; ) {
    grew = false;
    for (const w of all) {
      if (marked.has(w.dir)) continue;
      const via = all.find(u => marked.has(u.dir) && w.uses.includes(u.pkgName));
      if (via) {
        marked.set(w.dir, `${w.dir}: uses ${via.pkgName}, which is affected`);
        grew = true;
      }
    }
  }
  const dirs = all.filter(w => marked.has(w.dir)).map(w => w.dir);
  return { dirs, why: dirs.map(d => marked.get(d)!) };
}
