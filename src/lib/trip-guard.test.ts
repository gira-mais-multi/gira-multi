import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { routeDestination } from '$lib/routing';
import { currentTrip, type ActiveTrip } from '$lib/trip';
import { clearedDestination, dismissResume, resumeRoute, tripBack } from '$lib/trip-guard';

const home = { type: 'location' as const, lat: 38.75, lng: -9.13, name: 'Casa' };
const riding = (finished = false) => currentTrip.set({ finished } as ActiveTrip);

describe('during a trip', () => {
	it('back is used up while riding, and left to Gira+ otherwise', () => {
		expect(tripBack()).toBe(false);
		riding();
		expect(tripBack()).toBe(true);
		riding(true); // docked: the trip screen is ending
		expect(tripBack()).toBe(false);
		currentTrip.set(null);
	});

	it('directions cleared while riding can be brought back until the trip ends', () => {
		riding();
		routeDestination.set(home);
		routeDestination.set(null);
		expect(get(clearedDestination)).toEqual(home);
		resumeRoute();
		expect(get(routeDestination)).toEqual(home);
		expect(get(clearedDestination)).toBeNull();

		routeDestination.set(null);
		dismissResume();
		expect(get(clearedDestination)).toBeNull();

		routeDestination.set(home);
		routeDestination.set(null);
		currentTrip.set(null);
		expect(get(clearedDestination)).toBeNull();
	});

	it('another destination replaces the offer, and nothing is offered outside a trip', () => {
		routeDestination.set(home);
		routeDestination.set(null);
		expect(get(clearedDestination)).toBeNull();

		riding();
		routeDestination.set(home);
		routeDestination.set(null);
		routeDestination.set({ ...home, name: 'Trabalho' });
		expect(get(clearedDestination)).toBeNull();
		routeDestination.set(null);
		currentTrip.set(null);
	});
});