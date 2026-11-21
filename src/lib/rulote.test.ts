import { describe, expect, it } from 'vitest';
import { simulate } from '$lib/rulote';

describe('the About page\'s van', () => {
	it('still gets hit on a very wide screen (a tablet on its side), where the take-off alone never reaches the edge', () => {
		const scene = simulate(2000);
		expect(scene.hit).toBeGreaterThan(0);
		expect(scene.hit).toBeLessThan(1000);
	});
});