// Gira+ Multi: during a trip the screen is harder to lose by mistake (the phone on a handlebar mount, the map being
// dragged). Android's back, often an edge swipe that was meant to drag the map, neither clears the directions nor
// closes the app (Gira+ did both, one press after the other), and directions cleared during the trip can be brought
// back from a line under the search bar until the trip ends or another destination is set.
import { get, writable } from 'svelte/store';
import { routeDestination, type Destination } from './routing';
import { currentTrip } from './trip';

function riding() {
	const trip = get(currentTrip);
	return trip !== null && !trip.finished;
}

/** A back press during a trip, once nothing is left to close: used up here. True when it was. */
export function tripBack(): boolean {
	return riding();
}

/** The destination cleared during this trip, while it can be brought back. */
export const clearedDestination = writable<Destination | null>(null);

let last: Destination | null = null;
routeDestination.subscribe(destination => {
	if (destination) clearedDestination.set(null);
	else if (last && riding()) clearedDestination.set(last);
	last = destination;
});
currentTrip.subscribe(trip => {
	if (!trip || trip.finished) clearedDestination.set(null);
});

export function resumeRoute() {
	const destination = get(clearedDestination);
	if (destination) routeDestination.set(destination);
}

export function dismissResume() {
	clearedDestination.set(null);
}