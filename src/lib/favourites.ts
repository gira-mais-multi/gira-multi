// Gira+ Multi: favourite places and stations, shown first when the search bar opens. Kept on the phone in their own
// key, apart from Gira+'s search history, and shared by all saved accounts.
import { Preferences } from '@capacitor/preferences';
import { derived, get, writable } from 'svelte/store';
import type { SearchHistoryEntry } from './search-history';
import { buzz } from './hold';
import { routeDestination } from './routing';
import { t } from './translations';

const STORAGE_KEY = 'multiFavourites';
/** The empty Home and Work slots the rider hid by holding them. */
const HIDDEN_KEY = 'multiFavouritesHidden';

/** The icons a named place can have (Tabler outline icons). Anything else is drawn as the map pin. */
export const PLACE_ICONS = [
	'map-pin',
	'heart',
	'users',
	'school',
	'barbell',
	'coffee',
	'tools-kitchen-2',
	'shopping-cart',
	'glass-full',
	'tree',
	'ball-football',
	'first-aid-kit',
	'train',
	'ferry',
] as const;
export type PlaceIcon = typeof PLACE_ICONS[number];

export type FavouriteKind = 'home' | 'work' | 'other';
export type SlotKind = 'home' | 'work';
export type Favourite = {
	id: string,
	kind: FavouriteKind,
	/** The rider's own name for an `other` favourite; Home and Work use their translated label. */
	label: string,
	destination: SearchHistoryEntry,
	/** A named place's icon, one of PLACE_ICONS. Stations have none. Stored as chosen, never rewritten. */
	icon?: string,
};

export const favourites = writable<Favourite[]>([]);
export const hiddenSlots = writable<SlotKind[]>([]);

/** The icon a favourite is drawn with: its own when it's a known one, else the map pin. */
export function placeIcon(favourite: Favourite): PlaceIcon {
	return (PLACE_ICONS as readonly string[]).includes(favourite.icon ?? '') ? favourite.icon as PlaceIcon : 'map-pin';
}

const rank = (f: Favourite) => f.kind === 'home' ? 0 : f.kind === 'work' ? 1 : f.destination.type === 'station' ? 2 : 3;

/** Home, Work, stations, then named places; otherwise in the order they were saved. */
export const sortedFavourites = derived(favourites, list => list.map((f, i) => ({ f, i })).sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i).map(({ f }) => f));

/** The empty Home and Work slots shown in the row until they're set, unless the rider hid them. */
export const emptySlots = derived([favourites, hiddenSlots], ([list, hidden]) => (['home', 'work'] as const).filter(kind => !list.some(f => f.kind === kind) && !hidden.includes(kind)));

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
		try {
			const { value } = await Preferences.get({ key: HIDDEN_KEY });
			if (value) hiddenSlots.set((JSON.parse(value) as unknown[]).filter((k): k is SlotKind => k === 'home' || k === 'work'));
		} catch (e) {
			console.error('Failed to load hidden favourite slots', e);
		}
	})();
	return loaded;
}

/** For tests: forget what was loaded, so the next load reads storage again. */
export function resetFavouritesForTest() {
	loaded = null;
	favourites.set([]);
	hiddenSlots.set([]);
	pick.set(null);
	favouriteMenu.set(null);
	if (waiting) clearTimeout(waiting.timer);
	waiting = null;
}

async function change(next: (list: Favourite[]) => Favourite[]) {
	await loadFavourites();
	const list = next(get(favourites));
	favourites.set(list);
	await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(list) });
}

async function setHidden(next: (hidden: SlotKind[]) => SlotKind[]) {
	await loadFavourites();
	const before = get(hiddenSlots);
	const hidden = next(before);
	if (hidden.length === before.length && hidden.every(k => before.includes(k))) return;
	hiddenSlots.set(hidden);
	await Preferences.set({ key: HIDDEN_KEY, value: JSON.stringify(hidden) });
}

/** Hides an empty Home or Work slot; saving something as that kind brings it back. */
export function hideSlot(kind: SlotKind) {
	return setHidden(hidden => hidden.includes(kind) ? hidden : [...hidden, kind]);
}

export function samePlace(a: SearchHistoryEntry, b: SearchHistoryEntry) {
	if (a.type === 'station' || b.type === 'station') {
		return a.type === 'station' && b.type === 'station' && a.stationSerial === b.stationSerial;
	}
	return a.lat === b.lat && a.lng === b.lng;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** The saved Home or Work, if any. */
export function favouriteOfKind(kind: SlotKind) {
	return get(favourites).find(f => f.kind === kind) ?? null;
}

/**
 * Saves a place or station. Home and Work are single entries, so saving one replaces the old one, and the place stops
 * being any other favourite (a move, never a second copy). Saving a place that is already a named favourite renames
 * it instead of adding a second copy. Stations get no icon.
 */
export async function saveFavourite(destination: SearchHistoryEntry, kind: FavouriteKind, label = '', icon?: PlaceIcon) {
	const name = label.trim() || destination.name;
	const withIcon = destination.type === 'station' || !icon ? {} : { icon };
	await change(list => {
		if (kind !== 'other') {
			const old = list.find(f => f.kind === kind);
			const entry: Favourite = { id: old?.id ?? newId(), kind, label: '', destination };
			const rest = list.filter(f => f === old || !samePlace(f.destination, destination));
			return old ? rest.map(f => f === old ? entry : f) : [...rest, entry];
		}
		const old = list.find(f => f.kind === 'other' && samePlace(f.destination, destination));
		if (old) return list.map(f => f === old ? { ...f, label: name, destination, ...withIcon } : f);
		return [...list, { id: newId(), kind, label: name, destination, ...withIcon }];
	});
	if (kind !== 'other') await setHidden(hidden => hidden.filter(k => k !== kind));
}

/** Changes a named favourite's name and, for a place, its icon. */
export function editFavourite(id: string, label: string, icon?: PlaceIcon) {
	const name = label.trim();
	if (!name) return Promise.resolve();
	return change(list => list.map(f => f.id === id ?
		{ ...f, label: name, ...icon && f.destination.type !== 'station' ? { icon } : {} } :
		f));
}

/** Gives a favourite a new place. That place stops being any other favourite. */
export function moveFavourite(id: string, destination: SearchHistoryEntry) {
	return change(list => list
		.filter(f => f.id === id || !samePlace(f.destination, destination))
		.map(f => f.id === id ?
			{ ...f, destination, label: f.kind === 'other' && f.label === f.destination.name ? destination.name : f.label } :
			f));
}

export function removeFavourite(id: string) {
	return change(list => list.filter(f => f.id !== id));
}

/** Recent searches without the places already saved as favourites, which the row above already shows. */
export function withoutFavourites(history: SearchHistoryEntry[], list: Favourite[]) {
	return history.filter(entry => !list.some(f => samePlace(f.destination, entry)));
}

/** The favourite for a station: its named one first, else a Home or Work there. */
export function stationFavourite(list: Favourite[], stationSerial: string | null) {
	if (!stationSerial) return null;
	const here = list.filter(f => f.destination.type === 'station' && f.destination.stationSerial === stationSerial);
	return here.find(f => f.kind === 'other') ?? here[0] ?? null;
}

/** The favourite a place or station is already saved as, if any (a named one first). */
export function savedFavourite(list: Favourite[], destination: SearchHistoryEntry) {
	if (destination.type === 'station') return stationFavourite(list, destination.stationSerial);
	const here = list.filter(f => samePlace(f.destination, destination));
	return here.find(f => f.kind === 'other') ?? here[0] ?? null;
}

/**
 * The favourites sheet: "save" a place or station (optionally confirming a pick that would undo another favourite),
 * or "edit" a saved favourite. Shown by FavouritesHost.
 */
export type FavouriteMenuRequest =
	{ kind: 'save', destination: SearchHistoryEntry, pick?: Pick } |
	{ kind: 'edit', favourite: Favourite };
export const favouriteMenu = writable<FavouriteMenuRequest | null>(null);

/** Holding a place or station: the edit sheet when it's already saved, else the save sheet. */
export function holdToSave(destination: SearchHistoryEntry) {
	const saved = savedFavourite(get(favourites), destination);
	favouriteMenu.set(saved ? { kind: 'edit', favourite: saved } : { kind: 'save', destination });
}

/**
 * What saving a place as `target` would undo: the Home or Work it replaces, and the favourite the place stops being.
 * `target` is a kind, or the favourite being moved there ("Change place").
 */
export function saveEffects(list: Favourite[], destination: SearchHistoryEntry, target: FavouriteKind | Favourite) {
	if (target === 'other') return { replaces: null, stopsBeing: null };
	const moving = typeof target === 'object' ? target : null;
	const replaces = moving ? null : list.find(f => f.kind === target && !samePlace(f.destination, destination)) ?? null;
	const stopsBeing = list.find(f => samePlace(f.destination, destination) &&
		(moving ? f.id !== moving.id : f.kind !== target)) ?? null;
	return { replaces, stopsBeing };
}

/** The name shown for a favourite: Home, Work or the rider's own name. */
export const favouriteLabel = derived(t, text => (f: Favourite) => f.kind === 'home' ? text('multi_fav_home') : f.kind === 'work' ? text('multi_fav_work') : f.label);

/**
 * Pick mode: the next destination the rider picks in the search (result, recent search or station) becomes Home or
 * Work, is offered for saving ("Add"), or becomes a favourite's new place ("Change place"). Cancelled when the search
 * closes without a pick (FavouritesHost) or from the guide line.
 */
export type Pick = { kind: SlotKind | 'add' } | { kind: 'move', favourite: Favourite };
export const pick = writable<Pick | null>(null);

/** The search bar's placeholder while picking, else null. */
export const pickPlaceholder = derived([pick, favouriteLabel, t], ([current, label, text]) => {
	if (!current) return null;
	if (current.kind === 'add') return text('multi_fav_pick_add_placeholder');
	const name = current.kind === 'move' ? label(current.favourite) : text(current.kind === 'home' ? 'multi_fav_home' : 'multi_fav_work');
	return text('multi_fav_replace_placeholder', { name });
});

/**
 * Acts on a picked place. Saving never undoes another favourite silently: when the place is already one (or the slot
 * is somehow set), the save sheet opens to confirm, with the warning. "Add" on a saved place opens its edit sheet.
 * Resolves to true when it saved straight away.
 */
export async function choosePicked(current: Pick, destination: SearchHistoryEntry): Promise<boolean> {
	await loadFavourites();
	const list = get(favourites);
	if (current.kind === 'add') {
		const saved = savedFavourite(list, destination);
		favouriteMenu.set(saved ? { kind: 'edit', favourite: saved } : { kind: 'save', destination });
		return false;
	}
	const moving = current.kind === 'move' ? list.find(f => f.id === current.favourite.id) : null;
	if (current.kind === 'move' && !moving) return false; // removed meanwhile
	const { replaces, stopsBeing } = saveEffects(list, destination, moving ?? current.kind as SlotKind);
	if (replaces || stopsBeing) {
		favouriteMenu.set({ kind: 'save', destination, pick: moving ? { kind: 'move', favourite: moving } : current });
		return false;
	}
	if (moving) await moveFavourite(moving.id, destination);
	else await saveFavourite(destination, current.kind as SlotKind);
	return true;
}

/** What a short confirmation after a save says ("Saved as Home", "Work: new place saved"); shown by FavouritesHost. */
export type SavedNotice = { kind: FavouriteKind, name?: string } | { moved: Favourite };
export const favouriteNotice = writable<(SavedNotice & { id: number }) | null>(null);

/** Confirms a save: the notice and a short buzz. */
export function confirmSaved(notice: SavedNotice) {
	favouriteNotice.set({ ...notice, id: Date.now() });
	buzz();
}

/** How long a pin dropped on the map may wait for its address before it is saved with its coordinates. */
const ADDRESS_WAIT_MS = 6000;
// A pin dropped on the map arrives first without a name; Gira+ sets it again once the address is looked up
let waiting: { pick: Pick, lat: number, lng: number, timer: ReturnType<typeof setTimeout> } | null = null;

function finishPick(current: Pick, destination: SearchHistoryEntry) {
	void choosePicked(current, destination).then(saved => {
		if (saved) confirmSaved(current.kind === 'move' ? { moved: current.favourite } : { kind: current.kind as SlotKind });
	});
}

function waitForAddress(current: Pick, lat: number, lng: number) {
	if (waiting) clearTimeout(waiting.timer);
	waiting = {
		pick: current,
		lat,
		lng,
		timer: setTimeout(() => {
			waiting = null;
			finishPick(current, { type: 'location', lat, lng, name: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
		}, ADDRESS_WAIT_MS),
	};
}

routeDestination.subscribe(destination => {
	if (waiting && destination) {
		const current = waiting.pick;
		if (destination.name) {
			// The address arrived, or the rider picked something else meanwhile
			clearTimeout(waiting.timer);
			waiting = null;
			finishPick(current, { ...destination, name: destination.name });
		} else {
			waitForAddress(current, destination.lat, destination.lng);
		}
		return;
	}
	const current = get(pick);
	if (!current || !destination) return;
	pick.set(null);
	if (destination.name) finishPick(current, { ...destination, name: destination.name });
	else waitForAddress(current, destination.lat, destination.lng);
});

/** How long "Remove" stays armed for its second tap. */
export const REMOVE_CONFIRM_MS = 3000;

/**
 * A two-tap confirmation: the first tap arms it (onArmed(true)), a second tap within the window confirms (returns
 * true). Left alone, it disarms (onArmed(false)).
 */
export function twoTap(onArmed: (armed: boolean) => void, windowMs = REMOVE_CONFIRM_MS) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return {
		tap(): boolean {
			if (timer !== undefined) {
				clearTimeout(timer);
				timer = undefined;
				onArmed(false);
				return true;
			}
			onArmed(true);
			timer = setTimeout(() => {
				timer = undefined;
				onArmed(false);
			}, windowMs);
			return false;
		},
		cancel() {
			clearTimeout(timer);
			timer = undefined;
		},
	};
}

void loadFavourites();