// Gira+ Multi: what the ride history adds to a trip. A press and hold opens a menu to mark the trip false (the rider
// says it wasn't a real ride), copy its trip log, and, on a paid trip, draft an email to EMEL. The email's own text is
// written once by the rider and kept on the phone only; the app adds the trip's details. Nothing is sent by the app:
// the draft opens in the phone's email app.
import { Preferences } from '@capacitor/preferences';
import { writable } from 'svelte/store';
import type { CompletedTrip } from '$lib/gira-api/models';

const FALSE_TRIPS_KEY = 'multi/falseTrips';
const EMAIL_TEXT_KEY = 'multi/emailText';
export const EMEL_EMAIL = 'gira@emel.pt';

export const falseTrips = writable<Set<string>>(new Set);
export const emailText = writable('');

/** What the history asks for: the trip's menu, or straight to the email (its button on a paid trip). */
export const tripMenu = writable<{ trip: CompletedTrip, email: boolean } | null>(null);

let loaded: Promise<void> | null = null;

export function loadTripMarks() {
	loaded ??= (async () => {
		const [marks, text] = await Promise.all([FALSE_TRIPS_KEY, EMAIL_TEXT_KEY].map(key => Preferences.get({ key }).then(result => result.value)));
		try {
			const parsed: unknown = marks ? JSON.parse(marks) : [];
			falseTrips.set(new Set(Array.isArray(parsed) ? parsed.map(String) : []));
		} catch {
			falseTrips.set(new Set);
		}
		emailText.set(text ?? '');
	})();
	return loaded;
}

export async function toggleFalseTrip(id: string) {
	let next = new Set<string>;
	falseTrips.update(marks => {
		next = new Set(marks);
		if (!next.delete(id)) next.add(id);
		return next;
	});
	await Preferences.set({ key: FALSE_TRIPS_KEY, value: JSON.stringify([...next]) });
}

export async function saveEmailText(text: string) {
	const trimmed = text.trim();
	emailText.set(trimmed);
	await (trimmed ? Preferences.set({ key: EMAIL_TEXT_KEY, value: trimmed }) : Preferences.remove({ key: EMAIL_TEXT_KEY }));
}

const pad = (value: number) => String(value).padStart(2, '0');
const clock = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const day = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

function duration(trip: CompletedTrip) {
	const minutes = Math.max(0, Math.round((trip.endedAt.getTime() - trip.startedAt.getTime()) / 60_000));
	return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

/** The trip's details, in Portuguese since the email goes to EMEL. */
export function tripDetails(trip: CompletedTrip, account: string | null) {
	return [
		...account ? [`Conta: ${account}`] : [],
		`Viagem n.º ${trip.id}`,
		`Data: ${day(trip.startedAt)}`,
		`Início: ${clock(trip.startedAt)}${trip.startStation ? `, ${trip.startStation}` : ''}`,
		`Fim: ${clock(trip.endedAt)}${trip.endStation ? `, ${trip.endStation}` : ''}`,
		`Duração: ${duration(trip)}`,
		...trip.bikeId ? [`Bicicleta: ${trip.bikeId}`] : [],
		...trip.cost ? [`Valor cobrado: ${trip.cost.toFixed(2).replace('.', ',')} €`] : [],
	].join('\n');
}

/** The rider's text, then the trip's details, as a mailto: link that opens a draft. */
export function tripEmail(trip: CompletedTrip, account: string | null, text: string) {
	const body = [text.trim(), tripDetails(trip, account)].filter(Boolean).join('\n\n');
	const subject = `Viagem n.º ${trip.id}`;
	return { subject, body, url: `mailto:${EMEL_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}