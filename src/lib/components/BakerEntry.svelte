<script lang="ts">
	// Gira+ Multi: the profile's hidden "Order bolacha Maria" row ($lib/bolacha). Seven taps on the header bring it in at
	// the top of the menu, looking like any of Gira+'s rows; it goes when the profile closes, so it never stays in the
	// way. The countdown shows in the look of Gira+'s own toasts.
	import BolachaIcon from '$lib/components/BolachaIcon.svelte';
	import ProfileMenuEntry from '$lib/components/ProfileMenuEntry.svelte';
	import { baker, bakerToast, BOLACHA_URL, packs, resetBaker } from '$lib/bolacha';
	import { t } from '$lib/translations';
	import type { ComponentType } from 'svelte';
	import IconAlertTriangle from '@tabler/icons-svelte/icons/alert-triangle';
	import { onDestroy } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';

	// Gira+'s menu row still types its icon the Svelte 4 way
	const menuIcon = BolachaIcon as unknown as ComponentType;

	const order = $derived($baker ? packs() : '');
	onDestroy(resetBaker);
</script>

{#if $baker}
	<a href={BOLACHA_URL} transition:slide={{ duration: 400 }}>
		<ProfileMenuEntry icon={menuIcon} text={$t('multi_bolacha_order')} subtext="{$t('multi_bolacha_new')} · {order}" external />
	</a>
{/if}

<!-- one toast at a time: the next count replaces the last in place -->
<div class="fixed z-[110] bottom-10 inset-x-0 grid justify-items-center pointer-events-none">
	{#if $bakerToast}
		{#key $bakerToast.id}
			<div in:fly={{ y: 80 }} out:fade={{ duration: 150 }} class="col-start-1 row-start-1 flex items-center gap-2 w-max max-w-[85vw] font-bold text-sm text-background rounded-2xl py-2.5 px-3 {$baker ? 'bg-primary' : 'bg-warning'}"
				style:box-shadow="0px 0px 20px 0px var(--color-shadow)">
				{#if $baker}<BolachaIcon size={20} class="shrink-0" />{:else}<IconAlertTriangle size={20} stroke={2} class="shrink-0" />{/if}
				<span>{$bakerToast.text}</span>
			</div>
		{/key}
	{/if}
</div>