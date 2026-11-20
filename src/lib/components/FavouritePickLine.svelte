<script lang="ts">
	// Gira+ Multi: the line at the top of the search list while picking a place for a favourite ("Choosing Home ·
	// Cancel"), above the recent searches and the results alike.
	import { SLOT_ICONS } from '$lib/components/FavouriteIcon.svelte';
	import { favouriteLabel, pick } from '$lib/favourites';
	import { t } from '$lib/translations';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import IconReplace from '@tabler/icons-svelte/icons/replace';

	const Icon = $derived(!$pick ? null : $pick.kind === 'add' ? IconPlus : $pick.kind === 'move' ? IconReplace : SLOT_ICONS[$pick.kind]);
	const text = $derived.by(() => {
		if (!$pick) return '';
		if ($pick.kind === 'add') return $t('multi_fav_picking_add');
		if ($pick.kind === 'move') return $t('multi_fav_replace_placeholder', { name: $favouriteLabel($pick.favourite) });
		return $t('multi_fav_picking', { name: $t($pick.kind === 'home' ? 'multi_fav_home' : 'multi_fav_work') });
	});
</script>

{#if $pick && Icon}
	<div class="flex items-center gap-2 mx-4 mb-1.5 pb-2 border-b border-background-tertiary text-xs font-semibold text-info">
		<Icon class="text-primary shrink-0" size={16} stroke={2} />
		<span class="truncate">{text}</span>
		<!-- mousedown keeps the search focused, so the list stays open after cancelling -->
		<button class="ml-auto -mr-2 -my-3 px-2 py-3 font-bold text-label" onmousedown={e => e.preventDefault()} onclick={() => pick.set(null)}>{$t('cancel_button')}</button>
	</div>
{/if}