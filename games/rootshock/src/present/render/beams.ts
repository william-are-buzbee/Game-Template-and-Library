import * as THREE from 'three';
import type { Loose } from '../../world/light';
import { BEAMS, HELD, SHADOW, SHADOW_CAM, U } from './shader';
import { SHADOW_ONLY } from './selfView';
import { UNSEEN } from './castView';

/* Flashlights lying on (world/light.ts, Loose): the nearest few to the eye are drawn with their beams, each from its lens
   with a shadow map of its own, rendered every frame from there (what it lights moves: the cast, doors, crates). The map
   holds depth only; LIGHTS in shader.ts reads it. What is drawn into it is what stands in the light's way: not dust, drips
   or prints, nothing see-through, and not what you hold; but the parts of you the eye is not shown (SHADOW_ONLY in
   selfView.ts: your head, your arms) are, so your shadow is whole.
   The flashlight in your hand has one too, from your hand along its beam, finer (HELD), so what stands in your beam
   throws a shadow that slides as you sweep it. Your head and arms are left out of it (the hand is in them), and the
   rest of you is behind the lens or under it: point it at your feet and your legs shadow the floor.
   The cast out of your sight (castView.ts, SIGHT) is in a beam lying about's map, not the one in your hand's: a husk
   round a corner can throw its shadow out of a dropped light's beam where you see it. */

const FAR = 40; // a beam farther than this from the eye is not drawn
const AGAIN = 60; // how often the scene is searched again for what is not in a beam's way (frames)

export class Beams {
  private targets: THREE.WebGLRenderTarget[];
  private cams: THREE.PerspectiveCamera[];
  private depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  private held: THREE.WebGLRenderTarget;
  private heldCam = new THREE.PerspectiveCamera(HELD.fov, 1, SHADOW_CAM.near, SHADOW_CAM.far);
  /** what is not in a beam's way (seen through, dust): looked for through the whole scene only every so often
   *  (AGAIN frames), as the scene seldom gains one */
  private clear: THREE.Object3D[] = [];
  private since = Infinity;

  constructor() {
    this.targets = Array.from({ length: BEAMS }, () => {
      const t = new THREE.WebGLRenderTarget(SHADOW, SHADOW, { depthBuffer: true });
      t.depthTexture = new THREE.DepthTexture(SHADOW, SHADOW, THREE.UnsignedIntType);
      t.depthTexture.minFilter = t.depthTexture.magFilter = THREE.NearestFilter;
      return t;
    });
    this.cams = Array.from({ length: BEAMS }, () => {
      const c = new THREE.PerspectiveCamera(SHADOW_CAM.fov, 1, SHADOW_CAM.near, SHADOW_CAM.far);
      c.layers.enable(SHADOW_ONLY);
      c.layers.enable(UNSEEN); // the cast out of your sight still stands in a beam's way
      return c;
    });
    U.uSh0.value = this.targets[0].depthTexture;
    U.uSh1.value = this.targets[1].depthTexture;
    this.held = new THREE.WebGLRenderTarget(HELD.size, HELD.size, { depthBuffer: true });
    this.held.depthTexture = new THREE.DepthTexture(HELD.size, HELD.size, THREE.UnsignedIntType);
    this.held.depthTexture.minFilter = this.held.depthTexture.magFilter = THREE.NearestFilter;
    U.uShH.value = this.held.depthTexture;
  }

  /** another level is shown: look for what is not in a beam's way again now */
  rescan(): void {
    this.since = Infinity;
  }

  /** draw the shadow maps of the beams nearest `eye` among `lights`, and of the flashlight in your hand if it is on
   *  (uFlash, from uFlashPos along uFlashDir), and say where they are */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, eye: THREE.Vector3, lights: readonly Loose[]): void {
    const near = lights
      .filter(L => L.kind === 'flash' && L.k > 0)
      .map(L => ({ L, d: Math.hypot(L.x - eye.x, L.y - eye.y, L.z - eye.z) }))
      .filter(o => o.d < FAR)
      .sort((a, b) => a.d - b.d)
      .slice(0, BEAMS);
    for (let i = 0; i < BEAMS; i++) U.uBeam.value[i].w = 0;
    const hand = U.uFlash.value > 0;
    if (!near.length && !hand) return;
    /* what is not in a beam's way, hidden while the maps are drawn */
    if (++this.since >= AGAIN) {
      this.since = 0;
      this.clear = [];
      scene.traverse(o => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if ((o as THREE.Points).isPoints || (o as THREE.Camera).isCamera || m?.transparent) this.clear.push(o);
      });
    }
    const hidden: THREE.Object3D[] = [];
    for (const o of this.clear) if (o.visible) { o.visible = false; hidden.push(o); }
    const was = renderer.getRenderTarget(), over = scene.overrideMaterial;
    scene.overrideMaterial = this.depthOnly;
    /* from (x, y, z) along (dx, dy, dz), into the map M is to read it by */
    const look = (cam: THREE.PerspectiveCamera, x: number, y: number, z: number, dx: number, dy: number, dz: number, M: THREE.Matrix4) => {
      cam.position.set(x, y, z);
      cam.up.set(0, 1, 0);
      if (Math.abs(dy) > 0.95) cam.up.set(1, 0, 0);
      cam.lookAt(x + dx, y + dy, z + dz);
      cam.updateMatrixWorld();
      M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    };
    near.forEach(({ L }, i) => {
      const cam = this.cams[i];
      look(cam, L.x, L.y, L.z, L.dx, L.dy, L.dz, U.uBeamM.value[i]);
      U.uBeam.value[i].set(L.x, L.y, L.z, L.k);
      U.uBeamDir.value[i].set(L.dx, L.dy, L.dz);
      renderer.setRenderTarget(this.targets[i]);
      renderer.clear();
      renderer.render(scene, cam);
    });
    if (hand) {
      const P = U.uFlashPos.value, D = U.uFlashDir.value;
      look(this.heldCam, P.x, P.y, P.z, D.x, D.y, D.z, U.uHeldM.value);
      renderer.setRenderTarget(this.held);
      renderer.clear();
      renderer.render(scene, this.heldCam);
    }
    scene.overrideMaterial = over;
    renderer.setRenderTarget(was);
    for (const o of hidden) o.visible = true;
  }
}
