// tools/lib/jobs.ts — CI's jobs for a set of workspaces: one per workspace with anything to run, in catalog order, each
// with its tests, its build, its browser tests and (for a game or lab) its boot check. A workspace whose package.json
// has "shards": n gets its tests split across n jobs, <name>-1 … <name>-n, each given SHARD=k/n, and its build, browser
// tests and boot in a job of its own named for it. "smokeShards": n does the same for its browser tests: <name>-smoke-1 …
// <name>-smoke-n each build it and run `npm run smoke` with SHARD=k/n, and the job named for it keeps the build and the boot.
// Pure: tools/plan.ts decides which workspaces and writes the matrix.
import type { Workspace } from './workspaces.ts';

export interface Job {
  /** the check's name on the pull request: the workspace's folder name, with -k for one part of a split suite */
  name: string;
  dir: string;
  test: boolean;
  build: boolean;
  smoke: boolean;
  /** boot the build in headless Chromium (tools/look.ts): games and labs that build */
  boot: boolean;
  /** `k/n`: this job runs the k-th of n parts of the tests (package.json "shards") or, in a -smoke-k job, of the browser
   * tests ("smokeShards"), passed to them as SHARD */
  shard?: string;
}

/** the jobs for these workspaces (null: all of them), leaving out any with nothing to run */
export function jobs(all: Workspace[], dirs: string[] | null): Job[] {
  return all
    .filter(w => dirs === null || dirs.includes(w.dir))
    .flatMap(w => {
      const job: Job = {
        name: w.name,
        dir: w.dir,
        test: !!w.scripts.test,
        build: !!w.scripts.build,
        smoke: !!w.scripts.smoke,
        boot: w.kind !== 'package' && !!w.scripts.build,
      };
      const n = job.test ? (w.shards ?? 1) : 1;
      const m = job.smoke ? (w.smokeShards ?? 1) : 1;
      const tests: Job[] = n < 2 ? [] : Array.from({ length: n }, (_, i) => ({
        name: `${w.name}-${i + 1}`,
        dir: w.dir,
        test: true,
        build: false,
        smoke: false,
        boot: false,
        shard: `${i + 1}/${n}`,
      }));
      const smokes: Job[] = m < 2 ? [] : Array.from({ length: m }, (_, i) => ({
        name: `${w.name}-smoke-${i + 1}`,
        dir: w.dir,
        test: false,
        build: job.build,
        smoke: true,
        boot: false,
        shard: `${i + 1}/${m}`,
      }));
      return [{ ...job, test: job.test && n < 2, smoke: job.smoke && m < 2 }, ...tests, ...smokes];
    })
    .filter(j => j.test || j.build || j.smoke);
}

/** whether the templates must be tried: the change is shared (null), or reaches a package, which the templates import */
export function needsTemplates(dirs: string[] | null): boolean {
  return dirs === null || dirs.some(d => d.startsWith('packages/'));
}
