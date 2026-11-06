import { PI } from '../../core/math';
import type { LevelDef } from '../types';
import { beginLevel, bx, door, finishLevel, floor, room, stack, stairs, use, type Floor, type LevelInfo } from '../build/plan';
import { OFF, SEC, UTIL, desk, tbl } from '../build/furnish';
import { bed, bells, bracket, candelabra, climb, colonise, crown, cup, engulf, forced, grower, hang, heave, knot, litter, pressed, runner, spire, tobacco } from '../build/overgrowth';
import { fringe, pillar, span, sprawl, taproot, vault, wallroot } from '../build/roots';

/* A bench for the growth (content/build/overgrowth.ts), the bush's and Holt's, not part of the station: ?level=bench. In Security's
   finish, all of it lit. North of the corridor, the kit laid out piece by piece, each with a look to say what it is:
   shelves out of the wall, two walls climbed, stalks young to old, a ceiling hung, leaf over the floor young to cured,
   a runner and its seedling, the mound where it takes, a desk and a chair grown over. South, an office it has
   colonised from its far corner; out of its door, the front coming along the corridor; and at the corridor's end a
   runner under the locker room's door, the first leaf in, the room past it still clean. Past that, Holt's flowers on top
   and roots under them: a garden of the ways she flowers, each come up through the floor, a door welded shut with her
   growth forced out round it, and down the stair from it a
   cellar under the garden, its concrete broken through by their roots (content/build/roots.ts); and through the
   cellar's east wall a hall of the great roots, two to five times as thick, solid: things to go round. */

export const BENCH: LevelInfo = { id: 'bench', name: 'The bench', c: 'BENCH' };

export function bench(): LevelDef {
  beginLevel(BENCH, {});
  /* the bench's floor, and a cellar a storey under part of it */
  const F = floor(BENCH, { ground: true }), B = floor(BENCH, { y0: -4.5 }), H = { ht: 3 };
  stack(B, F);
  const sayOn = (L: Floor) => (x: number, z: number, label: string, text: string) => use(L, 'look', x, z, 1, { label, text }), say = sayOn(F);

  /* the kit */
  room(F, 'Kit', 0, 0, 20, 10, { ...SEC, ...H });
  const g = grower('bench');
  /* shelves out of the north wall, small to large, and the knot they come out of */
  knot(F, 1.2, 0.25, 0.08, 0.3, g);
  bracket(F, 1.2, 0.5, 0.04, 0, 2, 0.24, g, { age: 0.2 });
  bracket(F, 2.2, 1.05, 0.04, 0, 3, 0.4, g, { age: 0.4 });
  bracket(F, 1.6, 1.75, 0.04, 0.15, 4, 0.6, g, { age: 0.6 });
  say(1.8, 1.2, 'Shelves', 'Leaf in shelves out of a woody knot, stacked the way a bracket fungus stacks: as it comes out of the changed, at whatever size the wall gives it. bracket(), knot()');
  /* the wall climbed: newly, and long since, in flower */
  climb(F, 4.6, 0, 's', 1.5, { w: 0.7, age: 0.05 });
  say(4.6, 1.2, 'Climbing, new', 'A stem up the wall, leaf pressed flat along it, a shelf out of a knot. climb(), young');
  climb(F, 7.6, 0, 's', 2.75, { w: 1.4, age: 0.55, bloom: true });
  say(7.6, 1.2, 'Climbing, old', 'Up to the ceiling and branching, more shelves low down, flowering at the top. climb(), old, in bloom');
  /* stalks up out of the floor, seedling to old */
  ([[10.6, 0.3, 0, false], [12, 0.75, 0.15, false], [13.6, 1.25, 0.3, false], [15.4, 1.75, 0.45, true], [17.6, 1.6, 0.85, true]] as const).forEach(([x, h, age, bl], k) => {
    tobacco(F, x, 2.2, h, { age, bloom: bl });
    say(x, 3.1, ['Seedling', 'Young stalk', 'Stalk', 'In flower', 'Old, curing'][k], ['Wild tobacco, rustica, a hand high: what a runner puts up where it ends.', 'Leaf up it, turned each from the last.', 'The lowest leaves largest and hanging heaviest.', 'Its pale yellow flowers, tubes with flared mouths, thrown out on short stalks.', 'The lowest leaf cured yellow and brown, the first to go; seed setting among the flowers.'][k] + ' tobacco()');
  });
  /* leaf over the floor: new, half cured, cured */
  ([[2.2, 0], [4.8, 0.45], [7.4, 0.9]] as const).forEach(([x, dry], k) => {
    litter(F, x, 6, 1, { dry });
    say(x, 6, ['Leaf, new', 'Leaf, curing', 'Leaf, cured'][k], 'Leaf grown and fallen over the floor, thicker toward the middle. litter(), ' + ['green', 'half cured', 'cured brown'][k]);
  });
  /* a ceiling hung with it, clear of the lights */
  hang(F, 12, 6, 3);
  say(12, 6, 'Hung', 'Out of a knot on the ceiling, runners over it after the air, and strands hung with leaf, as tobacco hangs in a barn to cure. hang()');
  /* a runner, and its seedling */
  runner(F, [[1.2, 8.9], [2.4, 8.6], [3.6, 8.75], [4.9, 8.4], [6.1, 8.55], [7.3, 8.2], [8.4, 8.35]], 0.12, 0.03, { leaf: 0.6, tip: true, g: grower('bench runner') });
  say(4.9, 8.4, 'Runner', 'What it spreads by: woody, half sunk in the floor, knuckled at its bends, putting up leaf; a seedling where it ends. runner()');
  /* where it takes */
  crown(F, 17.4, 6.6, 1);
  say(17.4, 5.4, 'Where it took', 'A mound of knots grown into each other, shelves stacked out of it all round, stalks out of the top, in flower. crown()');
  /* a desk and a chair grown over */
  tbl(F, 12.4, 8.9, 1.6, 0.8, 0x5b5d5f); bx(F, 12.4, 8.1, 0.45, 0.45, 0.45, 0x3a3d40);
  engulf(F, 12.4, 8.9, 1.6, 0.8, 0.76, { cover: 0.8 }); engulf(F, 12.4, 8.1, 0.45, 0.45, 0.45, { cover: 0.6 });
  say(13.6, 8.3, 'Grown over', 'A desk and its chair: leaf over the top and off the edges, stems up the legs, a shelf out of the side. engulf()');

  /* the corridor; the office, colonised from its south-west corner; the locker room, all but clean */
  room(F, 'Corridor', 0, 10.5, 26, 2.5, { ...SEC, ...H, motes: 'spores' });
  door(F, 10.5, 10.25);
  room(F, 'Office', 2, 13.5, 9, 7.5, { ...OFF, ...H, motes: 'spores' });
  door(F, 6.5, 13.25, { sg: [['Office', 'n']] });
  desk(F, 4.4, 18.2, 1.6, 0.8); bx(F, 4.4, 17.4, 0.45, 0.45, 0.45, 0x3a3d40);
  desk(F, 8.6, 15.4, 1.6, 0.8); bx(F, 8.6, 16.2, 0.45, 0.45, 0.45, 0x3a3d40);
  bx(F, 10.7, 19.4, 0.5, 1.3, 0.6, 0x5f6266); bx(F, 10.7, 18.6, 0.5, 1.3, 0.6, 0x5f6266); // filing cabinets against the east wall
  const office = F.rooms.find(r => r.name === 'Office')!, corridor = F.rooms.find(r => r.name === 'Corridor')!;
  colonise(F, office, 2.6, 20.4, 9);
  engulf(F, 4.4, 18.2, 1.6, 0.8, 0.76, { cover: 0.95, age: 0.6 }); engulf(F, 4.4, 17.4, 0.45, 0.45, 0.45, { cover: 0.9, age: 0.6 });
  engulf(F, 8.6, 15.4, 1.6, 0.8, 0.76, { cover: 0.25, age: 0.2 });
  /* out of its door, thinning along the corridor both ways */
  colonise(F, corridor, 6.5, 13.25, 7, { dens: 0.8 });
  room(F, 'Locker room', 15, 13.5, 9, 6.5, { ...SEC, ...H });
  door(F, 20.5, 13.25, { sg: [['Lockers', 'n']] });
  for (let x = 15.6; x < 19.5; x += 0.55) bx(F, x, 19.7, 0.5, 1.9, 0.5, 0x4d5a66); // lockers along the south wall
  for (let x = 21.6; x < 23.7; x += 0.55) bx(F, x, 19.7, 0.5, 1.9, 0.5, 0x4d5a66);
  bx(F, 19.5, 16.8, 2.4, 0.45, 0.4, 0x6b5a48); // the bench between them
  /* the runner along the corridor and under the door, the first leaf in */
  runner(F, [[11.6, 12.3], [13, 12.5], [14.6, 12.35], [16.2, 12.55], [17.8, 12.4], [19.3, 12.6], [20.4, 12.9], [20.6, 13.6], [20.4, 14.4], [20.9, 15.1]], 0.07, 0.025, { leaf: 0.3, tip: true, g: grower('bench trail') });
  litter(F, 20.9, 15.1, 0.5, { n: 6, dry: 0 });
  say(20.4, 14.4, 'The front', 'A runner come along the corridor and under the door, and the first leaf in. The room past it is still clean.');

  /* flowers on top: a garden of the ways it flowers, off a landing at the corridor's end, each come up through the
     floor and broken it */
  room(F, 'Landing', 26, 10.5, 4, 2.5, { ...SEC, ...H });
  room(F, 'Garden', 27, 0, 15, 10, { ...SEC, ht: 3.5, motes: 'spores' });
  door(F, 28.5, 10.25, { sg: [['Garden', 's']] });
  spire(F, 29.2, 3, 2.3, { heave: true });
  say(29.2, 4.2, 'Spire', 'One stem, a rosette of broad leaf at its foot, its top clothed all round in flowers opening from the bottom up: gone to seed below, in bud at the tip. spire()');
  bells(F, 32.8, 3.2, 1.9, { heave: true });
  say(32.8, 4.6, 'Bells', 'Stems arching out of a clump and down, hung with long trumpets that nod, their mouths opened into lobes. bells()');
  candelabra(F, 36.6, 3, 2.2, { heave: true });
  say(36.6, 4.4, 'Candelabra', 'A stout stalk forking into a crown of arms that fork again, a head of flowers at every tip. candelabra()');
  cup(F, 40, 3.2, 1.35, { heave: true });
  say(40, 4.4, 'Cup', 'One great flower facing up, its mouth opened into a double ring of lobes round a gold throat, buds about it; the stalk bowed a little under it. cup()');
  tobacco(F, 29.6, 7.2, 1.7, { age: 0.45, bloom: true }); heave(F, 29.6, 7.2, 0.24);
  say(29.6, 8.2, 'Rustica', 'The stalk as it comes up through the floor: the floor heaved up round it, rubble, cracks run out. tobacco(), heave()');
  bed(F, 32.6, 7, 0.9);
  say(32.6, 8.2, 'Bed', 'Low over the floor: broad leaf lying in a rosette, short stems all through it, each with a flower or two looking up. bed()');
  /* and together, as a place grown over would have them */
  spire(F, 37, 6.6, 1.6, { age: 0.5 }); cup(F, 38.3, 7.6, 1.25, { size: 0.2 }); bells(F, 39.6, 6.7, 1.5); bed(F, 37.6, 8.2, 0.6); candelabra(F, 36.3, 8.4, 1.4, { age: 0.2 });
  say(38.2, 8.9, 'Together', 'The ways it flowers, grown up together, as a place it has taken would have them.');
  /* a door welded shut, and her growth out round it: from its seams either side, and under it */
  room(F, 'Shut', 37, -4, 4, 2, { ...UTIL, ...H });
  door(F, 39, -1, { kind: 'heavy', seal: true, msg: 'Welded shut.' });
  forced(F, [[38.06, 0.75, -0.87], [38.2, 0.9, -0.55], [38.35, 1.35, -0.15], [38.3, 2, 0.25], [38.12, 2.55, 0.55]], 0.06, { age: 0.6 });
  forced(F, [[39.94, 1.55, -0.87], [39.8, 1.7, -0.5], [39.72, 2.1, -0.1], [39.95, 2.75, 0.3], [40.25, 3.1, 0.55]], 0.05, { age: 0.6 });
  forced(F, [[39.1, 0.03, -0.95], [39.15, 0.04, -0.45], [39.25, 0.14, -0.05], [39.3, 0.7, 0.2], [39.36, 1.45, 0.3]], 0.07, { age: 0.6 });
  for (const [x, y, tilt] of [[38.22, 0.55, 0.5], [38.25, 1.05, -0.3], [39.75, 1.3, -0.6], [39.45, 0.3, 1.1]] as const) pressed(F, x, y, -0.85, 0, 0.28, 0.17, tilt, 0x5a6630);
  say(39, 1.2, 'Forced', 'A door welded shut, and her growth forced out round it: from its seams either side and from under it, swollen where it squeezed through, its leaf pressed flat to the slab. She goes round a shut door, not through it. forced()');
  stairs(B, F, 30, 10.5, 2.5, 10, 'w');

  /* roots under them: a cellar of raw concrete under the garden, down the stair; what the flowers above put down through
     its ceiling, and through its walls from the rock round it */
  const DIG = { ...UTIL, ht: 4 };
  room(B, 'Root cellar', 26, -1, 17, 11, DIG);
  room(B, 'Root cellar', 26, 10, 17, 3.5, { ...DIG, nolamp: 1 });
  const cellar = (x: number, z: number) => x > 26.3 && x < 42.7 && z > -0.7 && z < 9.7, sayB = sayOn(B);
  taproot(B, 29.2, 3, 4, { d: 0.3, inside: cellar });
  taproot(B, 32.8, 3.2, 4, { d: 0.25, inside: cellar });
  taproot(B, 36.6, 3, 4, { d: 0.48, inside: cellar });
  taproot(B, 40, 3.2, 4, { d: 0.34, inside: cellar });
  sayB(36.6, 4.6, 'Taproot', 'Down out of the ceiling from the flowers over it and into the floor, bending as it comes, buttressed where it goes in; the concrete broken through at both. taproot()');
  wallroot(B, 43, 2.5, 6.6, 'w', 39.4, 7.4, { d: 0.36, inside: cellar });
  sayB(41, 6.4, 'Out of the wall', 'Out of the rock through the wall, arching over and down into the floor. wallroot()');
  wallroot(B, 31, 2.8, -1, 's', 31.6, 1.2, { d: 0.28, inside: cellar });
  sayB(31.2, 0.3, 'Broken through', 'Where it goes through concrete: spalled off in lumps round the hole, cracks run out, the reinforcing bared and bent, rubble fallen under it. bore()');
  span(B, [26, 3.4, 9.1], 'e', [43, 3.3, 8.8], 'w', { d: 0.3, sag: 0.5, inside: cellar });
  sayB(34.5, 9.2, 'Across the room', 'Through one wall and into the other, over a head, sagging between, hung with rootlets. span()');
  fringe(B, 32.6, 7, 4, 0.8, { inside: cellar });
  sayB(32.6, 6.2, 'Hair roots', 'Hung from cracks across the ceiling under the bed of flowers over it: fine, pale, kinked, none low enough to touch. fringe()');

  /* the great roots: a hall off the cellar, rock over it, so they come down through its ceiling as far as they like;
     one of each, two to five times as thick as the cellar's, and one of those beside the greatest for scale */
  room(B, 'Root hall', 43.5, -1, 18, 15, { ...UTIL, ht: 4.5 });
  door(B, 43.25, 1.5, { open: true, sg: [['Root hall', 'w']] });
  const hall = (x: number, z: number) => x > 43.8 && x < 61.2 && z > -0.7 && z < 13.7;
  pillar(B, 50, 5.2, 4.5, { d: 1.75, inside: hall });
  sayB(50, 7.6, 'Great root', 'Five times as thick as the cellar\'s: down out of the ceiling, the floor heaved round its foot, great buttresses spread out over it and down into it. Solid: go round it. pillar()');
  taproot(B, 46.6, 9.6, 4.5, { d: 0.35, inside: hall });
  sayB(46.6, 10.6, 'For scale', 'A root as the cellar has them, beside the great one.');
  sprawl(B, 55.5, 0.75, -1, 's', [[55.9, 1.4], [56.8, 3.4], [57.9, 5.4], [58.6, 7.4], [59.3, 9.4]], { d: 1.4 });
  sayB(56.2, 6.2, 'Sprawl', 'Four times as thick: out of the wall low and along the floor half sunk in it, the floor broken up along its flanks, and down. Too high to step over. sprawl()');
  vault(B, 61.5, 3.3, 11.6, 'w', 52.6, 12.4, { d: 0.8 });
  sayB(56.5, 10.2, 'Vault', 'Twice as thick: out of the wall over a head and arching down into the floor; walked under near the wall, gone round further out. vault()');

  return finishLevel([25.2, 11.75, PI / 2], F); // at the corridor's east end, looking west along it
}
