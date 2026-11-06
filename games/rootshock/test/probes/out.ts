import { appendFileSync, writeFileSync } from 'node:fs';

/** where a probe writes what it measured (vitest keeps a passing test's console to itself): probe-<name>.txt, in the
 *  directory PROBE_OUT names (or here), each run after the last */
let file = '';
export const begin = (name: string, title = ''): void => { file = `${process.env.PROBE_OUT ?? '.'}/probe-${name}.txt`; writeFileSync(file, `${name}${title}\n`, { flag: 'a' }); };
export const say = (line: string): void => appendFileSync(file, `${line}\n`);

/** constants set for one run, from SET: 'RAG.tip=0.6;STAGGER.upright=0' against the tables given */
export function set(tables: Record<string, object>): void {
  for (const kv of (process.env.SET ?? '').split(';').filter(Boolean)) {
    const [path, val] = kv.split('='), keys = path.split('.');
    let o = tables as Record<string, unknown>;
    for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
    o[keys[keys.length - 1]] = +val;
  }
}
