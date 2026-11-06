// sim/state.ts — the whole game as plain data. It saves (JSON), clones (structuredClone) and could be sent over a
// network as it is. No three.js, no page: see test/layers.test.ts.

export interface Player {
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** facing, radians; 0 looks along −z */
  yaw: number;
}

export interface State {
  /** seconds of game time, advanced only by step() */
  t: number;
  player: Player;
}

export function newState(): State {
  return { t: 0, player: { x: 0, z: 0, vx: 0, vz: 0, yaw: 0 } };
}
