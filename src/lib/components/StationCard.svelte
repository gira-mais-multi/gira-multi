<script lang="ts">
	// Gira+ Multi: a saved station as a small card with its live bikes (green) and free docks, like the top of the
	// station sheet. "–" while the stations load, a grey 0 when empty, "Closed" when it's out of service.
	import { stations } from '$lib/map.svelte';
	import { t } from '$lib/translations';

	let { stationSerial, class: className = '' }: { stationSerial: string | null | undefined, class?: string } = $props();

	const state = $derived.by(() => {
		if (stations.value.length === 0) return null;
		const station = stations.value.find(s => s.serialNumber === stationSerial && s.assetStatus === 'active');
		return station ? { bikes: station.bikes, docks: station.freeDocks } : 'closed' as const;
	});
</script>

<span class="flex items-center justify-center w-[88px] h-12 rounded-2xl bg-background dark:bg-background-secondary shadow-[0_0_12px_var(--color-shadow)] dark:shadow-[inset_0_0_0_1px_var(--color-background-tertiary)] {className}">
	{#if state === 'closed'}
		<span class="text-[10px] font-bold tracking-wider uppercase text-label">{$t('multi_fav_station_closed')}</span>
	{:else}
		{@render count(state?.bikes ?? null, $t('multi_fav_bikes_short'), true)}
		<span class="w-px h-6 bg-background-tertiary"></span>
		{@render count(state?.docks ?? null, $t('multi_fav_docks_short'), false)}
	{/if}
</span>

{#snippet count(value: number | null, caption: string, bikes: boolean)}
	<span class="w-[34px] flex flex-col items-center leading-none text-info">
		<!-- the bike number is a deeper green in light mode, to stay readable on white -->
		<span class="text-2xl font-bold tabular-nums tracking-tight {!value ? 'text-label' : bikes ? 'text-[#5f9a00] dark:text-primary' : ''}">{value ?? '–'}</span>
		<span class="mt-0.5 text-[8px] font-bold uppercase tracking-wide">{caption}</span>
	</span>
{/snippet}