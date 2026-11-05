<script lang="ts">
	// Gira+ Multi: the dock check card under the search bar, from $lib/dock-check
	import { otherAccounts, savedAccounts } from '$lib/accounts';
	import { userCredentials } from '$lib/account';
	import { dismissDockCheck, dockCheck } from '$lib/dock-check';
	import { offerOtherAccount } from '$lib/ghost-trip';
	import { t } from '$lib/translations';
	import IconCircleCheck from '@tabler/icons-svelte/icons/circle-check';
	import { fade, fly } from 'svelte/transition';

	let { top, left = 0 }: { top: number, left?: number } = $props();

	const canSwitch = $derived(otherAccounts($savedAccounts, $userCredentials?.email ?? null).length > 0);

	function useAnotherAccount() {
		if (offerOtherAccount()) dismissDockCheck();
	}
</script>

{#if $dockCheck}
	{@const kind = $dockCheck.kind}
	<div in:fly={{ y: -40, duration: 180 }} out:fade={{ duration: 150 }} class="absolute right-4 z-10 bg-background rounded-2xl p-4 flex flex-col gap-2 text-info"
		style:top="{top}px" style:left="{left + 16}px" style:box-shadow="0px 0px 20px 0px var(--color-shadow)" role="status"
	>
		{#if kind === 'waiting'}
			<div class="flex items-center gap-2.5">
				<div class="w-[22px] h-[22px] shrink-0 rounded-full border-[3px] border-background-tertiary border-t-primary animate-spin"></div>
				<div class="font-bold text-base leading-snug">{$t('multi_dock_waiting_title')}</div>
			</div>
			<div class="text-sm font-medium text-label">{$t('multi_dock_waiting_message')}</div>
		{:else if kind === 'ended'}
			<div class="flex items-center gap-2.5">
				<IconCircleCheck size={24} stroke={2.4} class="text-primary shrink-0" />
				<div class="font-bold text-base leading-snug text-primary">{$t('multi_dock_ended_title')}</div>
			</div>
			<div class="text-sm font-medium text-label">{$t('multi_dock_ended_message')}</div>
		{:else}
			<div class="font-bold text-base leading-snug text-warning">{$t(kind === 'stuck' ? 'multi_dock_stuck_title' : 'multi_dock_problem_title')}</div>
			<div class="text-sm font-medium text-label">{$t(kind === 'stuck' ? 'multi_dock_stuck_message' : 'multi_dock_problem_message')}</div>
			{#if kind === 'stuck' && canSwitch}
				<button class="h-10 mt-1 rounded-lg bg-background-secondary active:bg-background-tertiary text-info text-sm font-bold" onclick={useAnotherAccount}>{$t('multi_dock_other_account')}</button>
			{/if}
			<button class="pt-1 text-sm font-bold text-label text-center" onclick={dismissDockCheck}>{$t('multi_not_now')}</button>
		{/if}
	</div>
{/if}