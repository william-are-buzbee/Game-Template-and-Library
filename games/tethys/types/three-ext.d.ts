// types/three-ext.d.ts — the fields the game keeps on three's own objects (v11.194; test/types.js). A module (the `export {}`), so its `declare module`
// adds to three's types rather than replacing them.
export {};
declare module 'three' {
  interface Material {
    cutAt?: number[] | null; // the far cut's [far, fade] (scene.js cutUOf); null FLORA_FAR's
    cutU?: { value: import('three').Vector3 }; // the cut's uniform, the material's own (scene.js farCut: near, far, fade)
    sway?: boolean; // a cell gives its instances aCur (chunks.js makeInstanced)
    land?: boolean; // a land plant: no current
    extensions?: any; // three's, on a ShaderMaterial; the flora's Lambert copies carry it (vpullMat)
  }
}
