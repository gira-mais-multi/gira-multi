import { describe, expect, it, vi } from 'vitest';
import type { VaimooSubscriptionUsage } from '$lib/vaimoo-api/types';

const stored = vi.hoisted(() => new Map<string, string>);
vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: async ({ key }: { key: string }) => ({ value: stored.get(key) ?? null }),
		set: async ({ key, value }: { key: string, value: string }) => void stored.set(key, value),
	},
}));

import { forgetSnapshot, knownSnapshot, knownSnapshots, loadSnapshots, rememberSnapshot, snapshotFrom } from './account-snapshot';

const NOW = Date.parse('2026-10-24T12:00:00Z');

function usage(name: string, expirationDate: string, isExpired?: boolean) {
	return { expirationDate, isExpired, currentSubscription: { name, membershipType: 'yearly' } } as unknown as VaimooSubscriptionUsage;
}

describe('snapshotFrom', () => {
	it('has no pass without usages', () => {
		expect(snapshotFrom(2, [], NOW)).toEqual({ balance: 2, subscription: null });
	});

	it('shows the pass that is still valid', () => {
		const snapshot = snapshotFrom(0, [usage('Old', '2026-01-01T00:00:00Z'), usage('Passe Anual', '2027-01-01T00:00:00Z')], NOW);
		expect(snapshot.subscription).toEqual({
			active: true,
			expiresAt: new Date('2027-01-01T00:00:00Z'),
			name: 'Passe Anual',
			status: 'Active',
			type: 'yearly',
		});
	});

	it('shows the first pass as expired when none is valid, trusting VAIMOO\'s own flag over the date', () => {
		const snapshot = snapshotFrom(-1, [usage('Passe Anual', '2027-01-01T00:00:00Z', true)], NOW);
		expect(snapshot.subscription).toMatchObject({ active: false, status: 'Expired', name: 'Passe Anual' });
	});
});

describe('known snapshots', () => {
	it('remembers each account\'s pass and balance for as long as asked, and forgets them', () => {
		forgetSnapshot();
		rememberSnapshot('Bob@example.com', { balance: 2, subscription: null }, 1_000);
		expect(knownSnapshot('bob@example.com', Infinity, 5_000)).toEqual({ balance: 2, subscription: null });
		expect(knownSnapshot('bob@example.com', 3_000, 5_000)).toBeNull();
		forgetSnapshot('BOB@example.com');
		expect(knownSnapshot('bob@example.com')).toBeNull();
	});

	it('are kept on the phone and come back after a restart, with the pass date', async () => {
		forgetSnapshot();
		stored.set('multi/snapshots', JSON.stringify({ 'bob@example.com': { snapshot: snapshotFrom(-1, [usage('Passe Anual', '2027-01-01T00:00:00Z')], NOW), seenAt: 1_000 }, 'broken@example.com': { snapshot: {} } }));
		await loadSnapshots();
		expect(knownSnapshot('bob@example.com')?.subscription?.expiresAt).toEqual(new Date('2027-01-01T00:00:00Z'));
		expect(knownSnapshot('broken@example.com')).toBeNull();
		rememberSnapshot('carol@example.com', { balance: 3, subscription: null }, 2_000);
		knownSnapshots.set({});
		await loadSnapshots();
		expect(knownSnapshot('carol@example.com')).toEqual({ balance: 3, subscription: null });
	});
});