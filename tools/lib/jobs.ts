// tools/lib/jobs.ts — CI's jobs for a set of workspaces: one per workspace with anything to run, in catalog order, each
// with its tests, its build, its browser tests and (for a game or lab) its boot check. Pure: tools/plan.ts decides which
// workspaces and writes the matrix.
import type { Workspace } from './workspaces.ts';

export interface Job {
  /** the check's name on the pull request: the workspace's folder name */
  name: string;
  dir: string;
  test: boolean;
  build: boolean;
  smoke: boolean;
  /** boot the build in headless Chromium (tools/look.ts): games and labs that build */
  boot: boolean;
}

/** the jobs for these workspaces (null: all of them), leaving out any with nothing to run */
export function jobs(all: Workspace[], dirs: string[] | null): Job[] {
  return all
    .filter(w => dirs === null || dirs.includes(w.dir))
    .map(w => ({
      name: w.name,
      dir: w.dir,
      test: !!w.scripts.test,
      build: !!w.scripts.build,
      smoke: !!w.scripts.smoke,
      boot: w.kind !== 'package' && !!w.scripts.build,
    }))
    .filter(j => j.test || j.build || j.smoke);
}

/** whether the templates must be tried: the change is shared (null), or reaches a package, which the templates import */
export function needsTemplates(dirs: string[] | null): boolean {
  return dirs === null || dirs.some(d => d.startsWith('packages/'));
}
