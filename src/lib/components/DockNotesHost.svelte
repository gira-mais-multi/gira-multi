<script lang="ts">
	// Gira+ Multi: loads the dock notes and shows a station's notes when its free-docks number is held
	import DockNotes from '$lib/components/DockNotes.svelte';
	import { dockNotesFor, loadDockNotes } from '$lib/dock-notes';
	import type { StationInfo } from '$lib/map.svelte';
	import { enqueueDialog } from '$lib/ui.svelte';
	import { onDestroy, onMount } from 'svelte';

	let station = $state<StationInfo | null>(null);

	onMount(() => void loadDockNotes());

	onDestroy(dockNotesFor.subscribe(next => {
		if (!next) return;
		station = next;
		dockNotesFor.set(null);
		enqueueDialog(notes);
	}));
</script>

{#snippet notes(dismiss: () => void)}
	{#if station}
		<DockNotes {station} {dismiss} />
	{/if}
{/snippet}