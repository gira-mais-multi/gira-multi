import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reverseGeocode } from '$lib/geocoding';
import { get } from 'svelte/store';
import {
	cancelPick, choosePicked, editFavourite, emptySlots, favouriteMenu, favouriteNotice, favourites, hiddenSlots, hideSlot, holdToSave, loadFavourites,
	moveFavourite, pick, placeIcon, removeFavourite, resetFavouritesForTest, saveEffects, saveFavourite, sortedFavourites,
	takeMapSpot, takePick, twoTap, withoutFavourites,
} from '$lib/favourites';
import type { SearchHistoryEntry } from '$lib/search-history';

vi.mock('$lib/geocoding', () => ({ reverseGeocode: vi.fn(async () => 'Avenida da República, 50') }));

const place = (name: string, lat = 38.7): SearchHistoryEntry => ({ type: 'location', name, lat, lng: -9.14 });
const sodre = { type: 'station', name: '481 - Cais do Sodré', lat: 38.7063, lng: -9.1449, stationSerial: 'sodre' } as const;

/** Forgets what is in memory and reads the phone's storage again, as after restarting the app. */
async function restart() {
	resetFavouritesForTest();
	await loadFavourites();
}

const summary = () => get(favourites).map(f => [f.kind, f.label, f.destination.name]);

describe('favourites', () => {
	beforeEach(() => {
		localStorage.clear();
		resetFavouritesForTest();
	});

	it('saves, renames and removes places, and keeps them after a restart', async () => {
		await saveFavourite(place('Rua do Ginásio'), 'other', 'Ginásio');
		await saveFavourite(sodre, 'other');
		await restart();
		expect(get(favourites).map(f => f.label)).toEqual(['Ginásio', '481 - Cais do Sodré']);

		const gym = get(favourites)[0];
		await editFavourite(gym.id, '  Piscina ');
		await removeFavourite(get(favourites)[1].id);
		await restart();
		expect(summary()).toEqual([['other', 'Piscina', 'Rua do Ginásio']]);
	});

	it('keeps a place\'s icon, draws old and unknown icons as the map pin, and never rewrites them', async () => {
		await saveFavourite(place('Ginásio', 38.71), 'other', 'Ginásio', 'barbell');
		await saveFavourite(sodre, 'other', 'Cais', 'heart');
		// A favourite from before icons, and one with an icon this version doesn't know
		const stored = JSON.parse(localStorage.getItem('CapacitorStorage.multiFavourites')!);
		stored.push({ id: 'old', kind: 'other', label: 'Mãe', destination: place('Rua da Mãe', 38.72) });
		stored.push({ id: 'new', kind: 'other', label: 'Lago', destination: place('Lago', 38.73), icon: 'swimming' });
		localStorage.setItem('CapacitorStorage.multiFavourites', JSON.stringify(stored));
		await restart();

		const byLabel = (label: string) => get(favourites).find(f => f.label === label)!;
		expect(placeIcon(byLabel('Ginásio'))).toBe('barbell');
		expect(byLabel('Cais').icon).toBeUndefined(); // stations get no icon
		expect(placeIcon(byLabel('Mãe'))).toBe('map-pin');
		expect(placeIcon(byLabel('Lago'))).toBe('map-pin');

		// An unrelated change keeps the unknown icon as stored
		await editFavourite(byLabel('Ginásio').id, 'Ginásio', 'school');
		await restart();
		expect(byLabel('Lago').icon).toBe('swimming');
		expect(placeIcon(byLabel('Ginásio'))).toBe('school');
	});

	it('keeps one Home: saving another Home replaces it', async () => {
		await saveFavourite(place('Rua Antiga', 38.71), 'home');
		await saveFavourite(place('Rua Nova', 38.72), 'home');
		await restart();
		expect(summary()).toEqual([['home', '', 'Rua Nova']]);
	});

	it('does not add the same place twice as a named favourite', async () => {
		await saveFavourite(place('Rossio'), 'other');
		await saveFavourite(place('Rossio'), 'other', 'Centro');
		expect(get(favourites).map(f => f.label)).toEqual(['Centro']);
	});

	it('lists Home, Work, stations, then named places', async () => {
		await saveFavourite(place('Ginásio', 38.73), 'other');
		await saveFavourite(sodre, 'other');
		await saveFavourite(place('Escritório', 38.74), 'work');
		await saveFavourite(place('Casa', 38.75), 'home');
		expect(get(sortedFavourites).map(f => f.destination.name)).toEqual(['Casa', 'Escritório', '481 - Cais do Sodré', 'Ginásio']);
	});

	it('holding something already saved opens its edit sheet, never a second copy', async () => {
		await saveFavourite(sodre, 'home');
		holdToSave({ ...sodre });
		expect(get(favouriteMenu)).toMatchObject({ kind: 'edit', favourite: { kind: 'home' } });
		holdToSave(place('Rossio'));
		expect(get(favouriteMenu)).toMatchObject({ kind: 'save', destination: { name: 'Rossio' } });
	});

	it('saving a named place as Home moves it there instead of keeping both', async () => {
		await saveFavourite(place('Rua do Ginásio', 38.71), 'other', 'Ginásio');
		expect(saveEffects(get(favourites), place('Rua do Ginásio', 38.71), 'home').stopsBeing?.label).toBe('Ginásio');
		await saveFavourite(place('Rua do Ginásio', 38.71), 'home');
		await restart();
		expect(summary()).toEqual([['home', '', 'Rua do Ginásio']]);
	});

	describe('choosing Home, Work or a new place', () => {
		const pickPlace = async (destination: SearchHistoryEntry) => {
			const taken = takePick(destination);
			await new Promise(resolve => setTimeout(resolve));
			return taken;
		};

		it('saves a new place as Home straight away, only for the one pick, and confirms it', async () => {
			pick.set({ kind: 'home' });
			expect(await pickPlace(place('Rua de Casa', 38.71))).toBe(true);
			// the next search result goes back to being a normal destination
			expect(await pickPlace(place('Outro sítio', 38.77))).toBe(false);
			await vi.waitFor(() => expect(get(favouriteNotice)).toMatchObject({ kind: 'home' }));
			await restart();
			expect(summary()).toEqual([['home', '', 'Rua de Casa']]);
		});

		it('a spot held on the map is saved under its address, or its coordinates when none comes', async () => {
			pick.set({ kind: 'work' });
			expect(takeMapSpot(38.74, -9.15)).toBe(true);
			await vi.waitFor(() => expect(summary()).toEqual([['work', '', 'Avenida da República, 50']]));

			vi.mocked(reverseGeocode).mockResolvedValueOnce(null);
			pick.set({ kind: 'add' });
			takeMapSpot(38.75, -9.16);
			await vi.waitFor(() => expect(get(favouriteMenu)).toMatchObject({ kind: 'save', destination: { name: '38.75000, -9.16000' } }));
		});

		it('ends on cancel, and outside choosing nothing is taken', async () => {
			pick.set({ kind: 'home' });
			expect(cancelPick()).toBe(true);
			expect(cancelPick()).toBe(false);
			expect(takePick(place('Rua de Casa'))).toBe(false);
			expect(takeMapSpot(38.74, -9.15)).toBe(false);
			expect(get(favourites)).toEqual([]);
		});

		it('never replaces another favourite silently: a saved place opens the save sheet with the warning', async () => {
			await saveFavourite(place('Rua do Ginásio', 38.71), 'other', 'Ginásio');
			pick.set({ kind: 'work' });
			await pickPlace(place('Rua do Ginásio', 38.71));
			expect(summary()).toEqual([['other', 'Ginásio', 'Rua do Ginásio']]);
			const request = get(favouriteMenu);
			expect(request).toMatchObject({ kind: 'save', pick: { kind: 'work' } });
			if (request?.kind !== 'save') throw new Error('expected the save sheet');
			expect(saveEffects(get(favourites), request.destination, 'work').stopsBeing?.label).toBe('Ginásio');
		});

		it('"Add" on a place already saved opens its edit sheet', async () => {
			await saveFavourite(sodre, 'other', 'Cais');
			expect(await choosePicked({ kind: 'add' }, { ...sodre })).toBe(false);
			expect(get(favouriteMenu)).toMatchObject({ kind: 'edit', favourite: { label: 'Cais' } });
			expect(get(favourites)).toHaveLength(1);
		});

		it('"Change place" moves a favourite, and asks first when the new place is another favourite', async () => {
			await saveFavourite(place('Rua Antiga', 38.71), 'work');
			await saveFavourite(place('Rua do Ginásio', 38.72), 'other', 'Ginásio');
			const work = get(favourites)[0];

			pick.set({ kind: 'move', favourite: work });
			await pickPlace(place('Avenida Nova', 38.76));
			expect(summary()[0]).toEqual(['work', '', 'Avenida Nova']);

			pick.set({ kind: 'move', favourite: get(favourites)[0] });
			await pickPlace(place('Rua do Ginásio', 38.72));
			expect(get(favourites)).toHaveLength(2); // nothing changed yet
			expect(get(favouriteMenu)).toMatchObject({ kind: 'save', pick: { kind: 'move' } });

			// Confirming in the sheet moves Work there and Ginásio stops being saved
			await moveFavourite(work.id, place('Rua do Ginásio', 38.72));
			await restart();
			expect(summary()).toEqual([['work', '', 'Rua do Ginásio']]);
		});
	});

	it('hides an empty Home or Work slot, and saving that kind brings it back', async () => {
		expect(get(emptySlots)).toEqual(['home', 'work']);
		await hideSlot('work');
		await restart();
		expect(get(emptySlots)).toEqual(['home']);
		await saveFavourite(place('Rua de Casa'), 'home');
		expect(get(emptySlots)).toEqual([]);

		await saveFavourite(place('Escritório', 38.74), 'work');
		await removeFavourite(get(favourites).find(f => f.kind === 'work')!.id);
		await restart();
		expect(get(hiddenSlots)).toEqual([]);
		expect(get(emptySlots)).toEqual(['work']);
	});

	describe('remove asks for a second tap', () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('removes on a second tap within 3 seconds, not after', () => {
			const armed: boolean[] = [];
			const remove = twoTap(on => armed.push(on));
			expect(remove.tap()).toBe(false);
			vi.advanceTimersByTime(3100);
			expect(armed).toEqual([true, false]);
			expect(remove.tap()).toBe(false);
			vi.advanceTimersByTime(2000);
			expect(remove.tap()).toBe(true);
		});
	});

	it('leaves places already saved as favourites out of the recent searches', async () => {
		await saveFavourite(place('Rua de Casa', 38.71), 'home');
		await saveFavourite(sodre, 'other', 'Cais');
		const history = [place('Rua de Casa', 38.71), place('Rossio', 38.714), { ...sodre }];
		expect(withoutFavourites(history, get(favourites)).map(e => e.name)).toEqual(['Rossio']);
	});
});