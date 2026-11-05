<script lang="ts">
	// Gira+ Multi: loads the saved accounts, starts the trip log, and shows the account picker when something asks for it
	import { userCredentials } from '$lib/account';
	import { accountPicker, initAccounts, type AccountPickerRequest } from '$lib/accounts';
	import { dockCheck } from '$lib/dock-check';
	import { currentTrip } from '$lib/trip';
	import { followTrips, loadTripLog } from '$lib/trip-log';
	import { get } from 'svelte/store';
	import AccountPicker from '$lib/components/AccountPicker.svelte';
	import { enqueueDialog } from '$lib/ui.svelte';
	import { onDestroy, onMount } from 'svelte';

	let request = $state<AccountPickerRequest | null>(null);

	onMount(() => {
		const tracking = initAccounts();
		// Loaded first, so what it follows isn't overwritten by the stored log
		const logging = loadTripLog().then(() => followTrips(currentTrip, dockCheck, () => get(userCredentials)?.email ?? null));
		return () => {
			void tracking.then(stop => stop());
			void logging.then(stop => stop());
		};
	});

	onDestroy(accountPicker.subscribe(next => {
		if (!next) return;
		request = next;
		accountPicker.set(null);
		enqueueDialog(picker);
	}));
</script>

{#snippet picker(dismiss: () => void)}
	{#if request}
		<AccountPicker {request} {dismiss} />
	{/if}
{/snippet}