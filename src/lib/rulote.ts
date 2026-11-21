// Gira+ Multi: the timeline and physics of the About page's "Tasca do Tozé" joke (drawn by AboutDelivery.svelte).
// Gira+'s own easter egg turns its developers into a bike that rides off; here a scruffy van cuts in at the last
// moment, the bike slams into it, and the van shoves the wreck aside and parks to sell. Everything is simulated
// once, a step per millisecond, so each frame only reads the arrays.
// Times are in ms from Gira+'s take-off (its `move`); places are in px from the developers' block's top-left corner.

export const GROUND = 172; // where the developers' "wheels" touch
export const VAN_SCALE = .85;
const G = 7e-4; // gravity, px/ms²
export const T_IN = -380, T_LOCK = -230, T_STOP = 60, T_DUCK = 3300, T_POP = 3750, T_SHOUT = 4100, T_END = 15000;
/** One long, pushy shove of the wreck: [start, end, nose to]. */
export const SHOVE = { from: 1000, to: 2500, nose: 66 };
const REVS = [760, 870, 960]; // the engine revving before it
const BIKE_FRONT = 128; // the developers' bike's front: the first avatar's leading edge

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (t: number, t0: number, t1: number) => clamp((t - t0) / (t1 - t0), 0, 1);
export const easeOut = (p: number) => 1 - (1 - p) * (1 - p);
export const smooth = (p: number) => p * p * (3 - 2 * p);

/** Tailwind's default transition curve, cubic-bezier(.4, 0, .2, 1): the share done at time share p. */
export function bez(p: number) {
	let lo = 0, hi = 1;
	for (let k = 0; k < 40; k++) {
		const s = (lo + hi) / 2, x = 1.2 * s * (1 - s) ** 2 + .6 * s * s * (1 - s) + s ** 3;
		if (x < p) lo = s;
		else hi = s;
	}
	const s = (lo + hi) / 2;
	return 3 * s * s - 2 * s ** 3;
}
/** Gira+'s take-off: translateX 0 → 1000px over 1 s. */
export const takeoff = (t: number) => 1000 * bez(clamp(t / 1000, 0, 1));

export type Puff = { at: number, x: number, y: number, ang: number, v: number, r0: number, r1: number, life: number, op: number, colour: string };
export type Bit = { colour: string, size: number, path: Float32Array };

export type Scene = ReturnType<typeof simulate>;

/** The whole scene for a van that stops with its nose at `stopNose` (just inside the screen's right edge). */
export function simulate(screenNose: number) {
	// past 1128 px the take-off (1000 px) would never reach the van: on a very wide screen it stops nearer
	const stopNose = Math.min(screenNose, 900);
	let hit = 0;
	while (BIKE_FRONT + takeoff(hit) < stopNose) hit++;
	const hitSpeed = takeoff(hit) - takeoff(hit - 1); // px/ms at the moment of impact
	const hitWheelie = 90 * (1 - bez(hit / 1000)); // how far the block had turned back at impact
	const shoveFrom = stopNose + 3;

	function nose(t: number) {
		if (t < T_STOP) {
			const u = lerp(t, T_IN, T_STOP);
			return stopNose + (Math.max(stopNose, screenNose) + 140 - stopNose) * (1 - u) * (1 - u); // from off the screen's edge
		}
		let n = stopNose;
		if (t >= hit) n += 3 * easeOut(lerp(t, hit, hit + 150));
		if (t >= SHOVE.from) n = shoveFrom + (SHOVE.nose - shoveFrom) * smooth(lerp(t, SHOVE.from, SHOVE.to));
		return n;
	}

	const n = T_END - T_IN + 1;
	const pitch = new Float32Array(n), head = new Float32Array(n), tx = new Float32Array(n), tip = new Float32Array(n);
	const hops = [0, 1, 2, 3].map(() => new Float32Array(n));
	const puffs: Puff[] = [], starts: { colour: string, size: number, x: number, y: number, vx: number, vy: number, vr: number }[] = [];
	let seed = 11;
	const rnd = (a: number, b: number) => {
		seed = (seed * 16807) % 2147483647;
		return a + (seed / 2147483647) * (b - a);
	};
	const DUST = '#6f6a62';

	const W = 2 * Math.PI / 520, Z = .85, KAPPA = .009; // the van's body on its springs: dips and settles, no rocking
	const WH = 2 * Math.PI / 300, ZH = .9, LAMBDA = .012; // the driver's head: leans once and settles, no wobble
	const GTH = 2.4e-5, MU = .9; // the bike tipping about its front wheel; sliding friction
	let phi = 0, dphi = 0, psi = 0, dpsi = 0, x = 0, vx = 0, th = 0, w = 0;
	const hy = [0, 0, 0, 0], hv = [0, 0, 0, 0];
	for (let i = 0; i < n; i++) {
		const t = T_IN + i, acc = nose(t + 1) - 2 * nose(t) + nose(t - 1);
		const ddphi = -W * W * phi - 2 * Z * W * dphi - KAPPA * acc;
		if (t === hit) dphi -= .00025;
		if (REVS.includes(t)) dphi += 3e-5; // each rev squats the back a touch
		dphi += ddphi;
		phi += dphi;
		const ddpsi = -WH * WH * psi - 2 * ZH * WH * dpsi - LAMBDA * acc - .3 * ddphi;
		if (t === hit) dpsi -= .0006;
		dpsi += ddpsi;
		psi += dpsi;
		// the goods on the counter jump a little at the hit
		for (let k = 0; k < 4; k++) {
			if (t === hit) hv[k] = -[.035, .05, .06, .045][k] * hitSpeed;
			if (hy[k] < 0 || hv[k] < 0) {
				hv[k] += G / VAN_SCALE;
				hy[k] += hv[k];
				if (hy[k] >= 0) {
					hy[k] = 0;
					hv[k] = hv[k] > .05 ? -.15 * hv[k] : 0;
				}
			}
			hops[k][i] = hy[k];
		}
		// the developers' bike: Gira+'s take-off until it hits; then it stops dead, tips onto its front wheel, falls back
		if (t >= 0 && t < hit) x = takeoff(t);
		else if (t >= hit) {
			if (t === hit) {
				x = stopNose - BIKE_FRONT;
				vx = -.1 * hitSpeed;
				w = .0021 * hitSpeed;
				for (let k = 0; k < 6; k++) puffs.push({ at: t + k * 12, x: stopNose - 4, y: GROUND - 18 - k * 3, ang: rnd(100, 200), v: rnd(.03, .08), r0: 2, r1: 9, life: 500, op: .35, colour: DUST });
				for (const colour of ['#87B43C', '#87B43C', '#9aa1ab', '#d8d2bf', '#87B43C', '#5a5a5a', '#9aa1ab']) starts.push({ colour, size: rnd(2.5, 5), x: stopNose - rnd(0, 6), y: GROUND - rnd(16, 34), vx: -rnd(.04, .3), vy: -rnd(.1, .34), vr: rnd(-1.2, 1.2) });
			}
			if (th > 0 || w > 0) {
				w -= GTH * Math.cos(th);
				th += w;
				if (th <= 0) {
					th = 0;
					if (w < -1.2e-3) {
						for (let k = 0; k < 4; k++) puffs.push({ at: t + k * 10, x: 28 + x, y: GROUND, ang: rnd(20, 160), v: rnd(.03, .07), r0: 2, r1: 8, life: 450, op: .3, colour: DUST });
						w = -.12 * w;
					} else w = 0;
				}
			}
			if (vx < 0) vx = Math.min(0, vx + MU * G);
			else if (vx > 0) vx = Math.max(0, vx - MU * G);
			x += vx;
			// tipping about its contact, the wheel's front would swing into the van: it rolls back instead
			const front = nose(t), lean = 28 * Math.sin(th);
			if (BIKE_FRONT + x + lean > front) {
				x = front - BIKE_FRONT - lean;
				vx = Math.min(vx, front - nose(t - 1));
			}
			if (t >= SHOVE.from && vx < -.02 && t % 50 === 0) puffs.push({ at: t, x: 28 + x, y: GROUND, ang: rnd(10, 60), v: rnd(.02, .05), r0: 2, r1: 7, life: 500, op: .25, colour: DUST });
		}
		pitch[i] = phi;
		head[i] = psi;
		tx[i] = x;
		tip[i] = th;
		// the van's locked wheels smoke while it brakes
		if (t >= T_LOCK && t < T_STOP && t % 40 === 0) for (const wx of [22, 168]) puffs.push({ at: t, x: nose(t) + wx, y: GROUND, ang: rnd(10, 50), v: rnd(.04, .08), r0: 2, r1: 9, life: 600, op: .22, colour: DUST });
	}

	// the exhaust, an old diesel, out of the side behind the front wheel (the only part on screen when it stops): a cough
	// as it stops, three revs that roll smoke up over the cab, a cloud as it pulls, sputtering while it pushes, a backfire
	// when it lets go, then a puff now and then. On the dark page thick smoke reads as a brighter grey.
	let seed2 = 7;
	const r2 = (a: number, b: number) => {
		seed2 = (seed2 * 16807) % 2147483647;
		return a + (seed2 / 2147483647) * (b - a);
	};
	const exhaust = (at: number, dark: boolean, r1: number, op: number, life = 800) => puffs.push({
		at,
		x: nose(at) + 42 + r2(-1, 1),
		y: GROUND - 20 + r2(-1, 1),
		ang: at < SHOVE.from ? r2(95, 135) : r2(55, 95),
		v: dark ? r2(.07, .11) : r2(.03, .06),
		r0: 3,
		r1,
		life,
		op,
		colour: dark ? '#8f897f' : '#a8a39a',
	});
	exhaust(T_STOP + 30, true, 16, .6);
	exhaust(T_STOP + 70, true, 12, .5);
	REVS.forEach((t, k) => { for (let j = 0; j < 3; j++) exhaust(t + j * 18, true, 18 + 6 * k, .7, 1100); });
	for (let t = SHOVE.from; t < SHOVE.from + 260; t += 22) exhaust(t, true, 28, .7, 1100);
	for (let t = SHOVE.from + 260; t < SHOVE.to; t += 90) if (r2(0, 1) > .3) exhaust(t, r2(0, 1) > .5, 12, .5);
	exhaust(SHOVE.to + 20, true, 32, .8, 1200);
	exhaust(SHOVE.to + 60, true, 24, .7, 1200);
	for (let t = SHOVE.to + 700; t < T_END; t += 1100) {
		exhaust(t, false, 9, .35, 900);
		if (r2(0, 1) > .6) exhaust(t + 140, false, 7, .3, 800);
	}

	// bits of bike and headlight: thrown back, they fall, bounce once and slide to a stop
	const bits: Bit[] = starts.map(b => {
		const path = new Float32Array((T_END - hit + 1) * 3);
		let { x, y, vx, vy, vr } = b, r = 0;
		for (let k = 0; k <= T_END - hit; k++) {
			vy += G;
			x += vx;
			y += vy;
			r += vr;
			if (y > GROUND - b.size / 2) {
				y = GROUND - b.size / 2;
				vy = vy > .08 ? -.2 * vy : 0;
				vx *= .6;
				vr *= .5;
			}
			if (vy === 0) {
				vx *= .96;
				vr *= .9;
			}
			path[k * 3] = x;
			path[k * 3 + 1] = y;
			path[k * 3 + 2] = r;
			// at rest: it stays put (and its ever smaller speeds would only slow the sum down)
			if (vy === 0 && Math.abs(vx) < 1e-3) {
				for (let j = k + 1; j <= T_END - hit; j++) path.set([x, y, r], j * 3);
				break;
			}
		}
		return { colour: b.colour, size: b.size, path };
	});

	return { hit, hitWheelie, nose, pitch, head, tx, tip, hops, puffs, bits };
}

/** A line typed letter by letter, one every `ms`. */
export const typed = (s: string, u: number, ms = 32) => s.slice(0, clamp(Math.floor(u / ms) + 1, 0, s.length));

/** What you shout from the driver's seat while barging in. */
export function road(t: number, hit: number) {
	let said = '';
	for (const [at, line] of [[hit + 250, 'SAI DA ESTRADA Ó CAMELO!'], [1750, 'VAIS A PÉ QUE TE FODES!']] as const) if (t >= at) said = typed(line, t - at, 34);
	return said;
}
export const ROAD_END = 3150;

const CHANT = 'CERVEJA! TREMOÇOS! PORTUGA';
export const CHANT_EVERY = 3800;
/** The vendor's chant, `u` ms into one of its rounds. */
export function shout(u: number) {
	if (u >= 3000) return '';
	if (u < CHANT.length * 28) return typed(CHANT, u, 28);
	const as = Math.min(5, 1 + Math.floor((u - CHANT.length * 28) / 130));
	return CHANT + 'A'.repeat(as) + (as >= 5 ? 'L!' : '');
}

/** The vendor paces up and down behind the counter: walk, stop to shout, turn, walk back. */
export function pace(t: number) {
	const left = 6, right = 100, speed = .055, stop = 700;
	const leg = (right - left) / speed, round = 2 * (leg + stop), u = ((t - T_SHOUT) % round + round) % round;
	if (u < leg) return { x: left + speed * u, walking: true, dir: 1, w: u };
	if (u < leg + stop) return { x: right, walking: false, dir: 1, w: 0 };
	if (u < 2 * leg + stop) return { x: right - speed * (u - leg - stop), walking: true, dir: -1, w: u - leg - stop };
	return { x: left, walking: false, dir: -1, w: 0 };
}