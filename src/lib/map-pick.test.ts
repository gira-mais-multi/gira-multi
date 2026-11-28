import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { favourites, favouriteSheetOpen, pick, resetFavouritesForTest } from '$lib/favourites';
import { stations, type StationInfo } from '$lib/map.svelte';
import { AFTER_TAP_MS, PIN_AFTER_SAVE_MS, pickHold, pickStation, pickTap, tapKeepsRoute, watchMapHold } from '$lib/map-pick';
import { selectedStation } from '$lib/map.svelte';
import { routeDestination } from '$lib/routing';
import { HOLD_MS } from '$lib/hold';
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

	it('a hold on an empty spot sets the destination there, in a trip or not; on a station it goes there and opens it', () => {
		vi.useFakeTimers({ now: Date.now() + 60_000 });
		try {
			let onStation = false;
			const map = {
				getCanvasContainer: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0 }) }),
				queryRenderedFeatures: () => onStation ? [{ properties: { serialNumber: 'sodre' } }] : [],
				unproject: ([x, y]: [number, number]) => ({ lat: 38 + y / 1000, lng: -9 + x / 1000 }),
				getSource: () => undefined,
				addSource: () => {},
				addLayer: () => {},
			} as unknown as maplibregl.Map;
			const dropped: { lat: number, lng: number }[] = [];
			const hold = { type: 'pointerdown', clientX: 100, clientY: 200 } as PointerEvent;

			expect(pickHold(map, hold, ['points'], at => dropped.push(at))).toBe(true);
			expect(dropped).toEqual([{ lat: 38.2, lng: -8.9 }]);

			onStation = true;
			expect(pickHold(map, hold, ['points'], at => dropped.push(at))).toBe(true);
			expect(dropped).toHaveLength(1);
			expect(get(selectedStation)).toBe('sodre');
			expect(get(routeDestination)).toMatchObject({ type: 'station', stationSerial: 'sodre', name: '481 - Cais do Sodré' });
			// an open station menu doesn't stop a hold on a station, but still stops one on an empty spot
			routeDestination.set(null);
			expect(pickHold(map, hold, ['points'], at => dropped.push(at))).toBe(true);
			expect(get(routeDestination)?.name).toBe('481 - Cais do Sodré');
			onStation = false;
			expect(pickHold(map, hold, ['points'], at => dropped.push(at))).toBe(true);
			expect(dropped).toHaveLength(1);
			selectedStation.set(null);
			routeDestination.set(null);

			onStation = false;
			currentTrip.set({} as ActiveTrip);
			expect(pickHold(map, hold, ['points'], at => dropped.push(at))).toBe(true);
			expect(dropped).toHaveLength(2);

			// Gira+'s own check when the finger lifts finds the hold already done
			expect(pickHold(map, { ...hold, type: 'pointerup' } as PointerEvent, ['points'], at => dropped.push(at))).toBe(true);
			expect(dropped).toHaveLength(2);
		} finally {
			currentTrip.set(null);
			selectedStation.set(null);
			routeDestination.set(null);
			vi.useRealTimers();
		}
	});

	it('with a destination set outside a trip, a station tap keeps the route', () => {
		expect(tapKeepsRoute()).toBe(false);
		routeDestination.set({ type: 'location', lat: 38.7, lng: -9.1, name: 'Somewhere' });
		expect(tapKeepsRoute()).toBe(true);
		currentTrip.set({} as ActiveTrip); // during a trip Gira+'s tap still re-routes
		expect(tapKeepsRoute()).toBe(false);
		currentTrip.set(null);
		routeDestination.set(null);
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
			expect(pickHold(map, { type: 'pointerdown', clientX: 10, clientY: 10 } as PointerEvent, ['points'], () => {})).toBe(true);
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

describe('holding the map', () => {
	let container: HTMLDivElement;
	let held: PointerEvent[];
	let stop: () => void;
	beforeEach(() => {
		vi.useFakeTimers();
		container = document.createElement('div');
		document.body.append(container);
		held = [];
		stop = watchMapHold(container, press => held.push(press));
	});
	afterEach(() => {
		stop();
		container.remove();
		vi.useRealTimers();
	});

	const down = (id = 1, x = 0, y = 0) => container.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, clientX: x, clientY: y, bubbles: true }));
	const move = (id: number, x: number, y: number) => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: id, clientX: x, clientY: y }));
	const up = (id = 1) => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: id }));

	it('acts after the same 400 ms as every other hold, before the finger lifts', () => {
		down(1, 40, 50);
		vi.advanceTimersByTime(HOLD_MS - 1);
		expect(held).toEqual([]);
		vi.advanceTimersByTime(1);
		expect(held.map(press => [press.type, press.clientX, press.clientY])).toEqual([['pointerdown', 40, 50]]);
		up();
		expect(held).toHaveLength(1);
	});

	it('leaves taps, pans and pinches alone', () => {
		down();
		vi.advanceTimersByTime(200);
		up();
		vi.advanceTimersByTime(AFTER_TAP_MS);
		down();
		move(1, 0, 30);
		vi.advanceTimersByTime(HOLD_MS);
		up();
		down(1);
		down(2);
		vi.advanceTimersByTime(HOLD_MS);
		expect(held).toEqual([]);
	});

	it('leaves a press right after a quick tap to the tap-then-drag zoom, but not one after a pan', () => {
		down();
		vi.advanceTimersByTime(100);
		up();
		vi.advanceTimersByTime(AFTER_TAP_MS - 50);
		down();
		vi.advanceTimersByTime(HOLD_MS);
		expect(held).toEqual([]);
		up();

		vi.advanceTimersByTime(AFTER_TAP_MS);
		down();
		move(1, 50, 0);
		up();
		down();
		vi.advanceTimersByTime(HOLD_MS);
		expect(held).toHaveLength(1);
	});
});