// Gira+ Multi: two hidden jokes that end on a real order of bolacha Maria. After Gira+'s own About animation (its
// developers ride off as a bike's wheels) the bike comes back on two biscuits with an order button; seven taps on the
// profile's header make a "Order bolacha Maria" row appear until the profile closes. Both open Continente's page for
// its Maria biscuits: their basket only takes products added on their own page, so a link can't fill it (or pick how
// many).
import { t } from '$lib/translations';
import { get, writable } from 'svelte/store';

export const BOLACHA_URL = 'https://www.continente.pt/produto/bolachas-maria-continente-6715842.html';

const BAKER_TAPS = 7;
/** A tap later than this after the previous one starts the count again. */
const TAP_GAP_MS = 1500;
/** The countdown shows from this tap on, so a stray tap or two says nothing. */
const COUNTDOWN_FROM = 3;

/** The profile's order row is shown (until the profile closes). */
export const baker = writable(false);
/** The countdown's message, shown like Gira+'s own toasts. */
export const bakerToast = writable<{ text: string, id: number } | null>(null);

let taps = 0;
let lastTap = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function toast(text: string, ms: number) {
	clearTimeout(toastTimer);
	bakerToast.set({ text, id: Date.now() });
	toastTimer = setTimeout(() => bakerToast.set(null), ms);
}

/** A tap on the profile's header. */
export function bakerTap() {
	if (get(baker)) return;
	const now = Date.now();
	if (now - lastTap > TAP_GAP_MS) taps = 0;
	lastTap = now;
	taps++;
	const left = BAKER_TAPS - taps;
	const tr = get(t);
	if (left === 0) {
		taps = 0;
		baker.set(true);
		toast(tr('multi_bolacha_baker'), 2500);
	} else if (taps >= COUNTDOWN_FROM) {
		toast(tr(left === 1 ? 'multi_bolacha_tap_left' : 'multi_bolacha_taps_left', { count: String(left) }), 1500);
	}
}

/** The profile closed: the row goes, and the count starts again. */
export function resetBaker() {
	taps = 0;
	clearTimeout(toastTimer);
	bakerToast.set(null);
	baker.set(false);
}