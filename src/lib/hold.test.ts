import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { hold } from './hold';

describe('hold', () => {
	let node: HTMLButtonElement;
	let tapped: Mock<() => void>;
	let held: Mock<() => void>;
	let action: ReturnType<typeof hold>;

	beforeEach(() => {
		vi.useFakeTimers();
		node = document.createElement('button');
		document.body.append(node);
		tapped = vi.fn<() => void>();
		held = vi.fn<() => void>();
		node.addEventListener('click', tapped);
		action = hold(node, held);
	});
	afterEach(() => {
		action.destroy();
		node.remove();
		vi.useRealTimers();
	});

	const press = (x = 0, y = 0) => node.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y }));
	const release = () => {
		node.dispatchEvent(new PointerEvent('pointerup'));
		node.click();
	};

	it('fires after half a second and swallows the click that ends the hold', () => {
		press();
		vi.advanceTimersByTime(500);
		release();
		expect(held).toHaveBeenCalledOnce();
		expect(tapped).not.toHaveBeenCalled();
	});

	it('swallows the release click wherever it lands, so it cannot press what the hold opened', () => {
		const opened = document.createElement('button');
		const pressed = vi.fn();
		opened.addEventListener('click', pressed);
		held.mockImplementation(() => document.body.append(opened));
		press();
		vi.advanceTimersByTime(500);
		node.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
		opened.click();
		expect(pressed).not.toHaveBeenCalled();
		// a real tap afterwards still works
		vi.advanceTimersByTime(600);
		opened.click();
		expect(pressed).toHaveBeenCalledOnce();
		opened.remove();
	});

	it('leaves a short tap alone', () => {
		press();
		vi.advanceTimersByTime(200);
		release();
		expect(held).not.toHaveBeenCalled();
		expect(tapped).toHaveBeenCalledOnce();
	});

	it('treats a moving finger as scrolling', () => {
		press(0, 0);
		node.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 30 }));
		vi.advanceTimersByTime(500);
		expect(held).not.toHaveBeenCalled();
	});
});