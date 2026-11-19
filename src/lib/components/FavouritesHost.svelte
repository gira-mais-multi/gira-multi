<script lang="ts">
	// Gira+ Multi: opens the favourites menu when a search result, recent search or favourite is held, and cancels a
	// pending "change place" when the search closes without a pick.
	import FavouriteMenu from '$lib/components/FavouriteMenu.svelte';
	import { favouriteMenu, replacing, type FavouriteMenuRequest } from '$lib/favourites';
	import { enqueueDialog } from '$lib/ui.svelte';
	import { Keyboard } from '@capacitor/keyboard';
	import { onDestroy, onMount } from 'svelte';

	let request = $state<FavouriteMenuRequest | null>(null);

	onDestroy(favouriteMenu.subscribe(next => {
		if (!next) return;
		request = next;
		favouriteMenu.set(null);
		enqueueDialog(menu);
	}));

	// A pick sets the destination before the keyboard closes; the delay keeps a slow pick from being cancelled
	let cancel: ReturnType<typeof setTimeout> | undefined;
	onMount(() => {
		const listener = Keyboard.addListener('keyboardWillHide', () => {
			clearTimeout(cancel);
			cancel = setTimeout(() => replacing.set(null), 400);
		}).catch(() => null); // not implemented on web
		const showListener = Keyboard.addListener('keyboardWillShow', () => clearTimeout(cancel)).catch(() => null);
		return () => {
			clearTimeout(cancel);
			listener.then(l => l?.remove());
			showListener.then(l => l?.remove());
		};
	});
</script>

{#snippet menu(dismiss: () => void)}
	{#if request}
		{#key request}
			<FavouriteMenu {request} {dismiss} />
		{/key}
	{/if}
{/snippet}