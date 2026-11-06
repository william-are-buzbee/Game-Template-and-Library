/* The family's exhibit (world.md §8, *The exhibit*): the story the company told about itself, on the walls of the upper
   corridor and the atrium's gallery, in its own voice. Each board is drawn from this (present/render/exhibit.ts) and
   read off the board itself, as a note (content/notes.ts). Plain data.

   The family and its founder are agreed (world.md §1, *The family*); the company's name and the dates are placeholders,
   to be retooled once the lore is down. */

/** the house: who built Lowfield, and what they sold */
export const HOUSE = { family: 'Ashcombe', company: 'Ashcombe Leaf Company', since: 1891 };

/** what is drawn on a board: a picture of its own (render/exhibit.ts, ART) */
export type Art = 'field' | 'barns' | 'blight' | 'shaft' | 'galleries' | 'range' | 'deeper'
  | 'seed' | 'seedbed' | 'transplant' | 'lamps' | 'priming' | 'curing';

export interface Board {
  /** its note's key, and what is read off it */
  key: string;
  /** when, as the board has it large: a year, or a word */
  era: string;
  title: string;
  /** a line or two on the board itself, under its picture */
  line: string;
  art: Art;
  /** the board in full, read off it */
  text: string;
}

/** the house's own board, on the wall facing you as you come in off the lobby's gallery: its mark and its name */
export const WELCOME = {
  key: 'ex-house', title: 'Welcome to Lowfield',
  text: `Welcome to Lowfield Station: home of ${HOUSE.family} leaf since 1986, and of the ${HOUSE.family} family's business since ${HOUSE.since}.\n\nThe story of the company runs the length of this corridor, from the low field four hundred metres over your head to the galleries beneath it. Please take your time.`,
};

/** the house's board in the arrival hall, across from the cage's gates: the same mark and name, and what a visitor
 *  stepping off was told */
export const ARRIVAL = {
  key: 'ex-arrive', title: 'Lowfield Station',
  text: `The ${HOUSE.family} family welcomes you to Lowfield Station, four hundred metres under the low field.\n\nPlease have your pass ready for the checkpoint. Coats may be left at the cloakroom, and will be kept for you until you go up.`,
};

/** the timeline, along the upper corridor's south wall from the lobby east: walking on is walking forward in time */
export const HISTORY: Board[] = [
  {
    key: 'ex-field', era: '1891', title: 'The Low Field', art: 'field',
    line: 'Four acres by the river, too wet for wheat.',
    text: `In 1891 Josiah ${HOUSE.family} put four acres of leaf into the low field by the river. Too wet for wheat, his neighbours told him. Just wet enough for tobacco.\n\nThe field is still there, four hundred metres over your head. Every Lowfield plant can trace its seed to it.`,
  },
  {
    key: 'ex-barns', era: '1923', title: 'Cured by Hand', art: 'barns',
    line: 'Hung by the stick, cured slow over wood fires.',
    text: `By 1923 the ${HOUSE.family} barns lined the river road: eleven of them, each hung with leaf from the floor to the ridge and cured over slow fires for six weeks.\n\nThe bales went to market stamped with the family's leaf, and the buyers learned to ask for it by name.`,
  },
  {
    key: 'ex-blight', era: '1979', title: 'Blue Mould', art: 'blight',
    line: 'Three generations of seed, gone in a fortnight.',
    text: `In June 1979 blue mould came up the valley on a wet wind. It took the ${HOUSE.family} crop in eleven days, and three generations of seed stock with it.\n\nThat autumn the family made a decision. The crop would never again be grown under an open sky.`,
  },
  {
    key: 'ex-shaft', era: '1981', title: 'Going Down', art: 'shaft',
    line: 'Four hundred metres down, there is no weather.',
    text: `Four hundred metres down, the rock under the low field holds one temperature the whole year round. No frost. No drought. No blight on the wind.\n\nThe first shaft was sunk in 1981, and the caverns blasted from it as a mine's are. Every tonne of rock that came up made room for leaf.`,
  },
  {
    key: 'ex-galleries', era: '1986', title: 'A Sky of Our Own', art: 'galleries',
    line: 'Lamps that never set. Water from the rock.',
    text: `Lowfield Station opened in 1986: grow galleries under lamps that never set, water drawn from the aquifer below and treated twice, air filtered and warmed. Its first crop was harvested on schedule that winter, the first leaf ever grown so far from the sun.\n\nThe family kept its promise. The crop has never seen the sky.`,
  },
  {
    key: 'ex-range', era: 'Today', title: 'The Lowfield Range', art: 'range',
    line: 'From one leaf, a whole line.',
    text: `From one leaf, a whole line. Fine cigarette and cigar grades. Chewing leaf. Oils and resins. And a growing range of clinical and wellness products, developed by our Horticulture team.\n\nAccelerated breeding brings a new Lowfield strain from the seed bed to market in a single season. The field took a lifetime.`,
  },
  {
    key: 'ex-deeper', era: 'Coming soon', title: 'Phase 2', art: 'deeper',
    line: 'Lowfield grows down.',
    text: `Deeper galleries. A second aquifer. Four times the growing floor.\n\nPhase 2 is already under way beneath your feet. Lowfield grows down.`,
  },
];

/** the growing process, one board across the atrium gallery's back wall, read a stage at a time: its title in a block
 *  at its left end (`lead`, a share of its width), then the stages left to right */
export const PROCESS = { title: 'From Seed to Leaf', lead: 0.16 };
/** how far stage k's middle is from the process board's middle, to the reader's right, on a board w wide */
export const stageAt = (k: number, w: number): number => w * (PROCESS.lead + ((k + 0.5) / STAGES.length) * (1 - PROCESS.lead) - 0.5);
export const STAGES: Board[] = [
  {
    key: 'ex-seed', era: '1', title: 'The Seed', art: 'seed',
    line: 'Ten thousand to the gram.',
    text: `A tobacco seed is the size of a grain of dust: ten thousand of them weigh a gram. Every Lowfield seed is saved from our own stock, and every lot is tested before it is sown.`,
  },
  {
    key: 'ex-seedbed', era: '2', title: 'The Seed Bed', art: 'seedbed',
    line: 'Sown on the surface: it wakes to light.',
    text: `Sown on the surface of the bed, never covered, because the seed needs light to wake. Under the lamps and a fine mist it comes up in a week, and is ready to move in eight.`,
  },
  {
    key: 'ex-transplant', era: '3', title: 'Transplant', art: 'transplant',
    line: 'In the field, a fortnight lost. Here, a day.',
    text: `Every seedling moved suffers transplant shock: torn roots, wilted leaf, a check in its growth. Gardeners call it root shock. In the field it cost the crop a fortnight. Under Lowfield's lamps, our seedlings take in a day.`,
  },
  {
    key: 'ex-lamps', era: '4', title: 'Under the Lamps', art: 'lamps',
    line: 'Eighteen hours of light a day.',
    text: `Eighteen hours of light a day, warm wet air, and water from the aquifer at the root. A Lowfield plant stands taller than a man in nine weeks.`,
  },
  {
    key: 'ex-priming', era: '5', title: 'Topping and Priming', art: 'priming',
    line: 'Picked from the foot up, as each ripens.',
    text: `The flower is cut, so that the plant puts its strength into the leaf. Then the leaves are primed: picked from the foot of the stalk upward, two or three at a time, as each ripens.`,
  },
  {
    key: 'ex-curing', era: '6', title: 'Curing', art: 'curing',
    line: 'Six weeks, from green to gold.',
    text: `Hung in the curing hall in warm, damp air, the leaf turns from green to gold over six weeks. What it becomes after that is the Lowfield Range.`,
  },
];

/** every board's note: its title, and what is read off it */
export const EXHIBIT_NOTES = Object.fromEntries([...HISTORY, ...STAGES].map(b => [b.key, {
  t: STAGES.includes(b) ? `${PROCESS.title}: ${b.title}` : `${b.title}, ${b.era}`, b: b.text,
}]).concat([[WELCOME.key, { t: WELCOME.title, b: WELCOME.text }], [ARRIVAL.key, { t: ARRIVAL.title, b: ARRIVAL.text }]]));
