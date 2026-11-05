// Gira+ Multi: a log of what happens on each trip, kept on the phone only, so false trips can be compared with normal
// ones. It records the trip's start, every change the bike reports (state, error code, trip id), the dock check, unlocks
// that never started, and the trip leaving the app. Nothing is sent anywhere; the history's trip menu copies one trip's
// log as text.
import { Preferences } from '@capacitor/preferences';
import { get, type Readable } from 'svelte/store';

const STORAGE_KEY = 'multi/tripLog';
/** Trips kept, newest first; older ones are dropped. */
export const MAX_TRIPS = 100;
/** Events kept per trip; a trip that keeps changing stops being logged past this. */
export const MAX_EVENTS = 80;
const SAVE_DELAY_MS = 1000;

export type TripLogEvent = { at: string, what: string, state?: string | null, error?: number | null, tripId?: number | null };
export type TripLogEntry = { code: string, account: string | null, bike: string | null, startedAt: string, events: TripLogEvent[] };

let entries: TripLogEntry[] = [];
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastBike: { code: string, state: string | null, error: number | null, tripId: number | null } | null = null;

function scheduleSave() {
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => void saveTripLog(), SAVE_DELAY_MS);
}

export async function saveTripLog() {
	clearTimeout(saveTimer);
	saveTimer = undefined;
	await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(entries) });
}

export async function loadTripLog() {
	const stored = (await Preferences.get({ key: STORAGE_KEY })).value;
	try {
		const parsed: unknown = stored ? JSON.parse(stored) : [];
		entries = Array.isArray(parsed) ? parsed as TripLogEntry[] : [];
	} catch {
		entries = [];
	}
}

/** Start a trip's entry. A trip already logged (a restart mid-trip) keeps its entry. */
export function logTripStart(code: string, bike: string | null, account: string | null, startedAt: Date, now = new Date) {
	if (!code || entries.some(entry => entry.code === code)) return;
	entries.unshift({ code, account, bike, startedAt: startedAt.toISOString(), events: [{ at: now.toISOString(), what: 'started' }] });
	entries.length = Math.min(entries.length, MAX_TRIPS);
	scheduleSave();
}

/** An unlock that never became a trip, kept under its own code since VAIMOO gave it no trip id. */
export function logFailedUnlock(bike: string | null, account: string | null, startedAt: Date, now = new Date) {
	logTripStart(`unlock-${startedAt.getTime()}`, bike, account, startedAt, now);
	logTripEvent(`unlock-${startedAt.getTime()}`, 'unlock never confirmed', {}, now);
}

export function logTripEvent(code: string | null | undefined, what: string, details: Omit<TripLogEvent, 'at' | 'what'> = {}, now = new Date) {
	const entry = code ? entries.find(candidate => candidate.code === code) : undefined;
	if (!entry || entry.events.length >= MAX_EVENTS) return;
	entry.events.push({ at: now.toISOString(), what, ...details });
	scheduleSave();
}

/** What the bike document says, logged only when something in it changes. */
export function logBikeState(code: string | null | undefined, state: string | null, error: number | null, tripId: number | null, now = new Date) {
	if (!code) return;
	if (lastBike?.code === code && lastBike.state === state && lastBike.error === error && lastBike.tripId === tripId) return;
	lastBike = { code, state, error, tripId };
	logTripEvent(code, 'bike', { state, error, tripId }, now);
}

export function tripLogFor(code: string) {
	return entries.find(entry => entry.code === code);
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** One trip's log as plain text, to paste into a message. */
export function formatTripLog(entry: TripLogEntry) {
	const lines = [`Trip ${entry.code} · bike ${entry.bike ?? '?'} · ${new Date(entry.startedAt).toLocaleDateString('pt-PT')}`];
	for (const event of entry.events) {
		const details = event.what === 'bike' ?
			`bike: ${event.state ?? 'no state'}, error ${event.error ?? 0}, ${event.tripId ? `trip ${event.tripId}` : 'no trip'}` :
			event.what;
		lines.push(`${time(event.at)} ${details}`);
	}
	return lines.join('\n');
}

type Trip = { code: string, bikePlate: string | null, confirmed: boolean, startDate: Date } | null;
type DockState = { kind: string, tripCode: string } | null;

/** Follow the app's trip and the dock check. Returns the unsubscribe. */
export function followTrips(currentTrip: Readable<Trip>, dockCheck: Readable<DockState>, account: () => string | null) {
	let previous: Trip = get(currentTrip);
	const stopTrip = currentTrip.subscribe(trip => {
		if (trip?.confirmed && trip.code) logTripStart(trip.code, trip.bikePlate, account(), trip.startDate);
		if (!trip && previous) {
			if (previous.confirmed) logTripEvent(previous.code, 'left the app (ended or account switched)');
			else logFailedUnlock(previous.bikePlate, account(), previous.startDate);
		}
		previous = trip;
	});
	const stopDock = dockCheck.subscribe(check => {
		if (check) logTripEvent(check.tripCode, `dock check: ${check.kind}`);
	});
	return () => {
		stopTrip();
		stopDock();
	};
}