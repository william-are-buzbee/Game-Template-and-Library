// types/globals.d.ts — what the browser gives Tethys that the type checker does not know (v11.193, analysis_project.md §3; test/types.js).
// The game is scripts in one shared scope (src/order.txt), so every top-level name of every file is global to the checker too.
declare const THREE: typeof import('three'); // three.js r128 from cdnjs, as the global the page loads; @types/three@0.128.0's own index exports it as a module
declare const WB: typeof import('../../../packages/core/src/index.ts'); // @wb/core, vendored as vendor/wb-core.global.js (one global); typed from its own source, not the generated file
interface Window { [key: string]: any } // the console's helpers (tp, skip, report, machine…) and the tests' hooks are put on window by name
interface Performance { memory?: { usedJSHeapSize: number, totalJSHeapSize: number, jsHeapSizeLimit: number } } // Chrome's heap, read by the readout and the recorder
interface Navigator { deviceMemory?: number, userAgentData?: { platform: string, getHighEntropyValues(hints: string[]): Promise<any> } } // Chrome's, read by the recorder (src/rec.js)
