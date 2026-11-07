// tools/lib/jobs.ts — CI's jobs for a set of workspaces: one per workspace with a "test" or "smoke" script, in catalog
// order. Pure: tools/plan.ts decides which workspaces and writes the matrix.
import type { Workspace } from './workspaces.ts';

export interface Job {
  /** the check's name on the pull request: the workspace's folder name */
  name: string;
  dir: string;
  test: boolean;
  smoke: boolean;
}

/** the jobs for these workspaces (null: all of them), leaving out any with nothing to run */
export function jobs(all: Workspace[], dirs: string[] | null): Job[] {
  return all
    .filter(w => dirs === null || dirs.includes(w.dir))
    .map(w => ({ name: w.name, dir: w.dir, test: !!w.scripts.test, smoke: !!w.scripts.smoke }))
    .filter(j => j.test || j.smoke);
}
