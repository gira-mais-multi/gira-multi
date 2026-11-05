<script lang="ts">
	// Gira+ Multi: loads the false trip marks and the email text, and opens a history trip's menu when asked
	import TripMenu from '$lib/components/TripMenu.svelte';
	import type { CompletedTrip } from '$lib/gira-api/models';
	import { loadTripMarks, tripMenu } from '$lib/trip-marks';
	import { enqueueDialog } from '$lib/ui.svelte';
	import { onDestroy, onMount } from 'svelte';

	let request = $state<{ trip: CompletedTrip, email: boolean } | null>(null);

	onMount(() => void loadTripMarks());

	onDestroy(tripMenu.subscribe(next => {
		if (!next) return;
		request = next;
		tripMenu.set(null);
		enqueueDialog(menu);
	}));
</script>

{#snippet menu(dismiss: () => void)}
	{#if request}
		<TripMenu trip={request.trip} email={request.email} {dismiss} />
	{/if}
{/snippet}