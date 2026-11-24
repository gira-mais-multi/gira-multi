import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Coord } from '$lib/osrm';

const mocks = vi.hoisted(() => ({ walks: [] as { from: Coord, to: Coord }[] }));
vi.mock('$lib/gira-api/api');
vi.mock('$lib/osrm', () => ({
	osrmRoute: async (_profile: string, from: Coord, to: Coord) => {
		mocks.walks.push({ from, to });
		return { distance: 1000, duration: 600, geometry: { coordinates: [[from.lng, from.lat], [to.lng, to.lat]] } };
	},
	osrmTable: async () => null,
}));

import { currentPos } from '$lib/location';
import { pick, takePick } from '$lib/favourites';
import { endPlan, planFrom } from '$lib/plan';
import { withPlanOrigin } from '$lib/plan-origin';
import { currentRoute, routeDestination } from '$lib/routing';
import { currentTrip, type ActiveTrip } from '$lib/trip';
import { appSettings } from '$lib/settings';

const phone = { coords: { latitude: 38.70, longitude: -9.14, accuracy: 5 }, timestamp: 0 } as unknown as GeolocationPosition;
const home = { type: 'location' as const, lat: 38.75, lng: -9.15, name: 'Casa' };
const destination = { type: 'location' as const, lat: 38.77, lng: -9.10, name: 'Oriente' };
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Plan mode', () => {
	beforeEach(async () => {
		appSettings.set({ locale: 'pt' } as never);
		planFrom.set(null);
		routeDestination.set(null);
		currentTrip.set(null);
		currentPos.set(phone);
		await settle();
		mocks.walks.length = 0;
	});

	it('stands its starting point in for the phone\'s position, and leaves it alone otherwise', () => {
		expect(withPlanOrigin(phone)).toBe(phone);
		planFrom.set(home);
		expect(withPlanOrigin(phone)?.coords).toMatchObject({ latitude: 38.75, longitude: -9.15, accuracy: 5 });
		expect(withPlanOrigin(null)?.coords).toMatchObject({ latitude: 38.75, longitude: -9.15 });
	});

	it('is chosen like a favourite\'s place, and plans the destination again from it with the planner of Gira+', async () => {
		routeDestination.set(destination);
		await settle();
		expect(get(currentRoute)?.origin).toEqual({ lat: 38.70, lng: -9.14 });

		pick.set({ kind: 'from' });
		expect(takePick(home)).toBe(true);
		await settle();
		expect(get(planFrom)).toEqual(home);
		expect(get(currentRoute)?.origin).toEqual({ lat: 38.75, lng: -9.15 });
		expect(get(routeDestination)).toEqual(destination);
	});

	it('ignores the phone moving, then hands the route back to it', async () => {
		planFrom.set(home);
		routeDestination.set(destination);
		await settle();
		const planned = mocks.walks.length;
		// far away, and then right at the destination: neither re-plans nor ends the route
		currentPos.set({ ...phone, coords: { ...phone.coords, latitude: 38.60 } });
		currentPos.set({ ...phone, coords: { ...phone.coords, latitude: 38.77, longitude: -9.10 } });
		await settle();
		expect(mocks.walks).toHaveLength(planned);
		expect(get(routeDestination)).toEqual(destination);

		currentPos.set(phone);
		expect(endPlan()).toBe(true);
		await settle();
		expect(get(planFrom)).toBeNull();
		expect(get(currentRoute)?.origin).toEqual({ lat: 38.70, lng: -9.14 });
	});

	it('ends when the destination is cleared or a trip starts', async () => {
		planFrom.set(home);
		routeDestination.set(destination);
		await settle();
		routeDestination.set(null);
		expect(get(planFrom)).toBeNull();

		routeDestination.set(destination);
		planFrom.set(home);
		await settle();
		currentTrip.set({ code: 'T1' } as ActiveTrip);
		expect(get(planFrom)).toBeNull();
		currentTrip.set(null);
	});
});