import { it } from 'vitest';
import { STATION } from '../../src/content/station';
import type { DoorDef } from '../../src/content/types';
import { levelDef } from '../../src/sim/run';
import { makeSim } from '../../src/sim/sim';
import { makeFields } from '../../src/sim/fields';
import { Edge } from '../../src/world/nav';
import { begin, say } from './out';

/* How each level is joined up: its rooms as a graph, from the nav graph, so stairs, platforms and partitions are as a
   body finds them. A loop is a way round: something on a patrol can be gone round, and a lure decides which side of it
   something is on. On a spine every room is a dead end off one hall, and a patrol on it is only a wait.

   A room is its name: boxes of the same name that join are one room (the muster hall's four sides), and two that do not
   are two (the washrooms). Doorways are the way between two rooms, not rooms. Two doors between the same two rooms are
   one link: a second door into the same place is not a way round. Sealed doors and panes join nothing; every other door
   joins, whatever it wants (power, a card, a code). Platforms join their ends. A drop is one way: the loops are counted
   on foot, and again with drops.

   Out: for each level, its rooms, links, loops (links - rooms + pieces), the rooms on a loop, its dead ends, and what
   cannot be walked to from the rest (a room behind a sealed door; a roof something could stand on).
   LEVEL=upper for one; LINKS=1 lists every link and what it is. */
it('loops', () => {
  begin('loops');
  const only = process.env.LEVEL;
  for (const L of STATION.levels.filter(l => !only || l.id === only)) {
    const def = levelDef(STATION, L.id), sim = makeSim(def, { station: STATION }), nav = (sim.fields ?? makeFields(sim)).nav;
    const doors = sim.doors.map(d => d.def), rooms = sim.world.def.rooms;
    const shut = (k: number) => k >= 0 && (doors[k].seal || !!doors[k].glass);
    const kindOf = (D: DoorDef) => (D.vent ? 'vent' : D.stuck ? 'crawl' : D.kind === 'heavy' ? 'heavy' : D.card ? 'card' : D.code ? 'code' : 'door');
    const named = (i: number) => { const R = nav.room[i] >= 0 ? rooms[nav.room[i]] : null; return R && !R.doorway && R.name ? R : null; };

    /* rooms by name, joined where they meet */
    const up = new Map<number, number>(), find = (r: number): number => { const p = up.get(r) ?? r; if (p === r) return r; const q = find(p); up.set(r, q); return q; };
    for (let a = 0; a < nav.n; a++) for (let e = nav.start[a]; e < nav.start[a + 1]; e++) {
      const A = named(a), B = named(nav.to[e]);
      if (A && B && A !== B && A.name === B.name) up.set(find(A.id), find(B.id));
    }
    /* only rooms something can stand in: a partition's strip or the air over a hall is no room of its own */
    const stood = new Set<number>();
    for (let i = 0; i < nav.n; i++) { const R = named(i); if (R) stood.add(find(R.id)); }
    const names = new Map<number, string>(), count = new Map<string, number[]>();
    for (const r of [...stood].sort((a, b) => a - b)) { const c = count.get(rooms[r].name) ?? []; c.push(r); count.set(rooms[r].name, c); }
    for (const [n, c] of count) c.forEach((r, i) => names.set(r, c.length > 1 ? `${n} #${i + 1}` : n));

    /* the way between rooms: what is not a room (doorways, the spots in doors), in pieces, and which rooms each piece
       meets; and rooms that meet directly */
    const links = new Map<string, { walk: boolean; drop: boolean; how: Set<string>; ways: Set<number> }>();
    const link = (a: number, b: number, how: string, walk: boolean, way = -1) => {
      if (a === b) return;
      const k = [names.get(a)!, names.get(b)!].sort().join(' <-> ');
      const l = links.get(k) ?? { walk: false, drop: false, how: new Set(), ways: new Set() };
      if (walk) l.walk = true; else l.drop = true;
      l.how.add(how); if (way !== -1) l.ways.add(way); links.set(k, l); // ways: which doors and doorways (an opening is not counted)
    };
    const piece = new Int32Array(nav.n).fill(-1);
    let pieces = 0;
    for (let s = 0; s < nav.n; s++) {
      if (named(s) || shut(nav.door[s]) || piece[s] >= 0) continue;
      const st = [s]; piece[s] = pieces;
      while (st.length) {
        const a = st.pop()!;
        for (let e = nav.start[a]; e < nav.start[a + 1]; e++) {
          const b = nav.to[e];
          if (nav.kind[e] === Edge.Walk && !named(b) && !shut(nav.door[b]) && piece[b] < 0) { piece[b] = pieces; st.push(b); }
        }
      }
      pieces++;
    }
    const meets = new Map<number, Map<number, string>>(), how = new Map<number, string>();
    for (let a = 0; a < nav.n; a++) {
      if (shut(nav.door[a])) continue;
      for (let e = nav.start[a]; e < nav.start[a + 1]; e++) {
        const b = nav.to[e];
        if (shut(nav.door[b])) continue;
        const A = named(a), B = named(b), walk = nav.kind[e] !== Edge.Drop;
        const by = nav.kind[e] === Edge.Lift ? 'platform' : nav.kind[e] === Edge.Drop ? 'drop' : null;
        if (A && B) {
          const k = nav.door[a] >= 0 ? nav.door[a] : nav.door[b];
          link(find(A.id), find(B.id), by ?? (k >= 0 ? kindOf(doors[k]) : 'open'), walk, k);
        } else if (A || B) {
          /* a room meeting a piece of the way between: on foot only (a drop into a doorway is a drop into the room) */
          const p = piece[A ? b : a], r = find((A ?? B)!.id);
          if (p < 0 || !walk) continue;
          const m = meets.get(p) ?? new Map(); m.set(r, names.get(r)!); meets.set(p, m);
          const k = nav.door[A ? b : a];
          if (k >= 0) how.set(p, kindOf(doors[k]));
        }
      }
    }
    let junctions = 0;
    for (const [p, m] of meets) {
      const rs = [...m.keys()];
      if (rs.length > 2) junctions++;
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) link(rs[i], rs[j], how.get(p) ?? 'doorway', true, doors.length + p);
    }

    /* loops: links - rooms + pieces, on foot and with drops; a room is on a loop if a link of it is no bridge */
    const V = [...new Set(names.values())];
    const loops = (drops: boolean) => {
      const adj = new Map(V.map(v => [v, [] as string[]]));
      for (const [k, l] of links) if (l.walk || drops) { const [a, b] = k.split(' <-> '); adj.get(a)!.push(b); adj.get(b)!.push(a); }
      const E = [...adj.values()].reduce((s, a) => s + a.length, 0) / 2;
      const seen = new Map<string, number>(), low = new Map<string, number>(), onLoop = new Set<string>();
      let t = 0, C = 0;
      const dfs = (u: string, from: string | null) => {
        seen.set(u, t); low.set(u, t++);
        for (const w of adj.get(u)!) {
          if (w === from) continue;
          if (seen.has(w)) { low.set(u, Math.min(low.get(u)!, seen.get(w)!)); continue; }
          dfs(w, u); low.set(u, Math.min(low.get(u)!, low.get(w)!));
          if (low.get(w)! <= seen.get(u)!) { onLoop.add(u); onLoop.add(w); } // not a bridge: u and w are on a loop together
        }
      };
      const parts: string[][] = [];
      for (const v of V) if (!seen.has(v)) { C++; const t0 = t; dfs(v, null); parts.push([...seen].filter(([, i]) => i >= t0).map(([w]) => w)); }
      return { n: E - V.length + C, C, onLoop, adj, parts: parts.sort((a, b) => b.length - a.length) };
    };
    const foot = loops(false), all = loops(true);
    const kinds = new Map<string, number>(), walked = [...links.values()].filter(l => l.walk), drops = links.size - walked.length;
    for (const l of walked) for (const h of l.how) if (h !== 'drop') kinds.set(h, (kinds.get(h) ?? 0) + 1);
    say(`\n== ${L.id}: ${V.length} rooms, ${walked.length} links on foot (${[...kinds].map(([k, n]) => `${k} ${n}`).join(', ')})${drops ? ` and ${drops} drop${drops > 1 ? 's' : ''} one way` : ''}, ${foot.C} piece${foot.C > 1 ? 's' : ''}`);
    say(`loops on foot: ${foot.n}; with drops: ${all.n}${junctions ? `; ${junctions} doorways meet three rooms or more` : ''}`);
    say(`on a loop: ${[...foot.onLoop].sort().join(', ') || 'none'}`);
    if (all.n > foot.n) say(`on a loop only with drops: ${[...all.onLoop].filter(v => !foot.onLoop.has(v)).sort().join(', ')}`);
    say(`dead ends: ${V.filter(v => foot.adj.get(v)!.length === 1).sort().join(', ') || 'none'}`);
    for (const p of foot.parts.slice(1)) say(`cut off on foot from the rest: ${p.sort().join(', ')}`);
    if (process.env.LINKS) for (const [k, l] of [...links].sort()) say(`  ${[...l.how].join('/').padEnd(16)} ${l.ways.size > 1 ? `×${l.ways.size} ` : ''}${k}${l.walk ? '' : ' (one way)'}`);
  }
});
