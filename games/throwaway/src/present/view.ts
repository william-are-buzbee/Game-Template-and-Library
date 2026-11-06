// present/view.ts — draws the state with three.js: a floor, the player, a camera that follows. It reads the sim,
// never writes it.
import * as THREE from 'three';
import { HALF } from '../sim/step';
import type { State } from '../sim/state';

export class View {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  private body: THREE.Mesh;
  private look = new THREE.Vector3();

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    parent.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x9fb4c7);
    this.scene.fog = new THREE.Fog(0x9fb4c7, 20, 70);
    this.scene.add(new THREE.HemisphereLight(0xdde8f2, 0x3a3328, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(8, 14, 6);
    this.scene.add(sun);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2, 1, 1), new THREE.MeshLambertMaterial({ map: checker(HALF) }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 1.2), new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({ color: 0x2b2b2b }));
    nose.position.set(0, 0.2, -0.65);
    this.body.add(nose);
    this.scene.add(this.body);

    addEventListener('resize', () => this.resize());
    this.resize();
  }

  private resize(): void {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /** draws between the previous step (`prev`) and the latest (`cur`); alpha 0..1 is how far between */
  draw(prev: State, cur: State, alpha: number): void {
    const a = prev.player, b = cur.player;
    const x = a.x + (b.x - a.x) * alpha;
    const z = a.z + (b.z - a.z) * alpha;
    this.body.position.set(x, 0.5, z);
    this.body.rotation.y = b.yaw;
    this.camera.position.set(x, 9, z + 11);
    this.camera.lookAt(this.look.set(x, 0.5, z - 2));
    this.renderer.render(this.scene, this.camera);
  }
}

/** a two-tone checker, one square per metre over a floor `half` metres from middle to edge: made, not loaded */
function checker(half: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const g = c.getContext('2d')!;
  g.fillStyle = '#5f7a4d';
  g.fillRect(0, 0, 2, 2);
  g.fillStyle = '#55704a';
  g.fillRect(0, 0, 1, 1);
  g.fillRect(1, 1, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(half, half);
  return t;
}
