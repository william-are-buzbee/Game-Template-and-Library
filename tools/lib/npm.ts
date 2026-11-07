// tools/lib/npm.ts — runs npm from a tool, on Linux, macOS and Windows alike.
// `spawnSync('npm', …)` fails on Windows: npm there is `npm.cmd`, and Node refuses to start a .cmd without a shell
// (since Node 18.20.2 and 20.12.2). So: when npm started this tool (an `npm run …` script), run npm's own script with
// this Node (`npm_execpath`), no shell at all; otherwise run `npm`, through a shell on Windows only. Arguments that a
// shell would split or interpret are refused on that one path rather than passed on mangled.
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';

export interface NpmInvocation {
  command: string;
  args: string[];
  shell: boolean;
}

export function npmInvocation(args: string[], platform: string = process.platform, env: NodeJS.ProcessEnv = process.env, node: string = process.execPath): NpmInvocation {
  const cli = env.npm_execpath;
  if (cli && /npm-cli\.c?js$/.test(cli)) return { command: node, args: [cli, ...args], shell: false };
  if (platform !== 'win32') return { command: 'npm', args, shell: false };
  const unsafe = args.find(a => !/^[\w@./:=,+-]+$/.test(a));
  if (unsafe !== undefined) throw new Error(`npm argument ${JSON.stringify(unsafe)} cannot go through the Windows shell; run the tool from an npm script`);
  return { command: 'npm.cmd', args, shell: true };
}

export function runNpm(args: string[], options: SpawnSyncOptions = {}) {
  const n = npmInvocation(args);
  return spawnSync(n.command, n.args, { ...options, shell: n.shell });
}
