import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import type { CompletedTrip } from '$lib/gira-api/models';

const stored = new Map<string, string>;
vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: vi.fn(async ({ key }: { key: string }) => ({ value: stored.get(key) ?? null })),
		set: vi.fn(async ({ key, value }: { key: string, value: string }) => { stored.set(key, value); }),
		remove: vi.fn(async ({ key }: { key: string }) => { stored.delete(key); }),
	},
}));

import { emailText, falseTrips, saveEmailText, toggleFalseTrip, tripDetails, tripEmail } from './trip-marks';

const trip: CompletedTrip = {
	id: '4521',
	startedAt: new Date(2026, 9, 27, 18, 12),
	endedAt: new Date(2026, 9, 27, 19, 20),
	bikeId: 'E2114',
	bikeType: null,
	startStation: '401 - Alameda Santo António',
	endStation: '443 - Rua da Boavista',
	distanceMeters: 3200,
	cost: 1,
};

describe('trip marks', () => {
	beforeEach(() => stored.clear());

	it('marks a trip false and unmarks it, and keeps the marks on the phone', async () => {
		await toggleFalseTrip('4521');
		expect(get(falseTrips).has('4521')).toBe(true);
		expect(JSON.parse(stored.get('multi/falseTrips')!)).toEqual(['4521']);
		await toggleFalseTrip('4521');
		expect(get(falseTrips).has('4521')).toBe(false);
		expect(JSON.parse(stored.get('multi/falseTrips')!)).toEqual([]);
	});

	it('lists the trip details EMEL needs, in Portuguese', () => {
		expect(tripDetails(trip, 'main@x.pt')).toBe([
			'Conta: main@x.pt',
			'Viagem n.º 4521',
			'Data: 27/10/2026',
			'Início: 18:12, 401 - Alameda Santo António',
			'Fim: 19:20, 443 - Rua da Boavista',
			'Duração: 1 h 8 min',
			'Bicicleta: E2114',
			'Valor cobrado: 1,00 €',
		].join('\n'));
	});

	it("puts the rider's text first and opens a draft to EMEL", () => {
		const email = tripEmail(trip, 'main@x.pt', '  Bom dia.\nA viagem não terminou.  ');
		expect(email.body.startsWith('Bom dia.\nA viagem não terminou.\n\nConta: main@x.pt')).toBe(true);
		expect(email.url.startsWith('mailto:gira@emel.pt?subject=Viagem%20n.%C2%BA%204521&body=Bom%20dia.%0AA%20viagem')).toBe(true);
		expect(decodeURIComponent(email.url.split('&body=')[1])).toBe(email.body);
	});

	it('still drafts the details when no text was saved', () => {
		expect(tripEmail(trip, null, '').body).toBe(tripDetails(trip, null));
	});

	it('saves the text on the phone, and an empty text removes it', async () => {
		await saveEmailText('  Olá  ');
		expect(get(emailText)).toBe('Olá');
		expect(stored.get('multi/emailText')).toBe('Olá');
		await saveEmailText('   ');
		expect(stored.has('multi/emailText')).toBe(false);
	});
});