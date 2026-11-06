import { describe, expect, it } from 'vitest';
import { STATION } from '../src/content/station';
import { World } from '../src/world/world';

/* Where two rooms touch side to side with no wall between them, and not through a doorway: one open space, whether that
   was meant or not. Laid out on 2 m tiles, rooms on different decks, or tiles that happened to meet, were open to each
   other with nothing to say so: the isolation hall's top beside the check-in hall, the square's shops and the flats over
   them. Every such contact on every level is listed here, each one meant; one that is not is a hole. (A room drawn as
   several boxes touches itself: that is not listed.) */

const MEANT: Record<string, string[]> = {
  upper: [
    /* the walkways in the halls they look down into */
    'Cargo cavern | Deck 1', 'Cargo cavern | Deck 2', 'Cargo cavern | Deck 3', 'Cargo cavern | Crane cab', 'Lobby | Lobby gallery', 'Atrium | Gallery',
    'Isolation suite | Nurses\' station',
    /* sunk in its hall */
    'Muster court | Muster hall', 'Pool | Pool hall',
    /* the highway, room to room */
    'Atrium | Security corridor', 'Atrium | Operations corridor', 'Muster hall | Operations corridor',
    /* the check-in hall's opening in the lobby's stone; the upper corridor between the galleries; the passage off the
       kitchen; the plant stair's head, and the steps up from the plant over the false sky */
    'Check-in hall | Lobby', 'Lobby gallery | Upper corridor', 'Gallery | Upper corridor', 'Kitchen | Service passage',
    'Air plant | Plant stair', 'Air plant | Sky void',
    /* the mess's branch, crawled: its mouth low in the plant's east wall, and its grille high in the mess's north wall */
    'Air plant | Duct', 'Duct | Staff mess',
    /* the service stair's foot in the pantry under the bar */
    'Pantry | Service stair',
  ],
  main: [
    /* the cavern over the street and the square, their galleries, bridges and ring */
    'Gallery | The Commons', 'Bridge | The Commons', 'Ring | The Square', 'The Commons | The Square', 'Gallery | The Square',
    'Bridge | Gallery', 'Gallery | Ring',
    /* the grow galleries open off the cross passage, as does the overlook's stair; the overlook over the arboretum */
    'Cross passage | Grow gallery north', 'Cross passage | Grow gallery', 'Cross passage | Grow gallery south',
    'Cross passage | Overlook stair', 'Overlook passage | Overlook stair', 'Arboretum balcony | Overlook passage',
    'Arboretum | Arboretum balcony',
  ],
  plant: ['East corridor | West corridor', 'Control stair | Link corridor', 'Control landing | Control stair'],
  sump: ['Pump station | Sump'],
  sumpdeep: ['Flooded link | Intake gallery', 'Intake gallery | Intake main'],
  cave: [
    'Descent | Great chamber', 'Entry passage | Upper chamber', 'Lower chamber | Lower passage', 'Great chamber | Lower passage',
    'Descent | Upper chamber', 'Spring branch | Upper chamber',
  ],
};

/** every pair of differently named rooms whose cells meet side to side, but for doorways: as 'A | B', A before B */
function contacts(w: World): Map<string, string> {
  const R = w.rooms, out = new Map<string, string>(), g = w.grid;
  g.forEachChunk((cx, cy, cz) => {
    const cells = g.chunkCells(cx, cy, cz)!;
    for (let i = 0; i < 4096; i++) {
      const a = cells[i];
      if (a < 0 || R[a].doorway) continue;
      const I = cx * 16 + (i & 15), J = cy * 16 + ((i >> 4) & 15), K = cz * 16 + (i >> 8);
      for (const b of [(i & 15) < 15 ? cells[i + 1] : g.get(I + 1, J, K), i >> 8 < 15 ? cells[i + 256] : g.get(I, J, K + 1)]) {
        if (b < 0 || b === a || R[b].doorway || R[b].name === R[a].name) continue;
        const key = [R[a].name, R[b].name].sort().join(' | ');
        if (!out.has(key)) out.set(key, `(${(I * 0.25).toFixed(2)}, ${(J * 0.25).toFixed(2)}, ${(K * 0.25).toFixed(2)})`);
      }
    }
  });
  return out;
}

describe('rooms touch where they are meant to, and nowhere else', () => {
  for (const L of STATION.levels)
    it(L.id, () => {
      const found = contacts(new World(L.build())), meant = new Set(MEANT[L.id].map(k => k.split(' | ').sort().join(' | ')));
      /* (where each unlisted one is, to go and look) */
      expect([...found].filter(([k]) => !meant.has(k)).map(([k, at]) => `${k} at ${at}`)).toEqual([]);
      expect([...meant].filter(k => !found.has(k))).toEqual([]);
    });
});
