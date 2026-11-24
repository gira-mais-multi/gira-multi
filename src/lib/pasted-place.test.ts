import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodePlusCode, recoverPlusCode } from '$lib/plus-code';

const mocks = vi.hoisted(() => ({
	search: vi.fn(),
	reverse: vi.fn(),
	request: vi.fn(),
}));
vi.mock('$lib/geocoding', () => ({ searchLocations: mocks.search, reverseGeocode: mocks.reverse }));
vi.mock('@capacitor/core', () => ({ CapacitorHttp: { request: mocks.request } }));

import { LISBON, parseCoordinates, parseMapsUrl, searchLocations } from '$lib/pasted-place';

const near = (at: { lat: number, lng: number } | null, lat: number, lng: number, within = 0.0002) => {
	expect(at).not.toBeNull();
	expect(Math.abs(at!.lat - lat)).toBeLessThan(within);
	expect(Math.abs(at!.lng - lng)).toBeLessThan(within);
};

describe('plus codes', () => {
	it('decode a full code to the centre of its area (the specification\'s own example)', () => {
		near(decodePlusCode('8FVC9G8F+6X'), 47.3655625, 8.5249375, 0.000001);
		near(decodePlusCode('8fvc9g8f+6x'), 47.3655625, 8.5249375, 0.000001);
		expect(decodePlusCode('9G8F+6X')).toBeNull();
		expect(decodePlusCode('8FVC9G8F6X')).toBeNull();
	});

	it('complete a short code against a nearby place, as the specification does', () => {
		near(recoverPlusCode('9G8F+6X', { lat: 47.4, lng: 8.6 }), 47.3655625, 8.5249375, 0.000001);
		// across a cell edge: the nearest match, not the one in the reference's own cell
		const north = { lat: 39.01, lng: -9.01 };
		near(recoverPlusCode(fullCodeFor(north).slice(4), { lat: 38.99, lng: -8.99 }), north.lat, north.lng);
	});

	it('recover any short code in the Gira area from Lisbon\'s centre', () => {
		// Codes made from places across the area (Oeiras to Parque das Nações), shortened to 4+2
		for (const place of [{ lat: 38.6929, lng: -9.3146 }, { lat: 38.7685, lng: -9.0947 }, { lat: 38.7223, lng: -9.1393 }, { lat: 38.58, lng: -9.0 }]) {
			const full = fullCodeFor(place);
			near(decodePlusCode(full), place.lat, place.lng, 0.0002);
			near(recoverPlusCode(full.slice(4), LISBON), place.lat, place.lng, 0.0002);
		}
	});
});

/** A full code for a place, from the decoder itself: every 10-digit code whose centre is the place's. */
function fullCodeFor({ lat, lng }: { lat: number, lng: number }) {
	const alphabet = '23456789CFGHJMPQRVWX';
	let la = lat + 90, ln = lng + 180, code = '';
	for (const size of [20, 1, 0.05, 0.0025, 0.000125]) {
		const a = Math.floor(la / size), b = Math.floor(ln / size);
		la -= a * size;
		ln -= b * size;
		code += alphabet[a] + alphabet[b];
	}
	return code.slice(0, 8) + '+' + code.slice(8);
}

describe('parseCoordinates', () => {
	it('reads coordinates as Google Maps copies them, and nothing else', () => {
		expect(parseCoordinates('38.72230, -9.13930')).toEqual({ lat: 38.7223, lng: -9.1393 });
		expect(parseCoordinates('38.7223 -9.1393')).toEqual({ lat: 38.7223, lng: -9.1393 });
		expect(parseCoordinates('Rua 5, 1000')).toBeNull();
		expect(parseCoordinates('138.7, -9.1')).toBeNull();
	});
});

describe('parseMapsUrl', () => {
	it('takes the place\'s own coordinates and name from a long link', () => {
		expect(parseMapsUrl('https://www.google.com/maps/place/Pra%C3%A7a+do+Com%C3%A9rcio/@38.7075,-9.1364,17z/data=!3m1!4b1!4m6!3m5!1s0xd19347!8m2!3d38.7076!4d-9.1365!16z'))
			.toEqual({ at: { lat: 38.7076, lng: -9.1365 }, name: 'Praça do Comércio' });
	});

	it('takes coordinates from q=, /search/ and dropped pins', () => {
		expect(parseMapsUrl('https://maps.google.com/?q=38.7223,-9.1393')).toEqual({ at: { lat: 38.7223, lng: -9.1393 }, name: null });
		expect(parseMapsUrl('https://www.google.com/maps/search/38.7223,+-9.1393?entry=tts')).toEqual({ at: { lat: 38.7223, lng: -9.1393 }, name: null });
		expect(parseMapsUrl('https://www.google.com/maps/place/38%C2%B043\'20.3%22N/@38.7223,-9.1393,17z/data=!4m4!3m3!8m2!3d38.7223!4d-9.1393')).toEqual({ at: { lat: 38.7223, lng: -9.1393 }, name: '38°43\'20.3"N' });
	});

	it('falls back to a name to search, reads through the consent page, and ignores other sites', () => {
		expect(parseMapsUrl('https://www.google.com/maps/search/?api=1&query=Jardim+da+Estrela')).toEqual({ query: 'Jardim da Estrela' });
		expect(parseMapsUrl('https://consent.google.com/ml?continue=https://www.google.com/maps/place/X/data%3D!3d38.7!4d-9.1&gl=PT')).toEqual({ at: { lat: 38.7, lng: -9.1 }, name: 'X' });
		expect(parseMapsUrl('https://example.com/maps?q=38.7,-9.1')).toBeNull();
	});
});

describe('searchLocations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.search.mockResolvedValue([]);
		mocks.reverse.mockResolvedValue('Rua Augusta 100');
	});

	it('turns pasted coordinates into one result, named by Gira+\'s reverse geocoder', async () => {
		expect(await searchLocations('38.7100, -9.1370')).toEqual([{ name: 'Rua Augusta 100', detail: '38.71000, -9.13700', lat: 38.71, lng: -9.137 }]);
		expect(mocks.search).not.toHaveBeenCalled();
	});

	it('reads a short Maps link from its first redirect, inside the text Maps\' share button copies', async () => {
		mocks.request.mockResolvedValue({ status: 302, headers: { Location: 'https://www.google.com/maps/place/Caf%C3%A9+X/data=!3d38.71!4d-9.14' }, url: 'https://maps.app.goo.gl/abc' });
		const found = await searchLocations('Café X · Rua Augusta 100, Lisboa https://maps.app.goo.gl/abc');
		expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://maps.app.goo.gl/abc', disableRedirects: true }));
		expect(found).toEqual([{ name: 'Café X', detail: 'Café X Rua Augusta 100, Lisboa', lat: 38.71, lng: -9.14 }]);
	});

	it('searches the shared text when the link can\'t be read', async () => {
		mocks.request.mockRejectedValue(new Error('offline'));
		mocks.search.mockResolvedValue([{ name: 'Rua Augusta', detail: '', lat: 1, lng: 2 }]);
		await searchLocations('Rua Augusta 100 https://maps.app.goo.gl/abc');
		expect(mocks.search).toHaveBeenCalledWith('Rua Augusta 100', undefined);
	});

	it('completes a short plus code against Lisbon, or against the locality that follows it if Gira+ finds it', async () => {
		const [lisbon] = await searchLocations('PV6Q+WP');
		expect(Math.abs(lisbon.lat - 38.7)).toBeLessThan(0.5);
		expect(Math.abs(lisbon.lng + 9.1)).toBeLessThan(0.5);
		expect(lisbon.detail).toBe('PV6Q+WP');

		// A locality outside Gira+'s area isn't found: no result rather than a place moved into Lisbon
		expect(await searchLocations('PV6Q+WP Porto')).toEqual([]);
		expect(mocks.search).toHaveBeenCalledWith('Porto', undefined);
	});

	it('tries an address once more without its postcode', async () => {
		mocks.search.mockResolvedValueOnce([]).mockResolvedValueOnce([{ name: 'Rua Augusta 100', detail: 'Lisboa', lat: 1, lng: 2 }]);
		expect(await searchLocations('Rua Augusta 100, 1100-053 Lisboa')).toHaveLength(1);
		expect(mocks.search).toHaveBeenLastCalledWith('Rua Augusta 100, Lisboa', undefined);
	});

	it('leaves ordinary searches to Gira+', async () => {
		await searchLocations('Alameda');
		expect(mocks.search).toHaveBeenCalledOnce();
		expect(mocks.search).toHaveBeenCalledWith('Alameda', undefined);
	});
});