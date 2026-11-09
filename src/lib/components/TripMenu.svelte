<script lang="ts">
	// Gira+ Multi: a history trip's menu (false trip mark, trip log, email) and the steps of the email to EMEL
	import { userCredentials } from '$lib/account';
	import { mainAccount, sameEmail } from '$lib/accounts';
	import type { CompletedTrip } from '$lib/gira-api/models';
	import { isPaidTrip } from '$lib/paid-trips';
	import { t } from '$lib/translations';
	import { formatTripLog, tripLogFor } from '$lib/trip-log';
	import { emailText, falseTrips, saveEmailText, toggleFalseTrip, tripEmail } from '$lib/trip-marks';

	let { trip, email, dismiss }: { trip: CompletedTrip, email: boolean, dismiss: () => void } = $props();

	type Step = 'menu' | 'warn' | 'text' | 'send';

	const account = $derived($userCredentials?.email ?? null);
	const notMain = $derived($mainAccount !== null && account !== null && !sameEmail($mainAccount, account));
	const log = $derived(tripLogFor(trip.id));
	const draft = $derived(tripEmail(trip, account, $emailText));

	let warned = false;
	let editingOnly = false;
	let text = $state('');
	let copied = $state(false);

	const nextEmailStep = (): Step => notMain && !warned ? 'warn' : $emailText ? 'send' : 'text';
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
</script>

<div class="w-[340px] max-w-md mx-auto p-6 bg-background rounded-2xl shadow-lg text-left flex flex-col gap-3">
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
	{:else if step === 'warn'}
		<h1 class="text-lg font-semibold text-warning">{$t('multi_email_not_main_title')}</h1>
		<div class="text-sm text-label">{$t('multi_email_not_main_message', { email: account ?? '' })}</div>
		<div class="flex justify-end gap-5 mt-1 font-bold">
			<button class="text-label" onclick={dismiss}>{$t('cancel_button')}</button>
			<button class="text-primary" onclick={() => { warned = true; step = nextEmailStep(); }}>{$t('multi_continue')}</button>
		</div>
	{:else if step === 'text'}
		<h1 class="text-lg font-semibold text-info">{$t('multi_email_text_title')}</h1>
		<!-- The text box comes before the hint: kept high, the keyboard doesn't push the whole screen up on top of Gira+'s own lift -->
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
		<div class="text-sm text-label">{$t('multi_email_send_message')}</div>
		<pre class="whitespace-pre-wrap font-sans text-xs text-info bg-background-secondary rounded-lg p-3 max-h-60 overflow-y-auto">{draft.body}</pre>
		<div class="flex justify-end items-center gap-5 mt-1 font-bold">
			<button class="text-label" onclick={() => openText(false)}>{$t('multi_edit_email_text')}</button>
			<a href={draft.url} class="text-primary" onclick={dismiss}>{$t('multi_open_email')}</a>
		</div>
	{/if}
</div>