import { get, writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	others: [] as { email: string }[],
	signIn: vi.fn(),
	rememberSession: vi.fn(),
	getCurrentVaimooTrip: vi.fn(),
	getVaimooSubscriptionUsage: vi.fn(),
	getVaimooRemainingCredit: vi.fn(),
}));
vi.mock('@capacitor/preferences', () => ({
	Preferences: { get: async () => ({ value: null }), set: async () => {}, remove: async () => {} },
}));
vi.mock('$lib/accounts', () => ({
	otherAccounts: () => mocks.others,
	rememberSession: mocks.rememberSession,
	sameEmail: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
	signIn: mocks.signIn,
	switchingTo: writable(null),
}));
vi.mock('$lib/vaimoo-api/client', () => ({
	getCurrentVaimooTrip: mocks.getCurrentVaimooTrip,
	getVaimooSubscriptionUsage: mocks.getVaimooSubscriptionUsage,
	getVaimooRemainingCredit: mocks.getVaimooRemainingCredit,
}));

import { blockedForTrip, checkedLabels, LABEL_MAX_AGE_MS, passState, refreshAccountLabels, SNAPSHOT_MAX_AGE_MS, stopAccountLabels } from './account-labels';
import { forgetSnapshot, knownSnapshot, rememberSnapshot } from './account-snapshot';

const NOW = Date.parse('2026-10-24T12:00:00Z');
const pass = (active: boolean, expiresAt: string) => ({ balance: 2, subscription: { active, expiresAt: new Date(expiresAt), name: 'Passe Anual', status: active ? 'Active' : 'Expired', type: 'Anual' } });
const usage = (expirationDate: string) => ({ currentSubscription: { name: 'Passe Anual' }, expirationDate });

/** A promise the test resolves itself, to hold a request open. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(done => resolve = done);
	return { promise, resolve };
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('passState', () => {
	it('reads the last pass seen: none, valid, marked expired, or past its date since', () => {
		expect(passState({ balance: 0, subscription: null }, NOW)).toBe('none');
		expect(passState(pass(true, '2027-01-01T00:00:00Z'), NOW)).toBe('valid');
		expect(passState(pass(false, '2027-01-01T00:00:00Z'), NOW)).toBe('expired');
		expect(passState(pass(true, '2026-10-24T11:59:00Z'), NOW)).toBe('expired');
	});
});

describe('blockedForTrip', () => {
	it('flags a pass that is not valid or a negative balance, and nothing unknown', () => {
		expect(blockedForTrip('valid', 0)).toBe(false);
		expect(blockedForTrip('valid', -0.5)).toBe(true);
		expect(blockedForTrip('expired', 3)).toBe(true);
		expect(blockedForTrip('none', null)).toBe(true);
		expect(blockedForTrip(null, null)).toBe(false);
	});
});

describe('refreshAccountLabels', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
		vi.clearAllMocks();
		checkedLabels.set({});
		forgetSnapshot();
		mocks.others = [{ email: 'bob@example.com' }];
		mocks.signIn.mockImplementation(async (account: { email: string }) => ({ userId: 2, refreshToken: `${account.email}-new` }));
		mocks.getCurrentVaimooTrip.mockResolvedValue({ activeTripId: 7 });
		mocks.getVaimooSubscriptionUsage.mockResolvedValue([usage('2026-01-01T00:00:00Z')]);
		mocks.getVaimooRemainingCredit.mockResolvedValue({ remainingCredit: -1.2 });
	});
	afterEach(() => {
		stopAccountLabels();
		vi.useRealTimers();
	});

	it('asks only for the running trip when the pass and balance were seen in the last day, and keeps the rotated session', async () => {
		rememberSnapshot('bob@example.com', pass(true, '2027-01-01T00:00:00Z'), NOW - SNAPSHOT_MAX_AGE_MS + 1);
		await refreshAccountLabels();
		expect(get(checkedLabels)['bob@example.com']).toMatchObject({ tripRunning: true });
		expect(mocks.rememberSession).toHaveBeenCalledWith('bob@example.com', { userId: 2, refreshToken: 'bob@example.com-new' });
		expect(mocks.getVaimooSubscriptionUsage).not.toHaveBeenCalled();
		expect(mocks.getVaimooRemainingCredit).not.toHaveBeenCalled();
	});

	it('also asks for the pass and balance when none were seen, or only over a day ago', async () => {
		await refreshAccountLabels();
		expect(knownSnapshot('bob@example.com')).toMatchObject({ balance: -1.2, subscription: { active: false } });
		vi.setSystemTime(NOW + LABEL_MAX_AGE_MS);
		await refreshAccountLabels();
		expect(mocks.getVaimooSubscriptionUsage).toHaveBeenCalledOnce();
		vi.setSystemTime(NOW + SNAPSHOT_MAX_AGE_MS + 1);
		await refreshAccountLabels();
		expect(mocks.getVaimooSubscriptionUsage).toHaveBeenCalledTimes(2);
	});

	it('asks VAIMOO at most once every three minutes per account', async () => {
		await refreshAccountLabels();
		vi.setSystemTime(NOW + LABEL_MAX_AGE_MS - 1);
		await refreshAccountLabels();
		expect(mocks.signIn).toHaveBeenCalledOnce();
		vi.setSystemTime(NOW + LABEL_MAX_AGE_MS);
		await refreshAccountLabels();
		expect(mocks.signIn).toHaveBeenCalledTimes(2);
	});

	it('keeps the previous labels when a check fails', async () => {
		await refreshAccountLabels();
		vi.setSystemTime(NOW + LABEL_MAX_AGE_MS);
		mocks.getCurrentVaimooTrip.mockRejectedValue(new Error('offline'));
		await refreshAccountLabels();
		expect(get(checkedLabels)['bob@example.com']).toMatchObject({ tripRunning: true, checkedAt: NOW });
	});

	it('checks one account at a time', async () => {
		mocks.others = [{ email: 'bob@example.com' }, { email: 'carol@example.com' }];
		const bob = deferred<{ userId: number, refreshToken: string }>();
		mocks.signIn.mockImplementationOnce(() => bob.promise);
		const done = refreshAccountLabels();
		await flush();
		expect(mocks.signIn).toHaveBeenCalledOnce();
		bob.resolve({ userId: 2, refreshToken: 'bob-new' });
		await done;
		expect(mocks.signIn).toHaveBeenCalledTimes(2);
		expect(Object.keys(get(checkedLabels))).toEqual(['bob@example.com', 'carol@example.com']);
	});

	it('stops the checks still to come when the list closes, but keeps a session already rotated', async () => {
		mocks.others = [{ email: 'bob@example.com' }, { email: 'carol@example.com' }];
		const bob = deferred<{ userId: number, refreshToken: string }>();
		mocks.signIn.mockImplementationOnce(() => bob.promise);
		const done = refreshAccountLabels();
		await flush();
		stopAccountLabels();
		bob.resolve({ userId: 2, refreshToken: 'bob-new' });
		await done;
		expect(mocks.rememberSession).toHaveBeenCalledWith('bob@example.com', { userId: 2, refreshToken: 'bob-new' });
		expect(mocks.getCurrentVaimooTrip).not.toHaveBeenCalled();
		expect(mocks.signIn).toHaveBeenCalledOnce();
		expect(get(checkedLabels)).toEqual({});
	});

	it('checks again once a stopped check finishes, if the list opened again meanwhile', async () => {
		const bob = deferred<{ userId: number, refreshToken: string }>();
		mocks.signIn.mockImplementationOnce(() => bob.promise);
		const first = refreshAccountLabels();
		await flush();
		stopAccountLabels();
		void refreshAccountLabels();
		bob.resolve({ userId: 2, refreshToken: 'bob-new' });
		await first;
		await flush();
		await flush();
		expect(mocks.signIn).toHaveBeenCalledTimes(2);
		expect(get(checkedLabels)['bob@example.com']).toMatchObject({ tripRunning: true });
	});
});