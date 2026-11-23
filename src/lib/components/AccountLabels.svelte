<script lang="ts">
	// Gira+ Multi: a small tag under a saved account with a trip running. A pass or balance that stops an account from
	// riding is only the orange icon; the profile spells it out
	import { checkedLabels, labelKey } from '$lib/account-labels';
	import { t } from '$lib/translations';
	import { slide } from 'svelte/transition';
	import { currentTrip, DEBUG_TRIP_CODE } from '$lib/trip';

	let { email, active }: { email: string, active: boolean } = $props();

	const tripRunning = $derived(active ? $currentTrip !== null && $currentTrip.code !== DEBUG_TRIP_CODE && !$currentTrip.finished : $checkedLabels[labelKey(email)]?.tripRunning ?? false);
</script>

<!-- Slides in: a tag arriving after the list opened moves the rows below smoothly instead of making them jump -->
{#if tripRunning}
	<div class="flex flex-wrap gap-1 mt-1" transition:slide={{ duration: 150 }}>
		<span class="text-[11px] font-bold text-warning border border-current rounded-full px-2">{$t('multi_trip_running_label')}</span>
	</div>
{/if}