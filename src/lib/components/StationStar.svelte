<script lang="ts">
	// Gira+ Multi: the star on a station's sheet, saving the station to (or removing it from) the search favourites
	import { favourites, stationFavourite, toggleStationFavourite } from '$lib/favourites';
	import type { StationInfo } from '$lib/map.svelte';
	import { t } from '$lib/translations';
	import { IconStar, IconStarFilled } from '@tabler/icons-svelte';

	let { station }: { station: StationInfo | undefined } = $props();

	const saved = $derived(stationFavourite($favourites, station?.serialNumber ?? null) != null);

	function toggle() {
		if (!station) return;
		void toggleStationFavourite({ type: 'station', lat: station.latitude, lng: station.longitude, name: station.name, stationSerial: station.serialNumber });
	}
</script>

{#if station}
	<!-- the padding widens the tap target without moving the header; stopPropagation keeps the sheet from dragging -->
	<button class="-m-2 p-2" onclick={toggle} ontouchstart={e => e.stopPropagation()} aria-label={$t(saved ? 'multi_fav_star_remove' : 'multi_fav_star_add')}>
		{#if saved}
			<IconStarFilled class="text-primary" size="16" />
		{:else}
			<IconStar class="text-label" size="16" stroke="2.2" />
		{/if}
	</button>
{/if}