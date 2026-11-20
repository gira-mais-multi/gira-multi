<script lang="ts" module>
	let close: (() => boolean) | null = null;

	/** Closes the favourites sheet; true when it was open, so a back press stops there. */
	export function closeFavouriteSheet(): boolean {
		return close?.() ?? false;
	}
</script>

<script lang="ts">
	// Gira+ Multi: opens the favourites sheet when a station title, search result, recent search or favourite is held
	// (or a pick needs confirming), and cancels a pending pick when the search closes without one.
	import FavouriteSheet from '$lib/components/FavouriteSheet.svelte';
	import { dismissSearchBar } from '$lib/components/SearchBar.svelte';
	import { favouriteMenu, pick, type FavouriteMenuRequest } from '$lib/favourites';
	import { Keyboard } from '@capacitor/keyboard';
	import { onDestroy, onMount } from 'svelte';

	let request = $state<FavouriteMenuRequest | null>(null);
	const dismiss = () => request = null;
	close = () => {
		const open = request !== null;
		request = null;
		return open;
	};

	onDestroy(favouriteMenu.subscribe(next => {
		if (!next) return;
		favouriteMenu.set(null);
		dismissSearchBar(); // the sheet takes over from the search and its keyboard
		request = next;
	}));

	// A pick sets the destination before the keyboard closes; the delay keeps a slow pick from being cancelled
	let cancel: ReturnType<typeof setTimeout> | undefined;
	onMount(() => {
		const listener = Keyboard.addListener('keyboardWillHide', () => {
			clearTimeout(cancel);
			cancel = setTimeout(() => pick.set(null), 400);
		}).catch(() => null); // not implemented on web
		const showListener = Keyboard.addListener('keyboardWillShow', () => clearTimeout(cancel)).catch(() => null);
		return () => {
			close = null;
			clearTimeout(cancel);
			listener.then(l => l?.remove());
			showListener.then(l => l?.remove());
		};
	});
</script>

{#if request}
	{#key request}
		<FavouriteSheet {request} {dismiss} />
	{/key}
{/if}