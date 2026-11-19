<script lang="ts">
	// Gira+ Multi: the favourites at the top of the search list (Home, Work, named places, stations with live bikes and
	// free docks). Tap goes there like a recent search; press and hold to rename, change the place or remove.
	import { favouriteLabel, favouriteMenu, replacing, sortedFavourites, takeHintShowing, type Favourite } from '$lib/favourites';
	import { hold } from '$lib/hold';
	import { stations } from '$lib/map.svelte';
	import type { SearchHistoryEntry } from '$lib/search-history';
	import { t } from '$lib/translations';
	import { IconBike, IconBriefcase, IconHome, IconStarFilled } from '@tabler/icons-svelte';
	import { onMount } from 'svelte';

	let { onselect, recents }: { onselect: (entry: SearchHistoryEntry) => void, recents: boolean } = $props();

	let hint = $state(false);
	onMount(() => {
		takeHintShowing().then(show => hint = show);
	});

	const shown = $derived($replacing ? [] : $sortedFavourites);

	function detail(favourite: Favourite) {
		const destination = favourite.destination;
		if (destination.type === 'station') {
			const station = stations.value.find(s => s.serialNumber === destination.stationSerial && s.assetStatus === 'active');
			if (station) return $t('station_availability', { bikes: station.bikes.toString(), docks: station.freeDocks.toString() });
		}
		return favourite.kind === 'other' && favourite.label === destination.name ? '' : destination.name;
	}
</script>

{#if shown.length > 0}
	<span class="block px-4 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-label">{$t('multi_fav_section')}</span>
	{#each shown as favourite (favourite.id)}
		{@const sub = detail(favourite)}
		<button class="flex items-center gap-3 w-full px-4 py-2 text-left" onclick={() => onselect(favourite.destination)}
			use:hold={() => favouriteMenu.set({ kind: 'edit', favourite })}>
			<span class="flex items-center justify-center w-7 h-7 -mx-[4px] rounded-full bg-primary shrink-0">
				{#if favourite.kind === 'home'}
					<IconHome class="text-white" size="16" stroke="2.2" />
				{:else if favourite.kind === 'work'}
					<IconBriefcase class="text-white" size="16" stroke="2.2" />
				{:else if favourite.destination.type === 'station'}
					<IconBike class="text-white" size="16" stroke="2.2" />
				{:else}
					<IconStarFilled class="text-white" size="15" />
				{/if}
			</span>
			<div class="flex flex-col min-w-0">
				<span class="text-info font-semibold text-sm truncate">{$favouriteLabel(favourite)}</span>
				{#if sub}
					<span class="text-label text-xs truncate">{sub}</span>
				{/if}
			</div>
		</button>
	{/each}
	{#if recents}
		<span class="block px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-label">{$t('multi_fav_recent_section')}</span>
	{/if}
{:else if hint && !$replacing}
	<span class="block px-4 pt-1 pb-2 text-xs text-label">{$t('multi_fav_hint')}</span>
{/if}