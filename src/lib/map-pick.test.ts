import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { favourites, favouriteSheetOpen, pick, resetFavouritesForTest } from '$lib/favourites';
import { stations, type StationInfo } from '$lib/map.svelte';
import { PIN_AFTER_SAVE_MS, pickHold, pickStation, pickTap } from '$lib/map-pick';
import { currentTrip, type ActiveTrip } from '$lib/trip';
import type maplibregl from 'maplibre-gl';

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

	it('outside a trip, a hold on an empty spot sets the destination there; on a station it leaves the tap to it', () => {
		vi.useFakeTimers({ now: Date.now() + 60_000 });
		try {
			let onStation = false;
			const map = {
				getCanvasContainer: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0 }) }),
				queryRenderedFeatures: () => onStation ? [{ properties: { serialNumber: 'sodre' } }] : [],
				unproject: ([x, y]: [number, number]) => ({ lat: 38 + y / 1000, lng: -9 + x / 1000 }),
			} as unknown as maplibregl.Map;
			const dropped: { lat: number, lng: number }[] = [];
			const hold = { clientX: 100, clientY: 200 } as PointerEvent;

			expect(pickHold(map, hold, ['points'], at => dropped.push(at))).toBe(true);
			expect(dropped).toEqual([{ lat: 38.2, lng: -8.9 }]);

			onStation = true;
			expect(pickHold(map, hold, ['points'], at => dropped.push(at))).toBe(true);
			expect(dropped).toHaveLength(1);

			// during a trip, Gira+'s own hold handles it
			currentTrip.set({} as ActiveTrip);
			expect(pickHold(map, hold, ['points'], at => dropped.push(at))).toBe(false);
		} finally {
			currentTrip.set(null);
			vi.useRealTimers();
		}
	});

	it('the held spot keeps its pin while the sheet for naming it is open, and loses it soon after it closes', () => {
		vi.useFakeTimers({ now: Date.now() + 60_000 });
		try {
			let pins = 0; // features on the pin layer
			const source = { setData: (data: GeoJSON.FeatureCollection) => pins = data.features.length };
			let added = false;
			const map = {
				getCanvasContainer: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0 }) }),
				queryRenderedFeatures: () => [],
				unproject: () => ({ lat: 38.71, lng: -9.14 }),
				getSource: () => added ? source : undefined,
				addSource: (_id: string, spec: { data: GeoJSON.FeatureCollection }) => { added = true; source.setData(spec.data); },
				addLayer: () => {},
				project: () => ({ y: 100 }),
				getContainer: () => ({ clientHeight: 800 }),
				panBy: () => {},
			} as unknown as maplibregl.Map;
			pick.set({ kind: 'add' });
			expect(pickHold(map, { clientX: 10, clientY: 10 } as PointerEvent, ['points'], () => {})).toBe(true);
			expect(pins).toBe(1);

			favouriteSheetOpen.set(true);
			vi.advanceTimersByTime(20_000); // naming takes a while
			expect(pins).toBe(1);

			favouriteSheetOpen.set(false);
			vi.advanceTimersByTime(PIN_AFTER_SAVE_MS);
			expect(pins).toBe(0);
		} finally {
			favouriteSheetOpen.set(false);
			pick.set(null);
			vi.useRealTimers();
		}
	});
});