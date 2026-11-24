// Gira+ Multi: Plan mode, a route from somewhere other than the phone's position. The starting point is picked like a
// favourite's place (a search result, a favourite, a recent search, a station tapped on the map or a spot held on it),
// then Gira+'s own planner works out the route from there: walking, or walk, ride and walk through the stations with
// bikes and free docks right now. Leaving it (the X, clearing the destination, or a trip starting) hands the route back
// to Gira+'s normal routing from the phone.
import { get } from 'svelte/store';
import { pick } from './favourites';
import { planFrom } from './plan-origin';
import { currentRoute, routeDestination } from './routing';
import { currentTrip } from './trip';

export { planFrom, planning } from './plan-origin';

/** Plans the current destination again, from the new starting point (Gira+ re-plans a destination without a route). */
function replan() {
	const destination = get(routeDestination);
	if (!destination) return;
	currentRoute.set(null);
	routeDestination.set({ ...destination });
}

/** Starts choosing where the route starts. */
export function chooseStart() {
	pick.set({ kind: 'from' });
}

/** Back to the phone's position. True when a plan was on. */
export function endPlan(): boolean {
	if (!get(planFrom)) return false;
	planFrom.set(null);
	replan();
	return true;
}

let following: unknown = null;
planFrom.subscribe(from => {
	if (from === following) return;
	following = from;
	if (from) replan();
});
// Modal: a cleared destination or a trip starting ends the plan
routeDestination.subscribe(destination => {
	if (!destination && get(planFrom)) planFrom.set(null);
});
currentTrip.subscribe(trip => {
	if (trip && get(planFrom)) endPlan();
});