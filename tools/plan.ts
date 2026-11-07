// tools/plan.ts — CI's plan: one job per workspace to test, build, browser-test and boot, as a GitHub Actions matrix.
//   node tools/plan.ts                     every workspace (a push to main)
//   node tools/plan.ts --changed[=ref]     only those a pull request affects (tools/lib/affected.ts)
// It prints the plan, and with GITHUB_OUTPUT set writes `matrix` (the jobs), `any` (whether there are any) and
// `templates` (whether tools/try-templates.ts must run) for
// .github/workflows/check.yml. Each job runs one workspace on a machine of its own, so main takes as long as its slowest
// workspace rather than all of them in a row, and a pull request's checks name the game that failed.
import { appendFileSync } from 'node:fs';
import { affected } from './lib/affected.ts';
import { changedFiles, changedRef } from './lib/changed.ts';
import { jobs, needsTemplates } from './lib/jobs.ts';
import { workspaces } from './lib/workspaces.ts';

const all = workspaces();
const ref = changedRef(process.argv.slice(2));
let dirs: string[] | null = null;
if (ref) {
  const files = changedFiles(ref);
  if (files === null) console.log(`could not compare with ${ref}, so every workspace runs`);
  else {
    const a = affected(files, all);
    console.log(`changed since ${ref}: ${files.length} files`);
    for (const line of a.why) console.log(`  ${line}`);
    dirs = a.dirs;
  }
}
const plan = jobs(all, dirs);
const templates = needsTemplates(dirs);
console.log(plan.length ? `jobs: ${plan.map(j => `${j.name} (${(['test', 'build', 'smoke', 'boot'] as const).filter(k => j[k]).join(', ')})`).join('; ')}` : 'jobs: none');
console.log(`templates: ${templates ? 'tried' : 'not needed'}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify({ include: plan })}\nany=${plan.length > 0}\ntemplates=${templates}\n`);
