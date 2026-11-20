import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { favourites, pick, resetFavouritesForTest } from '$lib/favourites';
import { stations, type StationInfo } from '$lib/map.svelte';
import { pickStation, pickTap } from '$lib/map-pick';

vi.mock('$lib/geocoding', () => ({ reverseGeocode: vi.fn(async () => null) }));

const station: StationInfo = {
	code: '481',
	name: '481 - Cais do Sodré',
	description: null,
	latitude: 38.7063,
	longitude: -9.1449,
	bikes: 3,
	docks: 20,
	freeDocks: 17,
	serialNumber: 'sodre',
	assetStatus: 'active',
};

describe('choosing a favourite\'s place on the map', () => {
	beforeEach(() => {
		localStorage.clear();
		resetFavouritesForTest();
		stations.value = [station];
	});

	it('a station tap is picked instead of opening it; taps right after the pick still belong to it', async () => {
		pick.set({ kind: 'home' });
		expect(pickTap()).toBe(true); // an empty spot: nothing saved, no pin
		expect(get(favourites)).toEqual([]);

		expect(pickStation('sodre')).toBe(true);
		await vi.waitFor(() => expect(get(favourites).map(f => [f.kind, f.destination.name])).toEqual([['home', '481 - Cais do Sodré']]));
		// the release of the same gesture is swallowed, so it can't drop a pin or open the station
		expect(pickTap()).toBe(true);
		expect(pickStation('sodre')).toBe(true);
	});

	it('leaves the map alone when not choosing', () => {
		vi.useFakeTimers({ now: Date.now() + 60_000 });
		try {
			expect(pickTap()).toBe(false);
			expect(pickStation('sodre')).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});
});