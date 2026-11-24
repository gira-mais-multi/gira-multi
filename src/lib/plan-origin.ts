// Gira+ Multi: Plan mode's starting point. While it's set, Gira+'s route planner starts from it instead of the phone's
// position, and the phone's movement doesn't re-plan or end the route (two one-line hooks in routing.ts). Kept apart
// from plan.ts, which reacts to Gira+'s routing, so routing.ts can import this without a cycle.
import { get, writable } from 'svelte/store';
import type { SearchHistoryEntry } from './search-history';

/** Where the planned route starts instead of the phone's position, or null for Gira+'s normal routing. */
export const planFrom = writable<SearchHistoryEntry | null>(null);

export function planning() {
	return get(planFrom) !== null;
}

/** The phone's position as Gira+'s planner reads it, or the plan's starting point standing in for it. */
export function withPlanOrigin<T extends { coords: { latitude: number, longitude: number } }>(position: T | null): T | null {
	const from = get(planFrom);
	if (!from) return position;
	return { ...position, coords: { ...position?.coords, latitude: from.lat, longitude: from.lng } } as T;
}