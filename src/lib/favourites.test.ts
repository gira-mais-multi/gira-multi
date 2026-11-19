import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	favourites, loadFavourites, removeFavourite, renameFavourite, replacing, resetFavouritesForTest, saveFavourite,
	sortedFavourites, stationFavourite, takeHintShowing, toggleStationFavourite, withoutFavourites,
} from '$lib/favourites';
import { routeDestination } from '$lib/routing';
import type { SearchHistoryEntry } from '$lib/search-history';

const place = (name: string, lat = 38.7): SearchHistoryEntry => ({ type: 'location', name, lat, lng: -9.14 });
const sodre = { type: 'station', name: '481 - Cais do Sodré', lat: 38.7063, lng: -9.1449, stationSerial: 'sodre' } as const;

/** Forgets what is in memory and reads the phone's storage again, as after restarting the app. */
async function restart() {
	resetFavouritesForTest();
	await loadFavourites();
}

describe('favourites', () => {
	beforeEach(() => {
		localStorage.clear();
		routeDestination.set(null);
		resetFavouritesForTest();
	});

	it('saves, renames and removes places, and keeps them after a restart', async () => {
		await saveFavourite(place('Rua do Ginásio'), 'other', 'Ginásio');
		await saveFavourite(sodre, 'other');
		await restart();
		expect(get(favourites).map(f => f.label)).toEqual(['Ginásio', '481 - Cais do Sodré']);

		const gym = get(favourites)[0];
		await renameFavourite(gym.id, '  Piscina ');
		await removeFavourite(get(favourites)[1].id);
		await restart();
		expect(get(favourites).map(f => [f.label, f.destination.name])).toEqual([['Piscina', 'Rua do Ginásio']]);
	});

	it('keeps one Home: saving another Home replaces it', async () => {
		await saveFavourite(place('Rua Antiga', 38.71), 'home');
		await saveFavourite(place('Rua Nova', 38.72), 'home');
		await restart();
		const homes = get(favourites).filter(f => f.kind === 'home');
		expect(homes.map(f => f.destination.name)).toEqual(['Rua Nova']);
	});

	it('does not add the same place twice as a named favourite', async () => {
		await saveFavourite(place('Rossio'), 'other');
		await saveFavourite(place('Rossio'), 'other', 'Centro');
		expect(get(favourites).map(f => f.label)).toEqual(['Centro']);
	});

	it('lists Home, Work, places, then stations', async () => {
		await saveFavourite(sodre, 'other');
		await saveFavourite(place('Ginásio', 38.73), 'other');
		await saveFavourite(place('Escritório', 38.74), 'work');
		await saveFavourite(place('Casa', 38.75), 'home');
		expect(get(sortedFavourites).map(f => f.destination.name)).toEqual(['Casa', 'Escritório', 'Ginásio', '481 - Cais do Sodré']);
	});

	it('gives a favourite the next place picked after "Change place"', async () => {
		await saveFavourite(place('Rua Antiga', 38.71), 'work');
		replacing.set(get(favourites)[0]);
		routeDestination.set({ type: 'location', name: 'Avenida Nova', lat: 38.76, lng: -9.15 });
		await new Promise(resolve => setTimeout(resolve));
		await restart();
		expect(get(favourites).map(f => [f.kind, f.destination.name])).toEqual([['work', 'Avenida Nova']]);
		// Only the one pick: a later destination doesn't touch it
		routeDestination.set({ type: 'location', name: 'Outro sítio', lat: 38.77, lng: -9.16 });
		await new Promise(resolve => setTimeout(resolve));
		expect(get(favourites)[0].destination.name).toBe('Avenida Nova');
	});

	it('the station star adds the station, and a second tap removes it', async () => {
		await toggleStationFavourite(sodre);
		expect(stationFavourite(get(favourites), 'sodre')?.label).toBe('481 - Cais do Sodré');
		await toggleStationFavourite(sodre);
		await restart();
		expect(get(favourites)).toEqual([]);
	});

	it('shows the "hold to save" hint in three app sessions, however often the search opens, and not once something is saved', async () => {
		const sessions = [];
		for (let i = 0; i < 4; i++) {
			await restart();
			sessions.push([await takeHintShowing(), await takeHintShowing(), await takeHintShowing()]);
		}
		expect(sessions).toEqual([[true, true, true], [true, true, true], [true, true, true], [false, false, false]]);

		localStorage.clear();
		resetFavouritesForTest();
		await saveFavourite(place('Rossio'), 'other');
		expect(await takeHintShowing()).toBe(false);
	});

	it('leaves places already saved as favourites out of the recent searches', async () => {
		await saveFavourite(place('Rua de Casa', 38.71), 'home');
		await saveFavourite(sodre, 'other', 'Cais');
		const history = [place('Rua de Casa', 38.71), place('Rossio', 38.714), { ...sodre }];
		expect(withoutFavourites(history, get(favourites)).map(e => e.name)).toEqual(['Rossio']);
	});
});