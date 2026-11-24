<script lang="ts">
	// Gira+ Multi: a station's noted docks, the red ones that still take a bike. Opened by holding the free-docks number
	// in the station menu, the only place they show: the menu counts them silently.
	import { addDockNote, dockNotes, removeDockNote } from '$lib/dock-notes';
	import type { StationInfo } from '$lib/map.svelte';
	import { t } from '$lib/translations';
	import IconX from '@tabler/icons-svelte/icons/x';

	let { station, dismiss }: { station: StationInfo, dismiss: () => void } = $props();

	const noted = $derived($dockNotes[station.serialNumber] ?? []);
	let text = $state('');
	let invalid = $state(false);

	async function add() {
		const number = Number(text.trim());
		// A dock past the station's last one is a typo
		if (station.docks > 0 && number > station.docks) {
			invalid = true;
			return;
		}
		invalid = !await addDockNote(station.serialNumber, text);
		if (!invalid) text = '';
	}
</script>

<div class="w-[340px] max-w-md mx-auto p-6 bg-background rounded-2xl shadow-lg text-left flex flex-col gap-3">
	<div class="flex justify-between items-start gap-3">
		<div class="min-w-0">
			<h1 class="text-lg font-semibold text-info">{$t('multi_dock_notes_title')}</h1>
			<div class="text-xs font-semibold text-label truncate">{station.name}</div>
		</div>
		<IconX class="text-label hover:text-primary cursor-pointer shrink-0" size="24" stroke="1.5" onclick={dismiss} aria-label={$t('multi_close_menu')} />
	</div>
	<div class="text-sm text-label">{$t('multi_dock_notes_message')}</div>
	{#if noted.length}
		<div class="flex flex-wrap gap-2">
			{#each noted as dock (dock)}
				<button class="flex items-center gap-1.5 rounded-xl bg-background-secondary active:bg-background-tertiary pl-3.5 pr-2.5 py-1.5 text-info"
					onclick={() => removeDockNote(station.serialNumber, dock)} aria-label={$t('multi_dock_notes_remove', { dock })}>
					<span class="font-bold text-2xl leading-none tabular-nums">{dock.padStart(2, '0')}</span><!-- as the station numbers its docks -->
					<IconX class="text-label" size={16} stroke={2} />
				</button>
			{/each}
		</div>
	{/if}
	<form class="flex items-center gap-3" onsubmit={event => { event.preventDefault(); void add(); }}>
		<input bind:value={text} type="text" inputmode="numeric" enterkeyhint="done" maxlength="3" oninput={() => invalid = false}
			placeholder={$t('multi_dock_notes_placeholder')} aria-label={$t('multi_dock_notes_placeholder')}
			class="grow min-w-0 h-11 rounded-xl border-none bg-background-secondary px-3.5 text-[15px] font-semibold text-info placeholder-label ring-[1.5px] ring-inset {invalid ? 'ring-red-500 focus:ring-red-500' : 'ring-transparent focus:ring-primary'} focus:ring-[1.5px] focus:ring-inset" />
		<button type="submit" class="shrink-0 font-bold text-primary disabled:text-label" disabled={text.trim() === ''}>{$t('multi_dock_notes_add')}</button>
	</form>
	<div class="flex justify-end gap-5 mt-1 font-bold">
		<button class="text-label" onclick={dismiss}>{$t('multi_dock_notes_done')}</button>
	</div>
</div>