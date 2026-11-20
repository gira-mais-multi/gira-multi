<script lang="ts">
	// Gira+ Multi: the favourites sheet, sliding up from the bottom like Gira+'s station sheet. "save": a held station,
	// search result or recent search becomes Home, Work or a named favourite ("Other": name and, for a place, an icon);
	// a pick that would undo another favourite comes here to confirm, with the warning in orange. "edit": a held
	// favourite gets a new name or icon, a new place, or is removed (two taps).
	import FavouriteIcon, { PLACE_ICON_COMPONENTS, SLOT_ICONS_FILLED } from '$lib/components/FavouriteIcon.svelte';
	import StationCard from '$lib/components/StationCard.svelte';
	import { focusSearchBar } from '$lib/components/SearchBar.svelte';
	import {
		confirmSaved, editFavourite, favouriteLabel, favourites, moveFavourite, pick, PLACE_ICONS, placeIcon, removeFavourite, saveEffects,
		saveFavourite, twoTap, type Favourite, type FavouriteKind, type FavouriteMenuRequest, type PlaceIcon,
	} from '$lib/favourites';
	import { t } from '$lib/translations';
	import { keyboard, safeInsets } from '$lib/ui.svelte';
	import IconMapPin from '@tabler/icons-svelte/icons/map-pin';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconReplace from '@tabler/icons-svelte/icons/replace';
	import IconTrash from '@tabler/icons-svelte/icons/trash';
	import { onDestroy, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let { request, dismiss }: { request: FavouriteMenuRequest, dismiss: () => void } = $props();

	// svelte-ignore state_referenced_locally
	const destination = request.kind === 'save' ? request.destination : request.favourite.destination;
	// svelte-ignore state_referenced_locally
	const editing = request.kind === 'edit' ? request.favourite : null;
	// svelte-ignore state_referenced_locally
	const confirming = request.kind === 'save' ? request.pick ?? null : null;
	const isStation = destination.type === 'station';
	const stationSerial = destination.type === 'station' ? destination.stationSerial : null;

	/** "509 - Fonte Nova" → "Fonte Nova", with "Estação 509" as the line below. */
	const parts = destination.name.split(/\s[-–]\s/);
	const shortName = isStation && parts.length > 1 ? parts.slice(1).join(' - ') : destination.name;
	const stationLine = isStation && parts.length > 1 ? `${$t('station_label')} ${parts[0]}` : null;

	let naming = $state(false);
	let name = $state('');
	let icon = $state<PlaceIcon>('map-pin');
	let input = $state<HTMLInputElement>();
	let armed = $state(false);
	const remover = twoTap(on => armed = on);
	onDestroy(() => remover.cancel());

	// How far the keyboard covers the page's bottom. Android may already scroll the page up to keep the name box
	// visible (then nothing is left to lift), so this follows the visible area rather than the keyboard's height.
	let lift = $state(0);
	$effect(() => {
		const view = window.visualViewport;
		if (!view) return;
		// Measured once the keyboard and that scroll have settled; reading in between made the sheet jump up and back
		let settle: ReturnType<typeof setTimeout> | undefined;
		const measure = () => lift = Math.max(0, Math.round(window.innerHeight - view.offsetTop - view.height));
		const update = () => {
			clearTimeout(settle);
			settle = setTimeout(measure, 120);
		};
		measure();
		view.addEventListener('resize', update);
		view.addEventListener('scroll', update);
		return () => {
			clearTimeout(settle);
			view.removeEventListener('resize', update);
			view.removeEventListener('scroll', update);
		};
	});

	const disc = 'flex items-center justify-center shrink-0 rounded-full bg-background-secondary dark:bg-background-tertiary text-primary';
	const caption = 'flex items-center gap-1 text-[10px] leading-none font-semibold uppercase tracking-wider text-label';

	/** The warning under a row: what saving here would replace or undo. */
	function warning(target: FavouriteKind | Favourite) {
		const { replaces, stopsBeing } = saveEffects($favourites, destination, target);
		const lines = [];
		if (replaces) lines.push($t('multi_fav_replaces', { name: replaces.destination.name }));
		if (stopsBeing) lines.push($t('multi_fav_stops_being', { name: $favouriteLabel(stopsBeing) }));
		return lines.join(' · ');
	}

	async function save(kind: 'home' | 'work') {
		await saveFavourite(destination, kind);
		confirmSaved({ kind });
		dismiss();
	}

	async function confirmMove(favourite: Favourite) {
		await moveFavourite(favourite.id, destination);
		confirmSaved({ moved: favourite });
		dismiss();
	}

	async function askName() {
		name = editing ? editing.label : shortName;
		icon = editing ? placeIcon(editing) : 'map-pin';
		naming = true;
		await tick();
		input?.focus();
		input?.select();
	}

	async function saveName() {
		if (!name.trim()) return;
		if (editing) await editFavourite(editing.id, name, isStation ? undefined : icon);
		else {
			await saveFavourite(destination, 'other', name, isStation ? undefined : icon);
			confirmSaved({ kind: 'other', name: name.trim() });
		}
		input?.blur();
		dismiss();
	}

	function changePlace() {
		if (!editing) return;
		pick.set({ kind: 'move', favourite: editing });
		dismiss();
		focusSearchBar();
	}

	async function remove() {
		if (!editing || !remover.tap()) return;
		await removeFavourite(editing.id);
		dismiss();
	}
</script>

<div class="fixed inset-0 z-[60]">
	<button transition:fade={{ duration: 200 }} class="absolute inset-0 bg-black/40 cursor-default" aria-label={$t('cancel_button')} onclick={dismiss}></button>
	<div transition:fly={{ y: 200, duration: 200 }}
		class="absolute inset-x-0 px-6 bg-background transition-[bottom] duration-200 {keyboard.visible ? 'rounded-4xl' : 'rounded-t-4xl'}"
		style:bottom="{lift}px" style:padding-bottom="{keyboard.visible ? 20 : Math.max(20, $safeInsets.bottom)}px"
		style:box-shadow="0px 0px 20px 0px var(--color-shadow)">
		<div class="mx-auto mt-2 mb-3.5 w-16 h-[6px] rounded-full bg-background-tertiary"></div>

		{#if naming}
			<div class="flex items-center gap-3">
				{#if isStation}
					<StationCard {stationSerial} />
				{:else}
					{@const Preview = PLACE_ICON_COMPONENTS[icon]}
					<span class="{disc} w-12 h-12"><Preview size={22} stroke={2} /></span>
				{/if}
				<input bind:this={input} bind:value={name} type="text" enterkeyhint="done" onkeydown={e => e.key === 'Enter' && saveName()}
					aria-label={$t('multi_fav_rename')}
					class="grow min-w-0 h-12 rounded-xl border-none bg-background-secondary px-3.5 text-[15px] font-semibold text-info ring-[1.5px] ring-inset ring-primary focus:ring-[1.5px] focus:ring-inset focus:ring-primary" />
			</div>
			{#if !isStation}
				<div class="grid grid-cols-[repeat(7,44px)] justify-between gap-y-1.5 mt-4 mb-1">
					{#each PLACE_ICONS as name (name)}
						{@const Icon = PLACE_ICON_COMPONENTS[name]}
						<!-- pointerdown keeps the keyboard up while choosing -->
						<button class="flex items-center justify-center w-11 h-11 rounded-full transition-colors {icon === name ? 'bg-primary text-background' : 'text-info active:bg-background-secondary'}"
							onpointerdown={e => e.preventDefault()} onmousedown={e => e.preventDefault()} onclick={() => icon = name} aria-label={name} aria-pressed={icon === name}>
							<Icon size={22} stroke={2} />
						</button>
					{/each}
				</div>
			{/if}
			<div class="flex justify-end gap-2 mt-1.5 -mr-3 text-sm font-bold">
				<button class="min-w-11 min-h-11 px-3 text-label" onclick={dismiss}>{$t('cancel_button')}</button>
				<button class="min-w-11 min-h-11 px-3 text-primary disabled:opacity-40" disabled={!name.trim()} onmousedown={e => e.preventDefault()} onclick={saveName}>{$t('multi_save')}</button>
			</div>
		{:else}
			<!-- what's being saved or edited, as it shows in the row -->
			<div class="flex items-center gap-3.5 mb-3.5">
				{#if isStation}
					<StationCard {stationSerial} />
				{:else}
					<span class="{disc} w-12 h-12">
						{#if editing}
							<FavouriteIcon favourite={editing} />
						{:else}
							<IconMapPin size={22} stroke={2} />
						{/if}
					</span>
				{/if}
				<div class="min-w-0">
					<div class="text-base font-bold text-info truncate">{editing ? $favouriteLabel(editing) : shortName}</div>
					{#if editing && $favouriteLabel(editing) !== destination.name}
						<div class="mt-0.5 text-xs font-medium text-label truncate">{destination.name}</div>
					{:else if stationLine}
						<div class="mt-0.5 text-xs font-medium text-label truncate">{stationLine}</div>
					{/if}
				</div>
			</div>

			{#if editing}
				{#if editing.kind === 'other'}
					<button class="flex items-center gap-3.5 w-full h-12 px-1 text-left text-[15px] font-bold text-info" onclick={askName}>
						<span class="flex items-center justify-center w-8 shrink-0 text-label"><IconPencil size={20} stroke={2} /></span>
						{$t(isStation ? 'multi_fav_rename' : 'multi_fav_name_icon')}
					</button>
				{/if}
				<button class="flex items-center gap-3.5 w-full h-12 px-1 text-left text-[15px] font-bold text-info" onclick={changePlace}>
					<span class="flex items-center justify-center w-8 shrink-0 text-label"><IconReplace size={20} stroke={2} /></span>
					{$t('multi_fav_replace')}
				</button>
				<button class="flex items-center gap-3.5 w-full h-12 px-1 text-left text-[15px] font-bold text-warning" onclick={remove}>
					{#if armed}
						<span class="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-warning text-background"><IconTrash size={18} stroke={2} /></span>
						{$t('multi_fav_remove_confirm')}
					{:else}
						<span class="flex items-center justify-center w-8 shrink-0"><IconTrash size={20} stroke={2} /></span>
						{$t('multi_fav_remove')}
					{/if}
				</button>
			{:else}
				<div class="{caption} mb-1"><span class="w-1.5 h-1.5 rounded-full bg-primary"></span>{$t('multi_fav_save_as')}</div>
				{#if confirming?.kind === 'move'}
					{@const moving = confirming.favourite}
					{@render choice(moving.kind === 'other' ? null : SLOT_ICONS_FILLED[moving.kind], moving, $favouriteLabel(moving), warning(moving), true, () => confirmMove(moving))}
				{:else}
					{#each ['home', 'work'] as const as kind (kind)}
						{#if !confirming || confirming.kind === kind}
							{@const warn = warning(kind)}
							{@render choice(SLOT_ICONS_FILLED[kind], null, $t(kind === 'home' ? 'multi_fav_home' : 'multi_fav_work'), warn || $t(kind === 'home' ? 'multi_fav_unset_home' : 'multi_fav_unset_work'), !!warn, () => save(kind))}
						{/if}
					{/each}
					{#if !confirming}
						{@render choice(IconMapPin, null, $t('multi_fav_other'), $t(isStation ? 'multi_fav_other_sub_station' : 'multi_fav_other_sub'), false, askName)}
					{/if}
				{/if}
				{#if confirming}
					<div class="flex justify-end -mr-3 text-sm font-bold">
						<button class="min-w-11 min-h-11 px-3 text-label" onclick={dismiss}>{$t('cancel_button')}</button>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>

{#snippet choice(Icon: typeof IconMapPin | null, favourite: Favourite | null, title: string, sub: string, warn: boolean, onclick: () => void)}
	<button class="flex items-center gap-3.5 w-full h-[58px] px-1 text-left" {onclick}>
		<span class="{disc} w-10 h-10">
			{#if Icon}
				<Icon size={20} />
			{:else if favourite}
				<FavouriteIcon {favourite} size={20} />
			{/if}
		</span>
		<span class="min-w-0">
			<span class="block text-[15px] font-bold text-info truncate">{title}</span>
			<span class="block mt-px text-xs font-semibold truncate {warn ? 'text-warning' : 'text-label'}">{sub}</span>
		</span>
	</button>
{/snippet}