<script lang="ts">
	// Gira+ Multi: the update part of Gira+'s "new version" popup ($lib/updater): a line for the permission note, the
	// download's progress or a failed download, then the green Update button, full width above Gira+'s own buttons
	// (the popup is too narrow for three in a row). Nothing shows when this phone can't install the release itself.
	import { onDestroy } from 'svelte';
	import { t } from '$lib/translations';
	import { popupShown, pressUpdate, updateApk, updateProgress, updateStep } from '$lib/updater';

	popupShown(true);
	onDestroy(() => popupShown(false));

	const label = $derived($updateStep === 'permission' ? 'multi_update_open_settings' : $updateStep === 'failed' ? 'multi_update_retry' : 'multi_update_button');
	const percent = $derived($updateProgress === null ? null : Math.round($updateProgress * 100));
</script>

{#if $updateApk}
	{#if $updateStep === 'downloading'}
		<div class="h-1.5 rounded-full bg-background-tertiary overflow-hidden mt-4">
			<div class="h-full bg-primary rounded-full transition-[width] duration-300 {percent === null ? 'animate-pulse' : ''}" style:width="{percent ?? 25}%"></div>
		</div>
		<p class="text-xs text-label mt-1.5">{percent === null ? $t('multi_update_downloading') : $t('multi_update_downloading_percent', { percent: String(percent) })}</p>
	{:else if $updateStep === 'permission'}
		<p class="text-xs text-label mt-4">{$t('multi_update_permission')}</p>
	{:else if $updateStep === 'failed'}
		<p class="text-xs text-warning mt-4">{$t('multi_update_failed')}</p>
	{/if}
	<button class="w-full h-11 mt-4 rounded-xl bg-primary text-background font-bold transition-opacity {$updateStep === 'downloading' ? 'opacity-40' : ''}"
		disabled={$updateStep === 'downloading'} onclick={() => void pressUpdate()}>{$t(label)}</button>
{/if}