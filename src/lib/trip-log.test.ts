import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writable } from 'svelte/store';

const stored = new Map<string, string>;
vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: vi.fn(async ({ key }: { key: string }) => ({ value: stored.get(key) ?? null })),
		set: vi.fn(async ({ key, value }: { key: string, value: string }) => { stored.set(key, value); }),
	},
}));

import { followTrips, formatTripLog, loadTripLog, logBikeState, logTripStart, MAX_TRIPS, saveTripLog, tripLogFor } from './trip-log';

const at = (minute: number) => new Date(2026, 10, 5, 18, minute);
const trip = (code: string, confirmed = true) => ({ code, bikePlate: 'E0980', confirmed, startDate: at(0) });

describe('trip log', () => {
	beforeEach(async () => {
		stored.clear();
		await loadTripLog();
	});
	afterEach(() => vi.useRealTimers());

	it('logs what the bike reports, once per change', () => {
		logTripStart('1', 'E0980', 'a@x.pt', at(0), at(0));
		logBikeState('1', 'RIDING', 0, 1, at(1));
		logBikeState('1', 'RIDING', 0, 1, at(2));
		logBikeState('1', 'LOCKED', 0, null, at(20));
		const events = tripLogFor('1')!.events.map(event => [event.what, event.state ?? null]);
		expect(events).toEqual([['started', null], ['bike', 'RIDING'], ['bike', 'LOCKED']]);
	});

	it('reads as text with times, states and error codes', () => {
		logTripStart('7', 'E0980', null, at(0), at(0));
		logBikeState('7', 'LOCKED', 402, null, at(20));
		expect(formatTripLog(tripLogFor('7')!)).toBe('Trip 7 · bike E0980 · 05/11/2026\n18:00:00 started\n18:20:00 bike: LOCKED, error 402, no trip');
	});

	it('keeps only the newest trips', () => {
		for (let i = 0; i <= MAX_TRIPS; i++) logTripStart(String(i), null, null, at(0));
		expect(tripLogFor('0')).toBeUndefined();
		expect(tripLogFor(String(MAX_TRIPS))).toBeDefined();
	});

	it('survives a restart', async () => {
		logTripStart('9', 'E0980', null, at(0), at(0));
		await saveTripLog();
		logTripStart('10', null, null, at(0));
		await loadTripLog();
		expect(tripLogFor('9')?.bike).toBe('E0980');
		expect(tripLogFor('10')).toBeUndefined();
	});

	it('follows trips: an unlock that never started, a trip, and its dock check', () => {
		const current = writable<ReturnType<typeof trip> | null>(null);
		const dock = writable<{ kind: string, tripCode: string } | null>(null);
		const stop = followTrips(current, dock, () => 'a@x.pt');
		current.set(trip('', false));
		current.set(null);
		current.set(trip('', false));
		current.set(trip('5'));
		dock.set({ kind: 'waiting', tripCode: '5' });
		current.set(null);
		stop();
		expect(tripLogFor(`unlock-${at(0).getTime()}`)?.events.map(event => event.what)).toEqual(['started', 'unlock never confirmed']);
		expect(tripLogFor('5')?.account).toBe('a@x.pt');
		expect(tripLogFor('5')?.events.map(event => event.what)).toEqual(['started', 'dock check: waiting', 'left the app (ended or account switched)']);
	});
});