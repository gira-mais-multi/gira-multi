<script lang="ts">
	// Gira+ Multi: under the search bar while a route shows (outside trips), where it starts: "From your location ·
	// Change", or, in Plan mode, the chosen starting point with an X back to the phone's position, and the time the
	// stations' bikes and free docks were read (they're live counts, not a forecast for later).
	import { focusSearchBar } from '$lib/components/SearchBar.svelte';
	import { pick } from '$lib/favourites';
	import type { SearchHistoryEntry } from '$lib/search-history';
	import { chooseStart, endPlan, planFrom } from '$lib/plan';
	import { currentRoute, routeDestination } from '$lib/routing';
	import { t } from '$lib/translations';
	import { currentTrip } from '$lib/trip';
	import { keyboard } from '$lib/ui.svelte';
	import IconCurrentLocation from '@tabler/icons-svelte/icons/current-location';
	import IconRoute from '@tabler/icons-svelte/icons/route';
	import IconX from '@tabler/icons-svelte/icons/x';
	import { fly } from 'svelte/transition';

	let { top }: { top: number } = $props();

	const shown = $derived($routeDestination !== null && $currentTrip === null && $pick === null && !keyboard.visible);
	const readAt = $derived($currentRoute ? new Date($currentRoute.computedAt) : null);
	const pad = (value: number) => String(value).padStart(2, '0');

	// The search opens empty for the start (it shows the destination's name otherwise), and gets the name back if the
	// choosing is cancelled; a chosen start re-plans the destination, which puts the name back by itself
	function change() {
		chooseStart();
		focusSearchBar('');
	}
	/** The start when choosing began, to tell a cancelled choice (nothing changed) from a chosen one. */
	let startBefore: SearchHistoryEntry | null | undefined;
	$effect(() => {
		const choosing = $pick?.kind === 'from';
		const from = $planFrom;
		if (choosing && startBefore === undefined) startBefore = from;
		if (!choosing && startBefore !== undefined) {
			if (from === startBefore) focusSearchBar($routeDestination?.name ?? '', false);
			startBefore = undefined;
		}
	});
</script>

{#if shown}
	<div transition:fly={{ y: -12, duration: 200 }} class="fixed z-[44] left-4 right-[76px]" style:top="{top}px">
		{#if $planFrom}
			<div role="status" class="flex items-center gap-3 pl-4 pr-1 py-1.5 bg-background dark:bg-background-secondary rounded-2xl" style:box-shadow="0px 0px 20px 0px var(--color-shadow)">
				<IconRoute class="text-primary shrink-0" size={20} stroke={2} />
				<button class="min-w-0 grow text-left leading-tight" onclick={change}>
					<div class="text-sm font-semibold text-info truncate">{$t('multi_plan_from', { name: $planFrom.name })}</div>
					{#if readAt}
						<div class="text-xs font-medium text-label truncate">{$t('multi_plan_live', { time: `${pad(readAt.getHours())}:${pad(readAt.getMinutes())}` })}</div>
					{/if}
				</button>
				<button class="shrink-0 flex items-center justify-center w-11 h-11 text-label" onclick={endPlan} aria-label={$t('multi_plan_back')}>
					<IconX size={20} stroke={2} />
				</button>
			</div>
		{:else}
			<button class="flex items-center gap-2 max-w-full pl-3 pr-3.5 py-2 bg-background dark:bg-background-secondary rounded-2xl text-xs font-semibold" style:box-shadow="0px 0px 20px 0px var(--color-shadow)" onclick={change}>
				<IconCurrentLocation class="text-label shrink-0" size={16} stroke={2} />
				<span class="text-label truncate">{$t('multi_plan_from_here')}</span>
				<span class="text-primary font-bold shrink-0">{$t('multi_plan_change')}</span>
			</button>
		{/if}
	</div>
{/if}