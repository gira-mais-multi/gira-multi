<script lang="ts" module>
	import { cancelPick } from '$lib/favourites';
	let close: (() => boolean) | null = null;

	/** Closes the favourites sheet, or else ends choosing a place; true when either was on, so a back press stops there. */
	export function closeFavouriteSheet(): boolean {
		return (close?.() ?? false) || cancelPick();
	}
</script>

<script lang="ts">
	// Gira+ Multi: opens the favourites sheet when a station title, search result, recent search or favourite is held
	// (or a pick needs confirming), shows the "saved" notice, and ends choosing a place after a long time in the background.
	import FavouriteSheet from '$lib/components/FavouriteSheet.svelte';
	import { dismissSearchBar } from '$lib/components/SearchBar.svelte';
	import { favouriteLabel, favouriteMenu, favouriteNotice, type FavouriteMenuRequest } from '$lib/favourites';
	import { t } from '$lib/translations';
	import { safeInsets } from '$lib/ui.svelte';
	import IconCircleCheck from '@tabler/icons-svelte/icons/circle-check';
	import { fly } from 'svelte/transition';
	import { App } from '@capacitor/app';
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

	// The "saved" notice shows for a moment, below the search bar
	const NOTICE_MS = 2500;
	const noticeText = $derived.by(() => {
		const notice = $favouriteNotice;
		if (!notice) return '';
		if ('moved' in notice) return $t('multi_fav_moved', { name: $favouriteLabel(notice.moved) });
		const name = notice.kind === 'home' ? $t('multi_fav_home') : notice.kind === 'work' ? $t('multi_fav_work') : notice.name ?? '';
		return $t('multi_fav_saved_as', { name });
	});
	$effect(() => {
		if (!$favouriteNotice) return;
		const timer = setTimeout(() => favouriteNotice.set(null), NOTICE_MS);
		return () => clearTimeout(timer);
	});

	// Choosing a place survives the search closing (the place can be held on the map), but not a long absence: coming
	// back much later, a tap shouldn't save over a favourite the rider forgot they were choosing
	const PICK_BACKGROUND_LIMIT_MS = 5 * 60_000;
	onMount(() => {
		let leftAt: number | null = null;
		const listener = App.addListener('appStateChange', ({ isActive }) => {
			if (!isActive) leftAt = Date.now();
			else if (leftAt !== null && Date.now() - leftAt > PICK_BACKGROUND_LIMIT_MS) cancelPick();
			if (isActive) leftAt = null;
		}).catch(() => null); // not implemented on web
		return () => {
			close = null;
			listener.then(l => l?.remove());
		};
	});
</script>

{#if request}
	{#key request}
		<FavouriteSheet {request} {dismiss} />
	{/key}
{/if}

{#if $favouriteNotice}
	{#key $favouriteNotice.id}
		<div class="fixed z-[110] left-1/2 -translate-x-1/2 max-w-[85vw] pointer-events-none" style:top="{Math.max($safeInsets.top, 16) + 64}px">
			<div transition:fly={{ y: -12, duration: 200 }} role="status" class="flex items-center gap-2 w-max max-w-full font-bold text-sm text-info bg-background dark:bg-background-secondary rounded-2xl py-2.5 px-3"
				style:box-shadow="0px 0px 20px 0px var(--color-shadow)">
				<IconCircleCheck class="text-primary shrink-0" size={20} stroke={2} />
				<span class="truncate">{noticeText}</span>
			</div>
		</div>
	{/key}
{/if}