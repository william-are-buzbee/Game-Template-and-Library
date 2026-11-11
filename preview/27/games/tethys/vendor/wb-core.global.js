var WB = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// src/rng.ts
	/** A seeded random generator (mulberry32). From Rootshock (src/core/rng.ts, Oct 2026); Tethys, Overworld and Planet-Viewer
	*  each had the same algorithm, giving the same numbers (packages/core/test/golden.test.ts pins them).
	*  Content, world and sim draw from these, never from Math.random,
	*  so a level is dressed the same on every load and a run can be replayed. */
	var Rng = class {
		s;
		constructor(seed) {
			this.s = typeof seed === "number" ? seed >>> 0 : hashString(seed);
		}
		/** 0 <= x < 1 */
		next() {
			let t = this.s = this.s + 1831565813 >>> 0;
			t = Math.imul(t ^ t >>> 15, t | 1);
			t ^= t + Math.imul(t ^ t >>> 7, t | 61);
			return ((t ^ t >>> 14) >>> 0) / 4294967296;
		}
		/** range(b): 0..b; range(a, b): a..b */
		range(a, b) {
			return b === void 0 ? this.next() * a : a + this.next() * (b - a);
		}
		int(n) {
			return Math.floor(this.next() * n);
		}
		pick(a) {
			return a[this.int(a.length)];
		}
		chance(p) {
			return this.next() < p;
		}
		state() {
			return this.s;
		}
		/** go back to a state (a save's) */
		restore(s) {
			this.s = s >>> 0;
		}
	};
	function hashString(s) {
		let h = 2166136261;
		for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
		return h >>> 0;
	}
	// src/loop.ts
	/** The fixed step. From Rootshock (src/core/loop.ts, Oct 2026). The sim always advances by STEP seconds; the renderer draws between the last two steps.
	*  Real time is fed in, whole steps come out, and the remainder carries to the next frame. */
	var HZ = 60;
	var STEP = 1 / 60;
	/** never try to catch up more than this many steps in one frame (a stalled tab, a debugger pause) */
	var MAX_STEPS = 8;
	var FixedLoop = class {
		acc = 0;
		/** how far the renderer is between the previous step and the latest one, 0..1 */
		alpha = 0;
		/** add real elapsed seconds; returns how many sim steps to run now */
		advance(dt) {
			this.acc += Math.max(0, dt);
			let n = Math.floor(this.acc / STEP + 1e-9);
			if (n > MAX_STEPS) {
				n = MAX_STEPS;
				this.acc = 0;
			} else this.acc = Math.max(0, this.acc - n * STEP);
			this.alpha = this.acc / STEP;
			return n;
		}
	};
	// src/math.ts
	var PI = Math.PI;
	var TAU = PI * 2;
	var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
	var lerp = (a, b, t) => a + (b - a) * t;
	/** the shortest signed turn from angle a to angle b */
	function angDiff(a, b) {
		return ((b - a + PI) % TAU + TAU) % TAU - PI;
	}
	var angLerp = (a, b, t) => a + angDiff(a, b) * t;
	// src/meter.ts
	/** how often the numbers shown change (s) */
	var EVERY = .5;
	var Meter = class {
		/** this frame's, and the half second's: summed, and the worst frame */
		now = /* @__PURE__ */ new Map();
		sum = /* @__PURE__ */ new Map();
		most = /* @__PURE__ */ new Map();
		frames = 0;
		t = 0;
		/** what was measured over the last half second: each part's mean and worst a frame */
		shown = /* @__PURE__ */ new Map();
		/** `v` more of `part` this frame (ms, or a count) */
		add(part, v) {
			this.now.set(part, (this.now.get(part) ?? 0) + v);
		}
		/** the frame is over, `dt` seconds after the last */
		end(dt) {
			for (const [k, v] of this.now) {
				this.sum.set(k, (this.sum.get(k) ?? 0) + v);
				this.most.set(k, Math.max(this.most.get(k) ?? 0, v));
			}
			this.now.clear();
			this.frames++;
			this.t += dt;
			if (this.t < EVERY) return;
			this.shown = new Map([...this.sum].map(([k, v]) => [k, {
				mean: v / this.frames,
				max: this.most.get(k)
			}]));
			this.sum.clear();
			this.most.clear();
			this.frames = 0;
			this.t = 0;
		}
		/** each part as its mean/worst, `dp` places after the point */
		line(parts, dp = 2) {
			return parts.map((k) => {
				const s = this.shown.get(k);
				return `${k} ${s ? `${s.mean.toFixed(dp)}/${s.max.toFixed(dp)}` : "-"}`;
			}).join("  ");
		}
	};
	exports.FixedLoop = FixedLoop;
	exports.HZ = HZ;
	exports.Meter = Meter;
	exports.PI = PI;
	exports.Rng = Rng;
	exports.STEP = STEP;
	exports.TAU = TAU;
	exports.angDiff = angDiff;
	exports.angLerp = angLerp;
	exports.clamp = clamp;
	exports.hashString = hashString;
	exports.lerp = lerp;
	return exports;
})({});
