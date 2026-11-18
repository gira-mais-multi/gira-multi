// Gira+ Multi: an Android notification when the dock check card says the trip ended, looks stuck or hit a problem.
// By then the phone is usually in a pocket, so the card goes unseen (its vibration never reached the rider). The card
// stays as it is; this only repeats it outside the app. Nothing is requested from EMEL or VAIMOO for it.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { get, type Readable } from 'svelte/store';
import type { DockCheck, DockCheckKind } from './dock-check';
import { getLocale, t } from './translations';

export type TripAlertKind = Exclude<DockCheckKind, 'waiting'>;
export type TripAlert = { kind: TripAlertKind, tripCode: string, id: number };

const CHANNEL_ID = 'gira-multi-trip-end';
/** `android/app/src/main/res/drawable/ic_stat_gira_multi.xml`, a white bike for the status bar. */
const SMALL_ICON = 'ic_stat_gira_multi';
/** Gira+'s primary green and warning orange (`src/app.css`, light theme). */
const COLOURS: Record<TripAlertKind, string> = { ended: '#79c000', stuck: '#ffa929', problem: '#ffa929' };

/** One id per trip, so a later alert for the same trip replaces the earlier one (stuck, then ended). */
export function notificationId(tripCode: string) {
	let hash = 0;
	for (const char of tripCode) hash = (hash * 31 + char.charCodeAt(0)) | 0;
	return (hash & 0x7fffffff) || 1;
}

/** Calls `send` once per trip and kind, when the dock check card turns to ended, stuck or problem. */
export function watchDockAlerts(dockCheck: Readable<DockCheck | null>, send: (alert: TripAlert) => void) {
	const sent = new Set<string>;
	return dockCheck.subscribe(check => {
		if (!check || check.kind === 'waiting') return;
		const key = `${check.kind}:${check.tripCode}`;
		if (sent.has(key)) return;
		sent.add(key);
		send({ kind: check.kind, tripCode: check.tripCode, id: notificationId(check.tripCode) });
	});
}

/** The notification's text, from the card's own strings. */
export function alertText(kind: TripAlertKind, now = new Date) {
	const text = get(t);
	if (kind === 'ended') {
		const time = now.toLocaleTimeString(getLocale() === 'pt' ? 'pt-PT' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
		return { title: text('multi_dock_ended_title'), body: text('multi_notify_ended_message', { time }) };
	}
	if (kind === 'stuck') return { title: text('multi_dock_stuck_title'), body: text('multi_dock_stuck_message') };
	return { title: text('multi_dock_problem_title'), body: text('multi_dock_problem_message') };
}

async function showAlert(alert: TripAlert) {
	try {
		await LocalNotifications.schedule({
			notifications: [{
				id: alert.id,
				...alertText(alert.kind),
				channelId: CHANNEL_ID,
				smallIcon: SMALL_ICON,
				iconColor: COLOURS[alert.kind],
				autoCancel: true,
			}],
		});
	} catch (e) {
		// No permission or no plugin: the card on screen is still there
		console.warn('Trip notification failed', e);
	}
}

async function createChannel() {
	const text = get(t);
	try {
		await LocalNotifications.createChannel({
			id: CHANNEL_ID,
			name: text('multi_notify_channel_name'),
			description: text('multi_notify_channel_description'),
			importance: 4, // High: sound, vibration and a banner, also with the screen locked
			visibility: 1,
			vibration: true,
		});
	} catch (e) {
		console.warn('Trip notification channel failed', e);
	}
}

/** Asks for the notification permission once, when the first trip starts and the rider is looking at the screen. */
async function askPermission() {
	try {
		const { display } = await LocalNotifications.checkPermissions();
		if (display === 'prompt' || display === 'prompt-with-rationale') await LocalNotifications.requestPermissions();
	} catch (e) {
		console.warn('Trip notification permission failed', e);
	}
}

/** Starts the notifications. Only on the phone; in a browser the card is enough. */
export function initTripNotifications(dockCheck: Readable<DockCheck | null>, currentTrip: Readable<unknown>) {
	if (!Capacitor.isNativePlatform()) return () => {};
	void createChannel();
	const stopAlerts = watchDockAlerts(dockCheck, alert => void showAlert(alert));
	let asked = false;
	const stopTrip = currentTrip.subscribe(trip => {
		if (!trip || asked) return;
		asked = true;
		void askPermission();
	});
	return () => {
		stopAlerts();
		stopTrip();
	};
}