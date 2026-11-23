// Gira+ Multi: "trip running" and pass labels for the saved accounts. The active account's come from what the app
// already loaded. For each other account, the pass and balance are the last ones the app saw (kept on the phone), so
// only the running trip is asked of VAIMOO: when a list of accounts is shown, at most once every LABEL_MAX_AGE_MS per
// account, one account at a time, with two of the requests Gira+ makes for the active account (session refresh and
// current trip). The pass and balance are asked again too when the last ones seen are old or say the account can't
// ride, so one fixed elsewhere shows up. Closing the list or picking an account stops the checks still to come.
import { accountSnapshotFor, knownSnapshot, rememberSnapshot } from '$lib/account-snapshot';
import { otherAccounts, rememberSession, sameEmail, signIn, switchingTo } from '$lib/accounts';
import type { AccountSnapshot } from '$lib/gira-api/models';
import { getCurrentVaimooTrip, VaimooNetworkError } from '$lib/vaimoo-api/client';
import type { VaimooCurrentTrip } from '$lib/vaimoo-api/types';
import { get, writable } from 'svelte/store';

export const LABEL_MAX_AGE_MS = 3 * 60_000;
/** A pass and balance older than this are asked again with the trip, so one bought or topped up elsewhere shows up. */
export const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60_000;

export type PassState = 'valid' | 'expired' | 'none';
export type AccountLabels = { tripRunning: boolean, checkedAt: number };

/** The last trip check of each other account, by lower-cased email. */
export const checkedLabels = writable<Record<string, AccountLabels>>({});

export const labelKey = (email: string) => email.trim().toLowerCase();

/** Same rule as upstream's getActiveTrip. */
export const hasRunningTrip = (trip: VaimooCurrentTrip) => trip.activeTripId != null && trip.activeTripId > 0;

/**
 * The account can't start a trip: no valid pass, or a negative balance (which turns Gira+'s profile button orange).
 * Anything not known yet counts as fine.
 */
export const blockedForTrip = (pass: PassState | null, balance: number | null) => (pass !== null && pass !== 'valid') || (balance !== null && balance < 0);

/** The account can't start a trip, by the pass and balance last seen; nothing seen yet counts as fine. */
export const cantRide = (snapshot: AccountSnapshot | null | undefined, now = Date.now()) => snapshot != null && blockedForTrip(passState(snapshot, now), snapshot.balance);

/** The pass as Gira+'s profile shows it (active or not), and expired once its date has passed since it was seen. */
export function passState(snapshot: AccountSnapshot, now = Date.now()): PassState {
	const subscription = snapshot.subscription;
	if (subscription === null) return 'none';
	return subscription.active && subscription.expiresAt.getTime() > now ? 'valid' : 'expired';
}

let generation = 0;
let running: { generation: number, done: Promise<void> } | null = null;
let rerunFor: number | null = null;

/** Stop the checks still to come, when the list closes or an account is picked. */
export function stopAccountLabels() {
	generation++;
}

/**
 * Check the other accounts whose trip check is older than LABEL_MAX_AGE_MS. A failed check keeps the previous labels and
 * waits as long as a successful one before it's tried again; without a connection the rest wait too.
 */
export function refreshAccountLabels(): Promise<void> {
	if (running && running.generation !== generation) {
		// A stopped run is still finishing its request; check again after it, if this list is still open then
		rerunFor = generation;
		return running.done;
	}
	if (!running) {
		const run = generation;
		const done = checkDue(run).finally(() => {
			running = null;
			if (rerunFor === generation) void refreshAccountLabels();
			rerunFor = null;
		});
		running = { generation: run, done };
	}
	return running.done;
}

async function checkDue(run: number) {
	const checked = get(checkedLabels);
	const due = otherAccounts().filter(account => Date.now() - (checked[labelKey(account.email)]?.checkedAt ?? -Infinity) >= LABEL_MAX_AGE_MS);
	for (const account of due) {
		if (run !== generation) return;
		const switching = get(switchingTo);
		if (switching && sameEmail(switching, account.email)) continue;
		try {
			const session = await signIn(account);
			// Always keep the rotated session, even when stopped meanwhile: the saved one no longer works
			rememberSession(account.email, session);
			if (run !== generation) return;
			const known = knownSnapshot(account.email, SNAPSHOT_MAX_AGE_MS);
			const stale = known === null || cantRide(known);
			const [trip, snapshot] = await Promise.all([getCurrentVaimooTrip(session), stale ? accountSnapshotFor(session) : null]);
			// The same pass and balance also make the profile's switch to this account quicker
			if (snapshot) rememberSnapshot(account.email, snapshot);
			checkedLabels.update(all => ({ ...all, [labelKey(account.email)]: { tripRunning: hasRunningTrip(trip), checkedAt: Date.now() } }));
		} catch (error) {
			console.debug('Could not check a saved account', error);
			const key = labelKey(account.email);
			checkedLabels.update(all => ({ ...all, [key]: { tripRunning: all[key]?.tripRunning ?? false, checkedAt: Date.now() } }));
			if (error instanceof VaimooNetworkError) return;
		}
	}
}