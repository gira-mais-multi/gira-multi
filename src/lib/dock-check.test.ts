import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { dismissDockCheck, dockCheck, dockCheckReset, dockProblem, dockSignalled, dockStuck, dockTripEnded, ENDED_SHOWN_MS } from './dock-check';

describe('dock check', () => {
	let vibrate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.useFakeTimers();
		vibrate = vi.fn(() => true);
		Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
	});

	afterEach(() => {
		dismissDockCheck();
		vi.useRealTimers();
	});

	it('says the trip ended, then clears itself so the rating can show', () => {
		dockSignalled('1');
		dockTripEnded('1');
		expect(get(dockCheck)).toEqual({ kind: 'ended', tripCode: '1' });
		expect(vibrate).toHaveBeenCalledOnce();
		vi.advanceTimersByTime(ENDED_SHOWN_MS - 1);
		expect(get(dockCheck)?.kind).toBe('ended');
		vi.advanceTimersByTime(1);
		expect(get(dockCheck)).toBeNull();
	});

	it("keeps \"trip ended\" through the reset that follows the trip's end", () => {
		dockSignalled('1');
		dockTripEnded('1');
		dockCheckReset();
		expect(get(dockCheck)?.kind).toBe('ended');
	});

	it("doesn't announce the end of a trip it wasn't following", () => {
		dockTripEnded('1');
		expect(get(dockCheck)).toBeNull();
		dockSignalled('2');
		dockTripEnded('1');
		expect(get(dockCheck)).toEqual({ kind: 'waiting', tripCode: '2' });
		expect(vibrate).not.toHaveBeenCalled();
	});

	it('goes from a reported problem back to waiting once the bike locks', () => {
		dockProblem('1');
		expect(get(dockCheck)?.kind).toBe('problem');
		expect(vibrate).toHaveBeenCalledOnce();
		dockSignalled('1');
		expect(get(dockCheck)?.kind).toBe('waiting');
	});

	it('marks a trip stuck only while following it, and buzzes once', () => {
		dockStuck('1');
		expect(get(dockCheck)).toBeNull();
		dockSignalled('1');
		dockStuck('1');
		dockStuck('1');
		expect(get(dockCheck)?.kind).toBe('stuck');
		expect(vibrate).toHaveBeenCalledOnce();
		dockSignalled('1');
		expect(get(dockCheck)?.kind).toBe('stuck');
	});

	it('clears on a reset, e.g. a switch to another account', () => {
		dockSignalled('1');
		dockCheckReset();
		expect(get(dockCheck)).toBeNull();
	});
});