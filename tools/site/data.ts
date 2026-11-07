// tools/site/data.ts — what the index page says about each game and lab, gathered once and handed to the page that
// draws it (tools/site/gallery.ts). `gather` reads the repository (package.json, git, _cards/); the page only reads a Site.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { affected, ignorable } from '../lib/affected.ts';
import { changedFiles } from '../lib/changed.ts';
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

/** what a pull request changed first, then what changed last, then the catalog's order */
export function byRecent(entries: Entry[]): Entry[] {
  const rank = (e: Entry) => (e.changed === 'here' ? 0 : e.changed === 'via' ? 1 : 2);
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => rank(a.e) - rank(b.e) || (b.e.last?.time ?? 0) - (a.e.last?.time ?? 0) || a.i - b.i)
    .map(x => x.e);
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
    const files = changedFiles(o.base);
    if (files === null) console.warn(`warning: could not compare with ${o.base}; nothing is marked as changed`);
    else changed = changes(files, all);
  }
  const entries: Entry[] = all
    .filter(w => w.kind !== 'package')
    .map(w => {
      const card = join(o.cards, `${w.name}.json`);
      const log = git('log', '-1', '--no-merges', '--format=%at%x1f%as%x1f%s', '--', w.dir);
      const [time, date, subject] = log ? log.split('\x1f') : [];
      return {
        kind: w.kind as 'game' | 'lab',
        name: w.name,
        title: title(w),
        dir: w.dir,
        href: built.has(w.dir) ? `${w.dir}/` : null,
        description: w.description,
        uses: w.uses.map(u => u.slice(SCOPE.length)),
        picture: existsSync(card) ? picture(w.name, JSON.parse(readFileSync(card, 'utf8')) as CardFile) : null,
        last: time && date ? { time: Number(time), date, subject: subject ?? '' } : null,
        changed: changed.get(w.dir) ?? null,
      };
    });
  return {
    entries,
    pr: o.pr ?? null,
    commit: o.commit || git('rev-parse', 'HEAD'),
    made: o.made ?? new Date().toISOString().slice(0, 10),
  };
}
