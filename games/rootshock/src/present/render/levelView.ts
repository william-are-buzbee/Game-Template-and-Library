import * as THREE from 'three';
import type { Sim } from '../../sim/sim';
import type { Lighting } from '../../world/light';
import { CastView } from './castView';
import { buildLevelMesh, type LevelMesh } from './levelMesh';
import { LightVolume } from './lightVolume';
import { Overlay } from './overlay';
import { DEPTH_FIRST, U, staticMaterial } from './shader';
import { Things } from './things';

/* One level, drawn: its mesh, what moves in it, its cast, all in one group. Kept once made, so going back to a level is
   only showing it again (as the first engine kept every deck and hid the others). */
export class LevelView {
  readonly group = new THREE.Group();
  readonly overlay: Overlay | null;
  private mesh: LevelMesh;
  private volume: LightVolume;
  private things: Things;
  private cast: CastView;
  /** how long it took to mesh, for the dev readout */
  readonly meshMs: number;

  constructor(readonly sim: Sim, L: Lighting, dev: boolean) {
    const t0 = performance.now();
    this.mesh = buildLevelMesh(sim.world, L);
    this.volume = new LightVolume(L);
    /* its pieces, on one material (levelMesh.ts), their depth drawn first (post.ts) */
    const mat = staticMaterial(), piece = (g: THREE.BufferGeometry, to: THREE.Object3D) => {
      const m = new THREE.Mesh(g, mat);
      m.matrixAutoUpdate = false;
      m.layers.enable(DEPTH_FIRST);
      to.add(m);
    };
    for (const g of this.mesh.pieces) piece(g, this.group);
    this.services.visible = U.uDetail.value > 0.5;
    for (const g of this.mesh.services) piece(g, this.services);
    this.group.add(this.services);
    this.meshMs = performance.now() - t0;
    this.things = new Things(this.group, sim, L);
    this.cast = new CastView(this.group, sim, L);
    this.overlay = dev ? new Overlay(this.group, sim) : null;
  }

  /** the pipes and trays under its bare ceilings, which go with surface detail */
  private services = new THREE.Group();
  showDetail(on: boolean): void {
    this.services.visible = on;
  }
  /** how many pieces its mesh is drawn in, for the dev readout */
  get pieces(): number {
    return this.mesh.pieces.length + this.mesh.services.length;
  }

  /** this is the level being drawn: the shader reads its light */
  bind(): void {
    this.volume.bind();
  }

  /** the power changed (or may have, while you were elsewhere): light it all again */
  relight(L: Lighting): void {
    this.mesh.relight(L);
    this.volume.sync(L);
    this.things.setLighting(L);
    this.cast.setLighting(L);
  }

  /** only these rooms: a light coming on room by room */
  relightRooms(L: Lighting, rooms: Iterable<number>): void {
    this.mesh.relightRooms(L, rooms);
  }

  /** the light as L has it now (a door moving, a room coming on): only what has changed is sent to the card */
  syncLight(L: Lighting): void {
    this.volume.sync(L);
  }

  /** done with (a new game, made in the page): what it put on the card, given back */
  dispose(): void {
    this.group.removeFromParent();
    this.group.traverse(o => (o as THREE.Mesh).geometry?.dispose());
    this.volume.dispose();
  }

  update(alpha: number, eye: THREE.Camera): void {
    this.things.update();
    this.cast.update(alpha, eye);
    this.overlay?.update();
  }
}
