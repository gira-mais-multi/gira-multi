import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissDockCheck, dockCheck, dockCheckReset, dockProblem, dockSignalled, dockStuck, dockTripEnded, ENDED_SHOWN_MS } from './dock-check';
import { appSettings } from './settings';
import { alertText, notificationId, watchDockAlerts, type TripAlert } from './trip-notify';

describe('trip-end notifications', () => {
	let sent: TripAlert[];
	let stop: () => void;

	beforeEach(() => {
		vi.useFakeTimers();
		sent = [];
		stop = watchDockAlerts(dockCheck, alert => sent.push(alert));
	});

	afterEach(() => {
		stop();
		dismissDockCheck();
		vi.useRealTimers();
	});

	it('notifies once when a followed trip ends, not while waiting', () => {
		dockSignalled('41');
		expect(sent).toEqual([]);
		dockTripEnded('41');
		vi.advanceTimersByTime(ENDED_SHOWN_MS);
		expect(sent.map(alert => alert.kind)).toEqual(['ended']);
	});

	it("doesn't notify for a trip the card wasn't following", () => {
		dockTripEnded('42');
		dockStuck('42');
		expect(sent).toEqual([]);
	});

	it('notifies a stuck trip once, even if the card is dismissed and the dock signal comes back', () => {
		dockSignalled('43');
		dockStuck('43');
		dismissDockCheck();
		dockSignalled('43');
		dockStuck('43');
		expect(sent.map(alert => alert.kind)).toEqual(['stuck']);
	});

	it('then notifies the end of a stuck trip, under the same id so it replaces the stuck one', () => {
		dockSignalled('44');
		dockStuck('44');
		dockTripEnded('44');
		expect(sent.map(alert => alert.kind)).toEqual(['stuck', 'ended']);
		expect(sent[0].id).toBe(sent[1].id);
	});

	it('notifies a reported problem once per trip', () => {
		dockProblem('45');
		dockSignalled('45');
		dockProblem('45');
		dockCheckReset();
		expect(sent.map(alert => alert.kind)).toEqual(['problem']);
	});

	it('gives different trips different ids that Android accepts', () => {
		const ids = ['1', '2', '123456789012', '999999999999999'].map(notificationId);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) {
			expect(Number.isInteger(id)).toBe(true);
			expect(id).toBeGreaterThan(0);
			expect(id).toBeLessThanOrEqual(2 ** 31 - 1);
		}
	});

	it('says when the trip ended, in the app language', () => {
		appSettings.set({ locale: 'pt' } as never);
		expect(alertText('ended', new Date(2026, 10, 18, 14, 5))).toEqual({ title: 'Viagem terminada', body: 'Terminou às 14:05.' });
		appSettings.set({ locale: 'en' } as never);
		expect(alertText('stuck').title).toBe("The trip hasn't ended");
	});
});