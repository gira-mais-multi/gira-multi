// Gira+ Multi: the dock check. Once a trip's bike reports being docked, a card asks the rider to wait by the dock, then
// says whether the trip ended. It's fed by ghost-trip.ts (docked, still open after a while), backend-sync.ts (the bike
// reported an end failure) and trip.ts (the trip ended). Nothing is requested for it; it only shows what Gira+ learns.
import { writable } from 'svelte/store';

/** How long "Trip ended" stays before the usual trip rating takes its place. */
export const ENDED_SHOWN_MS = 3000;

export type DockCheckKind = 'waiting' | 'ended' | 'stuck' | 'problem';
export type DockCheck = { kind: DockCheckKind, tripCode: string };

export const dockCheck = writable<DockCheck | null>(null);

let current: DockCheck | null = null;
let endedTimer: ReturnType<typeof setTimeout> | undefined;

function show(next: DockCheck | null, buzz = false) {
	clearTimeout(endedTimer);
	endedTimer = undefined;
	current = next;
	dockCheck.set(next);
	if (buzz) vibrate();
}

function vibrate() {
	try {
		navigator.vibrate?.([120, 80, 120]);
	} catch {
		// Not every WebView lets a page vibrate; the card is enough on its own
	}
}

/** The trip's bike reported being docked with no trip. A problem card gives way to it: the bike locked after all. */
export function dockSignalled(tripCode: string) {
	if (current?.tripCode === tripCode && current.kind !== 'problem') return;
	show({ kind: 'waiting', tripCode });
}

/** The trip stayed open long after its bike reported being docked. */
export function dockStuck(tripCode: string) {
	if (current?.tripCode !== tripCode || current.kind === 'stuck') return;
	show({ kind: 'stuck', tripCode }, true);
}

/** The bike reported it couldn't end the trip. */
export function dockProblem(tripCode: string) {
	if (current?.tripCode === tripCode && current.kind === 'problem') return;
	show({ kind: 'problem', tripCode }, true);
}

/** The trip ended. Says so only if the card was already following that trip, then clears itself. */
export function dockTripEnded(tripCode: string) {
	if (current?.tripCode !== tripCode || current.kind === 'ended') return;
	show({ kind: 'ended', tripCode }, true);
	endedTimer = setTimeout(() => show(null), ENDED_SHOWN_MS);
}

/** The trip is no longer followed (account switch, sync stopped). "Trip ended" is left to clear itself. */
export function dockCheckReset() {
	if (current?.kind === 'ended') return;
	show(null);
}

/** "Not now" on the card. */
export function dismissDockCheck() {
	show(null);
}