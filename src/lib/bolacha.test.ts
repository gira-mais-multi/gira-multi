import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { baker, bakerTap, bakerToast, resetBaker, tascaName } from '$lib/bolacha';
import type { SavedAccount } from '$lib/accounts';
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

	it("names the tasca after the main account's first name, else the first saved account's, else the van's own", () => {
		const account = (email: string, name: string) => ({ email, name, password: '', userId: null, refreshToken: null }) as SavedAccount;
		const accounts = [account('ana@x.pt', 'Ana Costa'), account('joao@x.pt', 'João Pedro Silva')];
		expect(tascaName(accounts, 'JOAO@x.pt')).toBe('Tasca do João');
		expect(tascaName(accounts, null)).toBe('Tasca do Ana');
		expect(tascaName([account('rui@x.pt', 'rui@x.pt')], null)).toBe('Tasca do Tozé'); // its name not loaded yet
		expect(tascaName([], null)).toBe('Tasca do Tozé');
	});
});