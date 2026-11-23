<script lang="ts">
	// Gira+ Multi: small tags under a saved account: trip running, pass expired or missing, negative balance (the last
	// pass and balance seen, for the other accounts)
	import { accountInfo } from '$lib/account';
	import { checkedLabels, labelKey, passState, type PassState } from '$lib/account-labels';
	import { knownSnapshots } from '$lib/account-snapshot';
	import { t } from '$lib/translations';
	import { slide } from 'svelte/transition';
	import { currentTrip, DEBUG_TRIP_CODE } from '$lib/trip';

	let { email, active }: { email: string, active: boolean } = $props();

	const checked = $derived(active ? null : $checkedLabels[labelKey(email)] ?? null);
	const tripRunning = $derived(active ? $currentTrip !== null && $currentTrip.code !== DEBUG_TRIP_CODE && !$currentTrip.finished : checked?.tripRunning ?? false);
	const known = $derived(active ? null : $knownSnapshots[labelKey(email)]?.snapshot ?? null);
	const pass = $derived(active ? activePass() : known && passState(known));
	const balance = $derived(active ? $accountInfo?.balance ?? null : known?.balance ?? null);
	const negative = $derived(balance !== null && balance < 0);

	function activePass(): PassState | null {
		if ($accountInfo === null) return null;
		if ($accountInfo.subscription === null) return 'none';
		return $accountInfo.subscription.active ? 'valid' : 'expired';
	}
</script>

<!-- Slides in: a tag arriving after the list opened moves the rows below smoothly instead of making them jump -->
{#if tripRunning || pass === 'expired' || pass === 'none' || negative}
	<div class="flex flex-wrap gap-1 mt-1" transition:slide={{ duration: 150 }}>
		{#if tripRunning}
			<span class="text-[11px] font-bold text-warning border border-current rounded-full px-2">{$t('multi_trip_running_label')}</span>
		{/if}
		{#if pass === 'expired' || pass === 'none'}
			<span class="text-[11px] font-bold text-red-500 border border-current rounded-full px-2">{$t(pass === 'expired' ? 'multi_pass_expired_label' : 'multi_no_pass_label')}</span>
		{/if}
		{#if negative}
			<span class="text-[11px] font-bold text-red-500 border border-current rounded-full px-2">{$t('multi_negative_balance_label')}</span>
		{/if}
	</div>
{/if}