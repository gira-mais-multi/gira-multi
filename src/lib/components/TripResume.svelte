<script lang="ts">
	// Gira+ Multi: under the search bar after the directions were cleared during a trip: tapping it brings them back,
	// the X hides it. Same look and layer as Plan mode's line.
	import { t } from '$lib/translations';
	import { clearedDestination, dismissResume, resumeRoute } from '$lib/trip-guard';
	import { keyboard } from '$lib/ui.svelte';
	import IconRoute from '@tabler/icons-svelte/icons/route';
	import IconX from '@tabler/icons-svelte/icons/x';
	import { fly } from 'svelte/transition';

	let { top }: { top: number } = $props();
</script>

{#if $clearedDestination && !keyboard.visible}
	<div transition:fly={{ y: -12, duration: 200 }} role="status" class="fixed z-[25] left-4 right-[76px] flex items-center gap-3 pl-4 pr-1 py-1.5 bg-background dark:bg-background-secondary rounded-2xl"
		style:top="{top}px" style:box-shadow="0px 0px 20px 0px var(--color-shadow)">
		<IconRoute class="text-primary shrink-0" size={20} stroke={2} />
		<button class="min-w-0 grow text-left leading-tight" onclick={resumeRoute}>
			<div class="text-sm font-semibold text-info truncate">{$t('multi_resume_route')}</div>
			<div class="text-xs font-medium text-label truncate">{$clearedDestination.name ?? $t('selected_location')}</div>
		</button>
		<button class="shrink-0 flex items-center justify-center w-11 h-11 text-label" onclick={dismissResume} aria-label={$t('cancel_button')}>
			<IconX size={20} stroke={2} />
		</button>
	</div>
{/if}