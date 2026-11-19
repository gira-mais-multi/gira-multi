<script lang="ts">
	// Gira+ Multi: the favourites menu. "save": a held search result or recent search becomes Home, Work or a named
	// favourite. "edit": a held favourite is renamed, gets a new place or is removed.
	import { favouriteLabel, favourites, removeFavourite, renameFavourite, replacing, saveFavourite, type FavouriteKind, type FavouriteMenuRequest } from '$lib/favourites';
	import { focusSearchBar } from '$lib/components/SearchBar.svelte';
	import { t } from '$lib/translations';
	import { tick } from 'svelte';

	let { request, dismiss }: { request: FavouriteMenuRequest, dismiss: () => void } = $props();

	// svelte-ignore state_referenced_locally
	const destination = request.kind === 'save' ? request.destination : request.favourite.destination;
	// svelte-ignore state_referenced_locally
	const editing = request.kind === 'edit' ? request.favourite : null;

	let naming = $state(false);
	let name = $state('');
	let input = $state<HTMLInputElement>();

	const title = $derived(editing ? $favouriteLabel(editing) : destination.name);
	const current = (kind: 'home' | 'work') => $favourites.find(f => f.kind === kind && !(editing && f.id === editing.id));

	async function save(kind: FavouriteKind) {
		await saveFavourite(destination, kind);
		dismiss();
	}

	async function askName() {
		name = editing ? editing.label : destination.name;
		naming = true;
		await tick();
		input?.focus();
		input?.select();
	}

	async function saveName() {
		if (!name.trim()) return;
		if (editing) await renameFavourite(editing.id, name);
		else await saveFavourite(destination, 'other', name);
		dismiss();
	}

	function replace() {
		if (!editing) return;
		replacing.set(editing);
		dismiss();
		focusSearchBar();
	}

	async function remove() {
		if (editing) await removeFavourite(editing.id);
		dismiss();
	}

	const button = 'rounded-xl px-4 py-3 bg-background-secondary active:bg-background-tertiary text-left font-bold text-info';
</script>

<div class="w-[340px] max-w-md mx-auto p-6 bg-background rounded-2xl shadow-lg text-left flex flex-col gap-3">
	{#if naming}
		<h1 class="text-lg font-semibold text-info">{$t('multi_fav_name_title')}</h1>
		<input bind:this={input} bind:value={name} type="text" enterkeyhint="done" onkeydown={e => e.key === 'Enter' && saveName()}
			class="w-full rounded-lg border border-background-tertiary bg-background-secondary text-sm text-info placeholder-label focus:border-primary focus:ring-primary" />
		<div class="flex justify-end gap-5 mt-1 font-bold">
			<button class="text-label" onclick={dismiss}>{$t('cancel_button')}</button>
			<button class="text-primary disabled:opacity-40" disabled={!name.trim()} onclick={saveName}>{$t('multi_save')}</button>
		</div>
	{:else}
		<h1 class="text-lg font-semibold text-info truncate">{title}</h1>
		<div class="flex flex-col gap-2">
			{#if editing}
				{#if editing.kind === 'other'}
					<button class={button} onclick={askName}>{$t('multi_fav_rename')}</button>
				{/if}
				<button class={button} onclick={replace}>{$t('multi_fav_replace')}</button>
				<button class={button} onclick={remove}>{$t('multi_fav_remove')}</button>
			{:else}
				<span class="text-xs font-bold uppercase tracking-wide text-label">{$t('multi_fav_save_as')}</span>
				{#each ['home', 'work'] as const as kind}
					{@const old = current(kind)}
					<button class="{button} flex flex-col" onclick={() => save(kind)}>
						<span>{$t(kind === 'home' ? 'multi_fav_home' : 'multi_fav_work')}</span>
						{#if old}
							<span class="text-xs font-medium text-label truncate">{$t('multi_fav_replaces', { name: old.destination.name })}</span>
						{/if}
					</button>
				{/each}
				<button class={button} onclick={askName}>{$t('multi_fav_other')}</button>
			{/if}
		</div>
		<div class="flex justify-end mt-1 font-bold">
			<button class="text-label" onclick={dismiss}>{$t('cancel_button')}</button>
		</div>
	{/if}
</div>