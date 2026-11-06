import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { levelDef } from '../src/sim/run';
import { testbed } from '../src/content/levels/testbed';
import { makeSim, type Sim } from '../src/sim/sim';
import { STEP } from '@wb/core';
import { refreshFields } from '../src/sim/fields';
import { ambientFor, genAt, hearing, legacyFloor, roomAir, spaceOf, underfoot } from '../src/present/soundscape';
import { flickerAt } from '../src/present/flicker';
import { hold } from './kit';

/* What the sound is told: what feet fall on, how a sound comes to you through the rooms, and the landings and jumps. The
   synthesis itself needs a browser; where a sound is does not. */

const sim = (id: string) => makeSim(levelDef(STATION, id), { seed: 7, station: STATION });
/** a crate: the station has none lying about now; the testbed's arena keeps them */
const bed = () => makeSim(testbed(), { seed: 7, station: STATION }), crate = () => bed().loose.all[0];
const sounds = (s: Sim, name: string) => s.game.events.filter(e => e.type === 'sfx' && e.name === name) as { k?: number }[];

describe('feet', () => {
  it('fall on what the room is floored with in the station, rock in the cave, water where it stands', () => {
    const up = sim('upper'), b = up.player.body;
    expect(underfoot(up.world, b.x, b.y, b.z)).toBe('vinyl'); // the isolation room's
    const cave = sim('cave'), c = cave.player.body;
    expect(underfoot(cave.world, c.x, c.y, c.z)).toBe('rock');
    const sump = sim('sump'), W = sump.world.water[0];
    expect(underfoot(sump.world, (W.x0 + W.x1) / 2, W.level - 0.2, (W.z0 + W.z1) / 2)).toBe('wet');
  });

  it('ring on a platform and knock on a crate', () => {
    const up = sim('upper'), b = up.player.body;
    expect(underfoot(up.world, b.x, b.y, b.z, up.platforms[0].dyn)).toBe('steel');
    expect(underfoot(up.world, b.x, b.y, b.z, crate().dyn)).toBe('wood');
  });

  it('know what they stand on without being told: a container is steel, a crate wood, a bay its floor round its boulders', () => {
    const up = sim('upper'), w = up.world;
    const box = w.def.props.find(p => p.mat === 'steel' && p.solid && p.sx > 5)!;
    expect(underfoot(w, box.x, box.y + box.sy, box.z)).toBe('steel');
    const tb = bed(), c = tb.loose.all[0].dyn;
    expect(underfoot(tb.world, (c.x0 + c.x1) / 2, c.y1, (c.z0 + c.z1) / 2)).toBe('wood');
    /* the cargo cavern is dug: sprayed rock over a poured floor, as the link in to it is; a step onto something in it
       that says nothing of itself is its floor, not grating */
    const R = w.def.rooms.find(r => r.name === 'Cargo cavern')!, link = w.def.rooms.find(r => r.name === 'Cargo link')!;
    expect(R.mat).toMatchObject({ floor: 'concrete', wall: 'shot', ceiling: 'shot' });
    expect(R.floor).toEqual(link.floor);
  });

  it('with surface detail off, are guessed as they were before materials', () => {
    const up = sim('upper'), b = up.player.body;
    expect(legacyFloor(up.world, b.x, b.y, b.z)).toBe('concrete');
    expect(legacyFloor(up.world, b.x, b.y, b.z, up.platforms[0].dyn)).toBe('metal');
    expect(legacyFloor(up.world, b.x, b.y, b.z, crate().dyn)).toBe('wood');
  });
});

describe('a blow on a wall', () => {
  it('is heard where it lands, from what the wall is made of', () => {
    const up = sim('upper'), w = up.world;
    const R = w.def.rooms.find(r => r.name === 'Security corridor')!, y = R.y0 + 1.2, z = (R.z0 + R.z1) / 2;
    /* from the middle of the corridor to its west wall: block, skim-coated */
    expect(w.solidMat(R.x0, y, z, R.x0 + 2, y, z)).toBe('plaster');
    /* onto a container's side: steel */
    const box = w.def.props.find(p => p.mat === 'steel' && p.solid && p.sx > 5)!;
    expect(w.solidMat(box.x, box.y + 1, box.z - box.sz / 2, box.x, box.y + 1, box.z - box.sz / 2 - 1)).toBe('steel');
  });
});

describe('a sound', () => {
  it('in the same room comes straight to you', () => {
    const s = sim('upper'), b = s.player.body;
    refreshFields(s, s.fields!);
    const h = hearing(s, b.x + 1.5, b.y, b.z);
    expect(h.muffle).toBeLessThan(0.1);
    expect(h.d).toBeLessThan(2.5);
  });

  it('behind a shut door is muffled and further off than it looks', () => {
    const s = sim('upper');
    const d = s.doors.find(d => d.def.seal)!, D = d.def, cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2;
    const [ox, oz] = D.alongX ? [0, 1] : [1, 0], b = s.player.body;
    b.x = cx - ox; b.z = cz - oz; b.y = D.y0; b.sync();
    refreshFields(s, s.fields!);
    const h = hearing(s, cx + ox, D.y0, cz + oz);
    expect(h.muffle).toBeGreaterThan(0.3);
    expect(h.d).toBeGreaterThan(2.5);
  });
});

describe('you', () => {
  it('push off with a jump and are heard landing', () => {
    const s = sim('upper');
    hold(s, 0.5);
    s.game.events.length = 0;
    hold(s, STEP, { jump: true });
    expect(sounds(s, 'jump').length).toBe(1);
    hold(s, 1.5);
    const land = sounds(s, 'land');
    expect(land.length).toBe(1);
    expect(land[0].k).toBeGreaterThanOrEqual(0);
    expect(land[0].k).toBeLessThan(0.5);
  });
});

describe('the station heard', () => {
  const room = (s: Sim, name: string) => s.world.rooms.find(r => r.name === name)!;
  const most = (w: number[]) => w.indexOf(Math.max(...w));

  it('echoes by the size of the room: an isolation room small, the generator hall vast, the cave more than either', () => {
    const post = spaceOf(room(sim('upper'), 'Isolation room 1'), false), hall = spaceOf(room(sim('plant'), 'Generator hall'), false);
    expect(most(post)).toBe(0);
    expect(most(hall)).toBe(2);
    const cave = sim('cave'), c = cave.player.body, R = cave.world.roomAt(c.x, c.y + 1, c.z)!;
    const sum = (w: number[]) => w.reduce((a, b) => a + b, 0);
    expect(sum(spaceOf(R, true))).toBeGreaterThan(sum(post));
  });

  it('hears Gen-1 from its board on the plant level, and from nowhere in particular on the others', () => {
    const plant = sim('plant'), G = genAt(plant.world)!;
    expect(plant.world.roomAt(G.x, G.y + 1, G.z)?.name).toBe('Generator hall');
    expect(genAt(sim('upper').world)).toBeNull();
  });

  it('flickers the same for the light and the buzz: by the slot, dim about a quarter of the time', () => {
    expect(flickerAt(12.34)).toBe(flickerAt(12.34 + 0.01));
    let dim = 0;
    for (let k = 0; k < 2000; k++) if (flickerAt(k / 11 + 0.01)) dim++;
    expect(dim / 2000).toBeGreaterThan(0.2);
    expect(dim / 2000).toBeLessThan(0.36);
  });
});

describe('the air', () => {
  it('rushes in a fitted room on Gen-1, barely on a backup set, not at all in a dead room or a cave', () => {
    const up = sim('upper'), corridor = up.world.rooms.find(R => R.name === 'Operations corridor')!;
    expect(roomAir(corridor, 2)).toBe(1);
    expect(roomAir(corridor, 1)).toBeGreaterThan(0);
    expect(roomAir(corridor, 1)).toBeLessThan(0.5);
    expect(roomAir(corridor, 0)).toBe(0);
    const cave = sim('cave').world.rooms.find(R => R.name === 'Great chamber')!;
    expect(roomAir(cave, 2)).toBe(0);
  });
});

describe("the station's own noises", () => {
  const top = (a: { n: string; w: number }[]) => [...a].sort((p, q) => q.w - p.w)[0].n;
  it('a cave settles; a fitted room knocks, more with its pumps running; a big hall groans more than a corridor', () => {
    const up = sim('upper'), room = (n: string) => up.world.rooms.find(R => R.name === n)!;
    const cave = sim('cave').world.rooms.find(R => R.name === 'Great chamber')!;
    expect(top(ambientFor(cave, true, false))).toBe('settle');
    const corridor = room('Operations corridor');
    expect(top(ambientFor(corridor, false, true))).toBe('knock');
    const w = (a: { n: string; w: number }[], n: string) => a.find(x => x.n === n)!.w;
    expect(w(ambientFor(corridor, false, true), 'knock')).toBeGreaterThan(w(ambientFor(corridor, false, false), 'knock'));
    const main = sim('main').world.rooms.reduce((a, R) => ((R.x1 - R.x0) * (R.z1 - R.z0) * R.ht > (a.x1 - a.x0) * (a.z1 - a.z0) * a.ht && !R.cells ? R : a));
    expect(w(ambientFor(main, false, true), 'groan')).toBeGreaterThan(w(ambientFor(corridor, false, true), 'groan'));
  });
});

describe('how the station looks', () => {
  it('names every material once, for the shader, and draws only patterns it knows', async () => {
    const { MATS, MAT_ORDER } = await import('../src/content/materials');
    const { matId } = await import('../src/present/render/shader');
    const ids = MAT_ORDER.map(m => matId(m));
    expect(new Set(ids).size).toBe(MAT_ORDER.length);
    expect(Math.min(...ids)).toBe(1);
    expect(matId(undefined)).toBe(0);
    for (const m of MAT_ORDER) expect(MATS[m].look.gloss).toBeGreaterThanOrEqual(0);
  });

  it('dresses rooms by what they are: tiled infirmaries, block in Security, services under a bare ceiling only', () => {
    const up = levelDef(STATION, 'upper');
    const room = (n: string) => up.rooms.find(r => r.name === n)!;
    expect(room('Infirmary').mat).toMatchObject({ wall: 'glazed', ceiling: 'tiles' });
    expect(room('Locker room').mat.wall).toBe('block');
    expect(room('Security corridor').mat.wall).toBe('plaster'); // skim-coated
    /* a pipe is a steel cylinder lying on its side, just under a ceiling */
    const pipesIn = (n: string) => {
      const R = room(n);
      return up.props.filter(p => p.shape === 'cyl' && p.mat === 'steel' && p.rz && p.x > R.x0 && p.x < R.x1 && p.z > R.z0 && p.z < R.z1).length;
    };
    expect(room('Electrical room').mat.ceiling).toBe('shot');
    expect(pipesIn('Electrical room')).toBe(2);
    expect(pipesIn('Infirmary')).toBe(0);
  });

  it('is mined: dug rooms are shotcrete, where visitors walked stone and terrazzo, offices carpeted', () => {
    const up = levelDef(STATION, 'upper');
    const room = (n: string) => up.rooms.find(r => r.name === n)!;
    expect(room('Goods inward').mat).toMatchObject({ wall: 'shot', ceiling: 'shot' });
    expect(room('Lobby').mat).toMatchObject({ floor: 'terrazzo', wall: 'stone' });
    expect(room('Security corridor').mat.floor).toBe('polished');
    for (const n of ['Armory', 'Locker room']) expect(room(n).mat.floor, n).toBe('flake'); // the wing's rooms are coated
    expect(room('Office: operations').mat).toMatchObject({ floor: 'carpet', wall: 'board' });
    expect(room('Infirmary').mat.floor).toBe('vinyl');
    /* the Commons' utility rooms stand inside its blocks: poured, not dug */
    const main = levelDef(STATION, 'main');
    expect(main.rooms.find(r => r.name === 'Workshop')!.mat.wall).toBe('concrete');
    expect(main.rooms.find(r => r.name === 'Kitchen')!.mat).toMatchObject({ floor: 'vinyl', wall: 'glazed' });
  });
});
