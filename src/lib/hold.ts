// Gira+ Multi: a press-and-hold action. The click that ends a hold is swallowed, so holding an element that also
// reacts to taps (an account row switches on tap) doesn't do both. While the finger rests on it, the element gets
// `data-holding` and, unless `press: false`, Gira+'s press colour; the phone gives a short buzz when the hold fires.
const HOLD_MS = 500;
/** The press feedback starts this long after the finger lands, so a quick tap or a scroll doesn't flash it. */
const FEEDBACK_MS = 120;
/** A finger that moves this far is scrolling, not holding. */
const MOVE_TOLERANCE_PX = 10;
/** The buzz, in ms. Tweak here if it isn't felt (15-20). */
const BUZZ_MS = 10;

/** A short buzz, where the phone allows it (needs the VIBRATE permission on Android). */
export function buzz() {
	try {
		navigator.vibrate?.(BUZZ_MS);
	} catch {
		// not supported
	}
}

export type HoldOptions = { onHold: () => void, press?: boolean };

export function hold(node: HTMLElement, param: (() => void) | HoldOptions) {
	let options: HoldOptions = typeof param === 'function' ? { onHold: param } : param;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let feedback: ReturnType<typeof setTimeout> | undefined;
	let start: { x: number, y: number } | null = null;
	let held = false;

	const showFeedback = (on: boolean) => {
		if (on) node.dataset.holding = '';
		else delete node.dataset.holding;
		if (options.press !== false) node.style.backgroundColor = on ? 'var(--color-background-tertiary)' : '';
	};
	const cancel = () => {
		clearTimeout(timer);
		clearTimeout(feedback);
		timer = undefined;
		feedback = undefined;
		start = null;
		showFeedback(false);
	};
	const down = (event: PointerEvent) => {
		cancel();
		held = false;
		start = { x: event.clientX, y: event.clientY };
		feedback = setTimeout(() => showFeedback(true), FEEDBACK_MS);
		timer = setTimeout(() => {
			cancel();
			held = true;
			buzz();
			options.onHold();
		}, HOLD_MS);
	};
	const move = (event: PointerEvent) => {
		if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE_PX) cancel();
	};
	const click = (event: MouseEvent) => {
		if (!held) return;
		held = false;
		event.preventDefault();
		event.stopImmediatePropagation();
	};
	// Android's own long-press menu (text selection) would otherwise open as well
	const contextMenu = (event: Event) => event.preventDefault();

	const listeners: [string, EventListener, boolean?][] = [
		['pointerdown', down as EventListener],
		['pointermove', move as EventListener],
		['pointerup', cancel],
		['pointercancel', cancel],
		['pointerleave', cancel],
		['click', click as EventListener, true],
		['contextmenu', contextMenu],
	];
	for (const [type, listener, capture] of listeners) node.addEventListener(type, listener, capture);

	return {
		update(next: (() => void) | HoldOptions) {
			options = typeof next === 'function' ? { onHold: next } : next;
		},
		destroy() {
			cancel();
			for (const [type, listener, capture] of listeners) node.removeEventListener(type, listener, capture);
		},
	};
}