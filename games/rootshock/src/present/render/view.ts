import * as THREE from 'three';
import { U } from './shader';
import { Post } from './post';
import { flickDepth, flickerAt } from '../flicker';

/** The renderer, the scene and the camera, and the picture made from what they draw (post.ts). It draws; it decides
 *  nothing. */
export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(72, 1, 0.06, 140);
  private post: Post;
  /** what share of the screen's resolution is drawn (present/quality.ts) */
  private scale: number;

  constructor(canvas: HTMLCanvasElement, scale = 1) {
    /* (the scene's own target smooths its edges; the screen is drawn once, whole, by the picture's pass) */
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setClearColor(0x000000);
    this.camera.rotation.order = 'YXZ';
    this.post = new Post(this.renderer);
    this.scale = scale;
    window.addEventListener('resize', () => this.size());
    this.size();
  }

  /** draw this share of the screen's resolution */
  setScale(k: number): void {
    if (k === this.scale) return;
    this.scale = k;
    this.size();
  }

  private size(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * this.scale);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.resize();
  }

  /** show this level's group, and only it */
  show(group: THREE.Object3D): void {
    if (group.parent !== this.scene) this.scene.add(group);
    for (const c of this.scene.children) if (c !== this.camera && c.type === 'Group') c.visible = c === group;
  }

  /** `hard`: the flickering lights stuttering badly (sim/cast.ts, `stutters`) */
  draw(time: number, hard = false): void {
    U.uTime.value = time;
    U.uFlick.value = flickerAt(time, hard) ? flickDepth(hard) : 0;
    this.post.render(this.scene, this.camera);
  }
}
