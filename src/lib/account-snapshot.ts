// Gira+ Multi: upstream's account snapshot (balance and pass) for any session, not only the active one. Used to load a
// saved account's pass and balance before switching to it, so the profile changes all at once. The rules are copied
// from getAccountSnapshot in gira-api/api.ts, which only works with the active session; keep the two in step.
import type { AccountSnapshot } from '$lib/gira-api/models';
import { getVaimooRemainingCredit, getVaimooSubscriptionUsage } from '$lib/vaimoo-api/client';
import type { VaimooSession, VaimooSubscriptionUsage } from '$lib/vaimoo-api/types';
import { Preferences } from '@capacitor/preferences';
import { get, writable } from 'svelte/store';

export const isUsageExpired = (item: VaimooSubscriptionUsage, now = Date.now()) => item.isExpired ?? new Date(item.expirationDate).getTime() <= now;

export function snapshotFrom(remainingCredit: number, usage: VaimooSubscriptionUsage[], now = Date.now()): AccountSnapshot {
	const activeUsage = usage.find(item => !isUsageExpired(item, now)) ?? usage[0];
	return {
		balance: remainingCredit,
		subscription: activeUsage ? {
			active: !isUsageExpired(activeUsage, now),
			expiresAt: new Date(activeUsage.expirationDate),
			name: activeUsage.currentSubscription.name,
			status: isUsageExpired(activeUsage, now) ? 'Expired' : 'Active',
			type: activeUsage.currentSubscription.membershipType ?? 'unknown',
		} : null,
	};
}

export type KnownSnapshot = { snapshot: AccountSnapshot, seenAt: number };

/**
 * The last pass and balance seen for each saved account, by lower-cased email, with when they were seen. Kept on the
 * phone, so the map menu can label the other accounts after a restart without asking VAIMOO.
 */
export const knownSnapshots = writable<Record<string, KnownSnapshot>>({});

const SNAPSHOTS_KEY = 'multi/snapshots';
const key = (email: string) => email.trim().toLowerCase();
let loaded = false;

function save() {
	if (loaded) void Preferences.set({ key: SNAPSHOTS_KEY, value: JSON.stringify(get(knownSnapshots)) });
}

function revive(entry: unknown): KnownSnapshot | null {
	const { snapshot, seenAt } = (entry ?? {}) as Partial<KnownSnapshot>;
	if (typeof seenAt !== 'number' || typeof snapshot?.balance !== 'number') return null;
	const subscription = snapshot.subscription ? { ...snapshot.subscription, expiresAt: new Date(snapshot.subscription.expiresAt) } : null;
	if (subscription && isNaN(subscription.expiresAt.getTime())) return null;
	return { snapshot: { balance: snapshot.balance, subscription }, seenAt };
}

/** Load the pass and balance kept on the phone; anything seen since the app started wins. */
export async function loadSnapshots() {
	try {
		const { value } = await Preferences.get({ key: SNAPSHOTS_KEY });
		const stored = Object.entries(JSON.parse(value ?? '{}') as Record<string, unknown>)
			.flatMap(([email, entry]) => {
				const known = revive(entry);
				return known ? [[email, known] as const] : [];
			});
		knownSnapshots.update(current => ({ ...Object.fromEntries(stored), ...current }));
	} catch (error) {
		console.debug('Could not read the saved accounts\' pass and balance', error);
	}
	loaded = true;
	save();
}

/** Keep an account's pass and balance from a request the app made anyway (the menu's check, or leaving the account). */
export function rememberSnapshot(email: string, snapshot: AccountSnapshot, seenAt = Date.now()) {
	knownSnapshots.update(all => ({ ...all, [key(email)]: { snapshot, seenAt } }));
	save();
}

/** Forget an account's pass and balance (when it's removed), or every account's without an email. */
export function forgetSnapshot(email?: string) {
	knownSnapshots.update(all => email === undefined ? {} : Object.fromEntries(Object.entries(all).filter(([known]) => known !== key(email))));
	save();
}

/** The account's last known pass and balance, if seen within `maxAgeMs`. */
export function knownSnapshot(email: string, maxAgeMs = Infinity, now = Date.now()): AccountSnapshot | null {
	const entry = get(knownSnapshots)[key(email)];
	return entry && now - entry.seenAt <= maxAgeMs ? entry.snapshot : null;
}

export async function accountSnapshotFor(session: VaimooSession): Promise<AccountSnapshot> {
	const [credit, usage] = await Promise.all([getVaimooRemainingCredit(session), getVaimooSubscriptionUsage(session)]);
	return snapshotFrom(credit.remainingCredit, usage);
}