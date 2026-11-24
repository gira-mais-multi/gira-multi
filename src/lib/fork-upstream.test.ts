// Gira+ Multi: checks that Gira+ still works the way the fork relies on. A rebase onto a new Gira+ release can go
// through without a conflict and still break the fork quietly; these tests make the release workflow stop instead
// (it opens the "Automatic release failed" issue). When one fails, read the Gira+ change it names and adapt the fork.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VaimooCurrentTrip, VaimooSubscriptionUsage } from '$lib/vaimoo-api/types';

const mocks = vi.hoisted(() => ({
	preferences: new Map<string, string>,
	secure: new Map<string, unknown>,
	getCurrentVaimooTrip: vi.fn(),
	getVaimooRemainingCredit: vi.fn(),
	getVaimooSubscriptionUsage: vi.fn(),
}));

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: async ({ key }: { key: string }) => ({ value: mocks.preferences.get(key) ?? null }),
		set: async ({ key, value }: { key: string, value: string }) => void mocks.preferences.set(key, value),
		remove: async ({ key }: { key: string }) => void mocks.preferences.delete(key),
	},
}));
// Gira+'s secure storage from its commit c10dad2 on; not installed before that, which is fine for a mock
vi.mock('@aparajita/capacitor-secure-storage', () => ({
	KeychainAccess: { afterFirstUnlock: 2 },
	SecureStorage: {
		get: async (key: string) => mocks.secure.get(key) ?? null,
		set: async (key: string, data: unknown) => void mocks.secure.set(key, data),
		remove: async (key: string) => void mocks.secure.delete(key),
	},
}));
vi.mock('$lib/account', () => ({
	currentSession: () => ({ accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 60_000, userId: 42, user: { userId: 42 } }),
	refreshToken: vi.fn(async () => false),
}));
vi.mock('$lib/accounts', () => ({ otherAccounts: () => [], rememberSession: vi.fn(), sameEmail: vi.fn(), signIn: vi.fn(), switchingTo: null }));
vi.mock('$lib/vaimoo-api/firestore', () => ({}));
vi.mock('$lib/vaimoo-api/client', () => ({
	VaimooApiError: class VaimooApiError extends Error {},
	getCurrentVaimooTrip: mocks.getCurrentVaimooTrip,
	getVaimooRemainingCredit: mocks.getVaimooRemainingCredit,
	getVaimooSubscriptionUsage: mocks.getVaimooSubscriptionUsage,
}));

import { getAccountSnapshot, getActiveTrip } from '$lib/gira-api/api';
import { hasRunningTrip, passState } from '$lib/account-labels';
import { snapshotFrom } from '$lib/account-snapshot';
import { startupLogin, upstreamCredentials } from '$lib/startup-login';

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');
const secureStorage = Object.keys(upstreamCredentials).length > 0;
const alice = { email: 'alice@example.com', password: 'alice-pw' };
const bob = { email: 'bob@example.com', password: 'bob-pw' };

describe('Gira+ opens with the login the fork points it at (Main account, a trip still running)', () => {
	beforeEach(() => {
		mocks.preferences.clear();
		mocks.secure.clear();
	});

	it.runIf(!secureStorage)('v1.7.1: Gira+ reads its login from the email and password Preferences keys', () => {
		const account = source('./account.ts');
		expect(account).toMatch(/Preferences\.get\(\{\s*key:\s*'email'\s*\}\)/);
		expect(account).toMatch(/Preferences\.get\(\{\s*key:\s*'password'\s*\}\)/);
	});

	it.runIf(secureStorage)('secure storage: Gira+ reads its login through loadCredentials', () => {
		const account = source('./account.ts');
		expect(account).toMatch(/from '\$lib\/credentials'/);
		expect(account).toMatch(/await loadCredentials\(\)/);
	});

	it.runIf(secureStorage)('secure storage: the first start after the update moves the old login, then opens on the chosen one', async () => {
		const { loadCredentials } = Object.values(upstreamCredentials)[0];
		mocks.preferences.set('email', alice.email);
		mocks.preferences.set('password', alice.password);
		const gira = startupLogin();
		expect(await gira.read()).toBe(alice.email);
		expect(mocks.preferences.has('password')).toBe(false);
		await gira.write(bob);
		expect(await loadCredentials()).toEqual(bob);
	});

	it.runIf(secureStorage)('secure storage: later starts switch the saved login too', async () => {
		const { loadCredentials, saveCredentials } = Object.values(upstreamCredentials)[0];
		await saveCredentials(alice);
		const gira = startupLogin();
		expect(await gira.read()).toBe(alice.email);
		await gira.write(bob);
		expect(await loadCredentials()).toEqual(bob);
	});
});

describe('the map hold acts while the finger is down (the map hold of Gira+ acts on release)', () => {
	const map = source('./components/Map.svelte');

	it('Gira+ hands every map hold, on release, to tripHoldPinDrop, which first asks the fork (pickHold)', () => {
		expect(map).toMatch(/e\.type === 'pointerup' && held >= TRIP_PIN_HOLD_ms[^\n]*tripHoldPinDrop\(e\)/);
		expect(map).toMatch(/function tripHoldPinDrop\(e: PointerEvent\) \{\s*if \(mapLoaded && pickHold\(/);
		expect(map).toMatch(/watchMapHold\(map\.getCanvasContainer\(\), tripHoldPinDrop\)/);
	});

	it('the pin drop of Gira+ shows the route within the second the pin of the fork stays', () => {
		const delay = Number(map.match(/const PIN_DROP_DELAY_ms = (\d+);/)?.[1]);
		expect(delay).toBeLessThan(1000);
	});
});

describe('the rules the fork copied from Gira+ still match it', () => {
	const usage = (name: string, expirationDate: string, isExpired?: boolean): VaimooSubscriptionUsage => ({
		currentSubscription: { name, membershipType: 'Anual' },
		expirationDate,
		...isExpired === undefined ? {} : { isExpired },
	}) as VaimooSubscriptionUsage;
	const passes: [string, VaimooSubscriptionUsage[]][] = [
		['no pass', []],
		['a valid pass', [usage('Passe Anual', '2099-01-01T00:00:00Z')]],
		['a pass past its date', [usage('Passe Anual', '2001-01-01T00:00:00Z')]],
		['a pass VAIMOO marks expired early', [usage('Passe Anual', '2099-01-01T00:00:00Z', true)]],
		['an expired pass before a valid one', [usage('Passe Diário', '2001-01-01T00:00:00Z'), usage('Passe Mensal', '2099-01-01T00:00:00Z')]],
		['two expired passes', [usage('Passe Diário', '2001-01-01T00:00:00Z'), usage('Passe Mensal', '2002-01-01T00:00:00Z')]],
	];

	it.each(passes)('pass and balance (snapshotFrom, passState) with %s', async (_, usages) => {
		mocks.getVaimooRemainingCredit.mockResolvedValue({ remainingCredit: -1.25 });
		mocks.getVaimooSubscriptionUsage.mockResolvedValue(usages);
		const upstream = await getAccountSnapshot();
		expect(snapshotFrom(-1.25, usages)).toEqual(upstream);
		expect(passState(snapshotFrom(-1.25, usages))).toBe(upstream.subscription === null ? 'none' : upstream.subscription.active ? 'valid' : 'expired');
	});

	it.each([null, 0, -1, 7])('a running trip (hasRunningTrip) with activeTripId %s', async activeTripId => {
		const trip = { activeTripId, visualId: 'E0980', tripStartDate: '2026-09-15T21:20:22.308', bikePcbBikeState: 'RUNNING' };
		mocks.getCurrentVaimooTrip.mockResolvedValue(trip);
		expect(hasRunningTrip(trip as VaimooCurrentTrip)).toBe(await getActiveTrip() !== null);
	});
});