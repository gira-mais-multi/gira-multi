<script lang="ts">
	// Gira+ Multi: the favourites at the top of the search list, in one row that scrolls sideways: Home and Work as
	// discs with filled icons, saved stations as small cards with their live bikes and free docks, then named places
	// with their own icon. Empty Home and Work slots and "Add" start a pick in the search. Tap goes there like a recent
	// search; press and hold edits (or hides an empty slot).
	import StationCard from '$lib/components/StationCard.svelte';
	import FavouriteIcon, { SLOT_ICONS, SLOT_ICONS_FILLED } from '$lib/components/FavouriteIcon.svelte';
	import { emptySlots, favouriteLabel, favouriteMenu, hideSlot, pick, sortedFavourites, type Favourite, type SlotKind } from '$lib/favourites';
	import { hold } from '$lib/hold';
	import { dismissSearchBar, focusSearchBar } from '$lib/components/SearchBar.svelte';
	import { selectedStation, stations } from '$lib/map.svelte';
	import { routeDestination } from '$lib/routing';
	import { t } from '$lib/translations';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import { scale } from 'svelte/transition';

	let { recents }: { recents: boolean } = $props();

	const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	// Only a tile saved while the row is open scales in, not the whole row each time the search opens
	const shownAtStart = new Set($sortedFavourites.map(f => f.id));
	// the same tile look as StationCard
	const tile = 'bg-background dark:bg-background-secondary shadow-[0_0_12px_var(--color-shadow)] dark:shadow-[inset_0_0_0_1px_var(--color-background-tertiary)]';
	const press = 'transition-transform duration-100 motion-reduce:transition-none group-active:scale-95';
	const label = 'mt-1.5 max-w-full flex items-center justify-center gap-[3px] text-xs font-semibold';

	/**
	 * Goes there like a recent search (a live station also opens its sheet), without adding it to the recent searches:
	 * the row already shows it, and it would push real recents out of Gira+'s ten.
	 */
	function go(favourite: Favourite) {
		const destination = favourite.destination;
		const station = destination.type === 'station' && stations.value.find(s => s.serialNumber === destination.stationSerial && s.assetStatus === 'active');
		selectedStation.set(station ? station.serialNumber : null);
		if (station) routeDestination.set({ type: 'station', lat: station.latitude, lng: station.longitude, name: station.name, stationSerial: station.serialNumber });
		else routeDestination.set({ type: 'location', lat: destination.lat, lng: destination.lng, name: destination.name });
		dismissSearchBar();
	}

	/** Starts a pick: the next place chosen in the search becomes Home or Work, or is offered for saving. */
	function startPick(kind: SlotKind | 'add') {
		pick.set({ kind });
		focusSearchBar();
	}

	/** The tile's label. A station saved under its own name drops the number ("509 - Fonte Nova" → "Fonte Nova"). */
	function short(favourite: Favourite) {
		const text = $favouriteLabel(favourite);
		if (favourite.destination.type !== 'station' || text !== favourite.destination.name) return text;
		return text.split(/\s[-–]\s/).slice(1).join(' - ') || text;
	}

	// The right edge fades only while more tiles follow
	let row = $state<HTMLElement>();
	let more = $state(false);
	function measure() {
		if (row) more = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
	}
	$effect(() => {
		void $sortedFavourites.length;
		void $emptySlots.length;
		measure();
	});
	const fade = 'linear-gradient(to right, #000 calc(100% - 26px), transparent)';

	// Keeps the search focused (and its keyboard up) when a slot is tapped, so the pick isn't cancelled
	const keepFocus = (event: MouseEvent) => event.preventDefault();
</script>

{#if !$pick}
	<div bind:this={row} onscroll={measure} class="flex overflow-x-auto px-2.5 pt-1 pb-3 snap-x snap-proximity overscroll-x-contain"
		style:scrollbar-width="none" style:mask-image={more ? fade : undefined} style:-webkit-mask-image={more ? fade : undefined}>
		{#each $sortedFavourites as favourite (favourite.id)}
			{@const isStation = favourite.destination.type === 'station'}
			<button class="group shrink-0 flex flex-col items-center snap-start {isStation ? 'w-[100px]' : 'w-[60px]'}"
				in:scale={{ duration: reducedMotion || shownAtStart.has(favourite.id) ? 0 : 220, start: 0.6 }} onclick={() => go(favourite)}
				use:hold={{ onHold: () => favouriteMenu.set({ kind: 'edit', favourite }), press: false }} aria-label={$favouriteLabel(favourite)}>
				{#if isStation}
					<StationCard stationSerial={favourite.destination.type === 'station' ? favourite.destination.stationSerial : null} class={press} />
				{:else}
					<span class="flex items-center justify-center w-12 h-12 rounded-full text-primary {tile} {press}">
						<FavouriteIcon {favourite} />
					</span>
				{/if}
				<span class="{label} text-info">
					{#if isStation && favourite.kind !== 'other'}
						{@const Glyph = SLOT_ICONS_FILLED[favourite.kind]}
						<Glyph class="text-primary shrink-0" size={12} />
					{/if}
					<span class="min-w-0 truncate">{short(favourite)}</span>
				</span>
			</button>
		{/each}
		{#each $emptySlots as kind (kind)}
			{@const Icon = SLOT_ICONS[kind]}
			<button class="group shrink-0 flex flex-col items-center w-[60px] snap-start" onmousedown={keepFocus} onclick={() => startPick(kind)}
				use:hold={{ onHold: () => hideSlot(kind), press: false }} aria-label={$t(kind === 'home' ? 'multi_fav_home' : 'multi_fav_work')}>
				<span class="relative flex items-center justify-center w-12 h-12 rounded-full text-label shadow-[inset_0_0_0_1.5px_var(--color-background-tertiary)] {press}">
					<Icon size={22} stroke={2} />
					<span class="absolute -right-[3px] -bottom-[3px] flex items-center justify-center w-[18px] h-[18px] rounded-full bg-primary text-white ring-2 ring-background-secondary dark:ring-background">
						<IconPlus size={12} stroke={3} />
					</span>
				</span>
				<span class="{label} text-label"><span class="truncate">{$t(kind === 'home' ? 'multi_fav_home' : 'multi_fav_work')}</span></span>
			</button>
		{/each}
		<button class="group shrink-0 flex flex-col items-center w-[60px] snap-start" onmousedown={keepFocus} onclick={() => startPick('add')}>
			<span class="flex items-center justify-center w-12 h-12 rounded-full text-label shadow-[inset_0_0_0_1.5px_var(--color-background-tertiary)] {press}">
				<IconPlus size={22} stroke={2} />
			</span>
			<span class="{label} text-label"><span class="truncate">{$t('multi_fav_add')}</span></span>
		</button>
	</div>
	{#if recents}
		<div class="mx-4 mb-1.5 border-t border-background-tertiary"></div>
	{/if}
{/if}