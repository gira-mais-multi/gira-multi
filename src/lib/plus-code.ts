// Gira+ Multi: Google's plus codes (Open Location Code), decoded on the phone. Written from the published
// specification (github.com/google/open-location-code, Apache 2.0): no request is needed to read one.

const ALPHABET = '23456789CFGHJMPQRVWX';
const PAIR_LENGTH = 10;
const GRID_ROWS = 5;
const GRID_COLUMNS = 4;
/** The size in degrees of each pair's digit: 20°, 1°, 0.05°, 0.0025°, 0.000125°. */
const PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125];

const CODE_CHARS = `[${ALPHABET}]`;
/** A full code ("8CCGPV6P+R7") or a short one ("PV6P+R7"), in upper or lower case. */
export const PLUS_CODE = new RegExp(`(?:${CODE_CHARS}{2}){1,4}0*\\+${CODE_CHARS}{0,7}`, 'i');

export type Coordinates = { lat: number, lng: number };

/** True for a full code (8 digits before the "+"), which needs no reference place. */
export function isFullCode(code: string) {
	return code.indexOf('+') === 8;
}

/** The centre of a full code's area, or null if it isn't one. */
export function decodePlusCode(code: string): Coordinates | null {
	const clean = code.toUpperCase();
	if (!isFullCode(clean) || !new RegExp(`^${PLUS_CODE.source}$`, 'i').test(clean)) return null;
	const digits = clean.replace('+', '').replace(/0+$/, '');
	if (digits.length < 2 || digits.length % 2 === 1 && digits.length < PAIR_LENGTH) return null;
	let lat = -90;
	let lng = -180;
	let latSize = 0;
	let lngSize = 0;
	for (let i = 0; i < Math.min(digits.length, PAIR_LENGTH); i += 2) {
		const resolution = PAIR_RESOLUTIONS[i / 2];
		lat += ALPHABET.indexOf(digits[i]) * resolution;
		lng += ALPHABET.indexOf(digits[i + 1]) * resolution;
		latSize = lngSize = resolution;
	}
	for (let i = PAIR_LENGTH; i < digits.length; i++) {
		const digit = ALPHABET.indexOf(digits[i]);
		latSize /= GRID_ROWS;
		lngSize /= GRID_COLUMNS;
		lat += Math.floor(digit / GRID_COLUMNS) * latSize;
		lng += (digit % GRID_COLUMNS) * lngSize;
	}
	if (lat >= 90 || lng >= 180) return null;
	return { lat: lat + latSize / 2, lng: lng + lngSize / 2 };
}

/** The first `length` digits of the code for a place (enough for the part a short code leaves out). */
function encodePrefix(at: Coordinates, length: number) {
	let lat = Math.min(Math.max(at.lat, -90), 89.9999999) + 90;
	let lng = (((at.lng + 180) % 360) + 360) % 360;
	let code = '';
	for (let i = 0; code.length < length; i++) {
		const resolution = PAIR_RESOLUTIONS[i];
		const latDigit = Math.floor(lat / resolution);
		const lngDigit = Math.floor(lng / resolution);
		lat -= latDigit * resolution;
		lng -= lngDigit * resolution;
		code += ALPHABET[latDigit] + ALPHABET[lngDigit];
	}
	return code.slice(0, length);
}

/**
 * A short code ("PV6P+R7") completed with the digits of the place nearest to `reference`, as Google does: right for
 * any place within about half the code's area of the reference (for a 4+2 code, ±0.5°, so the whole Lisbon area from
 * its centre). A full code comes back decoded as is.
 */
export function recoverPlusCode(code: string, reference: Coordinates): Coordinates | null {
	const clean = code.toUpperCase();
	if (isFullCode(clean)) return decodePlusCode(clean);
	const separator = clean.indexOf('+');
	if (separator < 2 || separator > 8 || separator % 2 === 1) return null;
	const missing = 8 - separator;
	const decoded = decodePlusCode(encodePrefix(reference, missing) + clean);
	if (!decoded) return null;
	// The size of the area the left-out digits stand for
	const resolution = PAIR_RESOLUTIONS[missing / 2 - 1];
	const half = resolution / 2;
	let { lat, lng } = decoded;
	if (reference.lat + half < lat && lat - resolution >= -90) lat -= resolution;
	else if (reference.lat - half > lat && lat + resolution <= 90) lat += resolution;
	if (reference.lng + half < lng) lng -= resolution;
	else if (reference.lng - half > lng) lng += resolution;
	return { lat, lng };
}