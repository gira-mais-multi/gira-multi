import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { baker, bakerTap, bakerToast, resetBaker, tascaName } from '$lib/bolacha';
import { appSettings } from '$lib/settings';

describe('the profile\'s hidden bolacha Maria row', () => {
	beforeEach(() => appSettings.set({ locale: 'pt' } as never));
	afterEach(() => {
		resetBaker();
		vi.useRealTimers();
	});

	it('appears after 7 quick taps on the header, counting down from the 3rd, and goes when the profile closes', () => {
		vi.useFakeTimers();
		for (let i = 1; i <= 6; i++) {
			bakerTap();
			vi.advanceTimersByTime(300);
			expect(get(bakerToast) !== null).toBe(i >= 3);
		}
		expect(get(baker)).toBe(false);
		bakerTap();
		expect(get(baker)).toBe(true);
		expect(get(bakerToast)).toBe(null); // the board drops over the name with no toast in the way

		resetBaker();
		expect(get(baker)).toBe(false);
	});

	it('starts the count again after a pause, so slow taps never unlock it', () => {
		vi.useFakeTimers();
		for (let i = 0; i < 10; i++) {
			bakerTap();
			vi.advanceTimersByTime(2000);
		}
		expect(get(baker)).toBe(false);
	});

	it("names the tasca after the account's first name, or the van's own when there is none", () => {
		expect(tascaName('João Pedro Silva')).toBe('Tasca de João');
		expect(tascaName('  Maria ')).toBe('Tasca de Maria');
		expect(tascaName('')).toBe('Tasca do Tozé');
		expect(tascaName(undefined)).toBe('Tasca do Tozé');
	});
});