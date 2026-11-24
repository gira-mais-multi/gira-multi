// Gira+ Multi: docks a rider noted as working although EMEL shows them red (they turn green on docking, unlike truly
// broken ones). Only the station menu uses them: while a noted dock is empty, its free-docks number counts it, with no
// marker. The map, favourites, search and the route planner keep EMEL's number. Notes are kept on the phone per
// station, shared by every saved account. Holding the free-docks number opens them (DockNotes.svelte).
import { Preferences } from '@capacitor/preferences';
import { derived, get, writable } from 'svelte/store';
import { hold } from './hold';
import { selectedStation, type StationInfo } from './map.svelte';
import { subscribeFirestoreBikes } from './vaimoo-api/firestore';
import type { VaimooBike } from './vaimoo-api/types';

const STORAGE_KEY = 'multi/dockNotes';

/** Noted docks by station serial, as plain numbers ("2", not "02"). */
export const dockNotes = writable<Record<string, string[]>>({});
/** The station whose notes are open, from a hold on its free-docks number. */
export const dockNotesFor = writable<StationInfo | null>(null);

/** A dock number as typed or as the bike feed gives it ("02", " 2 "), or null if it isn't one. */
export function normalizeDock(text: string | null | undefined): string | null {
	const trimmed = (text ?? '').trim();
	if (!/^\d{1,3}$/.test(trimmed)) return null;
	const number = Number(trimmed);
	return number > 0 ? String(number) : null;
}

/**
 * How many noted docks to add to EMEL's free count: those with no bike in them, but never more than the empty docks
 * EMEL leaves out (docks − bikes − its free count), so a dock EMEL counts again isn't counted twice. Every bike in the
 * feed takes a dock, unlockable or not, and one with no dock number may sit in a noted one, so it counts as taking one.
 */
export function extraFreeDocks(noted: string[], bikes: VaimooBike[], docks: number, freeDocks: number): number {
	const taken = new Set(bikes.map(bike => normalizeDock(bike.DockingPointVisualId)).filter(dock => dock !== null));
	const notedEmpty = noted.filter(dock => !taken.has(dock)).length;
	const leftOut = Math.max(0, docks - bikes.length - freeDocks);
	return Math.min(notedEmpty, leftOut);
}

let loading: Promise<void> | null = null;

export function loadDockNotes(): Promise<void> {
	loading ??= Preferences.get({ key: STORAGE_KEY }).then(({ value }) => {
		try {
			const parsed = JSON.parse(value ?? '{}') as Record<string, unknown>;
			const notes: Record<string, string[]> = {};
			for (const [serial, docks] of Object.entries(parsed)) {
				if (!Array.isArray(docks)) continue;
				const valid = [...new Set(docks.map(dock => normalizeDock(String(dock))).filter(dock => dock !== null))];
				if (valid.length) notes[serial] = valid;
			}
			dockNotes.set(notes);
		} catch {
			dockNotes.set({});
		}
	});
	return loading;
}

async function save(update: (notes: Record<string, string[]>) => Record<string, string[]>) {
	await loadDockNotes();
	dockNotes.update(update);
	await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(get(dockNotes)) });
}

/** Note a dock of a station; false when it isn't a dock number. */
export async function addDockNote(serial: string, text: string): Promise<boolean> {
	const dock = normalizeDock(text);
	if (!dock) return false;
	await save(notes => {
		const docks = notes[serial] ?? [];
		if (docks.includes(dock)) return notes;
		return { ...notes, [serial]: [...docks, dock].sort((a, b) => Number(a) - Number(b)) };
	});
	return true;
}

export async function removeDockNote(serial: string, dock: string) {
	await save(notes => {
		const docks = (notes[serial] ?? []).filter(noted => noted !== dock);
		const next = { ...notes };
		if (docks.length) next[serial] = docks;
		else delete next[serial];
		return next;
	});
}

/**
 * Every bike at the open station, while it has notes: the menu's own list leaves out the bikes it can't unlock, which
 * still fill docks. The query is the menu's own (Firestore shares one listener between them), stopped when the menu
 * closes or moves to another station.
 */
const openStationBikes = writable<{ serial: string, bikes: VaimooBike[] } | null>(null);
const notedOpenStation = derived([selectedStation, dockNotes], ([serial, notes]) => serial != null && notes[serial]?.length ? serial : null);
let stopBikes: (() => void) | null = null;
let following: string | null = null;
notedOpenStation.subscribe(serial => {
	if (serial === following) return;
	stopBikes?.();
	stopBikes = null;
	following = serial;
	openStationBikes.set(null);
	if (serial == null) return;
	stopBikes = subscribeFirestoreBikes(Number(serial), bikes => openStationBikes.set({ serial, bikes }), error => {
		console.debug('Could not follow the bikes for dock notes', error);
	});
});

/** What the station menu needs to count the noted docks: the open station's bikes and notes. */
export const openStationDockNotes = derived([openStationBikes, dockNotes], ([open, notes]) => open && { ...open, noted: notes[open.serial] ?? [] });

/** The station menu's free-docks number: EMEL's, plus the noted docks that are empty. */
export function withDockNotes(station: StationInfo | undefined, open: { serial: string, bikes: VaimooBike[], noted: string[] } | null): number {
	const free = station?.freeDocks ?? 0;
	if (!station || !open || open.serial !== station.serialNumber) return free;
	return free + extraFreeDocks(open.noted, open.bikes, station.docks, free);
}

/** Hold the station menu's free-docks number to open its notes. */
export function dockNotesHold(node: HTMLElement, station: StationInfo | undefined) {
	let current = station;
	node.style.borderRadius = '0.5rem';
	const action = hold(node, () => {
		if (current) dockNotesFor.set(current);
	});
	return {
		update(next: StationInfo | undefined) {
			current = next;
		},
		destroy: action.destroy,
	};
}