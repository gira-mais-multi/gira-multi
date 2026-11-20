<script lang="ts">
	// Gira+ Multi: the end of Gira+'s About easter egg. Once its bike has ridden off with the developers as wheels, the
	// same bike rolls back in on two Maria biscuits, nobody on it, brakes where it stood, drops a few crumbs, and offers
	// the order ($lib/bolacha). Laid over the spot of Gira+'s "Made by" block, with the same geometry, so the bike
	// returns to exactly where it was; the zero-height box and its negative margin leave Gira+'s layout as it was.
	import BolachaIcon from '$lib/components/BolachaIcon.svelte';
	import BolachaMaria from '$lib/components/BolachaMaria.svelte';
	import ProfileMenuEntry from '$lib/components/ProfileMenuEntry.svelte';
	import { BOLACHA_URL } from '$lib/bolacha';
	import { t } from '$lib/translations';
	import type { ComponentType } from 'svelte';
	import { onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';

	// Gira+'s menu row still types its icon the Svelte 4 way
	const menuIcon = BolachaIcon as unknown as ComponentType;

	let { started }: { started: boolean } = $props();

	/** After the developers left, before the bike comes back. */
	const AWAY_MS = 1900;
	const ROLL_MS = 2600;
	const ROLL_FROM_PX = -460;
	/** The wheels' radius: a biscuit turns by the distance rolled over this. */
	const WHEEL_PX = 28;

	let x = $state(ROLL_FROM_PX);
	let nod = $state(0);
	let back = $state(false);
	let parked = $state(false);
	let crumbs = $state<{ x: number, y: number, size: number, opacity: number }[]>([]);

	let frame = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let ran = false;
	$effect(() => {
		if (!started || ran) return;
		ran = true;
		timer = setTimeout(rollIn, AWAY_MS);
	});
	onDestroy(() => {
		clearTimeout(timer);
		cancelAnimationFrame(frame);
	});

	function rollIn() {
		back = true;
		const start = performance.now();
		const step = (now: number) => {
			const progress = Math.min(1, (now - start) / ROLL_MS);
			x = ROLL_FROM_PX * (1 - progress) ** 3;
			// a small nod forward as it brakes
			nod = progress > 0.82 ? -Math.sin((progress - 0.82) / 0.18 * Math.PI) * 1.6 : 0;
			if (progress < 1) frame = requestAnimationFrame(step);
			else park();
		};
		frame = requestAnimationFrame(step);
	}

	function park() {
		// crumbs fall from under both wheels (their centres at 28,144 and 100,144, radius 28) and fade where they land
		const bits = [28, 100].flatMap(centre => Array.from({ length: 6 }, () => ({
			x: centre + (Math.random() - 0.3) * 30,
			y: 150 + Math.random() * 18,
			vx: (Math.random() - 0.2) * 1.8,
			vy: -1.5 - Math.random() * 1.5,
			floor: 172 + Math.random() * 3,
			life: 1,
			size: 2 + Math.random() * 3,
		})));
		const step = () => {
			for (const bit of bits) {
				if (bit.y < bit.floor) {
					bit.vy += 0.35;
					bit.x += bit.vx;
					bit.y = Math.min(bit.floor, bit.y + bit.vy);
				} else bit.life -= 0.012;
			}
			crumbs = bits.map(bit => ({ x: bit.x, y: bit.y, size: bit.size, opacity: Math.max(0, bit.life) }));
			if (bits.some(bit => bit.life > 0)) frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		timer = setTimeout(() => parked = true, 500);
	}
</script>

<div class="relative w-full h-0 -mb-8">
	{#if back}
		<div class="absolute inset-x-0 top-0">
			<div class="flex flex-col w-full gap-4 origin-[1.75rem_144px] relative" style:transform="translateX({x}px) rotate({90 + nod}deg)">
				<span class="text-lg invisible">.</span>
				{#each [0, 1] as wheel (wheel)}
					<div class="flex z-10 origin-[1.75rem_1.75rem] w-14" style:transform="rotate({(x - ROLL_FROM_PX) / WHEEL_PX}rad)">
						<BolachaMaria size={56} />
					</div>
				{/each}
				<div class="absolute -left-12 top-[4.5rem]">
					<!-- Gira+'s bike, as in About.svelte -->
					<svg class="h-full w-[110px] -rotate-90" width="62" height="38" viewBox="0 0 62 38" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M11.0862 26.6841L18.6347 20.9505C15.871 17.2807 10.0799 18.3456 7.56726 18.814C13.1653 19.8331 11.0862 26.6841 11.0862 26.6841Z" class="fill-primary" />
						<path d="M11.0862 26.6848L20.8612 26.8514C20.5211 24.2944 19.7072 22.3752 18.6347 20.9512L11.0862 26.6848Z" class="fill-primary" />
						<path d="M28.1018 26.9753L23.685 17.1157M28.1018 26.9753L42.185 10.4097M28.1018 26.9753L20.8612 26.8519M23.685 17.1157L19.7388 8.41601M23.685 17.1157L18.6347 20.9517M42.185 10.4097L46.638 22.118L50.2583 26.6853M42.185 10.4097L40.411 5.11738L44.7192 2L37.4785 2.39874M42.185 10.4097H46.245M20.8612 26.8519L11.0862 26.6853M20.8612 26.8519C20.5211 24.2949 19.7072 22.3757 18.6347 20.9517M19.7388 8.41601H16.6254M19.7388 8.41601H24.0833M11.0862 26.6853C11.0862 26.6853 13.1653 19.8343 7.56725 18.8152M11.0862 26.6853L18.6347 20.9517M7.56725 18.8152C10.0798 18.3468 15.871 17.282 18.6347 20.9517M7.56725 18.8152H2.987" class="stroke-primary" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
			</div>
			{#each crumbs as crumb, i (i)}
				<div class="absolute left-0 top-0 rounded-sm bg-[#d9a95b]" style:width="{crumb.size}px" style:height="{crumb.size}px"
					style:transform="translate({crumb.x}px, {crumb.y}px)" style:opacity={crumb.opacity}></div>
			{/each}
			{#if parked}
				<div in:fly={{ x: 12, duration: 300 }} class="absolute left-[136px] right-0 top-[100px] font-medium text-info leading-tight">{$t('multi_bolacha_fetched')}</div>
				<a in:fly={{ y: 12, duration: 350, delay: 150 }} href={BOLACHA_URL} class="absolute -left-3 -right-3 top-[188px] z-10">
					<ProfileMenuEntry icon={menuIcon} text={$t('multi_bolacha_order')} subtext="Continente" external />
				</a>
			{/if}
		</div>
	{/if}
</div>