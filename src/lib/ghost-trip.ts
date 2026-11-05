// Gira+ Multi: spots a ghost trip (one VAIMOO keeps open after the bike is docked) from what backend-sync.ts already
// learns. backend-sync reports Gira+'s own trip-end signal (the bike document says LOCKED with no trip) and every regular
// poll that still finds the trip; the dock check shows "waiting" from the signal and "stuck" once the trip has stayed
// open that long after it, where the rider can open the account picker. Nothing is requested or reported for this.
import { dockCheckReset, dockSignalled, dockStuck } from '$lib/dock-check';

/** How long VAIMOO may keep a trip open after its bike reported being docked before it counts as a ghost trip. */
export const GHOST_TRIP_AFTER_MS = 2 * 60_000;

/** Shows the account picker; false when there is no other account to offer. */
type Handler = () => boolean;
let handler: Handler | null = null;
/** Told when a trip's bike is first reported docked, ghost trip or not. */
let dockedListener: ((tripCode: string) => void) | null = null;
let watch: { tripCode: string, signalledAt: number, stuck: boolean } | null = null;

export function setGhostTripHandler(next: Handler | null) {
	handler = next;
}

export function setTripDockedListener(next: ((tripCode: string) => void) | null) {
	dockedListener = next;
}

/** "Use another account" on the stuck card. */
export function offerOtherAccount() {
	return handler?.() ?? false;
}

/** The trip's bike reported being docked with no trip. Only the first report of a trip counts. */
export function ghostTripSignal(tripCode: string, now = Date.now()) {
	if (watch?.tripCode === tripCode) return;
	watch = { tripCode, signalledAt: now, stuck: false };
	dockedListener?.(tripCode);
	dockSignalled(tripCode);
}

/** A regular poll found VAIMOO still holding the trip; call it stuck once it has outlived the docked signal. */
export function ghostTripStillOpen(tripCode: string, now = Date.now()) {
	if (!watch || watch.tripCode !== tripCode || watch.stuck) return;
	if (now - watch.signalledAt < GHOST_TRIP_AFTER_MS) return;
	watch.stuck = true;
	dockStuck(tripCode);
}

/** The trip is no longer followed (it ended, the account changed or the sync stopped); a later signal starts over. */
export function ghostTripReset() {
	watch = null;
	dockCheckReset();
}