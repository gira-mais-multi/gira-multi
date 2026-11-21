// Gira+ Multi: two hidden jokes that end on a real order of bolacha Maria. In Gira+'s own About animation the
// developers' bike crashes into the Tasca do Tozé's van, whose taped-on advert orders it (AboutDelivery.svelte); seven
// taps on the profile's header turn the profile into the user's own tasca, with an "Order bolacha Maria" row, until
// the profile closes (TascaBoard.svelte, BakerEntry.svelte). Both open Continente's page for its Maria biscuits: their
// basket only takes products added on their own page, so a link can't fill it (or pick how many).
import { t } from '$lib/translations';
import { mainAccount, sameEmail, savedAccounts, type SavedAccount } from '$lib/accounts';
import { derived, get, writable } from 'svelte/store';

export const BOLACHA_URL = 'https://www.continente.pt/produto/bolachas-maria-continente-6715842.html';

const BAKER_TAPS = 7;
/** A tap later than this after the previous one starts the count again. */
const TAP_GAP_MS = 1500;
/** The countdown shows from this tap on, so a stray tap or two says nothing. */
const COUNTDOWN_FROM = 3;

/** The profile is a tasca: its board and order row are shown (until the profile closes). */
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
		// the board dropping over the name is the payoff: no toast over it
		clearTimeout(toastTimer);
		bakerToast.set(null);
	} else if (taps >= COUNTDOWN_FROM) {
		toast(tr(left === 1 ? 'multi_bolacha_tap_left' : 'multi_bolacha_taps_left', { count: String(left) }), 1500);
	}
}

/**
 * The tasca's name, on the About van and the profile's board: "Tasca do João" from the first name of the main account,
 * or of the first saved one when none is main (the user's choice). A name not yet loaded (the email stands in) or no
 * account at all leaves the van's own Tasca do Tozé.
 */
export function tascaName(accounts: SavedAccount[], main: string | null) {
	const owner = (main ? accounts.find(account => sameEmail(account.email, main)) : undefined) ?? accounts[0];
	const first = owner?.name.includes('@') ? '' : owner?.name.trim().split(/\s+/)[0];
	return first ? `Tasca do ${first}` : 'Tasca do Tozé';
}
export const tasca = derived([savedAccounts, mainAccount], ([accounts, main]) => tascaName(accounts, main));

/** The profile closed: the row goes, and the count starts again. */
export function resetBaker() {
	taps = 0;
	clearTimeout(toastTimer);
	bakerToast.set(null);
	baker.set(false);
}