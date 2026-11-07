// tools/site/data.ts — what the index page says about each game and lab, gathered once and handed to whichever design
// draws it (tools/site/*.ts). `gather` reads the repository (package.json, git, _cards/); the designs only read a Site.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { affected, ignorable } from '../lib/affected.ts';
import { ROOT, SCOPE, title, type Workspace } from '../lib/workspaces.ts';
import type { CardFile } from '../cards.ts';

export const REPO = 'https://github.com/william-are-buzbee/Game-Template-and-Library';

/** a card picture as the page links it: cards/<name>-<width>.webp, at each width tools/cards.ts wrote */
export interface Picture {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

export interface Change {
  /** YYYY-MM-DD */
  date: string;
  subject: string;
  /** seconds since 1970 */
  time: number;
}

export interface Entry {
  kind: 'game' | 'lab';
  /** the folder name, `planet-viewer` */
  name: string;
  /** as the page shows it, `Planet-Viewer` */
  title: string;
  dir: string;
  /** where its build is on the site, or null when it has none (listed, not linked) */
  href: string | null;
  description: string;
  /** the packages it uses, without the scope: `core` */
  uses: string[];
  picture: Picture | null;
  /** the last commit that changed its folder */
  last: Change | null;
  /** the few before that, newest first */
  earlier: Change[];
  /** on a pull request's preview: whether the pull request changed it, itself or through a package it uses */
  changed: 'here' | 'via' | null;
}

export interface Site {
  /** games, then labs, each in folder order (as CATALOG.md lists them) */
  entries: Entry[];
  /** the pull request this is a preview of */
  pr: string | null;
  /** the commit it was made from */
  commit: string | null;
  /** how many commits led to it (the front page's issue number) */
  count: number | null;
  /** the day it was made, YYYY-MM-DD */
  made: string;
}

export function picture(name: string, file: CardFile): Picture {
  const at = (w: number) => `cards/${name}-${w}.webp`;
  return {
    src: at(file.width),
    srcset: file.widths.map(w => `${at(w)} ${w}w`).join(', '),
    width: file.width,
    height: file.height,
  };
}

/** which games and labs a pull request changed: `here` if a file in its folder, `via` if only a package it uses */
export function changes(files: string[], all: Workspace[]): Map<string, 'here' | 'via'> {
  const own = files.filter(f => !ignorable(f) && all.some(w => f.startsWith(w.dir + '/')));
  const out = new Map<string, 'here' | 'via'>();
  // only files inside a workspace count: a change to the tools or the workflows touches every build, and marking every
  // game as changed would say nothing
  for (const dir of affected(own, all).dirs ?? []) out.set(dir, own.some(f => f.startsWith(dir + '/')) ? 'here' : 'via');
  return out;
}

const git = (...args: string[]): string | null => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};

/**
 * Reads the repository. `built` is the set of dirs whose build is on the site; `cards` is the folder tools/cards.ts
 * wrote; on a preview, `pr` is its number and `base` the branch it goes into (its changes are counted from there).
 */
export function gather(all: Workspace[], built: Set<string>, o: { cards: string; pr?: string; base?: string; commit?: string; made?: string }): Site {
  let changed = new Map<string, 'here' | 'via'>();
  if (o.pr && o.base) {
    // as tools/each.ts --changed counts them: from where the branch left the base, committed or not, and new files
    const from = git('merge-base', o.base, 'HEAD');
    const diff = from ? git('diff', '--name-only', '--no-renames', from) : null;
    const added = git('ls-files', '--others', '--exclude-standard');
    if (diff === null || added === null) console.warn(`warning: could not compare with ${o.base}; nothing is marked as changed`);
    else changed = changes(`${diff}\n${added}`.split('\n').filter(Boolean), all);
  }
  const entries: Entry[] = all
    .filter(w => w.kind !== 'package')
    .map(w => {
      const card = join(o.cards, `${w.name}.json`);
      const log = git('log', '-4', '--no-merges', '--format=%at%x1f%as%x1f%s', '--', w.dir);
      const history: Change[] = (log ?? '')
        .split('\n')
        .filter(Boolean)
        .map(l => l.split('\x1f'))
        .map(([time, date, subject]) => ({ time: Number(time), date: date ?? '', subject: subject ?? '' }));
      return {
        kind: w.kind as 'game' | 'lab',
        name: w.name,
        title: title(w),
        dir: w.dir,
        href: built.has(w.dir) ? `${w.dir}/` : null,
        description: w.description,
        uses: w.uses.map(u => u.slice(SCOPE.length)),
        picture: existsSync(card) ? picture(w.name, JSON.parse(readFileSync(card, 'utf8')) as CardFile) : null,
        last: history[0] ?? null,
        earlier: history.slice(1),
        changed: changed.get(w.dir) ?? null,
      };
    });
  const count = git('rev-list', '--count', 'HEAD');
  return {
    entries,
    pr: o.pr ?? null,
    commit: o.commit || git('rev-parse', 'HEAD'),
    count: count ? Number(count) : null,
    made: o.made ?? new Date().toISOString().slice(0, 10),
  };
}
