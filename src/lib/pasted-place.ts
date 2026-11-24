// Gira+ Multi: what Google Maps lets a rider copy, pasted into Gira+'s search, comes back as a normal result: a plus
// code, coordinates, or a Google Maps link (the short maps.app.goo.gl ones too, also inside the text that Maps' share
// button copies). Anything else goes to Gira+'s own search as typed, once more without the postcode if that finds
// nothing. SearchBar.svelte imports `searchLocations` from here instead of from Gira+'s geocoding.ts.
import { CapacitorHttp } from '@capacitor/core';
import { reverseGeocode, searchLocations as searchGira, type GeocodingResult } from '$lib/geocoding';
import { PLUS_CODE, recoverPlusCode, type Coordinates } from '$lib/plus-code';
import type { Coord } from '$lib/routing';

/** Short plus codes are completed against this place when no locality follows them: Lisbon's centre. */
export const LISBON: Coordinates = { lat: 38.7223, lng: -9.1393 };

const NUMBER = String.raw`-?\d{1,3}(?:\.\d+)?`;
const COORDINATES = new RegExp(String.raw`^\s*(${NUMBER})\s*[,;\s]\s*(${NUMBER})\s*$`);
const URL_IN_TEXT = /https?:\/\/\S+/i;
const SHORT_LINK_HOSTS = /^(?:maps\.app\.goo\.gl|goo\.gl)$/i;
/** A Portuguese postcode ("1100-053"), which sometimes keeps Gira+'s geocoder from finding an address. */
const POSTCODE = /\b\d{4}-\d{3}\b/;

const valid = ({ lat, lng }: Coordinates) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
const format = ({ lat, lng }: Coordinates) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** "38.7223, -9.1393" (or with a space or semicolon between), as Google Maps copies a dropped pin. */
export function parseCoordinates(text: string): Coordinates | null {
	const match = text.match(COORDINATES);
	if (!match) return null;
	const at = { lat: Number(match[1]), lng: Number(match[2]) };
	return valid(at) ? at : null;
}

/** What a long Google Maps address names: the place's coordinates (and its name, if any), or else a text to search. */
export function parseMapsUrl(url: string): { at: Coordinates, name: string | null } | { query: string } | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	const host = parsed.hostname.toLowerCase();
	// The consent page Google puts in front of Maps in the EU carries the real address
	if (/^consent\.google\./.test(host)) {
		const next = parsed.searchParams.get('continue');
		return next ? parseMapsUrl(next) : null;
	}
	const maps = /^maps\.google\./.test(host) || (/(^|\.)google\.[a-z.]+$/.test(host) && parsed.pathname.startsWith('/maps'));
	if (!maps) return null;

	const path = decodeURIComponent(parsed.pathname).replace(/\+/g, ' ');
	const place = path.match(/\/place\/([^/]+)/)?.[1]?.trim() ?? null;
	const name = place && !parseCoordinates(place) ? place : null;
	const full = decodeURIComponent(parsed.href);
	// The place itself (!3d lat !4d lng), then a searched point, then the map's centre
	const pin = full.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
	if (pin) return { at: { lat: Number(pin[1]), lng: Number(pin[2]) }, name };
	for (const key of ['q', 'query', 'destination', 'daddr', 'll', 'center']) {
		const value = parsed.searchParams.get(key);
		if (!value) continue;
		const at = parseCoordinates(value);
		if (at) return { at, name };
		if (key === 'q' || key === 'query' || key === 'destination' || key === 'daddr') return { query: value };
	}
	const searched = path.match(/\/search\/([^/]+)/)?.[1]?.trim();
	const searchedAt = searched ? parseCoordinates(searched) : null;
	if (searchedAt) return { at: searchedAt, name };
	if (searched) return { query: searched };
	const centre = full.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
	if (centre && name) return { at: { lat: Number(centre[1]), lng: Number(centre[2]) }, name };
	if (name) return { query: name };
	return null;
}

/**
 * Where a short Maps link leads, read from its first redirect without following it: following it would land on
 * Google's consent page in the EU, and the first hop already holds the long address. One request to Google, made only
 * when such a link is pasted. Null if it can't be read (no connection, or Google changed its links).
 */
export async function resolveShortLink(url: string): Promise<string | null> {
	try {
		const response = await CapacitorHttp.request({ url, method: 'GET', disableRedirects: true, readTimeout: 5000, connectTimeout: 5000 });
		const headers = Object.fromEntries(Object.entries(response.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
		const location = headers.location;
		if (typeof location === 'string' && location) return new URL(location, url).href;
		return typeof response.url === 'string' && response.url !== url ? response.url : null;
	} catch (error) {
		console.debug('Could not read the Maps link', error);
		return null;
	}
}

async function placeAt(at: Coordinates, name: string | null, detail: string): Promise<GeocodingResult[]> {
	const named = name ?? await reverseGeocode(at);
	return [{ name: named ?? format(at), detail: named ? detail : '', lat: at.lat, lng: at.lng }];
}

async function fromLink(url: string, rest: string, bias?: Coord | null): Promise<GeocodingResult[] | null> {
	let target: string | null = url;
	if (SHORT_LINK_HOSTS.test(new URL(url).hostname)) target = await resolveShortLink(url);
	const place = target ? parseMapsUrl(target) : null;
	if (place && 'at' in place && valid(place.at)) return placeAt(place.at, place.name, rest || format(place.at));
	if (place && 'query' in place) return searchWithRetry(place.query, bias);
	// The text Maps' share button copies around the link names the place too
	return rest ? searchWithRetry(rest, bias) : null;
}

async function fromPlusCode(code: string, locality: string, bias?: Coord | null): Promise<GeocodingResult[]> {
	let reference: Coordinates | null = LISBON;
	if (locality) {
		// "PV6P+R7 Lisboa": completed against the locality; one outside Gira+'s area isn't found, so it isn't
		// silently moved into Lisbon
		reference = (await searchGira(locality, bias))[0] ?? null;
	}
	const at = reference && recoverPlusCode(code, reference);
	return at && valid(at) ? placeAt(at, null, code.toUpperCase()) : [];
}

async function searchWithRetry(query: string, bias?: Coord | null): Promise<GeocodingResult[]> {
	const found = await searchGira(query, bias);
	if (found.length > 0 || !POSTCODE.test(query)) return found;
	const withoutPostcode = query.replace(POSTCODE, ' ').replace(/\s*,\s*(,\s*)+/g, ', ').replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '');
	return withoutPostcode.length >= 2 ? searchGira(withoutPostcode, bias) : found;
}

/** Gira+'s place search, which also takes what Google Maps lets a rider copy. */
export async function searchLocations(query: string, bias?: Coord | null): Promise<GeocodingResult[]> {
	const text = query.trim();
	const at = parseCoordinates(text);
	if (at) return placeAt(at, null, format(at));

	const url = text.match(URL_IN_TEXT)?.[0];
	if (url) {
		const rest = text.replace(url, ' ').replace(/[·•|]/g, ' ').replace(/\s+/g, ' ').trim();
		const found = await fromLink(url.replace(/[).,]+$/, ''), rest, bias);
		if (found) return found;
	}

	const code = text.match(PLUS_CODE);
	if (code && (code.index === 0 || /\s/.test(text[code.index! - 1]))) {
		const locality = text.slice(code.index! + code[0].length).replace(/^[\s,]+/, '').trim();
		return fromPlusCode(code[0], locality, bias);
	}

	return searchWithRetry(text, bias);
}