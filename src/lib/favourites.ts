// Gira+ Multi: favourite places and stations, shown first when the search bar opens. Kept on the phone in their own
// key, apart from Gira+'s search history, and shared by all saved accounts.
import { Preferences } from '@capacitor/preferences';
import { derived, get, writable } from 'svelte/store';
import type { SearchHistoryEntry } from './search-history';
import { routeDestination } from './routing';
import { t } from './translations';

const STORAGE_KEY = 'multiFavourites';
const HINT_KEY = 'multiFavouritesHint';
/** The "hold a result to save it" hint shows in this many app sessions, while nothing is saved. */
const HINT_SHOWINGS = 3;

export type FavouriteKind = 'home' | 'work' | 'other';
export type Favourite = {
	id: string,
	kind: FavouriteKind,
	/** The rider's own name for an `other` favourite; Home and Work use their translated label. */
	label: string,
	destination: SearchHistoryEntry,
};

export const favourites = writable<Favourite[]>([]);

/** Home, Work, named places, then stations; otherwise in the order they were saved. */
export const sortedFavourites = derived(favourites, list => {
	const rank = (f: Favourite) => f.kind === 'home' ? 0 : f.kind === 'work' ? 1 : f.destination.type === 'station' ? 3 : 2;
	return list.map((f, i) => ({ f, i })).sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i).map(({ f }) => f);
});

let loaded: Promise<void> | null = null;

function valid(entry: unknown): entry is Favourite {
	const f = entry as Favourite;
	return !!f && typeof f.id === 'string' && ['home', 'work', 'other'].includes(f.kind) && typeof f.label === 'string' &&
		!!f.destination && typeof f.destination.name === 'string' &&
		typeof f.destination.lat === 'number' && typeof f.destination.lng === 'number';
}

export function loadFavourites(): Promise<void> {
	loaded ??= (async () => {
		try {
			const { value } = await Preferences.get({ key: STORAGE_KEY });
			if (value) favourites.set((JSON.parse(value) as unknown[]).filter(valid));
		} catch (e) {
			console.error('Failed to load favourites', e);
		}
	})();
	return loaded;
}

/** For tests: forget what was loaded, so the next load reads storage again. */
export function resetFavouritesForTest() {
	loaded = null;
	favourites.set([]);
	replacing.set(null);
	hintShowings = null;
	hintThisSession = false;
}

async function change(next: (list: Favourite[]) => Favourite[]) {
	await loadFavourites();
	const list = next(get(favourites));
	favourites.set(list);
	await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(list) });
}

export function samePlace(a: SearchHistoryEntry, b: SearchHistoryEntry) {
	if (a.type === 'station' || b.type === 'station') {
		return a.type === 'station' && b.type === 'station' && a.stationSerial === b.stationSerial;
	}
	return a.lat === b.lat && a.lng === b.lng;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** The saved Home or Work, if any. */
export function favouriteOfKind(kind: 'home' | 'work') {
	return get(favourites).find(f => f.kind === kind) ?? null;
}

/**
 * Saves a place or station. Home and Work are single entries, so saving one replaces the old one. Saving a place
 * that is already a named favourite renames it instead of adding a second copy.
 */
export function saveFavourite(destination: SearchHistoryEntry, kind: FavouriteKind, label = '') {
	const name = label.trim() || destination.name;
	return change(list => {
		if (kind !== 'other') {
			const old = list.find(f => f.kind === kind);
			const entry: Favourite = { id: old?.id ?? newId(), kind, label: '', destination };
			return old ? list.map(f => f === old ? entry : f) : [...list, entry];
		}
		const old = list.find(f => f.kind === 'other' && samePlace(f.destination, destination));
		if (old) return list.map(f => f === old ? { ...f, label: name, destination } : f);
		return [...list, { id: newId(), kind, label: name, destination }];
	});
}

export function renameFavourite(id: string, label: string) {
	const name = label.trim();
	if (!name) return Promise.resolve();
	return change(list => list.map(f => f.id === id ? { ...f, label: name } : f));
}

export function removeFavourite(id: string) {
	return change(list => list.filter(f => f.id !== id));
}

/** Recent searches without the places already saved as favourites, which the row above already shows. */
export function withoutFavourites(history: SearchHistoryEntry[], list: Favourite[]) {
	return history.filter(entry => !list.some(f => samePlace(f.destination, entry)));
}

/** The named favourite for a station, used by the star on its sheet. */
export function stationFavourite(list: Favourite[], stationSerial: string | null) {
	if (!stationSerial) return null;
	return list.find(f => f.kind === 'other' && f.destination.type === 'station' && f.destination.stationSerial === stationSerial) ?? null;
}

/** The star on a station's sheet: saves the station under its own name, or removes it when already saved. */
export async function toggleStationFavourite(destination: SearchHistoryEntry & { type: 'station' }) {
	await loadFavourites();
	const old = stationFavourite(get(favourites), destination.stationSerial);
	if (old) await removeFavourite(old.id);
	else await saveFavourite(destination, 'other');
}

/** Opens the favourites menu: save a place or station, or change a saved favourite. Shown by FavouritesHost. */
export type FavouriteMenuRequest = { kind: 'save', destination: SearchHistoryEntry } | { kind: 'edit', favourite: Favourite };
export const favouriteMenu = writable<FavouriteMenuRequest | null>(null);

/** The name shown for a favourite: Home, Work or the rider's own name. */
export const favouriteLabel = derived(t, text => (f: Favourite) => f.kind === 'home' ? text('multi_fav_home') : f.kind === 'work' ? text('multi_fav_work') : f.label);

// "Replace": the next destination the rider picks in the search (result, recent search or station) becomes the
// favourite's new place. Cancelled when the search closes without a pick (FavouritesHost).
export const replacing = writable<Favourite | null>(null);

/** The search bar's placeholder while replacing a favourite's place, else null. */
export const replacingPlaceholder = derived([replacing, favouriteLabel, t], ([target, label, text]) => target ? text('multi_fav_replace_placeholder', { name: label(target) }) : null);

routeDestination.subscribe(destination => {
	const target = get(replacing);
	if (!target || !destination) return;
	replacing.set(null);
	const entry: SearchHistoryEntry = { ...destination, name: destination.name ?? `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}` };
	void change(list => list.map(f => f.id === target.id ?
		{ ...f, destination: entry, label: f.kind === 'other' && f.label === f.destination.name ? entry.name : f.label } :
		f));
});

let hintShowings: number | null = null;
let hintThisSession = false;

/** Whether the search should show the "hold a result to save it" hint; counts once per app session. */
export async function takeHintShowing(): Promise<boolean> {
	await loadFavourites();
	if (get(favourites).length > 0) return false;
	if (hintThisSession) return true;
	if (hintShowings == null) {
		try {
			const { value } = await Preferences.get({ key: HINT_KEY });
			hintShowings = Number(value) || 0;
		} catch {
			hintShowings = 0;
		}
	}
	if (hintShowings >= HINT_SHOWINGS) return false;
	hintShowings++;
	hintThisSession = true;
	await Preferences.set({ key: HINT_KEY, value: String(hintShowings) });
	return true;
}

void loadFavourites();