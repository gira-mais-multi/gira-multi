<script lang="ts">
	// Gira+ Multi: the end of Gira+'s About easter egg ($lib/rulote has the timeline and the physics). Just as Gira+'s
	// developers ride off as a bike, a scruffy van, the Tasca do Tozé, screeches in and stops in its way. The bike
	// slams into it, tips up and drops back; the van shoves the wreck aside and parks; you duck out of the cab and sell
	// from the hatch. Everything on the counter is a real link, and the taped-on advert orders the Bolacha Maria.
	// Laid over the spot of Gira+'s "Made by" block, in the same coordinates: the zero-height box and its negative margin
	// leave Gira+'s layout as it was. From the moment of the hit the fork moves Gira+'s block itself (the next element).
	import '$lib/anton.css';
	import { BOLACHA_URL, tasca } from '$lib/bolacha';
	import { CASTANHAS, MINIS, ROLLS, SARDINHAS, TREMOCOS } from '$lib/rulote-art';
	import {
		CHANT_EVERY, easeOut, GROUND, lerp, pace, road, ROAD_END, type Scene, SHOVE, shout, simulate, smooth, T_DUCK, T_END, T_IN, T_LOCK, T_POP,
		T_SHOUT, T_STOP, VAN_SCALE, clamp,
	} from '$lib/rulote';
	import { onDestroy } from 'svelte';

	let { turned, spinning, started }: { turned: boolean, spinning: boolean, started: boolean } = $props();

	const AVATAR = '/assets/tasca-avatar.jpg';
	/** How long the parked van keeps pacing and chanting before the page stops animating. */
	const RUN_MS = 60000;

	let root: HTMLDivElement;
	// the scene's elements (inside the {#if}, so they're reactive), styled directly every frame
	let van = $state<HTMLDivElement>()!, rwF = $state<SVGGElement>()!, rwR = $state<SVGGElement>()!;
	let driver = $state<HTMLDivElement>()!, vendor = $state<HTMLDivElement>()!, head = $state<HTMLDivElement>()!;
	let skids = $state<SVGSVGElement>()!, skidF = $state<SVGPathElement>()!, skidR = $state<SVGPathElement>()!, skidB = $state<SVGPathElement>()!;
	let bubble = $state<HTMLDivElement>()!, bubbleText = $state<HTMLSpanElement>()!;
	const hops: HTMLAnchorElement[] = [], bitEls: HTMLElement[] = [], puffEls: HTMLElement[] = [];

	let scene = $state.raw<Scene | null>(null);
	let width = 310;
	let t0 = 0;
	let frame = 0;
	let wheelsStopped = false;
	let running = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	// the scene is worked out once Gira+'s block has started turning, 4.5 s before its take-off (its turn is a CSS
	// transition, which the sum doesn't hold up)
	$effect(() => {
		if (!turned || timer) return;
		timer = setTimeout(() => {
			width = root.offsetWidth || width;
			scene = simulate(width - 20);
		}, 100);
	});
	// Gira+ sets its wheels spinning 500 ms before the take-off: the van has to be on its way before the bike moves
	$effect(() => {
		if (!spinning || !scene || running) return;
		running = true;
		t0 = performance.now() + 500;
		frame = requestAnimationFrame(loop);
	});
	// the take-off itself sets the clock exactly
	$effect(() => {
		if (started && running) t0 = performance.now();
	});
	onDestroy(() => {
		clearTimeout(timer);
		cancelAnimationFrame(frame);
	});

	function loop(now: number) {
		const t = now - t0;
		if (t >= RUN_MS) {
			render(t, true); // the last frame: standing still, nothing said
			return;
		}
		if (t >= T_IN) render(t);
		frame = requestAnimationFrame(loop);
	}

	function render(t: number, quiet = false) {
		const s = scene!, i = Math.round(clamp(t, T_IN, T_END) - T_IN), n = s.nose(t);
		van.style.display = 'block';
		skids.style.display = t >= T_LOCK ? 'block' : 'none';

		// the developers' bike: Gira+'s own take-off until it hits; then it stops dead, tips onto its front wheel, falls back
		const block = root.nextElementSibling as HTMLElement | null;
		if (block && t >= s.hit) {
			if (!wheelsStopped) {
				wheelsStopped = true;
				block.style.transition = 'none';
				for (const wheel of block.querySelectorAll<HTMLElement>(':scope > a')) wheel.style.animation = 'none';
			}
			const tx = s.tx[i], th = s.tip[i] * 57.3, rot = 90 - (90 - s.hitWheelie) * Math.exp(-(t - s.hit) / 50);
			block.style.transform = `translate(${72 + tx}px,28px) rotate(${th}deg) translate(${-72 - tx}px,-28px) translateX(${tx}px) rotate(${rot}deg)`;
		}

		// the van on its springs, its wheels rolling until they lock
		van.style.transform = `translateX(${n - 26.3}px) rotate(${s.pitch[i] * 57.3}deg) scale(${VAN_SCALE})`;
		const lockAt = s.nose(T_LOCK), rolled = t < T_LOCK ? n - 430 : t < T_STOP ? lockAt - 430 : lockAt - 430 + (n - s.nose(T_STOP));
		rwF.setAttribute('transform', `rotate(${rolled / 15 * 57.3} 34 262)`);
		rwR.setAttribute('transform', `rotate(${rolled / 16 * 57.3} 206 262)`);

		// skid marks: the van's locked wheels, then the wreck being shoved
		const fade = 1 - lerp(t, 5500, 7500), nl = s.nose(T_LOCK), ne = s.nose(Math.min(t, T_STOP));
		skidF.setAttribute('d', `M${nl + 22} ${GROUND + 1}L${ne + 22} ${GROUND + 1}`);
		skidR.setAttribute('d', `M${nl + 168} ${GROUND + 1}L${ne + 168} ${GROUND + 1}`);
		skidB.setAttribute('d', t > SHOVE.from ? `M${28 + s.tx[SHOVE.from - T_IN]} ${GROUND + 1}L${28 + s.tx[i]} ${GROUND + 1}` : '');
		for (const skid of [skidF, skidR, skidB]) skid.style.opacity = String(.8 * fade);

		// the hit shakes the page, briefly
		const since = t - s.hit, shake = since > 0 && since < 140 ? 3 * Math.sin(since / 16) * (1 - since / 140) : 0;
		const page = root.parentElement;
		if (page) page.style.transform = shake ? `translate(${shake}px,${shake * .5}px)` : '';

		s.bits.forEach((b, k) => {
			const el = bitEls[k], j = Math.round(t - s.hit);
			if (j < 0) {
				el.style.display = 'none';
				return;
			}
			const q = Math.min(j, T_END - s.hit) * 3;
			el.style.display = 'block';
			el.style.transform = `translate(${b.path[q] - b.size / 2}px,${b.path[q + 1] - b.size / 2}px) rotate(${b.path[q + 2]}deg)`;
		});
		s.puffs.forEach((p, k) => {
			const el = puffEls[k], age = t - p.at;
			if (age < 0 || age > p.life) {
				el.style.display = 'none';
				return;
			}
			const a = p.ang * Math.PI / 180, d = p.v * age * (1 - age / (2.2 * p.life)), r = p.r0 + (p.r1 - p.r0) * Math.sqrt(age / p.life);
			el.style.display = 'block';
			el.style.width = el.style.height = `${2 * r}px`;
			el.style.transform = `translate(${p.x + d * Math.cos(a) - r}px,${p.y - 2 - d * Math.sin(a) - r}px)`;
			el.style.opacity = String(p.op * (1 - age / p.life));
		});
		hops.forEach((h, k) => h.style.transform = `translateY(${s.hops[k][i]}px)`);

		// you drive; once parked you duck out of the cab, pop up at the back and pace up and down behind the counter
		driver.style.transform = `translateY(${easeOut(lerp(t, T_DUCK, T_DUCK + 300)) * 40}px) rotate(${s.head[i] * 57.3}deg)`;
		const selling = t >= T_SHOUT;
		const rise = (1 - smooth(lerp(t, T_POP, T_POP + 280))) * 95;
		const pc = selling ? { ...pace(t), ...quiet ? { walking: false } : {} } : { x: 6, walking: false, dir: -1, w: 0 };
		const step = pc.walking ? Math.abs(Math.sin(pc.w / 190 * Math.PI)) : 0;
		const bobY = -6 * step, tilt = pc.walking ? 8 * Math.sin(pc.w / 190 * Math.PI) : selling && !quiet ? 5 * Math.sin((t - T_SHOUT) / 140) : 0;
		const land = t >= T_POP + 280 && t < T_POP + 520 ? 3 * Math.sin((t - T_POP - 280) / 240 * Math.PI) : 0; // a little squash as it lands
		vendor.style.transform = `translate(${pc.x}px,${rise + bobY + land}px)`;
		head.style.transform = `rotate(${tilt}deg) scaleX(${pc.dir > 0 ? -1 : 1})`;

		// the bubble always comes from you: the driver's seat while barging in, the hatch once selling
		const driving = t >= s.hit + 250 && t < ROAD_END;
		const said = quiet ? '' : driving ? road(t, s.hit) : selling ? shout((t - T_SHOUT) % CHANT_EVERY) : '';
		bubble.style.display = said ? 'block' : 'none';
		if (said) {
			bubbleText.textContent = said;
			const hx = driving ? n + 35.7 : n + (82 + 10 + pc.x + 25 - 8) * VAN_SCALE, wide = bubble.offsetWidth, left = clamp(hx - 30, -30, width + 30 - wide);
			bubble.style.top = `${driving ? 18 : -74 + 2 * bobY / 6}px`;
			bubble.style.left = `${left}px`;
			bubble.style.setProperty('--tail', `${clamp(hx - left - 6, 12, wide - 24)}px`);
		}
	}
</script>

<div class="root relative w-full h-0 -mb-8" bind:this={root}>
	{#if scene}
		<svg bind:this={skids} class="skids" width="1" height="1"><path bind:this={skidF} stroke="#333" stroke-width="3" stroke-linecap="round" fill="none" /><path bind:this={skidR} stroke="#333" stroke-width="3" stroke-linecap="round" fill="none" /><path bind:this={skidB} stroke="#333" stroke-width="2.5" stroke-linecap="round" fill="none" /></svg>
		<div class="debris">
			{#each scene.bits as bit, k (k)}<i bind:this={bitEls[k]} style:width="{bit.size}px" style:height="{bit.size * .7}px" style:background={bit.colour}></i>{/each}
		</div>
		<div class="van" bind:this={van}>
			<svg class="vansvg" width="260" height="280" viewBox="0 0 260 280" overflow="visible">
				<!-- the cab: white, a primer-grey door, rust, a taped headlight, a cracked windscreen -->
				<path d="M74 250 L74 140 Q40 134 22 160 L8 212 L8 250 Z" fill="#e4e1da" />
				<path d="M72 198 L72 244 L30 244 L35 198 Z" fill="#8e978a" /><path d="M35 198 L72 198" stroke="#7b8478" stroke-width="1" /><rect x="60" y="214" width="8" height="2.5" rx="1" fill="#5c625a" />
				<path d="M68 148 Q44 145 31 166 L23 196 L68 196 Z" fill="#262b30" />
				<path d="M62 155 L54 166 L57 171 L49 183" stroke="#e8e8e8" stroke-opacity=".55" stroke-width=".8" fill="none" />
				<path d="M52 150 L52 160" stroke="#151515" stroke-width="1" /><path d="M52 160 L47 172 L57 172 Z M48 168 L56 168" fill="#5f8a32" />
				<circle cx="15" cy="222" r="5" fill="#d8d2bf" /><path d="M9 217 L21 227 M9 227 L21 217" stroke="#a9a9a9" stroke-width="3" stroke-opacity=".9" />
				<rect x="3" y="234" width="18" height="10" rx="2" fill="#3a3a3a" />
				<path d="M20 240 q3 -3 6 0 q-2 3 -6 0" fill="#8a5a32" opacity=".75" /><path d="M56 241 q4 -4 9 -1 q-3 4 -9 1" fill="#8a5a32" opacity=".7" />
				<!-- the box: off-white, a dent, rust round the wheel arch -->
				<rect x="70" y="70" width="184" height="180" rx="6" fill="#e9e6df" />
				<path d="M160 72 L160 102" stroke="#cfcbc2" stroke-width="1" />
				<path d="M214 214 q8 6 18 1" stroke="#c4c0b6" stroke-width="1.5" fill="none" />
				<path d="M188 246 q18 -18 36 0" stroke="#8a5a32" stroke-width="3" stroke-opacity=".55" fill="none" />
				<!-- the hand-painted board -->
				<g transform="rotate(-2.5 162 54)">
					<path d="M112 66 L112 74 M212 66 L212 74" stroke="#6b6b6b" stroke-width="3" />
					<rect x="90" y="38" width="144" height="30" rx="2" fill="#7a5a38" /><path d="M90 48 L234 48 M90 58 L234 58" stroke="#68492c" stroke-width="1" />
					<!-- the main account's tasca; a long name is squeezed to fit the board -->
					<text x="162" y="61" text-anchor="middle" class="an" font-size="19" fill="#efe6cf" letter-spacing="1" textLength={$tasca.length > 14 ? 134 : undefined} lengthAdjust="spacingAndGlyphs"
						rotate="-4 3 -2 5 -3 0 4 -2 0 -5 3 -1 4 2 -3 1 -2 4 -1 3" dy="0 1 -1 1 0 0 -1 1 0 1 -1 0 1 0 -1 1 0 -1 1 0">{$tasca.toUpperCase()}</text>
				</g>
				<!-- the hatch, a crooked awning propped on a broom, the counter -->
				<rect x="82" y="104" width="162" height="92" rx="3" fill="#2b2b2b" />
				<path d="M78 104 L248 104 L260 88 L66 82 Z" fill="#d9d5cc" /><path d="M66 82 L260 88" stroke="#bdb8ad" stroke-width="2" />
				<path d="M256 90 L247 194" stroke="#8a6a44" stroke-width="3" stroke-linecap="round" />
				<path d="M68 84 L76 104" stroke="#a89a7a" stroke-width="1.2" />
				<rect x="76" y="194" width="176" height="8" rx="2" fill="#b9b4a8" />
				<!-- the side exhaust, then the bumper and the wheels -->
				<path d="M50 250 L60 254" stroke="#4a4a4a" stroke-width="4" stroke-linecap="round" /><rect x="6" y="244" width="248" height="8" rx="3" fill="#3a3a3a" />
				<g bind:this={rwF}><circle cx="34" cy="262" r="15" fill="#1b1b1b" /><circle cx="34" cy="262" r="7" fill="#444" /><circle cx="34" cy="257" r="1.3" fill="#777" /><circle cx="39" cy="262" r="1.3" fill="#777" /><circle cx="34" cy="267" r="1.3" fill="#777" /><circle cx="29" cy="262" r="1.3" fill="#777" /></g>
				<g bind:this={rwR}><circle cx="206" cy="262" r="16" fill="#1b1b1b" /><circle cx="206" cy="262" r="10" fill="#c9cdd3" /><circle cx="206" cy="262" r="3" fill="#9aa1ab" /><path d="M206 253 L206 271 M197 262 L215 262" stroke="#9aa1ab" stroke-width="1.5" /></g>
			</svg>
			<!-- the advert, taped on crooked: order your Bolacha Maria -->
			<a class="ad" href={BOLACHA_URL} aria-label="Encomende já a sua Bolacha Maria">
				<svg width="160" height="31" viewBox="0 0 168 33"><rect x="0" y="0" width="168" height="33" rx="2" fill="#b8352b" />
					<g transform="translate(7 4) scale(.43)">{@html ROLLS}</g>
					<text x="40" y="17" class="an" font-size="15" fill="#f4ecd8" letter-spacing=".4">ENCOMENDE JÁ!</text>
					<text x="40" y="28" class="an" font-size="8.5" fill="#e8d27a" letter-spacing=".5">A SUA BOLACHA MARIA ➜</text>
					<rect x="-4" y="-2" width="14" height="6" fill="#cfcfcf" opacity=".8" transform="rotate(-30 3 1)" /><rect x="156" y="27" width="14" height="6" fill="#cfcfcf" opacity=".8" transform="rotate(-25 163 30)" /></svg></a>
			<!-- you, at the wheel: flat cap, moustache, toothpick -->
			<div class="cabclip"><div class="driver" bind:this={driver}><img src={AVATAR} alt="" /><svg class="cap" width="34" height="13" viewBox="0 0 46 18" overflow="visible"><path d="M7 16 Q9 7 26 6 Q41 7 44 14 L44 16 Z" fill="#6e6c64" /><path d="M12 10 Q26 7 40 11 M10 13 Q26 10 43 14" stroke="#5a5852" stroke-width="1" fill="none" /><path d="M9 15 L0 17.5 Q3 13.5 10 13 Z" fill="#5a5852" /><path d="M7 16 L44 16" stroke="#4c4a45" stroke-width="1.4" /></svg><svg class="tash" width="35" height="28" viewBox="0 0 50 40"><path d="M14.6 28.3 Q17.4 27 20.6 27.8 Q21.2 29.3 19.3 29.8 Q16.8 30.1 15.4 29.7 Q14 29.4 14.6 28.3 Z" fill="#1d1d1d" /><path d="M18 31.6 L11.5 33.2" stroke="#b89a64" stroke-width=".8" stroke-linecap="round" /></svg></div></div>
			<!-- ...and at the hatch: a white vest, chest hair, a gold chain, a dish towel on the shoulder -->
			<div class="hatchclip"><div class="vendor" bind:this={vendor}><div class="head" bind:this={head}><img src={AVATAR} alt="" /><svg class="cap" width="46" height="18" viewBox="0 0 46 18" overflow="visible"><path d="M7 16 Q9 7 26 6 Q41 7 44 14 L44 16 Z" fill="#6e6c64" /><path d="M12 10 Q26 7 40 11 M10 13 Q26 10 43 14" stroke="#5a5852" stroke-width="1" fill="none" /><path d="M9 15 L0 17.5 Q3 13.5 10 13 Z" fill="#5a5852" /><path d="M7 16 L44 16" stroke="#4c4a45" stroke-width="1.4" /></svg><svg class="tash" width="50" height="40" viewBox="0 0 50 40"><path d="M14.6 28.3 Q17.4 27 20.6 27.8 Q21.2 29.3 19.3 29.8 Q16.8 30.1 15.4 29.7 Q14 29.4 14.6 28.3 Z" fill="#1d1d1d" /><path d="M18 31.6 L11.5 33.2" stroke="#b89a64" stroke-width=".8" stroke-linecap="round" /></svg></div>
				<svg class="torso" width="50" height="40" viewBox="0 0 50 40"><path d="M1 40 L1 15 Q3 5 15 3 L35 3 Q47 5 49 15 L49 40 Z" fill="#ece4d8" stroke="#2a2a2a" stroke-width=".8" /><path d="M10 40 L10 12 Q11 6 14 5 L17 5 Q19 15 25 16 Q31 15 33 5 L36 5 Q39 6 40 12 L40 40 Z" fill="#f7f7f3" /><path d="M20 9 q1 -2 2 0 q1 -2 2 0 q1 -2 2 0 q1 -2 2 0 M21 12 q1 -2 2 0 q1 -2 2 0 q1 -2 2 0" stroke="#2a2a2a" stroke-width=".8" fill="none" /><path d="M14 5 Q25 24 36 5" stroke="#d4af37" stroke-width="2" fill="none" /><circle cx="25" cy="15.5" r="3.2" fill="#d4af37" stroke="#a8862a" stroke-width=".6" /><g transform="rotate(8 41 14)"><rect x="37" y="2" width="9" height="22" fill="#f4f1ea" /><path d="M37 6 L46 6 M37 11 L46 11 M37 16 L46 16 M37 21 L46 21 M40 2 L40 24 M43 2 L43 24" stroke="#b8352b" stroke-width="1.4" /></g></svg></div></div>
			<!-- the scarf is thin: its link is wider than it, the scarf centred in it -->
			<a class="item" style="left:64px;top:104px;width:32px" href="https://portugalstore.fpf.pt/en/puma-portugal-home-jersey-2026-4069162759764" aria-label="Portugal">
				<svg width="16" height="78" viewBox="0 0 16 78"><rect x="1" y="0" width="14" height="36" fill="#3f6b2a" /><rect x="1" y="36" width="14" height="34" fill="#a0322a" /><text transform="translate(11 6) rotate(90)" class="an" font-size="9.5" fill="#e8d27a" letter-spacing=".8">PORTUGAL</text><path d="M2 70 L2 77 M5 70 L5 77 M8 70 L8 77 M11 70 L11 77 M14 70 L14 77" stroke="#a0322a" stroke-width="1.5" /></svg></a>
			<!-- the goods, a bit of a mess -->
			<a class="item" bind:this={hops[0]} style="left:88px;top:170px;width:36px" href="https://www.continente.pt/pesquisa/?q=tremo%C3%A7os" aria-label="Tremoços">
				<svg width="36" height="24" viewBox="0 0 36 24">{@html TREMOCOS}</svg></a>
			<a class="item" bind:this={hops[1]} style="left:124px;top:150px;width:44px" href="https://www.continente.pt/pesquisa/?q=castanhas" aria-label="Castanhas">
				<svg width="44" height="44" viewBox="0 0 44 44">{@html CASTANHAS}</svg></a>
			<a class="item" bind:this={hops[2]} style="left:166px;top:164px;width:46px" href="https://www.continente.pt/pesquisa/?q=sardinhas%20em%20conserva" aria-label="Sardinhas">
				<svg width="46" height="30" viewBox="0 0 46 30">{@html SARDINHAS}</svg></a>
			<a class="item" bind:this={hops[3]} style="left:208px;top:158px;width:44px" href="https://www.continente.pt/pesquisa/?q=cerveja%20mini" aria-label="Minis">
				<svg width="44" height="36" viewBox="0 0 44 36">{@html MINIS}</svg></a>
			<!-- scrawled cardboard labels taped to the counter -->
			<div class="tags"><span style="left:86px;transform:rotate(-4deg)">TREMOÇOS</span><span style="left:126px;transform:rotate(3deg)">CASTANHAS</span><span style="left:170px;transform:rotate(-2deg)">SARDINHAS</span><span style="left:214px;transform:rotate(5deg)">MINIS 1€</span></div>
		</div>
		<div class="dust">
			{#each scene.puffs as puff, k (k)}<div class="puff" bind:this={puffEls[k]} style:background={puff.colour}></div>{/each}
		</div>
		<div class="bubble" bind:this={bubble}><span bind:this={bubbleText}></span></div>
	{/if}
</div>

<style>
	.root :global(.an) { font-family: Anton, Impact, 'Arial Narrow', sans-serif; }
	.skids { position: absolute; left: 0; top: 0; overflow: visible; z-index: 0; display: none; }
	.debris { position: absolute; left: 0; top: 0; z-index: 11; }
	.debris i { position: absolute; left: 0; top: 0; display: none; border-radius: 1px; }
	.dust { position: absolute; left: 0; top: 0; z-index: 13; pointer-events: none; }
	.puff { position: absolute; left: 0; top: 0; border-radius: 50%; filter: blur(2.5px); display: none; }
	.van { position: absolute; left: 0; top: -106px; width: 260px; height: 280px; transform-origin: 130px 278px; display: none; z-index: 12; }
	.vansvg { position: absolute; left: 0; top: 0; overflow: visible; }
	.ad { position: absolute; left: 86px; top: 211px; transform: rotate(-1.5deg); display: block; -webkit-tap-highlight-color: transparent; }
	.ad svg { display: block; }
	.ad:active { filter: brightness(1.2); }
	.hatchclip { position: absolute; left: 82px; top: 96px; width: 162px; height: 100px; overflow: hidden; }
	.vendor { position: absolute; left: 10px; top: 18px; width: 50px; }
	.vendor .head { position: relative; width: 50px; height: 40px; transform-origin: 25px 40px; z-index: 1; }
	.vendor img { width: 40px; height: 40px; border-radius: 50%; display: block; margin-left: 5px; }
	.vendor .cap { position: absolute; left: 3px; top: -3px; }
	.vendor .torso { display: block; margin-top: -4px; }
	.cabclip { position: absolute; left: 20px; top: 140px; width: 50px; height: 58px; clip-path: polygon(48px 8px, 32px 5.5px, 20px 12px, 11px 26px, 3px 56px, 48px 56px); }
	.driver { position: absolute; left: 16px; top: 12px; width: 30px; height: 30px; transform-origin: 15px 30px; }
	.driver img { width: 28px; height: 28px; border-radius: 50%; display: block; }
	.driver .cap { position: absolute; left: -3px; top: -6px; }
	.tash { position: absolute; left: 0; top: 0; pointer-events: none; }
	.driver .tash { left: -3px; top: -1px; }
	.item { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; -webkit-tap-highlight-color: transparent; transform-origin: 50% 100%; }
	.item:active { filter: brightness(1.3); }
	.tags span { position: absolute; top: 195px; font: 9px/1 Anton, Impact, sans-serif; letter-spacing: .3px; color: #1b1b1b; background: #b49a6e; padding: 2px 3px 1px; border-radius: 1px; box-shadow: 0 1px 0 rgba(0, 0, 0, .25); white-space: nowrap; pointer-events: none; }
	.bubble { --tail: 30px; position: absolute; left: 0; top: -74px; background: #e8e2d2; color: #151515; font: 17px/1.15 Anton, Impact, sans-serif; letter-spacing: .3px; padding: 5px 10px 4px; border-radius: 12px; display: none; z-index: 14; white-space: nowrap; pointer-events: none; }
	.bubble::after { content: ""; position: absolute; left: var(--tail); bottom: -8px; border: 5px solid transparent; border-top: 7px solid #e8e2d2; border-right: 2px solid transparent; }
</style>