import type { Colour } from '../core/math';
import { ICO } from './types';

/* What lies about to be picked up, and the papers, as drawn (present/render/things.ts): plain data, so the level's
   builder can put each down on what is under it, and the tests measure it there (test/placement.ts). */

/** a part of a fitting: a box (or other shape) of a colour, sized, tipped about z, and placed in the fitting's own frame */
export type Part = [shape: 'box' | 'cyl' | 'ico', c: number | Colour, sx: number, sy: number, sz: number, x: number, y: number, z: number, rz?: number];

const R90 = Math.PI / 2;
/** a flashlight's lens, lit: in front of its head (itemParts) */
export const LENS: Part[] = [['cyl', [2.9, 2.85, 2.6], 0.065, 0.01, 0.065, 0.137, 0.04, 0, Math.PI / 2]];

/** something lying on the floor, as the first engine drew it (itemMesh); anything else is a sheet of paper. A flashlight's
 *  lens is its own part (LENS), shown while it lies on */
export function itemParts(id: string): Part[] {
  switch (id) {
    case 'baton': return [['cyl', 0x1c1e20, 0.05, 0.55, 0.05, 0, 0.03, 0, R90], ['cyl', 0x3a3d40, 0.06, 0.14, 0.06, -0.2, 0.03, 0, R90]];
    case 'adjwrench': return [['box', 0xb8bcc0, 0.36, 0.03, 0.05, 0, 0.015, 0], ['box', 0xb8bcc0, 0.08, 0.03, 0.12, 0.2, 0.015, 0]];
    case 'pistol': return [['box', 0x1c1e20, 0.2, 0.04, 0.05, 0, 0.02, 0], ['box', 0x1c1e20, 0.05, 0.04, 0.12, -0.07, 0.02, 0.06]];
    case 'shotgun': return [['box', 0x1c1e20, 0.7, 0.05, 0.06, 0, 0.03, 0], ['box', 0x5a4034, 0.25, 0.06, 0.07, -0.4, 0.03, 0]];
    case 'ammo9': return [['box', 0x8a7a2a, 0.12, 0.06, 0.08, 0, 0.03, 0]];
    case 'shells': return [['box', 0xa82a20, 0.14, 0.07, 0.1, 0, 0.035, 0]];
    case 'tacvest': return [['box', 0x23272c, 0.46, 0.14, 0.54, 0, 0.07, 0], ['box', 0x3a4030, 0.12, 0.05, 0.14, -0.1, 0.15, 0.1], ['box', 0x3a4030, 0.12, 0.05, 0.14, 0.1, 0.15, 0.1]];
    case 'goggles': return [['box', 0x22262a, 0.18, 0.05, 0.03, 0, 0.03, 0], ['cyl', [2.2, 2.5, 2.6], 0.07, 0.03, 0.07, -0.05, 0.03, 0.02, R90], ['cyl', [2.2, 2.5, 2.6], 0.07, 0.03, 0.07, 0.05, 0.03, 0.02, R90]];
    case 'rebreather': return [['box', 0x2a2c2e, 0.26, 0.12, 0.2, 0, 0.06, 0], ['cyl', 0xc9a227, 0.09, 0.2, 0.09, 0.08, 0.17, 0, R90], ['box', 0x15181b, 0.05, 0.05, 0.16, -0.1, 0.14, 0.12]];
    case 'surf': return [['box', [2.3, 2.85, 2.5], 0.09, 0.006, 0.06, 0, 0.006, 0]];
    case 'pipe': return [['cyl', 0x7a7e84, 0.06, 0.8, 0.06, 0, 0.03, 0, R90]];
    case 'wrench': return [['box', 0x8a3a2a, 0.45, 0.035, 0.06, 0, 0.02, 0], ['box', 0x9a9ea4, 0.1, 0.035, 0.13, 0.24, 0.02, 0]];
    case 'knife': return [['box', 0x22262a, 0.12, 0.025, 0.03, -0.1, 0.015, 0], ['box', 0xc8ccd0, 0.22, 0.01, 0.045, 0.07, 0.01, 0]];
    case 'axe': return [['box', 0x7a5a34, 0.9, 0.04, 0.045, 0, 0.02, 0], ['box', 0xa82a20, 0.14, 0.035, 0.24, 0.38, 0.0175, 0.06]];
    case 'flash': return [['cyl', 0x2a2c2e, 0.06, 0.2, 0.06, 0, 0.035, 0, R90], ['cyl', 0xc9a227, 0.075, 0.05, 0.075, 0.11, 0.04, 0, R90]];
    case 'lantern': return [['cyl', 0xc9a227, 0.14, 0.06, 0.14, 0, 0.03, 0], ['cyl', [2.4, 2.6, 2.7], 0.11, 0.14, 0.11, 0, 0.13, 0], ['cyl', 0xc9a227, 0.14, 0.05, 0.14, 0, 0.225, 0], ['box', 0x2a2c2e, 0.16, 0.02, 0.02, 0, 0.3, 0]];
    case 'batt': return [['cyl', 0xb87333, 0.045, 0.1, 0.045, 0, 0.05, 0], ['cyl', 0x22262a, 0.047, 0.04, 0.047, 0, 0.03, 0]];
    case 'medkit': return [['box', 0xd4d8d4, 0.32, 0.14, 0.22, 0, 0.07, 0], ['box', 0xa82a20, 0.12, 0.01, 0.04, 0, 0.145, 0], ['box', 0xa82a20, 0.04, 0.01, 0.12, 0, 0.145, 0]];
    case 'bandage': return [['cyl', 0xd8d4c8, 0.09, 0.07, 0.09, 0, 0.035, 0]];
    case 'ration': return [['box', 0x8a8478, 0.15, 0.03, 0.08, 0, 0.015, 0]];
    case 'peaches': return [['cyl', 0xb8bcc0, 0.09, 0.11, 0.09, 0, 0.055, 0], ['cyl', 0xd88a2a, 0.093, 0.06, 0.093, 0, 0.055, 0]];
    case 'fuse': return [['cyl', 0xd8d0b8, 0.07, 0.22, 0.07, 0, 0.04, 0, R90], ['cyl', 0xb87333, 0.075, 0.04, 0.075, -0.1, 0.04, 0, R90], ['cyl', 0xb87333, 0.075, 0.04, 0.075, 0.1, 0.04, 0, R90]];
    case 'armor': return [['box', 0x23272c, 0.44, 0.12, 0.52, 0, 0.06, 0], ['box', 0x39485a, 0.3, 0.02, 0.1, 0, 0.125, -0.1]];
    case 'hardhat': return [['ico', 0xc9a227, 0.28, 0.2, 0.3, 0, 0.08, 0], ['box', 0xc9a227, 0.2, 0.02, 0.12, 0, 0.02, 0.17]];
    case 'kit': return [['box', 0x39485a, 0.3, 0.12, 0.2, 0, 0.06, 0], ['cyl', 0x1a1c1e, 0.2, 0.05, 0.2, 0, 0.145, 0], ['box', 0xc9a227, 0.3, 0.02, 0.05, 0, 0.125, 0]];
    default: return [['box', [2.5, 2.48, 2.4], 0.2, 0.004, 0.28, 0, 0.004, 0]];
  }
}
/** a turn for something lying on the floor that is the same every time (it used to be random) */
export const lie = (x: number, z: number) => (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1 * Math.PI;

/** how a thing lies, turned about y: a light lying on points its lens the way it shines (its aim, turned to the part's
 *  +x), anything put down on something square lies as it was put (`yaw`, content/build/builder.ts, settle), and the rest
 *  as it fell */
export function lyingYaw(t: { id: string; x: number; z: number; yaw?: number; on?: { yaw: number } }): number {
  return t.on ? t.on.yaw + R90 : t.yaw ?? (t.id === 'flash' ? R90 : lie(t.x, t.z));
}
/** how a paper lies: as it was put, or near enough square to however it fell */
export const paperYaw = (n: { x: number; z: number; yaw?: number }): number => n.yaw ?? lie(n.x, n.z) * 0.3;

/** the corners of each part of a thing lying at (x, y, z), turned by yaw, as drawn: its box (a cylinder's or a lump's
 *  bounds), tipped about z and turned about y (present/render/things.ts, parts) */
export function lyingCorners(id: string, x: number, y: number, z: number, yaw: number): [number, number, number][] {
  const out: [number, number, number][] = [], cy = Math.cos(yaw), sy = Math.sin(yaw);
  for (const [shape, , sx, sh, sz, px, py, pz, rz] of itemParts(id)) {
    const cz = Math.cos(rz ?? 0), sn = Math.sin(rz ?? 0), k = shape === 'ico' ? ICO : 1;
    for (const a of [-0.5, 0.5]) for (const b of [-0.5, 0.5]) for (const c of [-0.5, 0.5]) {
      const X = a * sx * k, Y = b * sh * k, Z = c * sz * k, u = X * cz - Y * sn + px, v = X * sn + Y * cz + py, w = Z + pz;
      out.push([x + u * cy + w * sy, y + v, z - u * sy + w * cy]);
    }
  }
  return out;
}
