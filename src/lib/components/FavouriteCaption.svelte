<script lang="ts">
	// Gira+ Multi: the small caption above a saved station's title on its sheet ("⌂ Home", "Work", the rider's own name,
	// or "Saved"), in the style of the main account's caption. Placed out of the flow, so nothing on the sheet moves.
	import { SLOT_ICONS_FILLED } from '$lib/components/FavouriteIcon.svelte';
	import { favourites, stationFavourite } from '$lib/favourites';
	import type { StationInfo } from '$lib/map.svelte';
	import { t } from '$lib/translations';
	import { fade } from 'svelte/transition';

	let { station }: { station: StationInfo | undefined } = $props();

	const saved = $derived(stationFavourite($favourites, station?.serialNumber ?? null));
	const text = $derived(!saved ? '' : saved.kind === 'home' ? $t('multi_fav_home') : saved.kind === 'work' ? $t('multi_fav_work') :
		saved.label !== saved.destination.name ? saved.label : $t('multi_fav_saved'));
</script>

{#if saved}
	<div transition:fade={{ duration: 150 }} class="absolute left-0 -top-[15px] max-w-full flex items-center gap-1 text-[10px] leading-none font-semibold uppercase tracking-wider text-label pointer-events-none">
		{#if saved.kind === 'other'}
			<span class="w-1.5 h-1.5 shrink-0 rounded-full bg-primary"></span>
		{:else}
			{@const Icon = SLOT_ICONS_FILLED[saved.kind]}
			<Icon class="text-primary shrink-0" size={11} />
		{/if}
		<span class="truncate">{text}</span>
	</div>
{/if}