<script lang="ts">
	// Gira+ Multi: the bottom row of a history trip: the "false trip" tag, and on a paid trip the email button
	import type { CompletedTrip } from '$lib/gira-api/models';
	import { isPaidTrip } from '$lib/paid-trips';
	import { t } from '$lib/translations';
	import { falseTrips, tripMenu } from '$lib/trip-marks';
	import IconFlag from '@tabler/icons-svelte/icons/flag';

	let { trip }: { trip: CompletedTrip } = $props();

	const marked = $derived($falseTrips.has(trip.id));
	const paid = $derived(isPaidTrip(trip));
</script>

{#if marked || paid}
	<div class="basis-full -mt-2 flex items-center justify-between gap-3 min-h-8">
		{#if marked}
			<span class="flex items-center gap-1.5 text-xs font-bold text-warning"><IconFlag size={14} stroke={2.6} />{$t('multi_false_trip')}</span>
		{:else}
			<span></span>
		{/if}
		{#if paid}
			<button class="h-8 px-3 rounded-lg bg-primary text-background text-xs font-bold" onclick={() => tripMenu.set({ trip, email: true })}>{$t('multi_email_emel')}</button>
		{/if}
	</div>
{/if}