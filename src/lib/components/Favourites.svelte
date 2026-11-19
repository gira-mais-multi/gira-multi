<script lang="ts">
	// Gira+ Multi: the favourites at the top of the search list, as one row of round icons with short labels (Home, Work,
	// named places, stations with live bikes and free docks), scrolling sideways when there are more. Tap goes there like
	// a recent search; press and hold to rename, change the place or remove.
	import { favouriteLabel, favouriteMenu, replacing, sortedFavourites, takeHintShowing, type Favourite } from '$lib/favourites';
	import { hold } from '$lib/hold';
	import { stations } from '$lib/map.svelte';
	import type { SearchHistoryEntry } from '$lib/search-history';
	import { t } from '$lib/translations';
	import { IconBike, IconBriefcase, IconHome, IconParking, IconStarFilled } from '@tabler/icons-svelte';
	import { onMount } from 'svelte';

	let { onselect, recents }: { onselect: (entry: SearchHistoryEntry) => void, recents: boolean } = $props();

	let hint = $state(false);
	onMount(() => {
		takeHintShowing().then(show => hint = show);
	});

	const shown = $derived($replacing ? [] : $sortedFavourites);

	/** A saved station's live state: its bikes and docks, closed when it's out of service, or null while loading. */
	function live(favourite: Favourite) {
		const destination = favourite.destination;
		if (destination.type !== 'station' || stations.value.length === 0) return null;
		const station = stations.value.find(s => s.serialNumber === destination.stationSerial && s.assetStatus === 'active');
		return station ? { bikes: station.bikes, docks: station.freeDocks } : 'closed' as const;
	}

	/** The tile's label. A station saved under its own name drops the number ("509 - Fonte Nova" → "Fonte Nova"). */
	function short(favourite: Favourite) {
		const label = $favouriteLabel(favourite);
		if (favourite.destination.type !== 'station' || label !== favourite.destination.name) return label;
		return label.split(/\s[-–]\s/).slice(1).join(' - ') || label;
	}
</script>

{#if shown.length > 0}
	<!-- the tiles are sized so a fifth one peeks in at the edge, showing the row scrolls -->
	<div class="flex gap-1 overflow-x-auto px-2 pt-1 pb-2" style:scrollbar-width="none">
		{#each shown as favourite (favourite.id)}
			{@const state = live(favourite)}
			<button class="flex flex-col items-center w-[58px] shrink-0 py-1" onclick={() => onselect(favourite.destination)}
				use:hold={() => favouriteMenu.set({ kind: 'edit', favourite })} aria-label={$favouriteLabel(favourite)}>
				<span class="flex items-center justify-center w-11 h-11 rounded-full {state === 'closed' ? 'bg-label' : 'bg-primary'}">
					{#if favourite.kind === 'home'}
						<IconHome class="text-white" size="22" stroke="2.2" />
					{:else if favourite.kind === 'work'}
						<IconBriefcase class="text-white" size="22" stroke="2.2" />
					{:else if favourite.destination.type === 'station'}
						<IconBike class="text-white" size="22" stroke="2.2" />
					{:else}
						<IconStarFilled class="text-white" size="20" />
					{/if}
				</span>
				<span class="mt-1 w-full text-center text-info font-semibold text-xs truncate">{short(favourite)}</span>
				{#if state === 'closed'}
					<span class="w-full text-center text-label text-[10px] leading-tight truncate">{$t('multi_fav_station_closed')}</span>
				{:else if state}
					<span class="flex items-center justify-center gap-[1px] text-label text-[10px] font-semibold leading-tight">
						<IconBike size="11" stroke="2.4" />{state.bikes}
						<IconParking class="ml-[3px]" size="11" stroke="2.4" />{state.docks}
					</span>
				{/if}
			</button>
		{/each}
	</div>
	{#if recents}
		<div class="mx-4 mb-1 border-t border-background-tertiary"></div>
	{/if}
{:else if hint && !$replacing}
	<span class="block px-4 pt-1 pb-2 text-xs text-label">{$t('multi_fav_hint')}</span>
{/if}