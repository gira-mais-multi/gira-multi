<script lang="ts">
	// Gira+ Multi: while choosing a favourite's place, a small pill under the search bar says what's being chosen and
	// how ("Mantenha premido no mapa"), with an X to cancel. It stays while the search is closed, so the place can be held on
	// the map; a tap on the map (which does nothing while choosing) makes the instruction flash.
	import { SLOT_ICONS } from '$lib/components/FavouriteIcon.svelte';
	import { cancelPick, favouriteLabel, pick, pickNudge } from '$lib/favourites';
	import { t } from '$lib/translations';
	import { keyboard } from '$lib/ui.svelte';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import IconReplace from '@tabler/icons-svelte/icons/replace';
	import IconRoute from '@tabler/icons-svelte/icons/route';
	import IconX from '@tabler/icons-svelte/icons/x';
	import { fly } from 'svelte/transition';

	let { top }: { top: number } = $props();

	const Icon = $derived(!$pick ? null : $pick.kind === 'add' ? IconPlus : $pick.kind === 'move' ? IconReplace : $pick.kind === 'from' ? IconRoute : SLOT_ICONS[$pick.kind]);
	const title = $derived.by(() => {
		if (!$pick) return '';
		if ($pick.kind === 'add') return $t('multi_fav_picking_add');
		if ($pick.kind === 'from') return $t('multi_plan_picking');
		if ($pick.kind === 'move') return $t('multi_fav_replace_placeholder', { name: $favouriteLabel($pick.favourite) });
		return $t('multi_fav_picking', { name: $t($pick.kind === 'home' ? 'multi_fav_home' : 'multi_fav_work') });
	});

	// The instruction turns green for a moment after a tap on the map
	let flash = $state(false);
	let lastNudge = $pickNudge;
	$effect(() => {
		if ($pickNudge === lastNudge) return;
		lastNudge = $pickNudge;
		flash = true;
		const timer = setTimeout(() => flash = false, 900);
		return () => clearTimeout(timer);
	});
</script>

<!-- hidden while the search is open: its list has its own "Choosing…" line -->
{#if $pick && Icon && !keyboard.visible}
	<div transition:fly={{ y: -12, duration: 200 }} role="status"
		class="fixed z-[25] left-4 right-[76px] flex items-center gap-3 pl-4 pr-1 py-1.5 bg-background dark:bg-background-secondary rounded-2xl"
		style:top="{top}px" style:box-shadow="0px 0px 20px 0px var(--color-shadow)">
		<Icon class="text-primary shrink-0" size={20} stroke={2} />
		<div class="min-w-0 grow leading-tight">
			<div class="text-sm font-semibold text-info truncate">{title}</div>
			<div class="text-xs font-medium truncate transition-colors duration-200 {flash ? 'text-primary font-bold' : 'text-label'}" class:animate-nudge={flash}>{$t('multi_fav_pick_hold')}</div>
		</div>
		<button class="shrink-0 flex items-center justify-center w-11 h-11 text-label" onclick={cancelPick} aria-label={$t('cancel_button')}>
			<IconX size={20} stroke={2} />
		</button>
	</div>
{/if}

<style>
	.animate-nudge {
		animation: nudge 0.35s ease-in-out;
	}
	@keyframes nudge {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-3px); }
		75% { transform: translateX(3px); }
	}
	@media (prefers-reduced-motion: reduce) {
		.animate-nudge {
			animation: none;
		}
	}
</style>