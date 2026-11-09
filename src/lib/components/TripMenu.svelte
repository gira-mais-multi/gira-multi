<script lang="ts">
	// Gira+ Multi: a history trip's menu (false trip mark, trip log, email) and the steps of the email to EMEL
	import { userCredentials } from '$lib/account';
	import type { CompletedTrip } from '$lib/gira-api/models';
	import { isPaidTrip } from '$lib/paid-trips';
	import { t } from '$lib/translations';
	import { formatTripLog, tripLogFor } from '$lib/trip-log';
	import { emailText, falseTrips, saveEmailText, toggleFalseTrip, tripEmail } from '$lib/trip-marks';
	import { keyboard, safeInsets } from '$lib/ui.svelte';
	import { tick } from 'svelte';

	let { trip, email, dismiss }: { trip: CompletedTrip, email: boolean, dismiss: () => void } = $props();

	type Step = 'menu' | 'text' | 'send';

	const account = $derived($userCredentials?.email ?? null);
	const log = $derived(tripLogFor(trip.id));
	const draft = $derived(tripEmail(trip, account, $emailText));

	let editingOnly = false;
	let text = $state('');
	let copied = $state(false);
	let senderCopied = $state(false);

	const nextEmailStep = (): Step => $emailText ? 'send' : 'text';
	// svelte-ignore state_referenced_locally
	let step = $state<Step>(email ? nextEmailStep() : 'menu');

	const pad = (value: number) => String(value).padStart(2, '0');
	const title = $derived(`${pad(trip.startedAt.getHours())}:${pad(trip.startedAt.getMinutes())}${trip.bikeId ? ` · ${trip.bikeId}` : ''}`);

	function openText(only: boolean) {
		editingOnly = only;
		text = $emailText;
		step = 'text';
	}

	async function saveText() {
		await saveEmailText(text);
		if (editingOnly) dismiss();
		else step = $emailText ? 'send' : 'text';
	}

	async function copyLog() {
		if (!log) return;
		await navigator.clipboard.writeText(formatTripLog(log));
		copied = true;
	}

	// The email app picks the sender itself, so the rider copies this account's address to check or switch it there
	async function copySender() {
		if (!account) return;
		await navigator.clipboard.writeText(account);
		senderCopied = true;
	}

	// While the keyboard is open on the text step, the window sits at the top of the visible area instead of the
	// centre. Kept here rather than in Gira+'s Dialog so upstream updates merge cleanly. The phone scrolls the screen
	// to the text box and the Dialog lifts by the keyboard height; pinned to the visible top, neither moves it off screen
	let box = $state<HTMLDivElement>();
	let lifted = $state(false);
	let visibleTop = $state(0);
	const liftedTop = $derived(visibleTop + Math.max(16, $safeInsets.top + 16));

	$effect(() => {
		const viewport = window.visualViewport;
		if (!viewport) return;
		const update = () => visibleTop = viewport.offsetTop;
		update();
		viewport.addEventListener('resize', update);
		viewport.addEventListener('scroll', update);
		return () => {
			viewport.removeEventListener('resize', update);
			viewport.removeEventListener('scroll', update);
		};
	});

	$effect(() => {
		const next = step === 'text' && keyboard.visible;
		if (next !== lifted) void slide(next);
	});

	// Moves between the centre and the top, then plays the jump as a slide from where it was
	async function slide(next: boolean) {
		const before = box?.getBoundingClientRect().top;
		lifted = next;
		await tick();
		const after = box?.getBoundingClientRect().top;
		if (box && before !== undefined && after !== undefined && before !== after) {
			box.animate([{ transform: `translateY(${before - after}px)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
		}
	}
</script>

<div bind:this={box} class="w-[340px] max-w-md mx-auto p-6 bg-background rounded-2xl shadow-lg text-left flex flex-col gap-3"
	class:lifted style:top={lifted ? `${liftedTop}px` : null}>
	{#if step === 'menu'}
		<h1 class="text-lg font-semibold text-info">{title}</h1>
		<div class="flex flex-col gap-2">
			<button class="rounded-xl px-4 py-3 bg-background-secondary active:bg-background-tertiary text-left font-bold text-info" onclick={() => { void toggleFalseTrip(trip.id); dismiss(); }}>
				{$t($falseTrips.has(trip.id) ? 'multi_unmark_false_trip' : 'multi_mark_false_trip')}
			</button>
			{#if log}
				<button class="rounded-xl px-4 py-3 bg-background-secondary active:bg-background-tertiary text-left font-bold text-info" onclick={copyLog}>
					{$t(copied ? 'multi_trip_log_copied' : 'multi_copy_trip_log')}
				</button>
			{/if}
			{#if isPaidTrip(trip)}
				<button class="rounded-xl px-4 py-3 bg-background-secondary active:bg-background-tertiary text-left font-bold text-info" onclick={() => step = nextEmailStep()}>{$t('multi_email_emel')}</button>
			{/if}
			<button class="rounded-xl px-4 py-3 bg-background-secondary active:bg-background-tertiary text-left font-bold text-info" onclick={() => openText(true)}>{$t('multi_edit_email_text')}</button>
		</div>
		<div class="flex justify-end mt-1 font-bold">
			<button class="text-label" onclick={dismiss}>{$t('cancel_button')}</button>
		</div>
	{:else if step === 'text'}
		<h1 class="text-lg font-semibold text-info">{$t('multi_email_text_title')}</h1>
		<textarea bind:value={text} rows="6" placeholder={$t('multi_email_text_placeholder')}
			class="w-full resize-none rounded-lg border border-background-tertiary bg-background-secondary text-sm text-info placeholder-label focus:border-primary focus:ring-primary"
		></textarea>
		<div class="text-xs text-label">{$t('multi_email_text_message')}</div>
		<div class="flex justify-end gap-5 mt-1 font-bold">
			<button class="text-label" onclick={dismiss}>{$t('cancel_button')}</button>
			<button class="text-primary" onclick={saveText}>{$t('multi_save')}</button>
		</div>
	{:else}
		<h1 class="text-lg font-semibold text-info">{$t('multi_email_send_title')}</h1>
		{#if account}
			<div class="rounded-xl bg-background-secondary px-4 py-3 flex flex-col gap-1">
				<div class="text-xs text-label">{$t('multi_email_send_from')}</div>
				<div class="flex items-center justify-between gap-3">
					<div class="font-bold text-info break-all">{account}</div>
					<button class="shrink-0 text-sm font-bold text-primary" onclick={copySender}>{$t(senderCopied ? 'multi_copied' : 'multi_copy')}</button>
				</div>
			</div>
			<div class="text-xs text-label">{$t('multi_email_send_from_hint')}</div>
		{/if}
		<div class="text-sm text-label">{$t('multi_email_send_message')}</div>
		<pre class="whitespace-pre-wrap font-sans text-xs text-info bg-background-secondary rounded-lg p-3 max-h-44 overflow-y-auto">{draft.body}</pre>
		<div class="flex justify-end items-center gap-5 mt-1 font-bold">
			<button class="text-label" onclick={() => openText(false)}>{$t('multi_edit_email_text')}</button>
			<a href={draft.url} class="text-primary" onclick={dismiss}>{$t('multi_open_email')}</a>
		</div>
	{/if}
</div>

<style>
	.lifted {
		position: fixed;
		left: 0;
		right: 0;
	}
</style>