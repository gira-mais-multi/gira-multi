import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StationInfo } from '$lib/map.svelte';
import type { VaimooBike } from '$lib/vaimoo-api/types';

const mocks = vi.hoisted(() => ({
	stored: new Map<string, string>,
	listeners: [] as { stationId: number, onData: (bikes: VaimooBike[]) => void, stopped: boolean }[],
}));
vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: async ({ key }: { key: string }) => ({ value: mocks.stored.get(key) ?? null }),
		set: async ({ key, value }: { key: string, value: string }) => void mocks.stored.set(key, value),
	},
}));
vi.mock('$lib/vaimoo-api/firestore', () => ({
	subscribeFirestoreBikes: (stationId: number, onData: (bikes: VaimooBike[]) => void) => {
		const listener = { stationId, onData, stopped: false };
		mocks.listeners.push(listener);
		return () => listener.stopped = true;
	},
}));

import { addDockNote, dockNotes, extraFreeDocks, normalizeDock, openStationDockNotes, removeDockNote, withDockNotes } from '$lib/dock-notes';
import { selectedStation } from '$lib/map.svelte';

const bike = (dock: string | null, available = true) => ({ DockingPointVisualId: dock, IsAvaliable: available }) as VaimooBike;
const station = { serialNumber: '481', docks: 10, freeDocks: 3 } as StationInfo;

describe('normalizeDock', () => {
	it('reads dock numbers however they are written, and nothing else', () => {
		expect(normalizeDock('02')).toBe('2');
		expect(normalizeDock(' 12 ')).toBe('12');
		expect(normalizeDock('0')).toBeNull();
		expect(normalizeDock('A3')).toBeNull();
		expect(normalizeDock('')).toBeNull();
		expect(normalizeDock(null)).toBeNull();
	});
});

describe('extraFreeDocks', () => {
	// 10 docks, 5 bikes, EMEL counts 3 free: 2 empty docks are left out (red)
	const bikes = [bike('01'), bike('03'), bike('05', false), bike('06'), bike('08')];

	it('adds a noted dock while it is empty', () => {
		expect(extraFreeDocks(['2'], bikes, 10, 3)).toBe(1);
	});

	it('not while a bike is in it, unlockable or not', () => {
		expect(extraFreeDocks(['3'], bikes, 10, 3)).toBe(0);
		expect(extraFreeDocks(['5'], bikes, 10, 3)).toBe(0);
	});

	it('never counts a dock twice once EMEL counts it again', () => {
		expect(extraFreeDocks(['2', '4', '7'], bikes, 10, 3)).toBe(2);
		expect(extraFreeDocks(['2', '4'], bikes, 10, 5)).toBe(0);
	});

	it('takes a bike with no dock number as filling a dock, and never goes below zero', () => {
		expect(extraFreeDocks(['2', '4'], [...bikes, bike(null)], 10, 3)).toBe(1);
		expect(extraFreeDocks(['2'], bikes, 10, 7)).toBe(0);
	});
});

describe('dock notes', () => {
	beforeEach(() => {
		mocks.stored.clear();
		mocks.listeners.length = 0;
		dockNotes.set({});
		selectedStation.set(null);
	});

	it('are kept on the phone per station, as plain numbers, without repeats', async () => {
		expect(await addDockNote('481', '07')).toBe(true);
		expect(await addDockNote('481', '7')).toBe(true);
		expect(await addDockNote('481', '2')).toBe(true);
		expect(await addDockNote('481', 'x')).toBe(false);
		expect(get(dockNotes)).toEqual({ '481': ['2', '7'] });
		expect(JSON.parse(mocks.stored.get('multi/dockNotes')!)).toEqual({ '481': ['2', '7'] });
		await removeDockNote('481', '2');
		await removeDockNote('481', '7');
		expect(get(dockNotes)).toEqual({});
	});

	it('follow every bike of the open station only while it has notes, and stop when the menu closes', async () => {
		selectedStation.set('481');
		expect(mocks.listeners).toHaveLength(0);
		await addDockNote('481', '2');
		expect(mocks.listeners.map(l => l.stationId)).toEqual([481]);
		mocks.listeners[0].onData([bike('01'), bike('03', false)]);
		// 10 docks, 2 bikes, 3 free: 5 left out, dock 2 empty
		expect(withDockNotes(station, get(openStationDockNotes))).toBe(4);
		// another station's numbers are never touched
		expect(withDockNotes({ ...station, serialNumber: '99' }, get(openStationDockNotes))).toBe(3);
		selectedStation.set(null);
		expect(mocks.listeners[0].stopped).toBe(true);
		expect(withDockNotes(station, get(openStationDockNotes))).toBe(3);
	});
});