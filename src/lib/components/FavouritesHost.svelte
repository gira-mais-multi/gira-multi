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
	import PickReminder from '$lib/components/PickReminder.svelte';
	import { selectedStation } from '$lib/map.svelte';
	import { currentRoute } from '$lib/routing';
	import { currentTrip } from '$lib/trip';
	import { dismissSearchBar } from '$lib/components/SearchBar.svelte';
	import { favouriteLabel, favouriteMenu, favouriteNotice, pick, type FavouriteMenuRequest } from '$lib/favourites';
	import { t } from '$lib/translations';
	import IconCircleCheck from '@tabler/icons-svelte/icons/circle-check';
	import { fly } from 'svelte/transition';
	import { App } from '@capacitor/app';
	import { onDestroy, onMount } from 'svelte';

	/** Where Gira+'s search bar ends, with room for its route strip (the page's own `searchBarBottom`). */
	let { searchBarBottom }: { searchBarBottom: number } = $props();
	// The strip below the search bar only shows with a route outside a trip; without it, sit just under the bar
	const ROUTE_STRIP_PX = 40;
	const below = $derived(searchBarBottom - ($currentRoute != null && $currentTrip == null ? 0 : ROUTE_STRIP_PX) + 8);

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
		// Choosing starts with the map clear (an open station sheet would hide it and swallow the hold), and ends when a
		// trip starts or ends, so a hold meant as "go there" on the next ride can't move a favourite
		const stopPickWatch = pick.subscribe(current => {
			if (current) selectedStation.set(null);
		});
		let riding = $currentTrip != null;
		const stopTripWatch = currentTrip.subscribe(trip => {
			if ((trip != null) !== riding) cancelPick();
			riding = trip != null;
		});
		const listener = App.addListener('appStateChange', ({ isActive }) => {
			if (!isActive) leftAt = Date.now();
			else if (leftAt !== null && Date.now() - leftAt > PICK_BACKGROUND_LIMIT_MS) cancelPick();
			if (isActive) leftAt = null;
		}).catch(() => null); // not implemented on web
		return () => {
			close = null;
			stopPickWatch();
			stopTripWatch();
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
		<div class="fixed z-[110] left-1/2 -translate-x-1/2 max-w-[85vw] pointer-events-none" style:top="{below}px">
			<div transition:fly={{ y: -12, duration: 200 }} role="status" class="flex items-center gap-2 w-max max-w-full font-bold text-sm text-info bg-background dark:bg-background-secondary rounded-2xl py-2.5 px-3"
				style:box-shadow="0px 0px 20px 0px var(--color-shadow)">
				<IconCircleCheck class="text-primary shrink-0" size={20} stroke={2} />
				<span class="truncate">{noticeText}</span>
			</div>
		</div>
	{/key}
{/if}

<PickReminder top={below} />