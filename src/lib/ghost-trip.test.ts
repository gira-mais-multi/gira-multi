import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { dismissDockCheck, dockCheck } from './dock-check';
import { GHOST_TRIP_AFTER_MS, ghostTripReset, ghostTripSignal, ghostTripStillOpen, offerOtherAccount, setGhostTripHandler, setTripDockedListener } from './ghost-trip';

const kind = () => get(dockCheck)?.kind ?? null;

describe('ghost trip detection', () => {
	afterEach(() => {
		ghostTripReset();
		dismissDockCheck();
		setGhostTripHandler(null);
		setTripDockedListener(null);
	});

	it('asks the rider to wait once the bike reports being docked', () => {
		const docked = vi.fn();
		setTripDockedListener(docked);
		ghostTripSignal('123', 0);
		expect(get(dockCheck)).toEqual({ kind: 'waiting', tripCode: '123' });
		expect(docked).toHaveBeenCalledWith('123');
	});

	it('calls the trip stuck only once it outlives the docked signal', () => {
		ghostTripSignal('123', 0);
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS - 1);
		expect(kind()).toBe('waiting');
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS);
		expect(kind()).toBe('stuck');
	});

	it('times from the first signal of the trip', () => {
		ghostTripSignal('123', 0);
		ghostTripSignal('123', 60_000);
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS);
		expect(kind()).toBe('stuck');
	});

	it('ignores polls without a signal or for another trip', () => {
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS);
		expect(kind()).toBeNull();
		ghostTripSignal('123', 0);
		ghostTripStillOpen('456', GHOST_TRIP_AFTER_MS);
		expect(kind()).toBe('waiting');
	});

	it("doesn't bring the card back after the rider dismissed it", () => {
		ghostTripSignal('123', 0);
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS);
		dismissDockCheck();
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS + 15_000);
		expect(kind()).toBeNull();
	});

	it('starts over after a reset, e.g. on coming back to the account', () => {
		ghostTripSignal('123', 0);
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS);
		ghostTripReset();
		expect(kind()).toBeNull();
		ghostTripSignal('123', GHOST_TRIP_AFTER_MS + 60_000);
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS + 60_000 + GHOST_TRIP_AFTER_MS - 1);
		expect(kind()).toBe('waiting');
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS + 60_000 + GHOST_TRIP_AFTER_MS);
		expect(kind()).toBe('stuck');
	});

	it('opens the account picker only when asked, and says when there is nothing to offer', () => {
		expect(offerOtherAccount()).toBe(false);
		const handler = vi.fn(() => true);
		setGhostTripHandler(handler);
		ghostTripSignal('123', 0);
		ghostTripStillOpen('123', GHOST_TRIP_AFTER_MS);
		expect(handler).not.toHaveBeenCalled();
		expect(offerOtherAccount()).toBe(true);
		expect(handler).toHaveBeenCalledOnce();
	});
});